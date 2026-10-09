"""Prepare / finish the grass and interface refresh. Generation uses generate-audio.py.

Original provider responses are retained locally; no credentials enter artifacts.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / 'docs/audio/cue-sheet.json'
RECEIPTS = ROOT / 'docs/audio/generation.json'
VERSION = 'soft-trails-2'
UI = {
    'ui-click': ('Petal tap', .24, 'One tiny tactile soft felted-wood tap with a barely audible warm glass overtone. A precise understated menu selection. No beep, no chime melody, no high piercing click.'),
    'ui-confirm': ('A warm little yes', .48, 'Two short rounded wooden marimba notes rising gently, a soft thumb tap beneath. A warm, intimate confirmation, restrained and satisfying. No fanfare, no glitter explosion.'),
    'ui-back': ('Turn the leaf', .32, 'One short soft cloth and paper fold followed by a muted low wooden tuck. A delicate descending gesture for closing a menu. No long whoosh, no harsh paper crackle.'),
    'ui-error': ('A gentle nudge', .38, 'Two small soft hollow wooden knocks, slightly descending in pitch, friendly and restrained. A gentle unavailable-action cue. No alarm, no buzzer, no electronic distortion.'),
    'ui-notify': ('Firefly note', .64, 'A single warm felted celesta ping with a very soft airy wooden resonance and short mellow decay. A quiet friendly message notification. No shrill bell, no long reverb.'),
    'ui-reorder': ('Companion shuffle', .30, 'A tiny suede card slide and one padded wooden landing tap. Crisp but soft and very brief. Rearranging a creature team in a cozy fantasy menu. No snap, no high click.'),
    'purchase': ('Pocket change', .56, 'Three small softly clinking brass coins settle into a padded cloth pouch. Delicate small transaction, satisfying understated low metallic texture. No cash register, no jackpot, no melody.'),
    'customize': ('Tailor finish', .60, 'A delicate short swish of smooth linen with a tiny warm marimba sparkle at the end. Trying on a new outfit in a cozy fantasy game. Quiet close-up fabric, no magical explosion.'),
}
GRASS = [
    'A light heel presses springy short blades and releases with a tiny soft leaf flick.',
    'A slightly fuller flat-soled landing on mossy earth and a brief fine grass brush.',
    'A soft toe-first step, close leafy compression then a tiny boot scuff.',
    'A cushioned heel-to-toe step with a lower earth tap and fresh stems bending.',
    'A light boot brushes clover before landing on soft turf, gentle fibrous rustle.',
    'A short firm step on thick lawn, a muted rounded thud and soft blade flutter.',
    'A delicate step across fine meadow grass, a dry whisper of vegetation over padded soil.',
    'A gentle boot roll across dense green grass, warm low contact and a soft trailing leaf swish.',
]


def prepare():
    plan = json.loads(PLAN.read_text(encoding='utf-8'))
    old = json.loads(RECEIPTS.read_text(encoding='utf-8'))
    archive = ROOT / 'docs/audio/pre-soft-trails.json'
    ids = list(UI) + [f'step-grass-{i}' for i in range(1, 9)]
    if not archive.exists():
        archive.write_text(json.dumps({k: old[k] for k in ids if k in old}, indent=2)+'\n', encoding='utf-8')
    base = 'Original Nuvori cozy fantasy game foley. Clean isolated dry studio one-shot, immediate onset, intimate and soft, no voices, music, environmental ambience, repeated actions or reverb. '
    for id, (title, duration, description) in UI.items():
        cue = next(c for c in plan['cues'] if c['id'] == id)
        cue.update(title=title, seconds=max(.5, duration), file=f'audio/sfx/{id}-v2.mp3', prompt=base+description, finalSeconds=duration)
    for i, description in enumerate(GRASS, 1):
        id = f'step-grass-{i}'
        cue = next((c for c in plan['cues'] if c['id'] == id), None)
        if cue is None:
            cue = {'id': id, 'kind': 'sfx'}
            plan['cues'].append(cue)
        cue.update(title=f'Soft meadow step {i}', seconds=.7, finalSeconds=.36, file=f'audio/sfx/{id}-v2.mp3',
                   prompt='One isolated dry studio footfall of a soft leather boot on green grass and yielding earth. '+description+' Whole contact and release in first third of a second. Soft, intimate. No second step, voices, music, ambience, gravel, brittle crunch, squelch or plastic crinkle.')
    for cue in plan['cues']:
        record = old.get(cue['id'], {})
        if cue['id'] in ids and record.get('processing', {}).get('version') == VERSION and record.get('file') == cue['file'] and (ROOT/'public'/cue['file']).exists():
            cue['seconds'] = cue['finalSeconds']
    PLAN.write_text(json.dumps(plan, indent=2)+'\n', encoding='utf-8')
    print('Prepared '+', '.join(ids))


def finish():
    import numpy as np
    sys.path.insert(0, str(ROOT / '.sites-runtime/audio-tools'))
    import imageio_ffmpeg
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    plan = json.loads(PLAN.read_text(encoding='utf-8'))
    receipts = json.loads(RECEIPTS.read_text(encoding='utf-8'))
    backup = ROOT / '.sites-runtime/audio-qa/soft-trails-originals'
    backup.mkdir(parents=True, exist_ok=True)
    for cue in plan['cues']:
        if 'finalSeconds' not in cue:
            continue
        record = receipts[cue['id']]
        if record.get('processing', {}).get('version') == VERSION:
            continue
        path = ROOT / 'public' / cue['file']
        original = path.read_bytes()
        (backup / path.name).write_bytes(original)
        decoded = subprocess.run([ffmpeg, '-v', 'error', '-nostdin', '-i', str(path), '-af', 'highpass=f=85,lowpass=f=6500', '-f', 'f32le', '-ar', '44100', '-ac', '1', 'pipe:1'], capture_output=True, check=True).stdout
        pcm = np.frombuffer(decoded, dtype='<f4').copy()
        peak = float(np.max(np.abs(pcm)))
        assert peak > .005, cue['id']
        # Preserve contact transients with a 4ms lead and a short cosine attack.
        onset = max(0, int(np.flatnonzero(np.abs(pcm) > peak*.025)[0])-176)
        pcm = pcm[onset:]
        length = round(cue['finalSeconds']*44100)
        pcm = np.pad(pcm[:length], (0, max(0, length-len(pcm))))
        attack, release = 220, min(4410, length//3)
        pcm[:attack] *= np.sin(np.linspace(0, np.pi/2, attack))**2
        pcm[-release:] *= np.cos(np.linspace(0, np.pi/2, release))**2
        rms = float(np.sqrt(np.mean(pcm*pcm)))
        assert rms > .00001, cue['id']
        target = .052 if cue['id'].startswith('step-') else .044
        ceiling = .24 if cue['id'].startswith('step-') else .22
        gain = min(target/rms, ceiling/float(np.max(np.abs(pcm))))
        pcm *= gain
        encoded = subprocess.run([ffmpeg, '-v', 'error', '-nostdin', '-f', 'f32le', '-ar', '44100', '-ac', '1', '-i', 'pipe:0', '-c:a', 'libmp3lame', '-b:a', '128k', '-f', 'mp3', 'pipe:1'], input=pcm.astype('<f4').tobytes(), capture_output=True, check=True).stdout
        path.write_bytes(encoded)
        record['processing'] = dict(version=VERSION, sourceSha256=hashlib.sha256(original).hexdigest(), gain=round(gain, 6), trimmedLeadSeconds=round(onset/44100, 4), targetRms=target, peakCeiling=ceiling, highpassHz=85, lowpassHz=6500, attackSeconds=.005, releaseSeconds=round(release/44100,4), generatedSeconds=cue['seconds'])
        record.update(bytes=len(encoded), sha256=hashlib.sha256(encoded).hexdigest())
        cue['seconds'] = cue['finalSeconds']
        RECEIPTS.write_text(json.dumps(receipts, indent=2)+'\n', encoding='utf-8')
        PLAN.write_text(json.dumps(plan, indent=2)+'\n', encoding='utf-8')
        print('Finished '+cue['id'], flush=True)
    spec = importlib.util.spec_from_file_location('generator', ROOT/'scripts/generate-audio.py')
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    module.publish_manifest(plan, receipts)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('action', choices=['prepare', 'finish'])
    args = parser.parse_args()
    prepare() if args.action == 'prepare' else finish()
