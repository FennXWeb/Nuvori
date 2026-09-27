# Nuvori audio

## Ready now

- 80 ElevenLabs sound effects: 26 family cries (including Oneirune), 20 elemental attack sounds, and 34 interface/gameplay cues.
- Four generated ambience loops: forest, coast, storm and Dream Land.
- An opt-in Web Audio mixer with separate music, effects and ambience volumes; background-tab pause; lazy asset loading; limited voices and decoded-buffer cache; music ducking for reward stingers; scene transitions.
- 22 Suno music assignments and copy-ready prompts. **No Suno songs are installed yet.**

`generation.json` records provider, original file hash and credits for each generated asset. `validation.json` contains decoded duration, peak and RMS checks. This is technical validation, not a claim of human listening approval. No provider key ships to the browser.

## Music handoff

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

## Release status

Audio is part of the current draft expansion branch. The public GitHub Pages game has not received this change. The expansion's Supabase migrations remain a separate release prerequisite; see `docs/BACKEND.md`.
