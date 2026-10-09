# Sprite cropping repair · 2026-09-28

The six original evolution sheets crossed their assumed 5×5 crop boundaries. Repair sheets `public/assets/evolution-1-v2.png` through `evolution-6-v2.png` provide space around each of the 150 evolved forms. They were edited with the built-in imagegen tool, preserving each creature's design and row-major identity. Original sheets remain available for provenance, older clients, and the regression fixture.

The edit instruction was to change layout, spacing and scale only; preserve all 25 designs, colors, anatomy, poses and order; restore clipped outer tips; center each creature, including effects, within the central 60% of its cell; and retain a real transparent background with uninterrupted gutters. No raster postprocessing was applied.

Generated output identifiers, in sheet order:

1. `exec-f4b7a681-974b-4495-bb66-307765980ed4.png`
2. `exec-4d30b4d6-bcf5-4106-ba1b-d7a5538573d8.png`
3. `exec-c316cb36-2149-4a09-93c8-b43881d77a80.png`
4. `exec-7f13fa00-2252-4fb6-8ec6-31dac784d67d.png`
5. `exec-102c6012-ee84-4982-8f49-21f07ef5946d.png`
6. `exec-537f353c-2b7e-4d1f-8d32-1a3709af3ad5.png`

Generated spacing is not assumed to be mathematically exact. `scripts/measure-sprites.ts` reads the PNG alpha channel, finds 17-pixel transparent gutters near each expected row/column boundary, and measures each silhouette. It excludes detached generation dust smaller than 16 pixels from the bounds, retains visible separate effects, and adds six pixels of source padding for soft edges. It rejects missing gutters, empty cells and silhouettes touching crop edges. It never modifies the PNG.

`src/spriteFrames.json` stores source dimensions, SHA-256 hashes and integer rectangles for all 312 forms, plus the nursery egg illustration. `src/sprites.ts` supplies these same rectangles to UI portraits and world followers. Both preserve aspect ratio and leave display padding; growth stages retain progressively larger silhouettes. UI portraits use an explicitly clipped nested SVG viewport so letterboxing cannot reveal adjacent atlas cells. Followers animate one intact sprite with gait-specific bobbing, tilt and squash, avoiding the horizontal tearing caused by the previous strip deformation.

Keeper animations and world props keep their existing 4×4 source cells; their transparent boundaries are checked separately.

To update and verify artwork:

```powershell
npx tsx scripts/measure-sprites.ts
npm test
npm run build
```

For visual checks, run `npm run dev` and open `/scripts/sprite-preview.html`. Select each branch, base forms or Oneirune, and toggle Prismatic. The page uses the production portrait and follower components. It is a development tool and is not part of the deployed game bundle.
