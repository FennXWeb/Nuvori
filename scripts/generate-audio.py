"""Generate Nuvori's SFX using the configured ElevenLabs API key.

Run with --id <cue> for a single cue or --all. Existing recorded assets are skipped.
Credentials stay in the process environment and never enter the game or provenance.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "docs/audio/cue-sheet.json"
RECEIPTS = ROOT / "docs/audio/generation.json"
BASE = "https://api.elevenlabs.io/v1/"


def request(path, data=None, timeout=300):
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        raise RuntimeError("Set ELEVENLABS_API_KEY in your environment, never in VITE variables.")
    req = urllib.request.Request(BASE + path, data=json.dumps(data).encode() if data is not None else None,
                                 headers={"xi-api-key": key, "Content-Type": "application/json"})
    try:
        return urllib.request.urlopen(req, timeout=timeout)
    except urllib.error.HTTPError as error:
        # Only the service's public status/message, never request headers or credentials.
        try:
            detail = json.loads(error.read()).get("detail", {})
            message = detail.get("message", "Generation rejected") if isinstance(detail, dict) else str(detail)
        except Exception:
            message = "Generation rejected"
        raise RuntimeError(f"ElevenLabs HTTP {error.code}: {message}") from None


def quota():
    with request("user/subscription", timeout=30) as response:
        data = json.load(response)
    return data["character_limit"] - data["character_count"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--id", action="append", default=[])
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--kind", choices=["sfx", "ambience"])
    parser.add_argument("--reserve", type=int, default=1000, help="Leave this many credits unused.")
    args = parser.parse_args()
    plan = json.loads(PLAN.read_text(encoding="utf-8"))
    receipts = json.loads(RECEIPTS.read_text(encoding="utf-8")) if RECEIPTS.exists() else {}
    cues = [cue for cue in plan["cues"] if cue["kind"] != "music" and (args.all or cue["id"] in args.id) and (not args.kind or cue["kind"] == args.kind)]
    if not cues:
        parser.error("Choose --id or --all")
    available = quota()
    checked_at = time.monotonic()
    print(f"Available generation credits: {available}", flush=True)
    for cue in cues:
        target = ROOT / "public" / cue["file"]
        if target.exists() and cue["id"] in receipts:
            print(f"SKIP {cue['id']}", flush=True)
            continue
        # Avoid rate-limiting the subscription endpoint; charge local estimates between checks.
        if time.monotonic() - checked_at > 180:
            available = min(available, quota())
            checked_at = time.monotonic()
        estimate = cue["seconds"] * 40
        if available - estimate < args.reserve:
            raise RuntimeError(f"Stopping before {cue['id']}: {available} credits remain; reserve is {args.reserve}.")
        path = "sound-generation?output_format=mp3_44100_128"
        payload = {"text": cue["prompt"], "duration_seconds": cue["seconds"], "model_id": "eleven_text_to_sound_v2", "loop": cue["kind"] == "ambience", "prompt_influence": .65}
        print(f"GENERATE {cue['id']} ({cue['seconds']}s)", flush=True)
        # Never retry a timed-out paid request automatically: its billing outcome is unknown.
        with request(path, payload) as response:
            audio = response.read()
            content_type = response.headers.get("Content-Type", "")
            if "audio" not in content_type or len(audio) < 500:
                raise RuntimeError(f"No valid audio returned for {cue['id']}")
            cost = response.headers.get("character-cost")
            song_id = response.headers.get("song-id")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(audio)
        billed = int(cost) if cost and cost.isdigit() else estimate
        available -= billed
        receipts[cue["id"]] = {"provider": "ElevenLabs", "model": payload["model_id"], "file": cue["file"], "bytes": len(audio), "sha256": hashlib.sha256(audio).hexdigest(), "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "credits": billed}
        if song_id:
            receipts[cue["id"]]["songId"] = song_id
        RECEIPTS.write_text(json.dumps(receipts, indent=2) + "\n", encoding="utf-8")
        publish_manifest(plan, receipts)
        print(f"SAVED {cue['id']} · {len(audio)} bytes · {billed} credits", flush=True)


def publish_manifest(plan, receipts):
    catalog = {cue["id"]: {"title": cue["title"], "kind": cue["kind"], "file": cue["file"], "seconds": cue["seconds"], "loopStart": cue.get("loopStart"), "loopEnd": cue.get("loopEnd"), "available": cue["id"] in receipts and (ROOT / "public" / cue["file"]).exists()} for cue in plan["cues"]}
    (ROOT / "src/audioManifest.json").write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    (ROOT / "public/audio/manifest.json").write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
