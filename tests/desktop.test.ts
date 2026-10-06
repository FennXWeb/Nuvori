import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { desktopCallback } from '../src/desktopHandoff';
import { createClient } from '@supabase/supabase-js';
const require = createRequire(import.meta.url);
const { assetPath, isAuthorizeUrl, externalUrl, WEB_HOME, AUTH_ORIGIN } = require('../electron/security.cjs');
const { createOAuthHandoff } = require('../electron/oauth.cjs');
const authorize = (provider = 'google') => `${AUTH_ORIGIN}/auth/v1/authorize?${new URLSearchParams({ provider, redirect_to: WEB_HOME, code_challenge: 'a'.repeat(43), code_challenge_method: 's256' })}`;

test('installed Supabase SDK produces authorization URLs accepted by the desktop bridge', async () => {
  const client = createClient(AUTH_ORIGIN, 'test-public-key', { auth: { flowType: 'pkce', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  for (const provider of ['google', 'discord'] as const) {
    const { data, error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo: WEB_HOME, skipBrowserRedirect: true } });
    assert.equal(error, null);
    assert.ok(isAuthorizeUrl(data.url), provider);
  }
});

test('desktop serves only game-origin assets contained in the bundled directory', () => {
  const root = path.resolve('dist');
  assert.equal(assetPath(root, 'nuvori://game/'), path.join(root, 'index.html'));
  assert.equal(assetPath(root, 'nuvori://game/audio/music/title.mp3?v=1'), path.join(root, 'audio/music/title.mp3'));
  for (const url of ['file:///secret', 'nuvori://other/index.html', 'nuvori://user@game/index.html', 'nuvori://game/%2e%2e%2fsecret', 'nuvori://game/%5csecret', 'nuvori://game/a:stream', 'nuvori://game/.env', 'nuvori://game/%00', 'nuvori://game/%xx']) assert.equal(assetPath(root, url), null, url);
});
test('desktop only launches approved browser destinations and PKCE authorization requests', () => {
  assert.ok(isAuthorizeUrl(authorize())); assert.ok(isAuthorizeUrl(authorize('discord')));
  for (const url of [authorize('other'), authorize().replace(AUTH_ORIGIN, 'https://evil.example'), authorize().replace('s256', 'plain'), authorize().replace('redirect_to=', 'other='), 'file:///C:/Windows/notepad.exe', null]) assert.equal(isAuthorizeUrl(url), false);
  assert.equal(externalUrl('nuvori://game/audio/studio.html'), WEB_HOME + 'audio/studio.html');
  assert.equal(externalUrl('nuvori://game/privacy.html'), WEB_HOME + 'privacy.html');
  assert.equal(externalUrl('https://evil.example'), null);
  assert.equal(externalUrl('file:///C:/Windows/notepad.exe'), null);
});
test('browser callback accepts only fresh loopback handoffs and never relays access tokens', () => {
  const now = 1000000, data = { port: 54321, state: 'a'.repeat(64), expiresAt: now + 10000 }, code = 'test-code-1234567890';
  const url = desktopCallback(JSON.stringify(data), '?code=' + code, now)!;
  assert.equal(new URL(url).origin, 'http://127.0.0.1:54321');
  assert.equal(new URL(url).searchParams.get('code'), code);
  assert.ok(desktopCallback(JSON.stringify(data), '?error=access_denied', now)?.endsWith('?error=denied'));
  for (const altered of [{ ...data, port: 80 }, { ...data, port: 65536 }, { ...data, state: '../escape' }, { ...data, expiresAt: now - 1 }, { ...data, expiresAt: now + 999999 }]) assert.equal(desktopCallback(JSON.stringify(altered), '?code=' + code, now), null);
  assert.equal(desktopCallback(JSON.stringify(data), '?access_token=secret', now), null);
  assert.equal(desktopCallback('invalid json', '?code=' + code, now), null);
});
test('desktop OAuth receiver rejects incorrect state and completes exactly one valid callback', async t => {
  const handoff = await createOAuthHandoff(authorize()); t.after(() => handoff.close());
  const relay = new URL(handoff.url), fragment = new URLSearchParams(relay.hash.slice(1));
  assert.equal(relay.origin + relay.pathname, WEB_HOME + 'desktop-auth.html');
  assert.equal(fragment.get('authorize'), authorize());
  const base = `http://127.0.0.1:${fragment.get('port')}`;
  assert.equal((await fetch(base + '/complete/incorrect?code=test-code-1234567890')).status, 404);
  assert.equal((await fetch(base + '/complete/' + fragment.get('state') + '?code=bad')).status, 400);
  const result = await fetch(base + '/complete/' + fragment.get('state') + '?code=test-code-1234567890');
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(await handoff.completion, 'test-code-1234567890');
});
test('desktop OAuth expires and rejects unsupported providers without opening a listener', async () => {
  await assert.rejects(createOAuthHandoff(authorize('other')), /Unsupported/);
  const handoff = await createOAuthHandoff(authorize(), 20);
  await assert.rejects(handoff.completion, /timed out/);
  handoff.close();
});
