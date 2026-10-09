# Nuvori

An original 2D creature-collection game for the browser. Explore Auralis, collect Nuvo, and choose how your companions evolve.

**Play:** https://fennxweb.github.io/Nuvori/

**Windows / SMOG:** [Download the portable build](https://github.com/FennXWeb/Nuvori/releases/latest), or add `FennXWeb/Nuvori` in SMOG. Extract the full ZIP and run `smog_launch.bat` to play without installing Node.js. Desktop saves live in `%APPDATA%\FennXWeb\Nuvori`. F11 toggles fullscreen. See [Windows publishing](docs/SMOG.md).

See [First Light](docs/FIRST-LIGHT.md) for the full-screen world, expanded character studio, evolution cinema and free 100-tier seasonal pass.

## Included

- Character creation, four outfit palettes, five starters, animated four-direction walking/sprinting, and a following lead Nuvo.
- Fourteen connected regions with five towns, unique landmarks, trainers, and a hidden Dream Land. The new frontier includes Saffron Expanse, Threadhaven, Mirelight Fen, Tempest Shelf, and Crownspire.
- **28 Nuvo families and 312 playable forms**, each with illustrated portraits and animated follower gaits. The five starters span five stages with choices at the first, third and final evolution (levels 12, 22, 34 and 44). Other families have varied depths and branch patterns.
- Male and female Nuvo, plus walkable nurseries in all five towns. Breed opposite-sex companions from the same family, including different branches, for a level-1 base-form offspring. Rarity, parent levels and stages determine the wait; online visits persist on the account and use the server clock.
- Mythical Dreamweaver has **85 forms across four stages**: 1 → 4 → 16 → 64. Each adventure can catch one wild male and one wild female; nursery descendants do not reset or consume that lifetime allowance. Oneirune remains a separate mythical family.
- 100 moves across 10 elemental types, with unique particle configurations, physical/special/status classifications, power, accuracy, PP, priority, status effects, healing, and draining.
- Per-species starting moves, level-up learnsets, and tutor compatibility in the Nuvopedia and the downloadable [catalog](public/data/nuvori-catalog.json).
- Turn-based wild and trainer battles, six-Nuvo parties, reserve storage, capturing, progression, items, and move tutoring. Drag the bottom crew to reorder it; the far-left member leads. Other crew members receive 20% of active-member battle XP.
- Five Champions League guardians with 900–3,400 HP. Sign in and battle solo or in four-player rooms, with shared boss health, individual crew actions, room codes, resumable trials, and crest rewards.
- Six orb types: Binding, Verdant, Tide, Dusk, Swift, and Prism, with different capture affinities.
- Walkable clothing stores and barbers with six owned outfits, six hairstyles, and six hair colors.
- A keeper last stand when the entire crew faints. Keeper defeat normally restores the crew at the last Healing Lodge; a 1-in-10,000 roll instead awakens them in Dream Land, where Oneirune and Dreamweaver can appear and be caught.
- New-release detection with a save-and-apply popup, deferred until the current battle or activity ends.
- Rare **Prismatic** color variants at a 1/512 wild-encounter probability. Rarity persists through capture, saves, and evolution.
- Local guest saves; Supabase OAuth, per-account cloud saves, authenticated shared-world presence, visible remote keepers and companions, and greetings when the backend/providers are configured.
- Keyboard and touch controls, responsive layouts, five Suno music themes, 100 generated sound effects, four ambience loops, and reduced-motion styling.
- Previously caught badges in wild encounters and the Nuvopedia; animated evolution-ready choices that can be deferred.
- Persistent friend requests, friend codes, blocking, and direction markers for off-screen friends in the same area.
- Global and area-local text chat, including separate lodge/shop channels, message limits, and blocked-user filtering.
- Walkable Healing Lodge and Supply Shop interiors with counters, NPCs, furniture, exits, and your following Nuvo.
- A free daily wheel with eight rewards, midnight UTC reset, and account-wide claim enforcement.

This is an early-access cooperative game. Champions League rooms, battle actions, shared boss health, and reward claims run in PostgreSQL. Ordinary battles and inventory remain client-controlled, so this is not an authoritative competitive economy. PvP and trading are not included.

## Controls

| Input                  | Action                               |
| ---------------------- | ------------------------------------ |
| WASD / arrows          | Walk                                 |
| Hold Shift             | Sprint                               |
| E / Space              | Talk, heal, shop, examine            |
| M / B / J              | Map / satchel / journal              |
| Escape                 | Close a panel                        |
| Click / tap the ground | Walk there, routing around obstacles |
| Drag crew / Alt + arrows | Reorder the crew; far left is active |

Walk along the signed exits to change areas. Step off the paths in wild zones to encounter Nuvo. Weaken a wild Nuvo before using a binding orb. The far-left crew member is your following companion; battles use the first healthy member. Town healing lodges are free.

## Development

Node.js 22 or later is recommended.

```sh
npm ci
npm run dev
npm test
npm run export:catalog
npm run build
```

The production bundle uses a relative base so GitHub Pages project URLs work. `.github/workflows/deploy.yml` runs the gameplay/data checks, exports the catalog, builds, and publishes Pages on updates to `main`.

Local visual test fixtures are available at `/qa.html` on the Vite development server. They replace only the localhost guest save and are excluded from the production build. Database regression checks are in `supabase/tests/community.sql` and `supabase/tests/league.sql`; both roll back their fixtures. `npm test` runs the League migrations and integration checks against an isolated PGlite PostgreSQL database. Regenerate the server species/move/guardian catalog with `npx tsx scripts/export-league.ts` when balance data changes, then apply the generated migration.

## Accounts and online world

See [backend setup](docs/BACKEND.md). The client needs only a project URL and a public publishable/anon key. Never place a service-role key, database password, Google client secret, or Discord secret in this repository, browser bundle, or GitHub Pages.

The database migration enforces ownership with row-level security; guests cannot access cloud saves. Realtime presence uses a private channel limited to authenticated users. Account saves and guest saves use distinct local storage keys. Game inventory and movement are intentionally client-controlled for this cooperative early-access version; add an authoritative server before enabling economic transfers or competitive gameplay.

## Art

Logo, creature atlases, world props, and explorer frames were generated with OpenAI's built-in Imagegen tool. Exact prompts are recorded in [original art](docs/art-prompts.json), [expansion art](docs/EXPANSION-ART.md), [final evolution art](docs/EXPANSION-ART-FINALS.md), and [nursery and Dreamweaver art](docs/nursery-art-prompts.json). The nursery update adds 50 starter evolutions and all 85 Dreamweaver forms. PNG alpha and full silhouette bounds are checked automatically. All source artwork is included in `public/assets`.

## Save data

Guest saves remain in this browser. Signing into an account loads a separate account adventure. Use Settings → Export adventure for a JSON backup. Clearing browser storage removes device-only saves. Connected accounts sync every 12 seconds and can save immediately from Settings. Opening the same adventure in another tab pauses the older tab to prevent stale autosaves from overwriting progress.
