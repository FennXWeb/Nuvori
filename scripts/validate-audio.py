"""Decode every installed clip and report non-silence and expected duration."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.sites-runtime/audio-tools'))
import imageio_ffmpeg
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
plan=json.loads((ROOT/'docs/audio/cue-sheet.json').read_text(encoding='utf-8'))
report=[]
for cue in plan['cues']:
    path=ROOT/'public'/cue['file']
    if not path.exists():continue
    output=subprocess.run([ffmpeg,'-v','error','-nostdin','-protocol_whitelist','file,pipe','-i',str(path),'-f','f32le','-ar','22050','-ac','1','pipe:1'],capture_output=True,check=True).stdout
    pcm=np.frombuffer(output,dtype='<f4')
    peak=float(np.max(np.abs(pcm)));rms=float(np.sqrt(np.mean(pcm*pcm)));duration=len(pcm)/22050
    assert peak>.005 and rms>.0001,(cue['id'],peak,rms)
    assert abs(duration-cue['seconds'])<.2,(cue['id'],duration)
    report.append({'id':cue['id'],'duration':round(duration,3),'peak':round(peak,4),'rms':round(rms,4)})
(ROOT/'docs/audio/validation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
spec=importlib.util.spec_from_file_location('audio_generator',ROOT/'scripts/generate-audio.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
module.publish_manifest(plan,json.loads((ROOT/'docs/audio/generation.json').read_text(encoding='utf-8')))
print(f'PASS: {len(report)} clips decode, contain non-silent audio, and match expected durations.')
