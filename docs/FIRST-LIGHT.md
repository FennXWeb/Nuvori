# First Light · web version 1.2.0

## Playing

The world fills the window. Continue from the new main menu, press **Tab** for the field journal, and **Esc** to pause. The journal contains your crew, satchel, map, Nuvopedia, Season 1 pass, nursery status, daily wheel, friends, Champions League and settings. Pause also offers saving, browser full screen, and returning to the main menu. Other players and real-time timers continue while your local adventure is paused.

Outdoor regions are now **72 × 52 tiles (2,304 × 1,664 pixels)**, four times the previous area. The camera follows smoothly, with tile and prop culling and cached maps. Existing buildings, landmarks, keepers and interior coordinates stay compatible with old adventures. Travel gates are now at the enlarged boundaries. Towns have street grids, residential cottages, fences, lamps and fountain squares. Residential doors are scenery; named service buildings retain their entrances.

Wild encounters trigger in visible tall-grass patches, outside towns and away from paths. Grass sways and parts around the keeper. All ten move types have layered charge, projectile, impact, rings and debris effects, varied by move. Recorded ElevenLabs SFX are mixed with quiet type-specific synthesized transients. Evolution now has an awakening, luminous silhouette, burst and grown-form reveal. The evolution is saved before the animation; skipping cannot duplicate it. Reduced-motion preferences simplify combat effects and bypass the animated evolution phases. Muting stops both recorded and synthesized effects.

## Character studio

New keepers can choose 6 skin tones, 12 eye and material colors, 12 hairstyles, 8 ordinary top styles, 4 bottoms, shoe colors, 4 ordinary headwear choices, and 6 accessory choices. A four-direction live preview and a randomizer help explore combinations. Layered pixel sprites animate direction, walking and sprinting; online keepers see the same look. Legacy keepers retain their original sprite until they customize. Their first expanded studio visit is free; later tailor applications cost 80 coins and barber applications cost 40. Season cosmetics are locked until claimed and remain owned afterward.

## Season 1: First Light

October 9, 2026 through January 9, 2027 (UTC). **Free for every player: no purchase or premium track.** There are 100 tiers at 300 pass XP each. Rewards include keeper coins, healing potions, binding and specialty orbs, temporary boosts, and four exclusive styles:

| Tier | Exclusive reward |
| --- | --- |
| 20 | Starlace halo |
| 40 | Starlace coat |
| 60 | Dawnwarden crown |
| 80 | Dawnwarden regalia |
| 100 | Solunelle, a level-5 Astral/Bloom mythical Nuvo |

Pass XP comes from victories (75), newly caught species (125), first region or landmark discoveries (150), first trainer completion (an additional 150), evolution (100), and Champions reward claims (300 plus victory XP when applicable). Repeated UI actions and unchanged saves give no XP. Boost tokens grant 2× pass XP for 30 real-time minutes, stack duration, and do not alter Nuvo XP. The pass shows remaining time and refuses activation after the season ends. Earned rewards can still be claimed afterward. Each tier can be claimed once per adventure; the exclusive Nuvo waits if the reserve is full. Solunelle is absent from every wild pool. It uses a pitched Wisplet recording for its cry.

Progress, claimed tiers, boosts and owned cosmetics are persisted in the existing guest/account save, keyed by season ID. Existing adventure inventory remains cooperative and client-saved, as before; this is not a payment or competitive anti-cheat system. A new season can use its own ID without overwriting earlier progress. Season configuration and the complete reward table are in `src/season.ts` and the exported public catalog.

## Backend and checks

`202610090001_first_light.sql` adds Solunelle to the authoritative battle/nursery catalog and validates and retains all eleven appearance fields in Champions snapshots. It preserves existing RPC permissions and account isolation. Applied to production on October 9, 2026; the SQL Editor returned **312 forms, Solunelle ready, appearance ready**.

Automated checks cover all 100 rewards, duplicates, full reserves, boost activation/expiry, seasonal boundaries, old and new saves, map gates, town service access, tall-grass placement, quiet sound envelopes, and PostgreSQL support for Solunelle and valid/invalid appearances. Browser checks use disposable localhost guest adventures, exercising creation, the menus, evolution, claiming Solunelle and world rendering.

## Generated artwork

`public/assets/solunelle.png` was generated with the built-in ImageGen tool, with a transparent background. The complete silhouette and alpha bounds were measured into `src/spriteFrames.json`; portraits and followers use the same aspect-preserving crop. Original generation prompt:

> Use case: stylized-concept. Create one original 2D creature-collector game sprite asset for Nuvori, named Solunelle, the exclusive Season 1 companion. A beautiful small celestial fox-dragon with ivory fur, deep indigo legs, elegant leaf-shaped ears, a broad curled tail made of layered translucent turquoise leaves with gold star tips, and a soft golden crescent growing between its ears. Charming and memorable, expressive teal eyes, confident playful three-quarter standing pose facing left, all four paws and complete tail visible. Polished hand-painted pixel-art-inspired fantasy RPG creature illustration, crisp dark colored outlines, restrained small-pixel highlights, readable silhouette, not photorealistic, no existing franchise characters. One creature only, centered occupying about 75 percent of a square canvas, generous empty transparent padding all around, no scene, no floor, no text, no border, no contact shadow. Genuine alpha transparent background.
