# Nuvori backend setup

## Supabase

1. Create a free Supabase project. Enable the Data API and row-level security.
2. Run `supabase/migrations/202609260001_nuvori.sql` in its SQL Editor.
3. Under Authentication → URL Configuration, set the site URL to `https://fennxweb.github.io/Nuvori/` and allow that exact redirect URL. For local development, additionally allow `http://127.0.0.1:5173/`.
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

Authenticated players share their chosen keeper name, avatar palette, current game location, companion, and temporary greeting. No email address is transmitted through Realtime presence. Saves are visible only to their owner via RLS.

The current presence protocol is for friendly shared exploration and is not a trusted authority for player identity, movement, inventory, or battle outcomes. Add server-side validation and anti-abuse controls before competitive or transactional features.

References: [Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google), [Discord OAuth](https://supabase.com/docs/guides/auth/social-login/auth-discord), [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization), [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
