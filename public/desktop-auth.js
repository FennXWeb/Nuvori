const home = 'https://fennxweb.github.io/Nuvori/';
const status = document.getElementById('status');
try {
  const params = new URLSearchParams(location.hash.slice(1));
  history.replaceState(null, '', location.pathname);
  const port = Number(params.get('port')), state = params.get('state'), raw = params.get('authorize');
  const url = new URL(raw), q = url.searchParams;
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || !/^[a-f0-9]{64}$/.test(state || '')
    || raw.length >= 1600 || url.origin !== 'https://uvnlmfpqonmccbaqxyzt.supabase.co' || url.pathname !== '/auth/v1/authorize' || url.username || url.password || url.hash
    || !['google', 'discord'].includes(q.get('provider')) || q.get('redirect_to') !== home
    || q.get('code_challenge_method')?.toLowerCase() !== 's256' || !/^[A-Za-z0-9_-]{43}$/.test(q.get('code_challenge') || '')) throw new Error('Invalid sign-in link.');
  sessionStorage.setItem('nuvori-desktop-handoff-v1', JSON.stringify({ port, state, expiresAt: Date.now() + 300000 }));
  location.replace(url.href);
} catch {
  status.textContent = 'This sign-in link is incomplete or expired. Please return to Nuvori and choose Google or Discord again.';
}
