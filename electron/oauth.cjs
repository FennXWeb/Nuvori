const http = require('node:http');
const { randomBytes } = require('node:crypto');
const { WEB_HOME, isAuthorizeUrl } = require('./security.cjs');

// One short-lived, loopback-only receiver. No provider secret or access token passes through it.
async function createOAuthHandoff(authorizeUrl, timeoutMs = 300000) {
  if (!isAuthorizeUrl(authorizeUrl)) throw new Error('Unsupported sign-in request.');
  const state = randomBytes(32).toString('hex');
  let resolve, reject, timer, finished = false, port;
  const completion = new Promise((yes, no) => { resolve = yes; reject = no; });
  completion.catch(() => {});
  function finish(error, code) {
    if (finished) return;
    finished = true; clearTimeout(timer); server.close();
    if (error) reject(error); else resolve(code);
  }
  const server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'");
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (req.method !== 'GET' || req.headers.host !== `127.0.0.1:${port}` || req.url.length > 4096) { res.writeHead(400); res.end(); return; }
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (finished || url.pathname !== `/complete/${state}`) { res.writeHead(404); res.end(); return; }
    const code = url.searchParams.get('code');
    const failed = url.searchParams.has('error');
    if (!failed && !/^[A-Za-z0-9_-]{16,2048}$/.test(code || '')) { res.writeHead(400); res.end(); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><meta charset="utf-8"><title>Nuvori sign-in</title><body style="background:#102e32;color:#f6f1df;font:20px system-ui;padding:10vw"><h1>Return to Nuvori</h1><p>Your sign-in response has been sent to the game. You can close this tab.</p></body>');
    finish(failed ? new Error('Sign-in was cancelled or declined. Please try again.') : null, code);
  });
  server.requestTimeout = 10000; server.headersTimeout = 10000;
  await new Promise((yes, no) => { server.once('error', no); server.listen(0, '127.0.0.1', yes); });
  port = server.address().port;
  server.on('error', error => finish(error));
  timer = setTimeout(() => finish(new Error('Sign-in timed out. Please try again.')), timeoutMs);
  const relay = new URL('desktop-auth.html', WEB_HOME);
  relay.hash = new URLSearchParams({ authorize: authorizeUrl, port: String(port), state }).toString();
  return { url: relay.href, completion, close: () => finish(new Error('Sign-in closed.')) };
}
module.exports = { createOAuthHandoff };
