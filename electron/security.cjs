const path = require('node:path');

const GAME_ORIGIN = 'nuvori://game';
const WEB_HOME = 'https://fennxweb.github.io/Nuvori/';
const AUTH_ORIGIN = 'https://uvnlmfpqonmccbaqxyzt.supabase.co';

function isGameUrl(value) {
  try { const u = new URL(value); return u.protocol === 'nuvori:' && u.host === 'game' && !u.username && !u.password; }
  catch { return false; }
}
function assetPath(root, value) {
  if (!isGameUrl(value)) return null;
  try {
    const name = decodeURIComponent(new URL(value).pathname);
    if (/[\\\x00:]/.test(name) || name.split('/').some(part => part === '..' || part.startsWith('.'))) return null;
    const resolved = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
    const relative = path.relative(root, resolved);
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? resolved : null;
  } catch { return null; }
}
function isAuthorizeUrl(value) {
  try {
    const u = new URL(value), q = u.searchParams;
    return value.length < 1600 && u.origin === AUTH_ORIGIN && u.pathname === '/auth/v1/authorize' && !u.username && !u.password && !u.hash
      && ['google', 'discord'].includes(q.get('provider')) && q.get('redirect_to') === WEB_HOME
      && q.get('code_challenge_method')?.toLowerCase() === 's256' && /^[A-Za-z0-9_-]{43}$/.test(q.get('code_challenge') || '');
  } catch { return false; }
}
function externalUrl(value) {
  try {
    if (isGameUrl(value)) {
      const u = new URL(value);
      if (!['/privacy.html', '/audio/studio.html'].includes(u.pathname)) return null;
      return new URL(u.pathname.slice(1), WEB_HOME).href;
    }
    const u = new URL(value);
    return u.origin === new URL(WEB_HOME).origin && u.pathname.startsWith('/Nuvori/') && !u.username && !u.password ? u.href : null;
  } catch { return null; }
}
module.exports = { GAME_ORIGIN, WEB_HOME, AUTH_ORIGIN, isGameUrl, assetPath, isAuthorizeUrl, externalUrl };
