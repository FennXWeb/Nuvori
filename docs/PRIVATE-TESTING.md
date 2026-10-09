# Private testing

Production: `FennXWeb/Nuvori` (`origin`, public). Testing: `FennXWeb/Nuvori-Testing` (`testing`, private), branch `codex/testing`.

GitHub branches inherit repository visibility. A separate private repository is necessary to keep unfinished changes closed. This checkout's default push destination is `testing`, and its pre-push guard permits only `codex/testing` in that repository. See the standing user instruction in `AGENTS.md`.

Every testing push runs automated tests and a web build in the private repository. The workflow's downloadable `nuvori-private-web-build` artifact is retained for 14 days. It creates no public preview, Pages deployment, production tag, or release. The testing build has no online backend configuration unless separately provided; it supports guest play. Do not put a service-role key or provider secret in frontend configuration.

## Pending interface update

- Full-screen wild and trainer battles with move, satchel, crew and escape controls, keeper last-stand actions, animated actors, and keyboard focus handling.
- Shared jade/gold buttons, parchment panels, hover/press feedback, and a three-state SVG cursor with an optional click ripple.
- Generated Auralis map, region selection, local terrain maps, zoom and discovered-area travel. Fares are 35 coins plus 20 per graph connection. Confirmation precedes charging. Travel preserves crew health and cannot reach or leave Dream Land.
- Removed the blanket 1 HP revival after keeper victories/captures/escapes. Fallen Nuvo also remain at zero HP through level-ups and evolution; tonics cannot revive them. Wild and trainer encounters still offer keeper combat.
- Headwear attaches to the forehead/jaw frame and follows its bob/rotation, independent of long or spiky hair bounds.
- Cloud saves now update existing rows before creating missing rows. PostgreSQL runs `BEFORE INSERT` during an upsert even when the row exists; that triggered the nursery escrow guard and blocked nursery collection and the pre-League save. All database guards remain enabled. No database migration is needed.

The PostgreSQL test reproduces the old upsert failure and verifies the fixed save with nursery escrow, collection retry safety, stale-save rejection and lifetime capture limits. All 110 automated tests and the production build pass. Desktop battle, headwear and map/travel checks passed. Responsive visual refinement and final integrated review continue on this private branch. No user adventure or nursery visit was changed during these checks.

## Art

`public/assets/auralis-atlas.png` was generated with the built-in image generation tool and is included in this repository. See `ATLAS-IMAGE-PROMPT.txt` for the exact prompt. The cursor assets are code-authored SVGs: `cursor-trail.svg`, `cursor-bloom.svg`, and `cursor-press.svg`.
