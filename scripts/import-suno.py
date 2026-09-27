"""Import a Music Studio handoff ZIP; no network requests or credentials.

python scripts/import-suno.py <zip> --dry-run
python scripts/import-suno.py <zip>
FFmpeg must be on PATH, or imageio-ffmpeg installed in .sites-runtime/audio-tools.
"""
import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import sys
import tempfile
import time
import zipfile

ROOT=Path(__file__).resolve().parents[1]


def validated_tracks(archive, plan):
    if sum(i.file_size for i in archive.infolist()) > 525*1024*1024:
        raise ValueError('Handoff exceeds 525 MB. Send a smaller batch.')
    if archive.getinfo('suno-handoff.json').file_size > 100_000:
        raise ValueError('Handoff manifest is too large.')
    data=json.loads(archive.read('suno-handoff.json'))
    if data.get('schemaVersion') != 1 or data.get('project') != 'Nuvori' or not isinstance(data.get('tracks'),list):
        raise ValueError('Not a supported Nuvori Music Studio handoff.')
    allowed={c['id']:c for c in plan['cues'] if c['kind']=='music'}
    seen=set()
    for track in data['tracks']:
        cue_id=track.get('id')
        if cue_id not in allowed or cue_id in seen:
            raise ValueError(f'Unknown or duplicate music cue: {cue_id}')
        seen.add(cue_id)
        name=track.get('file','')
        path=PurePosixPath(name)
        if path.is_absolute() or '..' in path.parts or '\\' in name or len(path.parts)!=2 or path.parts[0]!='music' or path.stem!=cue_id or path.suffix.lower() not in ['.mp3','.wav','.m4a','.ogg','.flac']:
            raise ValueError('Unexpected track path in handoff.')
        if sum(i.filename==name for i in archive.infolist()) != 1:
            raise ValueError('Missing or duplicated audio entry.')
        info=archive.getinfo(name)
        if not 500 <= info.file_size <= 150*1024*1024:
            raise ValueError(f'Invalid audio size for {cue_id}')
        start,end=track.get('loopStart'),track.get('loopEnd')
        if any(v is not None and (isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) or v<0) for v in [start,end]):
            raise ValueError('Invalid loop point.')
        if end is not None and end <= (start or 0):
            raise ValueError('Loop end must follow loop start.')
    if not seen:
        raise ValueError('No tracks were attached.')
    return data['tracks']


def ffmpeg_path():
    found=shutil.which('ffmpeg')
    if found:return found
    sys.path.insert(0,str(ROOT/'.sites-runtime/audio-tools'))
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('zip',type=Path)
    parser.add_argument('--dry-run',action='store_true')
    args=parser.parse_args()
    plan_path=ROOT/'docs/audio/cue-sheet.json'
    plan=json.loads(plan_path.read_text(encoding='utf-8'))
    with zipfile.ZipFile(args.zip) as archive:
        tracks=validated_tracks(archive,plan)
        if args.dry_run:
            print('Validated: '+', '.join(t['id'] for t in tracks));return
        ffmpeg=ffmpeg_path()
        with tempfile.TemporaryDirectory(prefix='nuvori-suno-') as temporary:
            directory=Path(temporary);prepared=[]
            for track in tracks:
                source=directory/Path(track['file']).name
                original=archive.read(track['file']);source.write_bytes(original)
                # Decode audio only, normalize for the music bus, and cap malformed/very long inputs.
                target=directory/(track['id']+'-ready.mp3')
                subprocess.run([ffmpeg,'-v','error','-nostdin','-y','-protocol_whitelist','file,pipe','-i',str(source),'-map','0:a:0','-vn','-t','900','-af','loudnorm=I=-18:TP=-2:LRA=9','-ar','44100','-ac','2','-codec:a','libmp3lame','-b:a','192k',str(target)],check=True,timeout=180)
                pcm=subprocess.run([ffmpeg,'-v','error','-nostdin','-protocol_whitelist','file,pipe','-i',str(target),'-f','f32le','-ac','1','-ar','8000','pipe:1'],capture_output=True,check=True,timeout=90).stdout
                seconds=len(pcm)/4/8000
                if seconds<2 or (track.get('loopStart') or 0)>=seconds or (track.get('loopEnd') or 0)>seconds:
                    raise ValueError(f'Audio too short or loop points outside {track["id"]}.')
                prepared.append((track,target.read_bytes(),hashlib.sha256(original).hexdigest(),seconds))
            receipt_path=ROOT/'docs/audio/generation.json'
            receipts=json.loads(receipt_path.read_text(encoding='utf-8')) if receipt_path.exists() else {}
            for track,audio,source_hash,seconds in prepared:
                cue=next(c for c in plan['cues'] if c['id']==track['id'])
                path=ROOT/'public'/cue['file'];path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(audio)
                cue.update(seconds=round(seconds,3),loopStart=track.get('loopStart'),loopEnd=track.get('loopEnd'))
                receipts[cue['id']]={'provider':'Suno','source':'user-supplied handoff','file':cue['file'],'bytes':len(audio),'sha256':hashlib.sha256(audio).hexdigest(),'sourceSha256':source_hash,'importedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'notes':track.get('notes',''),'processing':'44.1 kHz stereo MP3 192 kbps; loudnorm -18 LUFS / -2 dBTP'}
            plan_path.write_text(json.dumps(plan,indent=2)+'\n',encoding='utf-8')
            receipt_path.write_text(json.dumps(receipts,indent=2)+'\n',encoding='utf-8')
            spec=importlib.util.spec_from_file_location('audio_generator',ROOT/'scripts/generate-audio.py')
            module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
            module.publish_manifest(plan,receipts)
    print(f'Imported {len(tracks)} tracks. Review notes/loop transitions, then build and test before deployment.')


if __name__=='__main__':main()
