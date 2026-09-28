"""Level the replacement battle cue and single-footfall takes once, preserving provenance."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.sites-runtime/audio-tools'))
import imageio_ffmpeg

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
receipts_path = ROOT / 'docs/audio/generation.json'
receipts = json.loads(receipts_path.read_text(encoding='utf-8'))
plan = json.loads((ROOT / 'docs/audio/cue-sheet.json').read_text(encoding='utf-8'))
for cue in plan['cues']:
    if cue['id'] != 'battle-start' and not cue['id'].startswith('step-'):
        continue
    receipt = receipts[cue['id']]
    if receipt.get('processing', {}).get('version') == 'gentle-foley-1':
        continue
    path = ROOT / 'public' / cue['file']
    original = path.read_bytes()
    data = subprocess.run([ffmpeg, '-v', 'error', '-nostdin', '-i', str(path), '-f', 'f32le',
                           '-ar', '44100', '-ac', '1', 'pipe:1'], capture_output=True, check=True).stdout
    pcm = np.frombuffer(data, dtype='<f4').copy()
    peak = float(np.max(np.abs(pcm)))
    assert peak > .005, cue['id']
    # Keep a 3ms lead-in ahead of the first audible contact, then a gentle attack/release.
    onset = max(0, int(np.flatnonzero(np.abs(pcm) > peak * .025)[0]) - 132)
    pcm = pcm[onset:]
    duration = round(cue['seconds'] * 44100)
    pcm = np.pad(pcm[:duration], (0, max(0, duration - len(pcm))))
    attack, release = 441, 4410
    pcm[:attack] *= np.linspace(0, 1, attack)
    pcm[-release:] *= np.linspace(1, 0, release)
    rms = float(np.sqrt(np.mean(pcm * pcm)))
    target_rms = .075 if cue['id'] == 'battle-start' else .085
    ceiling = .30 if cue['id'] == 'battle-start' else .35
    gain = min(target_rms / rms, ceiling / float(np.max(np.abs(pcm))))
    pcm *= gain
    encoded = subprocess.run([ffmpeg, '-v', 'error', '-nostdin', '-f', 'f32le', '-ar', '44100',
                              '-ac', '1', '-i', 'pipe:0', '-c:a', 'libmp3lame', '-b:a', '128k',
                              '-f', 'mp3', 'pipe:1'], input=pcm.astype('<f4').tobytes(),
                              capture_output=True, check=True).stdout
    path.write_bytes(encoded)
    receipt['processing'] = dict(version='gentle-foley-1', sourceSha256=hashlib.sha256(original).hexdigest(),
                                 gain=round(gain, 6), trimmedLeadSeconds=round(onset / 44100, 4),
                                 targetRms=target_rms, peakCeiling=ceiling, attackSeconds=.01, releaseSeconds=.1)
    receipt.update(bytes=len(encoded), sha256=hashlib.sha256(encoded).hexdigest())
    receipts_path.write_text(json.dumps(receipts, indent=2) + '\n', encoding='utf-8')
    print(f"Leveled {cue['id']}")
