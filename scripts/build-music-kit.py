"""Build the self-contained Suno prompt and handoff page from the cue sheet."""
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
plan = json.loads((ROOT / 'docs/audio/cue-sheet.json').read_text(encoding='utf-8'))
music = [cue for cue in plan['cues'] if cue['kind'] == 'music']
exclude = 'vocals, singing, humming, spoken words, choir, lyrics, harsh distortion, trailer impacts, long silent intro, fade-out'
uses = {'title':'Title screen and keeper creation', 'lodge':'Healing Lodge interior', 'shops':'Supply Shop, clothing store and barber', 'battle-wild':'Wild Nuvo encounters', 'battle-trainer':'Trainer duels', 'battle-league':'Champions League cooperative guardian battles', 'last-stand':'Keeper last stand after the crew falls', 'dreamland':'Dream Land and the search for Oneirune'}
priority = ['title','mossbell','verdant','battle-wild','lodge','battle-league','dreamland']
for cue in music:
    original = cue['prompt']
    detail = cue.get('musicalDirection') or original.split('Cohesive intimate game mix, not a trailer. ')[1].split(' A complete repeating gameplay passage')[0]
    cue['musicalDirection'] = detail
    cue.update(provider='Suno', targetSeconds=120, use=uses.get(cue['id'], detail.split('. ')[0] + ' exploration'), exclude=exclude, priority=cue['id'] in priority)
    cue['prompt'] = f'Instrumental fantasy adventure game soundtrack. {detail} Warm chamber orchestra, delicate 16-bit synth accents, expressive woodwinds, acoustic plucks and rounded bass. Memorable original melody with a rising four-note question and a gentle answering phrase. Clear intimate mix that leaves room for game sounds. Aim for about two minutes: brief pickup, 16-bar A melody, contrasting 16-bar B melody, varied A return and a lighter instrumental passage. Keep a steady pulse and return to the opening harmony for repeat playback. Continuous instrumental arrangement; no finale or fade-out.'
(ROOT / 'docs/audio/cue-sheet.json').write_text(json.dumps(plan,indent=2)+'\n',encoding='utf-8')
intro = '''# Nuvori — Suno soundtrack prompts

22 original instrumental themes for Nuvori. Start with the seven starred cues if you want a first batch; you can send tracks in any order.

## Create a track

1. Open Suno Create, choose **Custom**, and enable **Instrumental**. Paste a cue's prompt into **Styles**, use its title, and leave lyrics empty.
2. If available, put the shared exclusion list below into **Advanced Options → Exclude**.
3. Choose the take you like best and download its **MP3** (easiest handoff) or **WAV** (larger, useful for editing). Keep the original download.
4. Open `Nuvori-Music-Studio.html`, drop the file on its cue card, preview it, and choose **Export handoff ZIP**. Attach that ZIP in this conversation. Partial batches are welcome.

The prompts aim for about two minutes, but generated duration, BPM, motif and looping are creative targets, not guarantees. Send a great longer take as-is; we can choose loop points during integration. Choose takes with a clear melody, no accidental voices and a steady section that can repeat. Each prompt works independently; the recurring palette helps the score feel related, but does not guarantee an identical melody across generations.

You may instead attach the audio files directly using the filenames below. Suno share links alone are less useful than actual MP3/WAV downloads. No account credentials or API keys are needed.

**Shared Exclude field:** vocals, singing, humming, spoken words, choir, lyrics, harsh distortion, trailer impacts, long silent intro, fade-out

Official Suno instructions: [Custom / Instrumental](https://help.suno.com/en/articles/3726721), [Exclude](https://help.suno.com/en/articles/3161921), [downloads](https://help.suno.com/en/articles/13926081). MP3 is available on all plans; WAV is available to Pro/Premier subscribers on the website.

## The collection
'''
sections=[]
for i,cue in enumerate(music,1):
    sections.append(f"### {i:02d}. {'★ ' if cue['priority'] else ''}{cue['title']}\n\n**Use:** {cue['use']}  \n**Filename:** `{cue['id']}.mp3`  \n**Title in Suno:** Nuvori — {cue['title']}\n\n**Styles — copy this:**\n\n```text\n{cue['prompt']}\n```\n")
doc=intro+'\n'.join(sections)
(ROOT/'docs/audio/SUNO-PROMPTS.md').write_text(doc,encoding='utf-8')
template=(ROOT/'scripts/music-studio.html').read_text(encoding='utf-8')
runtime=(ROOT/'scripts/music-studio.js').read_text(encoding='utf-8')
zipper=(ROOT/'scripts/handoff-zip.mjs').read_text(encoding='utf-8').replace('export ', '')
html=template.replace('/* CUE_DATA */', 'const CUES = '+json.dumps(music)+';').replace('/* ZIP_RUNTIME */',zipper).replace('/* STUDIO_RUNTIME */',runtime)
(ROOT/'public/audio/studio.html').write_text(html,encoding='utf-8')
out=ROOT/'artifacts/audio'
out.mkdir(parents=True,exist_ok=True)
(out/'Nuvori-Music-Studio.html').write_text(html,encoding='utf-8')
(out/'Nuvori-Suno-Prompts.md').write_text(doc,encoding='utf-8')
with zipfile.ZipFile(out/'Nuvori-Suno-Kit.zip','w',zipfile.ZIP_DEFLATED) as z:
    z.writestr('Nuvori-Music-Studio.html',html)
    z.writestr('Nuvori-Suno-Prompts.md',doc)
    for i,cue in enumerate(music,1):
        z.writestr(f"prompts/{i:02d}-{cue['id']}.txt",f"TITLE: Nuvori — {cue['title']}\nFILENAME: {cue['id']}.mp3\nUSE: {cue['use']}\nMODE: Custom; Instrumental on; lyrics empty\n\nSTYLES:\n{cue['prompt']}\n\nEXCLUDE:\n{exclude}\n")
print(f'Built {len(music)} prompts, offline studio, and kit ZIP.')
