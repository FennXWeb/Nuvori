# Nuvori backend setup

## Provisioned services

- Game: <https://fennxweb.github.io/Nuvori/>
- Supabase project: [Nuvori](https://supabase.com/dashboard/project/uvnlmfpqonmccbaqxyzt), free plan, East US (Ohio).
- Google Cloud project: [nuvori-509916](https://console.cloud.google.com/auth/overview?project=nuvori-509916).
- Discord application: [Nuvori](https://discord.com/developers/applications/1553803905442250872/oauth2), application ID `1553803905442250872`.
- Provider callback: `https://uvnlmfpqonmccbaqxyzt.supabase.co/auth/v1/callback`.
- Google JavaScript origin: `https://fennxweb.github.io`.

All migrations are installed, including friends, chat, the daily wheel, Champions League and the nursery. On 2026-10-07, the paused free project was restored and `202610070001_nursery_catalog.sql` plus `202610070002_nursery.sql` were applied in one transaction. The SQL Editor confirmed 311 Nuvo forms and one nursery RPC. The live catalog also contains five guardians and 100 moves. The production site URL and exact redirect allowlist are configured. Realtime public channels are disabled. The project URL and public publishable key are set in the GitHub Actions repository variables and the ignored local `.env.local`. Unauthenticated REST access to player saves returns HTTP 401.

Google and Discord credentials have been entered by the project owner and both providers have completed end-to-end sign-in. Google is published for public sign-in. Account cloud saving and loading have been verified. Two independent accounts, signed in through Google in Chrome and Discord in Codex's browser, both showed two online keepers, listed each other, and rendered their companions and live movement in Mossbell Village after the Broadcast fix. Never put provider secrets in chat, source control, or the frontend environment. The privacy notice is served at `https://fennxweb.github.io/Nuvori/privacy.html`.

## Supabase

1. Create a free Supabase project. Enable the Data API and row-level security.
2. Run all files in `supabase/migrations/`, in filename order, in its SQL Editor.
3. Under Authentication → URL Configuration, set the site URL to `https://fennxweb.github.io/Nuvori/` and allow that exact redirect URL. For local development, additionally allow `http://127.0.0.1:5173/`. In Realtime settings, disable **Allow public access** so channels require authorization.
4. In Authentication → Sign In / Providers, configure Google and Discord using provider-owned OAuth applications.
5. Google: create a web OAuth client and consent screen. Set its authorized redirect URI to `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`. Enter the client ID and secret in Supabase's Google provider settings. In testing mode, add the intended test users; publish the consent screen for public availability.
6. Discord: create an application in the Discord Developer Portal. Add the same Supabase callback URL under OAuth2 → Redirects. Enter that application's client ID and secret into Supabase's Discord provider settings.
7. Read the project URL and public publishable (or legacy anon) key from the project's API settings. Put these into local `.env.local` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
8. Add the same two public values as GitHub Actions **repository variables**, then run the Pages workflow. These are browser-visible values; row-level security provides data protection.

Secrets belong only in Supabase/provider settings. The app uses PKCE and permits Supabase to handle OAuth code exchange. Both provider client secrets are required to make both sign-in buttons operational.

## Verification

- Sign in through each configured provider, create a keeper, move, and save.
- Open a second independent signed-in session and verify both keepers appear in the online list and the same region.
- Sign out and verify that the device's guest adventure loads instead of the account save.
- Confirm unauthenticated REST access cannot read `keeper_saves`; a user must be unable to read or update another user's row.

## Champions League

The frontier migrations create private, RLS-protected raid, member, action, and balance-catalog tables. Authenticated RPCs create/join rooms, transfer lobby hosting, start trials, apply moves, resume membership, and claim results. A room accepts up to four players from the guardian's town and expires after 90 minutes. Row locks serialize boss damage, a two-second per-player cooldown limits actions, and action nonces prevent duplicate execution. Users cannot read raids they have not joined. Blocks exclude room joins and public room listings.

The server snapshots each entrant's cloud crew and validates equipped moves, levels, HP, and PP against its catalog. It calculates guardian damage, retaliation, fainting, switching, keeper last stands, and rewards. Finished claims update the owner's cloud save atomically and are idempotent. A save trigger prevents a stale device from erasing a completed claim. The frontend suspends ordinary autosaves while a raid is open and restores unclaimed trials after reload. Source crew progression and inventory remain client-controlled; the League is cooperative, not a competitive anti-cheat system.

`npm test` runs `supabase/tests/league.sql` against PGlite with synthetic accounts, including room limits, membership authorization, cooldowns, duplicate actions/claims, shared damage, crew XP, host transfer, rescue, and table privileges. The same SQL file passed in the live SQL Editor on 2026-09-27. Its entire fixture transaction rolled back; no synthetic accounts, trials, chat messages, or rewards were retained.

## Security boundaries

Community tables have RLS enabled and no direct client grants. The authenticated `nuvori_*` RPCs expose chosen keeper profiles, each participant's friendships, each user's block list, bounded chat history, and daily rewards. Function search paths are fixed and anonymous execution is revoked. Profiles never contain provider names, emails, or avatars. Friend requests require recipient acceptance; blocked pairs cannot request each other. Outgoing requests are limited to five per minute and 25 pending.

Chat has global and local channels. Local uses the area ID plus an optional `:lodge`, `:shop`, `:tailor`, `:barber`, or `:nursery` suffix, so different interiors have distinct feeds. These are public game spaces for signed-in players, not private conversations. The server limits messages to 240 characters and one message per two seconds across channels, using a per-user transaction lock. The UI polls visible chat every 2.5 seconds and friendships every five seconds. Blocking filters messages in both directions. History and relationships persist; no automatic retention job is installed.

Daily gifts are free and have no monetary value. Each of eight prizes has equal probability. Signed-in claims use a unique account/UTC-date row and a transaction on the account save, making retries idempotent. A save trigger preserves the latest gift when a stale device save is uploaded. Guests use a local day marker. Inventory remains client-controlled outside this claim mechanism.

`supabase/tests/community.sql` checks friend authorization, blocking, channel isolation, message rate limits, duplicate claims, stale saves, and role privileges using transaction-scoped fixtures that roll back. These checks passed against the configured project.

Authenticated players share their chosen keeper name, avatar palette, outfit, hairstyle/color, current game location, companion, and temporary greeting. No email address is transmitted through Realtime. Saves are visible only to their owner via RLS.

Presence registers membership once per subscription. Movement uses private Broadcast, at most once per 450 ms while changing and a five-second heartbeat while idle. Joining players trigger fresh snapshots. Do not send movement through `track()`: Supabase closes clients that exceed five Presence updates per 30 seconds. Both Presence and Broadcast have authenticated read/write policies restricted to `nuvori:auralis`.

The current presence protocol is for friendly shared exploration and is not a trusted authority for player identity, movement, inventory, or battle outcomes. Add server-side validation and anti-abuse controls before competitive or transactional features.

References: [Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google), [Discord OAuth](https://supabase.com/docs/guides/auth/social-login/auth-discord), [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization), [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Nursery

`nuvori_nursery` starts, cancels and collects visits under the signed-in account and a locked save row. The server validates both parents, creates a level-1 base-form offspring, computes the rarity/level/stage timer, and returns parents and offspring atomically. A trigger protects visits, collection receipts, established companion sex and the lifetime Dreamweaver capture ledger from stale uploads. Anonymous RPC execution is revoked. See [nursery rules](NURSERY.md) and `tests/nursery-db.test.ts` for the formula and isolated PostgreSQL regression checks.
