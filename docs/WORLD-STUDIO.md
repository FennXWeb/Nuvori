# Nuvori World Studio

An owner-only local editor for all 21 existing cells and the five town interiors. Its output is consumed by the game, including terrain, collisions, objects, interactions, and encounters.

## Open your studio

Double-click **Nuvori World Studio.cmd** in the project folder, or run:

```sh
npm run world:editor
```

The desktop launcher opens the studio in your default browser; the npm command prints a private launch link to open. Leave the original server terminal running while editing. Reopening either launcher reuses the same verified session, so you can switch between World Studio and Play Beta without a port conflict. The studio uses port 5187 and checks that GitHub CLI is signed into **FennXWeb**, the checkout is on **codex/testing**, and the `testing` remote is the **private FennXWeb/Nuvori-Testing repository**. It fails closed if those checks cannot complete. Run `npm ci` first on a fresh checkout; Node 22+ and GitHub CLI are required.

The studio is a development tool on your computer, not a public game menu. No Supabase role or additional cloud credential is needed. The launch link is a short-lived capability for the current process; do not share it. Restarting the studio invalidates old links. API calls require that capability and a loopback client, exact host, and matching origin. Drafts and launch files are excluded from Git and denied by the development server. GitHub credentials remain in GitHub CLI; they never enter the browser or game build. Like any local tool, it trusts your OS account and anyone with access to its files.

## Design

- **Terrain:** round brushes, continuous strokes, rectangle painting, flood fill, and ten game materials. Paths and banks retain the game's blended rendering. Water, cliffs, and hedges block movement; grass and cave rubble trigger encounters.
- **Objects:** searchable visual library with town services, buildings, trees, decor, NPCs, and furniture. Place with a click, select and drag, duplicate, delete, snap to tiles, edit coordinates, labels, sizes, collision, and interactions. Choose a town interior to rearrange its furniture and counters.
- **Habitats:** default cell table plus rectangular overrides, with explicit names, bounds, and priority. Each entry chooses any eligible Nuvo form, a relative weight, and an inclusive level range of 1–50. The percentage shows the normalized weight within that table. Common / Uncommon / Rare / Ultra are weight shortcuts, not changes to a species' intrinsic rarity. The last overlapping area wins. Encounter rate applies per grass/rubble step, subject to the game's encounter cooldown. A town may have an explicitly enabled habitat if you paint encounter terrain there.
- **Navigation:** scroll to zoom, Space + drag or middle-drag to pan, minimap to navigate, Fit button, and independently visible artwork, objects, grid, collision, and habitat layers.
- **History:** up to 40 undo steps, redo, and Ctrl+D duplication. A paint stroke is one undo step. Ctrl+S saves a named draft.
- **Playtest:** an isolated keeper explores the current draft with normal movement, sprinting, collision, interiors, and sampled wild encounters. It never signs in, saves an adventure, changes your collection, or writes to Supabase. Encounters show a sample preview; they do not run progression battles.

Dreamweaver's lifetime male/female catch quota remains intact. Dream mythicals stay in Dream Land; Solunelle stays a pass exclusive. Cell IDs, dimensions, region connections, and fixed interior wall layouts are deliberately stable so current saves and online cell channels remain compatible. This version edits the existing cells; it does not create new online regions or upload arbitrary art.

## Drafts

Named drafts and an autosave are stored in `.world-editor/drafts/` on this computer. Drafts are not uploaded to GitHub. An autosave is offered for recovery after reopening; it never silently replaces the current beta. Export/import JSON to back up or move a design. Loading a saved draft preserves unsaved work as a separate draft first. Drafts may contain blocked paths while you are designing, but must have structurally valid data.

## Publish to beta

Choose **Publish to beta** to review affected cells and validation results, then confirm in the studio. Publishing:

