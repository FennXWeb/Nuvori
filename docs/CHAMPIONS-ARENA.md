# Champions League arena

Private testing update after 1.4.0. The five shared guardian trials now open in a full-screen celestial coliseum. Solo campaign guardian trials use the same environment, crest, entrance and jade/gold styling with their existing battle controls.

The shared screen includes four animated keeper stations, a segmented guardian health bar with trailing damage, guardian entrance and victory ceremonies, drifting lights, rotating seals, move trails, impact numbers, crew switching, room-code copying, a battle log, keeper last stands and rescue. Each guardian supplies its own accent color, name, location and crest. Lobby, active battle, victory and rescue all stay in the arena.

## Controls and authority

- Select abilities with the pointer or keys 1–4. The crew tab only permits healthy replacements. Escape skips the entrance, cancels the rescue confirmation, or returns to abilities; it does not abandon a room.
- The fullscreen button toggles browser fullscreen. The arena traps keyboard focus, restores it when closed and stops movement shortcuts from reaching the world. Browser reduced-motion preferences disable decorative CSS movement and simplify move effects.
- Existing Supabase RPCs still own damage, crew health, rewards and room membership. Animation cues derive from confirmed snapshots. Health changes follow impact cues, replacements follow fainting, and returning to a completed room cannot summon fallen actors. A keeper who has fallen remains a fallen keeper.
- The existing request lock, validation, two-second action interval, error reporting and retryable reward claim remain in place. No schema, progression, reward or save migration is required.

## Disposable preview

Run `npm run dev -- --mode beta --port 5190` and visit `/scripts/league-preview.html`. The small preview disclosure offers all five guardians, waiting/open rooms, crew defeat, keeper combat, victory, rescue, connection errors, a teammate action and a solo campaign trial. These fixtures make no account, save or RPC calls. The page is excluded from compiled game builds.

For fixed viewport checks, use `/scripts/league-preview.html?viewport=phone` or `?viewport=desktop`. Its toolbar switches between 390×844, 1440×900 and 844×390 iframe viewports.

## Validation

- 155 automated tests pass, including PostgreSQL multiplayer authorization/reward tests and new presentation tests for action availability, keeper health, rescue versus victory, initial/reconnected rooms, both kinds of faint/replacement sequence and all five solo guardian trials.
- TypeScript and the private beta build pass. The generated arena image is present in the compiled assets.
- The four-keeper active screen was visually inspected in Vivaldi at approximately 864×1255. A move correctly changed the shared guardian from 1400 to 1275 HP, the local companion from 175 to 135 HP and move energy from 20 to 19, then re-enabled the controls.
- Computer Use was stopped with the physical Escape key. Wide-screen, phone, landscape, reduced-motion and the remaining interactive fixture states have not received a final visual check. No live multiplayer accounts or saves were exercised.

## Artwork

`public/assets/champions-coliseum.png` was generated using the built-in ImageGen tool. The exact prompt and source identity are in `docs/champions-art-prompt.txt`. All particles, seals and interaction effects are drawn by the game.
