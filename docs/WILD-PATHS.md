# Wild Paths · 1.2.1

Auralis now has 20 connected public regions (five towns and 15 wild areas), plus the separately accessed Dream Land. Outdoor cells remain 72 × 52 tiles with the follow camera introduced in First Light.

## New routes

| Region | Connections | Exploration |
| --- | --- | --- |
| Brookbend Crossing | Mossbell Village, Bramble Labyrinth | Winding river, two timber crossings, meadows, working waterwheel |
| Bramble Labyrinth | Brookbend Crossing, Hollow Grove | Hedge switchbacks, optional outside route, Roseheart Court |
| Echohollow Caverns | Crystal Steps, Glassvein Tunnel | Crystal-lit chambers, underground pool and bridge, Singing Geode |
| Glassvein Tunnel | Echohollow Caverns, Tideglass Coast | Through-route beneath the mountain, branching mine galleries, flooded shaft |
| Lantern Lake | Threadhaven, Rimewind Pass | Separate grassy islands linked by boardwalks and bridges, boathouse |
| Rimewind Pass | Crownspire, Lantern Lake | Glacial river, high bridge, switchback terraces and stone stairways |

Existing wild areas also gain authored river, coast, marsh, canyon, ruin and maze layouts. Terrain graphics, map colors, collision and encounter eligibility share one cached tile model. Bridges have walkable decks; rivers, cave walls, cliffs and hedges are real obstacles. All route gates remain bidirectional. New landmark art is drawn on the existing canvas, including a turning waterwheel, rose arch, luminous geode, mine junction, boathouse and snowy cairn.

## Finding Nuvo

All 25 original base families now have at least two non-town, non-hidden encounter regions. Existing town pools are retained only to construct bonded trainer crews; towns cannot start wild encounters. Nuvopedia habitat strings are derived from the actual wild tables and inherited by evolved forms.

Tall grass is the outdoor encounter terrain. Loose gravel beds serve the same purpose underground. Paths, stairs and bridges are safe. The atlas lists each region's catchable families, level range, connecting trails and points of interest. Its minimap uses the same tile geometry. Mythical Dream Land access, Dreamweaver capture limits and the Season 1 Solunelle reward remain unchanged.

Existing saves retain their location unless it is covered by a new obstacle. In that case the keeper is placed on the nearest traversable tile reachable from the familiar junction. Collections, nursery visits and progression are unaffected. Six new trainer NPCs use the existing battle rules and region level ranges. Music reuses the existing Suno region cues; walking changes between grass, trail, wooden deck, cave stone and snow.

## Validation and deployment

- `tests/terrain.test.ts`: every family has multiple habitats; deterministic encounters match the tables; region links are reciprocal; all gates, trainers and landmarks are reachable; accessible grass/gravel exists in every wild area; water blocks movement and all bridge decks are reachable; maze walls force detours; blocked legacy positions are repaired.
- `tests/trails-db.test.ts`: PostgreSQL migration preserves old messages, allows all new channels and rejects unknown channels.
- All 82 automated checks and the production build pass. Browser checks verified bridge navigation, a real wild Jadeling encounter in cave gravel, the hedge maze, town-safe habitat text, the area atlas and the 20-region overview.
- Local browser fixtures: River crossing, Crystal cavern, Bramble maze, Lake islands and Mountain pass at `/qa.html` (development only).
- Production migration `202610090002_trail_expansion.sql` applied and verified on 2026-10-09. It expands the local-chat cell allowlist without altering access policies or rate limits.

This is a web release. No new Windows archive is published by this update.
