# Nuvori audio

## Ready now

- 100 ElevenLabs sound effects: 26 family cries (including Oneirune), 20 elemental attack sounds, 24 footstep takes, and 30 interface/gameplay cues.
- Four generated ambience loops: forest, coast, storm and Dream Land.
- An opt-in Web Audio mixer with separate music, effects and ambience volumes; background-tab pause; lazy asset loading; limited voices and decoded-buffer cache; music ducking for reward stingers; scene transitions.
- Five supplied Suno songs installed: title screen, Mossbell, Verdant, wild battles and trainer battles. The other 17 assignments still have copy-ready prompts for later handoffs.

`generation.json` records provider, published file hash and credits for each generated asset. Processed foley also preserves the original hash and leveling settings. `validation.json` contains decoded duration, peak and RMS checks. This is technical validation, not a claim of human listening approval. No provider key ships to the browser.

The battle entrance uses a short, leveled marimba cue with a soft attack and release, played at 42% cue gain across wild, trainer, and League battles. Wild encounter cries start after the chime at half their previous gain. Footsteps use four shuffled takes on each of six surfaces (grass, stone, sand, snow, dirt, wood), with no immediate repeats, subtle pitch/level/stereo variation, and cadence driven by actual travel distance. Sprinting uses a faster cadence. Pauses, collisions and travel reset the stride; slow downloads cannot queue late footfalls. Ground selection follows the rendered path tile, with snow in snowy towns and wood indoors.

## Music handoff

### Installed first batch

| Scene | Song | Length |
| --- | --- | --- |
| Title screen | Your Path, Their Evolution | 1:59 |
| Mossbell | A Pocketful of Morning | 1:59 |
| Verdant | The Trail Wakes Up | 1:59 |
| Wild battles | A Spark in the Grass | 1:59 |
| Trainer battles | The Bond We Bring | 1:59 |

Imported from the user's September 28, 2026 Music Studio handoff. Each song is normalized toward -18 LUFS, loaded on demand, and routed through the existing music volume control and scene fades. This batch supplied no custom loop points: songs repeat in full, including their natural introductions and endings; they are not claimed to be seamless loops. Source hashes and published hashes are recorded in `generation.json`.

### Adding more songs

Open `artifacts/audio/Nuvori-Music-Studio.html` in a browser, or `/audio/studio.html` on a local preview. Copy each prompt into Suno Custom / Instrumental, download your chosen MP3 or WAV, and drop it on its cue. Export one ZIP and attach it in the Nuvori conversation. Partial batches work. The offline page uploads nothing; IndexedDB remembers selections when browser storage permits. Export a ZIP before closing as a reliable backup.

The game settings also link to the studio. `SUNO-PROMPTS.md` contains the complete readable collection; `artifacts/audio/Nuvori-Suno-Kit.zip` bundles the offline page and one text file per prompt.

Import a supplied handoff after reviewing the user's notes:

```powershell
python scripts/import-suno.py path/to/Nuvori-Suno-Handoff.zip --dry-run
python scripts/import-suno.py path/to/Nuvori-Suno-Handoff.zip
npm test
npm run build
```

FFmpeg must be on PATH or `imageio-ffmpeg` installed in `.sites-runtime/audio-tools`. Importing validates cue names, ZIP size, file paths and loop points, decodes audio, creates 44.1 kHz stereo MP3s at 192 kbps, normalizes toward -18 LUFS / -2 dBTP, and publishes the manifest. It preserves notes and source hashes. Listen to transitions and choose/review loop points before deployment; Suno does not guarantee seamless loops. Optional loop points control the Web Audio repeat segment without removing the initial introduction. Keep original Suno downloads outside the repository.

## Rebuilding and generating

`python scripts/build-music-kit.py` rebuilds the prompt document, standalone studio and kit. Music prompts live in `cue-sheet.json`. The handoff ZIP writer is dependency-free and stores audio without recompression.

`python scripts/generate-audio.py --all` generates missing **SFX and ambience only**, using `ELEVENLABS_API_KEY` from the process environment. It skips completed assets and retains a quota reserve. It never generates ElevenLabs music or automatically retries a paid request with an unknown outcome.

`python scripts/validate-audio.py` decodes installed clips with FFmpeg and NumPy, checks for non-silence and expected durations, and refreshes both audio manifests.

`python scripts/finish-foley.py` levels the replacement battle cue and footsteps once, adding attack/release fades and retaining source hashes. It requires the same local FFmpeg and NumPy runtime as validation. It skips clips already processed with this version.

## Release status

Audio ships through the main-branch GitHub Pages workflow. The required Supabase migrations were installed and the live League checks passed on 2026-09-27; see `docs/BACKEND.md`. This release includes five Suno songs, 100 sound effects and four ambience loops. The remaining 17 music cues await later user-supplied batches.
