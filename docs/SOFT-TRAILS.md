# Soft Trails · 1.3.1

## Audio

ElevenLabs `eleven_text_to_sound_v2` generated 16 new responses: eight grass footfalls and eight interface cues (selection, confirm, back, error, notification, reorder, purchase and customization). The successful requests used 99 credits. The original grass prompt exceeded the provider's length limit and was explicitly rejected before generation; the shorter prompt succeeded. No music was generated.

`docs/audio/cue-sheet.json` preserves the final prompts and durations. `docs/audio/generation.json` records provider, credits, original/published SHA-256 hashes, generation time and processing settings. `pre-soft-trails.json` retains prior receipts. The new versioned MP3 files live in `public/audio/sfx/*-v2.mp3`, preventing browsers from retaining the previous recordings under cached URLs. All eight grass takes play once per shuffled bag without repeating across bag boundaries. Actual travel still determines cadence, pitch/level/pan vary slightly, and collisions/pausing stop footsteps.

Processing removes frequencies below 85 Hz and above 6.5 kHz, trims leading silence, applies a soft 5 ms attack and up to 100 ms release, and limits peaks to 0.24 for footsteps / 0.22 for UI before MP3 encoding. Target RMS values are ceilings, not forced compression targets. Decoded peaks and RMS are checked after encoding. Local original provider responses remain in the ignored `.sites-runtime/audio-qa/soft-trails-originals` folder. The Python scripts read the existing environment key; no credential is published.

Use `python scripts/refresh-trail-audio.py prepare`, the existing `generate-audio.py --id ...` flow, then `python scripts/refresh-trail-audio.py finish` for this batch. Completed generation requests are skipped; processing is idempotent. `python scripts/validate-audio.py` validates every installed clip and republishes both manifests. Validation proves technical properties, not subjective listening approval.

## Terrain

The existing illustrated sources are preserved. `periodicPixels` matches opposite edge bands on both axes before repetition, then closes the outer edges of the wrapped texture quilt. Material detail away from seams stays intact. The shared surface renderer applies this to outdoor materials and interior floors.

Ground blending samples a continuous field in world coordinates, using four neighboring material cells, gently distorted edges, rounded contours and normalized weights. The same field handles corners, T-junctions, grass/dirt, paving, snow, sand, cave gravel and water banks. A shoreline wash follows the field instead of rectangular edge strips. Bridge decks and stairs retain a clear structural footprint. Rendering leaves the authored collision, pathfinding and encounter grids unchanged.

Composed ground cells are cached on region canvases as they enter view. At most two regions remain cached; repeated frames draw the cached tiles, with water ripples and structural rails layered above. Cave shading follows the blended material weights. Textures also cache their source pixels and seamless repeats.

Checks cover opposite-edge equality, intact interior texture pixels, continuous blended edges and material hardness, three-material junctions, complete weight coverage, protected bridges/stairs, distinct generated audio, clipping limits, and all eight non-repeating grass takes.
