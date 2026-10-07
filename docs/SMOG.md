# Nuvori for Windows and SMOG

The [publishing kit contract](SMOG-PUBLISHING-KIT.md) is implemented by the five root files: `smog_icon.ico`, `smog_logo.png`, `smog_header.png`, `smog_meta.xml` and `smog_launch.bat`. These are real files, not Git LFS pointers. The art was generated specifically for Nuvori with the built-in Imagegen tool; [exact prompts](smog-art/prompts.json) and the [icon source](smog-art/nuvori-icon-source.png) are committed. The latest owner-selected artwork is retained: a transparent 1200 × 300 logo, a 1600 × 700 header, and a 256 px ICO. The publishing kit recommends multiple icon sizes but also accepts this icon. Every file is under SMOG's 8 MB artwork limit.

## Build and publish

On Windows with Node.js 22 and the two public Supabase settings from `.env.example` configured:

```sh
npm ci
npm test
npm run export:catalog
npm run package:windows
python scripts/verify-smog-build.py
```

The output is `release/Nuvori-1.1.0-windows-x64.zip`, with `Nuvori.exe`, the bundled Chromium/Node runtime, `resources/app.asar` containing the compiled game and assets, and the five SMOG files at the ZIP root. Source uploads, `.env` files, provider secrets, and development fixtures are excluded. The BAT invokes the EXE directly and waits for its exit, allowing SMOG to track play time.

For a new release, update the versions in `package.json`, `package-lock.json` and `smog_meta.xml`, and update `RELEASE-NOTES.md`. Merge to `main`, wait for the Pages workflow (the browser sign-in relay must be deployed), then tag that commit `v<version>` and push the tag. `.github/workflows/release.yml` tests, compiles, validates, and publishes a non-prerelease GitHub Release with the ZIP and SHA-256 checksum. Build outputs belong in Releases; source, packaging scripts and SMOG files belong in Git.

## Saves and online accounts

Electron's profile is explicitly stored at `%APPDATA%\FennXWeb\Nuvori`, independent of SMOG's installation/version directory. Guest saves, cloud account caches, authentication sessions, and audio settings persist across upgrades. Existing browser guest saves remain separate. A connected account retrieves its existing cloud adventure after login. Export adventures from keeper settings before resetting app data.

The app uses a stable `nuvori://game/` local origin and loads the compiled files from the release. Guest gameplay works offline. Internet access is needed for accounts, multiplayer, friends, chat, and the League. Website update prompts are disabled in the desktop app because SMOG manages complete builds.

Google and Discord use the default browser and Supabase PKCE. A relay stores only a short-lived loopback port and random nonce in browser session storage, sends the user to the existing provider flow, and intercepts the return before the web Supabase client loads. Clicking **Return to Nuvori** sends the one-use authorization code to a loopback-only receiver. The desktop app exchanges it with its own PKCE verifier; access/refresh tokens and provider secrets never appear in the relay URL. The existing exact production redirect URL is reused, so no provider credentials or Supabase allowlist changes are required.

The renderer is sandboxed with Node integration disabled. The bridge exposes only the validated sign-in operation, IPC accepts the main game frame, bundled asset paths are constrained, external destinations are allowlisted, and login listeners expire after five minutes. Unrequested device permissions are denied. Security references: [Electron protocol](https://www.electronjs.org/docs/latest/api/protocol), [Electron security](https://www.electronjs.org/docs/latest/tutorial/security), and [Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

The build currently has no Windows code-signing certificate. It is an early-access game release, published as a regular GitHub Release so SMOG can discover it.

## Validation for 1.0.0

All 59 gameplay, audio, rendering and desktop regression tests passed. The portable archive passed the kit verifier and SMOG's own metadata parser, ZIP extractor and launcher discovery. Its ASAR contains the compiled game and assets, with no `.env` files or runtime `node_modules`. The executable created the Nuvori title window. Interactive desktop gameplay and real provider sign-in were not completed: the owner chose to publish using automated checks after the app-control permission timed out. The PKCE receiver, callback validation, expiry and destination restrictions are covered by automated tests.

## Validation for 1.1.0

All 67 regression checks pass, including the new nursery PostgreSQL tests and sprite bounds for 311 forms. The live backend has the nursery RPC and updated catalog. Browser checks exercise cross-branch pairing, persistent timers, cancellation, collection and the new evolution navigator. The release workflow validates the compiled archive against the SMOG kit. Native interactive testing remains limited as described above.
