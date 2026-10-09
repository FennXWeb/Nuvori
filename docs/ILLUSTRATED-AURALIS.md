# Illustrated Auralis · 1.2.2

The world now uses illustrated character and scenery assets matched to the Nuvo artwork. The built-in ImageGen tool generated thirteen source sheets in public/assets. Prompt specifications and references are in [the art record](illustrated-art-prompts.json).

- 184 isolated sprites: 48 directional heads, 40 directional tops, 16 bottoms, 20 hats, 16 accessories, 16 furnishings/props, 12 landmarks, 8 buildings, and 8 encounter-grass clumps.
- All twelve hairstyles, ten tops, four bottoms, five optional hats, accessories and existing skin/eye/material color choices are retained. Freckles are a small face overlay. Legacy keepers and NPCs use the same illustrated renderer.
- Layered walk/sprint animation uses anchored heads, swinging arms and alternating feet; previews, the world, remote players and battle portraits share the renderer.
- Sixteen terrain materials cover lawns, roads, paths, water, snow, sand, caves, rubble, hedges, cliffs, bridges, steps and Dream Land. The second ground sheet provides calmer backgrounds beneath characters.
- Lodge, shop, nursery, tailor and barber interiors share detailed furnishings, timber floors, wall panels and windows. Existing matching trees, flowers, rocks, original buildings and Nuvo sheets are retained.

## Validation

Run npm test and npm run build. Regenerate new atlas bounds with npx tsx scripts/measure-world-art.ts after replacing source PNGs. The measuring tool validates complete connected components, rejects missing frames and rejects overlapping visible pixels. It never edits generated PNGs.

Use /scripts/art-preview.html on the development server to inspect animated directions, outfits, hats and prop sheets. Use /qa.html to review actual maps and interiors. These fixtures are excluded from production builds.

Existing saves, customization indexes, map collision geometry and online schemas are unchanged. No database migration is required.
