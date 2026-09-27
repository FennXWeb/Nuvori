# Nuvori

An original 2D creature-collection game for the browser. Explore Auralis, collect Nuvo, and choose how your companions evolve.

**Play:** https://fennxweb.github.io/Nuvori/

## Included

- Character creation, four outfit palettes, five starters, animated four-direction walking/sprinting, and a following lead Nuvo.
- Nine connected locations: three towns, four wild zones, and two landmark areas, with healing lodges, shops, discoveries, and a field journal.
- 25 original illustrated Nuvo families. Every family has two choices at level 12 and another two choices at level 26: **175 named playable forms** total.
- 100 moves across 10 elemental types, with unique particle configurations, physical/special/status classifications, power, accuracy, PP, priority, status effects, healing, and draining.
- Per-species starting moves, level-up learnsets, and tutor compatibility in the Nuvopedia and the downloadable [catalog](public/data/nuvori-catalog.json).
- Turn-based wild battles, six-Nuvo parties, reserve storage, capturing, experience, progression, items, and move tutoring.
- Rare **Prismatic** color variants at a 1/512 wild-encounter probability. Rarity persists through capture, saves, and evolution.
- Local guest saves; Supabase OAuth, per-account cloud saves, authenticated shared-world presence, visible remote keepers and companions, and greetings when the backend/providers are configured.
- Keyboard and touch controls, responsive layouts, optional synthesized sound effects, and reduced-motion styling.

This is an early-access game. Online play is cooperative shared-world exploration; battles and inventory are local simulations, not authoritative competitive gameplay. It does not include PvP, trading, or shared battles. Evolution forms currently use transformed family artwork and stage effects rather than 150 additional individual illustrations.

## Controls

| Input                  | Action                               |
| ---------------------- | ------------------------------------ |
| WASD / arrows          | Walk                                 |
| Hold Shift             | Sprint                               |
| E / Space              | Talk, heal, shop, examine            |
| M / B / J              | Map / satchel / journal              |
| Escape                 | Close a panel                        |
| Click / tap the ground | Walk there, routing around obstacles |

Walk along the signed exits to change areas. Step off the paths in wild zones to encounter Nuvo. Weaken a wild Nuvo before using a binding orb. The first healthy team member can be selected as your following companion. Town healing lodges are free.

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

## Accounts and online world

See [backend setup](docs/BACKEND.md). The client needs only a project URL and a public publishable/anon key. Never place a service-role key, database password, Google client secret, or Discord secret in this repository, browser bundle, or GitHub Pages.

The database migration enforces ownership with row-level security; guests cannot access cloud saves. Realtime presence uses a private channel limited to authenticated users. Account saves and guest saves use distinct local storage keys. Game inventory and movement are intentionally client-controlled for this cooperative early-access version; add an authoritative server before enabling economic transfers or competitive gameplay.

## Art

Logo, 25-creature atlas, world props, and explorer frames were generated with OpenAI's built-in Imagegen tool. Exact prompts are recorded in [art-prompts.json](docs/art-prompts.json). PNG alpha was verified, and atlas cells are normalized rather than rounded to an integer cell width. All source artwork is included in `public/assets`.

## Save data

Guest saves remain in this browser. Signing into an account loads a separate account adventure. Use Settings → Export adventure for a JSON backup. Clearing browser storage removes device-only saves. Connected accounts sync every 12 seconds and can save immediately from Settings.
