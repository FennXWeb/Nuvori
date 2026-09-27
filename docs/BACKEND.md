# Nuvori backend setup

## Provisioned services

- Game: <https://fennxweb.github.io/Nuvori/>
- Supabase project: [Nuvori](https://supabase.com/dashboard/project/uvnlmfpqonmccbaqxyzt), free plan, East US (Ohio).
- Google Cloud project: [nuvori-509916](https://console.cloud.google.com/auth/overview?project=nuvori-509916).
- Discord application: [Nuvori](https://discord.com/developers/applications/1553803905442250872/oauth2), application ID `1553803905442250872`.
- Provider callback: `https://uvnlmfpqonmccbaqxyzt.supabase.co/auth/v1/callback`.
- Google JavaScript origin: `https://fennxweb.github.io`.

Both SQL migrations are installed. The production site URL and exact redirect allowlist are configured. Realtime public channels are disabled. The project URL and public publishable key are set in the GitHub Actions repository variables and the ignored local `.env.local`. Unauthenticated REST access to player saves returns HTTP 401.

Google and Discord credentials have been entered by the project owner and both providers have completed end-to-end sign-in. Google is published for public sign-in, and account cloud saving has been verified. Two-player verification is in progress. Never put provider secrets in chat, source control, or the frontend environment. The privacy notice is served at `https://fennxweb.github.io/Nuvori/privacy.html`.

## Supabase

1. Create a free Supabase project. Enable the Data API and row-level security.
2. Run both files in `supabase/migrations/`, in filename order, in its SQL Editor.
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

## Security boundaries

Authenticated players share their chosen keeper name, avatar palette, current game location, companion, and temporary greeting. No email address is transmitted through Realtime. Saves are visible only to their owner via RLS.

Presence registers membership once per subscription. Movement uses private Broadcast, at most once per 450 ms while changing and a five-second heartbeat while idle. Joining players trigger fresh snapshots. Do not send movement through `track()`: Supabase closes clients that exceed five Presence updates per 30 seconds. Both Presence and Broadcast have authenticated read/write policies restricted to `nuvori:auralis`.

The current presence protocol is for friendly shared exploration and is not a trusted authority for player identity, movement, inventory, or battle outcomes. Add server-side validation and anti-abuse controls before competitive or transactional features.

References: [Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google), [Discord OAuth](https://supabase.com/docs/guides/auth/social-login/auth-discord), [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization), [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
