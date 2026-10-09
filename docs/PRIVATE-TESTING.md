# Private testing

Production: `FennXWeb/Nuvori` (`origin`, public). Testing: `FennXWeb/Nuvori-Testing` (`testing`, private), branch `codex/testing`.

GitHub branches inherit repository visibility. A separate private repository is necessary to keep unfinished changes closed. This checkout's default push destination is `testing`, and its pre-push guard permits only `codex/testing` in that repository. See the standing user instruction in `AGENTS.md`.

Every testing push runs automated tests and a beta web build in the private repository. The workflow's downloadable `nuvori-private-web-build` artifact is retained for 14 days. It creates no public preview, Pages deployment, production tag, or release. Beta mode explicitly disables online accounts and ignores production environment files; it supports guest play. Do not put a service-role key or provider secret in frontend configuration.

## Play beta in your browser

Double-click **Nuvori Play Beta.cmd**, or run `npm run beta`, then open the private launch link printed in the terminal. If World Studio is already running, click **Play Beta** in its header instead of starting a second server. GitHub CLI must be signed into FennXWeb, with this checkout on `codex/testing` and the testing repository private.

The beta lounge has **Build beta / Rebuild latest beta**, **Play beta**, a compiled commit/date, and a link back to World Studio. The first build requires a clean committed checkout. After publishing a world draft or pushing code changes, rebuild to play that commit. Rebuilding is local and does not publish anything. Unsaved or saved-but-unpublished world drafts are not included. Build failures preserve the previous playable game.

The full compiled game runs at `127.0.0.1:5188`, inside the lounge or its own tab, with fullscreen controls. This is a private local browser space, not an internet-hosted beta website. Keep the terminal running while playing. The studio/lobby uses port 5187; the game uses a separate origin with its own persistent guest saves. Progress survives rebuilds and server restarts in the same browser. Settings → Export adventure backs up that beta adventure. Clearing browser data removes local saves. A Codex browser panel and Chrome have separate storage.

The game requires a private launch capability exchanged for an HttpOnly session cookie. Both servers bind to loopback. The game server rejects unexpected hosts and unsafe paths. Restarting the launcher expires launch sessions; reopen from the lounge. Production Supabase accounts, chat, multiplayer, and cloud saves are disabled in beta mode so testing cannot write to the live adventure. A separate testing backend would be needed to test those features online.

Compiled builds and session details stay in ignored `.world-editor/beta/`. Each build has its own immutable directory so rebuilding cannot break assets in an already-running game. Previous builds are retained locally. The editor, launch keys, beta lounge, and local server are excluded from distributable game bundles.

## Pending interface update

- The Nuvopedia lists all 312 individual forms with distinct entry numbers, family/stage labels, exact-form completion, and caught/seen/not-caught filters. Battles and atlas habitat checkmarks use the same records.
- New captures and evolutions persist exact species IDs in `caughtForms`/`seenForms`; evolving preserves each prior form. Starter, collected nursery, and claimed reward Nuvo also count as obtained. Existing family progress remains for family objectives and pass rewards. No database migration is required: saves already store their JSON document intact.
- Legacy saves recover confirmed forms from crew, reserve, nursery parents, evolution notices, and the unambiguous lineage of starter/nursery companions. Pending offspring do not count. Old family-only flags cannot prove which branch or base was obtained, so they do not unlock forms without supporting records; missing historical forms cannot be fully reconstructed.
- `/scripts/guide-preview.html` is an in-memory local visual fixture showing an evolved starter, a directly captured evolved Nuvo, and a seen-only sibling. It never reads/writes a save and is excluded from compiled builds.

- Full-screen wild and trainer battles with move, satchel, crew and escape controls, keeper last-stand actions, animated actors, and keyboard focus handling.
- Shared jade/gold buttons, parchment panels, hover/press feedback, and a three-state SVG cursor with an optional click ripple.
- Generated Auralis map, region selection, local terrain maps, zoom and discovered-area travel. Fares are 35 coins plus 20 per graph connection. Confirmation precedes charging. Travel preserves crew health and cannot reach or leave Dream Land.
- Removed the blanket 1 HP revival after keeper victories/captures/escapes. Fallen Nuvo also remain at zero HP through level-ups and evolution; tonics cannot revive them. Wild and trainer encounters still offer keeper combat.
- Headwear attaches to the forehead/jaw frame and follows its bob/rotation, independent of long or spiky hair bounds.
- Cloud saves now update existing rows before creating missing rows. PostgreSQL runs `BEFORE INSERT` during an upsert even when the row exists; that triggered the nursery escrow guard and blocked nursery collection and the pre-League save. All database guards remain enabled. No database migration is needed.

The PostgreSQL test reproduces the old upsert failure and verifies the fixed save with nursery escrow, collection retry safety, stale-save rejection and lifetime capture limits. All 110 automated tests and the production build pass. Desktop battle, headwear and map/travel checks passed. Responsive visual refinement and final integrated review continue on this private branch. No user adventure or nursery visit was changed during these checks.

## Art

`public/assets/auralis-atlas.png` was generated with the built-in image generation tool and is included in this repository. See `ATLAS-IMAGE-PROMPT.txt` for the exact prompt. The cursor assets are code-authored SVGs: `cursor-trail.svg`, `cursor-bloom.svg`, and `cursor-press.svg`.
