export const HANDOFF_KEY = 'nuvori-desktop-handoff-v1';
export function desktopCallback(saved: string | null, query: string, now = Date.now()): string | null {
  if (!saved) return null;
  try {
    const data = JSON.parse(saved), params = new URLSearchParams(query);
    if (!Number.isInteger(data.port) || data.port < 1024 || data.port > 65535 || !/^[a-f0-9]{64}$/.test(data.state) || !Number.isFinite(data.expiresAt) || data.expiresAt < now || data.expiresAt > now + 300000) return null;
    const code = params.get('code'), failed = params.has('error');
    if (!failed && !/^[A-Za-z0-9_-]{16,2048}$/.test(code || '')) return null;
    const url = new URL(`http://127.0.0.1:${data.port}/complete/${data.state}`);
    url.searchParams.set(failed ? 'error' : 'code', failed ? 'denied' : code!);
    return url.href;
  } catch { return null; }
}
/** Run before importing the Supabase client: the PKCE verifier stays in the desktop app. */
export function completeDesktopLogin() {
  let saved: string | null = null;
  try { saved = sessionStorage.getItem(HANDOFF_KEY); } catch { return false; }
  const target = desktopCallback(saved, window.location.search);
  if (!target) return false;
  sessionStorage.removeItem(HANDOFF_KEY);
  history.replaceState(null, '', window.location.pathname);
  const main = document.createElement('main');
  main.className = 'desktop-login-complete';
  const heading = document.createElement('h1'); heading.textContent = 'Your adventure is waiting';
  const message = document.createElement('p'); message.textContent = 'Return to the Nuvori desktop game to finish signing in. Your browser adventure stays separate.';
  const link = document.createElement('a'); link.href = target; link.textContent = 'Return to Nuvori'; link.className = 'primary-button'; link.referrerPolicy = 'no-referrer';
  main.append(heading, message, link); document.getElementById('root')!.replaceChildren(main);
  return true;
}
