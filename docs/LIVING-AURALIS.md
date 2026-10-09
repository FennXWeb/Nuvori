# Living Auralis · 1.3.0

All 312 playable Nuvo forms now have four directional facings and a shared articulated animation renderer. The original portrait supplies the forward view; 26 new transparent atlases supply side and rear drawings. Left/right share a mirrored profile. Six movement rigs cover walking, hopping, flying, swimming, crawling and floating, with idle breathing, attack anticipation/lunges, damage recoil, fainting, summoning and recall actions. Prismatic colors are retained.

The built-in ImageGen tool generated the new artwork. Sources are preserved as PNGs in `public/assets/motion-*.png`, `public/assets/town-buildings.png` and `public/assets/town-decor.png`; the complete prompt/reference record is [motion-art-prompts.json](motion-art-prompts.json). These are directional drawings animated with continuous mesh deformation, not separately hand-drawn frames for each action. Images load when needed.

Keeper walking now articulates each leg around its hip, swings sleeves and shifts weight. Sprinting has a longer stride. Local footsteps and keeper strides follow actual travel. Existing hairstyles, clothing, colors and accessories remain compatible.

Wild/trainer encounters play ordered action scenes for both sides. Health/name panels follow the presented creature; a fainted or recalled creature stays on screen until its replacement is summoned. Controls stay locked until the sequence ends. Champions presentation is derived from confirmed server snapshots and queued across polling updates. Damage calculations and online authority remain on their existing paths.

Towns gain eight building styles (bakery, tea house, greenhouse, library, clocktower, windmill, market and boathouse) and twelve props (carts, noticeboard, mailbox, planters, café seating, arch, statue, well, picnic table and bunting). Existing fountains have animated water jets, droplets and ripples. Twelve resident route definitions add varied outfits, pauses and conversations; routes use world pathfinding and pause near the keeper.

## Validation and maintenance

- `npm test`: 99 checks, including every Nuvo's facings, exact source bounds/hashes, all action poses, crop-safe deformation, battle/replacement ordering, multiplayer cues, walkable resident routes, menu reward counts, UTC resets and reward artwork bounds.
- `npm run build`: TypeScript and production build.
- `npx tsx scripts/measure-motion.ts`: regenerate measured directional bounds after replacing a motion sheet.
- `npx tsx scripts/measure-world-art.ts`: regenerate scenery/customization bounds after replacing a world sheet.
- Development-only `/scripts/motion-preview.html`: all species, directions and actions plus battle fixtures. `/scripts/art-preview.html` checks keeper layers; `/qa.html` launches world fixtures. They are excluded from production builds.

Local browser review covered four-way followers, keeper sprinting, town population and fountain rendering, trainer replacement and forced-faint auto-switches. Existing save format and database schema are unchanged; no Supabase migration is needed. A new Windows/SMOG archive is not part of this web update.

## Cinematic main menu

The lobby layers a painted floating-island sanctuary, articulated Solunelle key art, pointer parallax, drifting starlight, orbiting accents and a shimmering animated logo. All animation respects reduced motion; canvas drawing pauses while the document is hidden. Covered world rendering is skipped while its position/presence lifecycle remains mounted.

The lobby opens the existing daily wheel, friends, global/local chat, account, audio/settings, crew, journal, guide and atlas systems. Its season and daily reset indicators derive from the active adventure. New keepers can preview all 100 pass rewards without creating a save. Claims use the existing validated reward logic; cosmetic previews preserve the keeper's appearance and do not equip or unlock an item. Chat retains account requirements, blocking, channel boundaries and server rate limits.

The pass gallery includes nine newly illustrated supply icons, animated Nuvo and keeper cosmetic previews, an illustrated Solunelle banner, XP/boost status and claim animations. Selecting a reward scrolls its detail into view. An in-game archive contains versioned release highlights and links to the full release notes.

Built-in ImageGen produced `public/assets/menu-sanctuary.png`, `public/assets/menu-solunelle.png` and `public/assets/menu-rewards.png`. Prompts and original source paths are recorded in [menu-art-prompts.json](menu-art-prompts.json). Run `npx tsx scripts/measure-menu-art.ts` after replacing the reward atlas. The development-only `/scripts/menu-preview.html` provides phone, tablet and desktop iframe sizes; `/qa.html` has disposable guest fixtures for season rewards and the daily wheel. Neither workshop is a production build entry.