1. Checks tile data, Nuvo tables, bounds, required town services, reachable exits/interactions, interior counters, and arrival positions. Empty or unreachable habitats are reported.
2. Rechecks the GitHub owner, private repository, and exact testing branch. Requires a clean checkout and rejects stale draft base revisions.
3. Saves a local backup of the previous beta world.
4. Writes `src/content/world.json`, runs regression tests and validates the authored world separately, then builds the game.
5. Commits **only that world-data file** and pushes to `testing/codex/testing`, without force. This draft-publishing action never updates main or the live game.

## Publish beta to main

Choose **Publish beta to main** in the top bar when the committed beta is ready for everyone. Restart World Studio after installing this feature so its local server loads the new release routes.

If the page has updated while the server is still running older code, the release review explains that a restart is needed. Save your draft, close the original World Studio terminal and reopen **Nuvori World Studio.cmd**. Reopening a launcher detects an incompatible server instead of silently reusing it. Saved drafts and beta adventures are preserved; use the new private launch link after restarting. Unknown API actions are reported as unsupported actions, rather than invalid world data.

1. Publish any world draft you want included with **Publish to beta**, then wait for its private GitHub validation to pass. Saved and unsaved drafts remain local until published to beta.
2. Open **Publish beta to main**. Review the current main and beta commit IDs, commit descriptions, changed files and full-diff link. This publishes the entire committed beta, including game code and artwork.
3. Check the confirmation naming the beta commit, then choose **Publish beta to main**. The studio rechecks ownership, repository identities, branch state, successful private CI, tests and the production build before pushing.
4. Follow **View deployment** to GitHub. The main workflow runs its own checks and deploys the web game. A successful push is reported separately from deployment completion.

The checkout must be clean, on `codex/testing`, and match the pushed private beta. Main must be an ancestor of beta. A changed branch, failed build, expired review or duplicate request cannot silently publish a different commit. Reviews expire after ten minutes and confirmation is consumed by each publication attempt, including failures. Refresh the review to retry. If main already contains beta, there is nothing to publish.

The pre-push guard stays enabled. Only the release process receives a one-command approval for the reviewed beta SHA, existing main SHA and exact public repository/main destination. Normal development pushes remain restricted to private testing. The publisher never force-pushes, switches your checkout, stages files, edits global Git settings, publishes native release tags, or applies database migrations. If a push connection fails, it checks the remote before reporting the outcome and never automatically retries.

Validation: all 167 automated tests, TypeScript, the beta build and a separate World Studio bundle pass. Publisher tests cover ownership, repository identity, CI failure, stale reviews, concurrent requests, failed checks, uncertain network outcomes and the actual pre-push guard. Static UI rendering covers confirmation, draft reminders and success/error states. No Computer Use or live production push was used to test this feature.

GitHub's private workflow creates the downloadable `nuvori-private-web-build` artifact. This is a branch/build publication, not public website hosting. Only built content goes into the game; neither editor entry point nor its backend is included in the production build.

Failed checks restore the prior world file. A failed upload preserves its local commit for retry: reload the studio, then publish again. A dirty checkout must be committed by the development workflow first. A revision conflict asks you to export your draft, reload the latest beta, import, and review before retrying. No automatic merge or overwrite is attempted.

## Verification

Automated coverage exercises authored geometry in actual collision checks, brush/fill boundaries, weighted zones and overlap, encounter levels, mythical restrictions, invalid imports, owner/origin/remote checks, backup creation, check/commit rollback, upload failure recovery, dirty worktrees, and stale revisions. The complete beta JSON is also validated on every test run; legacy regression fixtures use the unmodified procedural world.

## Play the full beta

The header's **Play Beta** button opens a dedicated private browser lounge. Build the latest committed beta, then launch the complete game, including battles and progression. Use **Playtest** for immediate isolated previews of an unpublished world draft; use **Play Beta** after publishing the world to test it in the full game. The beta has its own browser saves and no connection to production accounts. See [private testing](PRIVATE-TESTING.md) for launch and rebuild details.
