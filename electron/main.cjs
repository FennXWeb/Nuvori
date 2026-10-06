const { app, BrowserWindow, Menu, protocol, net, session, ipcMain, shell, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { GAME_ORIGIN, isGameUrl, assetPath, externalUrl } = require('./security.cjs');
const { createOAuthHandoff } = require('./oauth.cjs');

app.setName('Nuvori');
// Stable across release ZIPs and independent of the install directory.
const profile = path.join(app.getPath('appData'), 'FennXWeb', app.commandLine.hasSwitch('qa-profile') ? 'Nuvori-QA' : 'Nuvori');
fs.mkdirSync(profile, { recursive: true });
app.setPath('userData', profile);
app.setPath('sessionData', profile);
protocol.registerSchemesAsPrivileged([{ scheme: 'nuvori', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
let window, handoff, signingIn = false;
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
  app.whenReady().then(async () => {
    const root = path.join(app.getAppPath(), 'dist');
    protocol.handle('nuvori', async request => {
      const file = assetPath(root, request.url);
      if (request.method !== 'GET' || !file || !fs.existsSync(file) || !fs.statSync(file).isFile()) return new Response('Not found', { status: 404 });
      const response = await net.fetch(pathToFileURL(file).href);
      const headers = new Headers(response.headers);
      headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' blob:; connect-src 'self' https://uvnlmfpqonmccbaqxyzt.supabase.co wss://uvnlmfpqonmccbaqxyzt.supabase.co; object-src 'none'; base-uri 'self'; frame-src 'none'");
      return new Response(response.body, { status: response.status, headers });
    });
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    Menu.setApplicationMenu(null);
    window = new BrowserWindow({
      width: 1440, height: 960, minWidth: 900, minHeight: 650, show: false,
      title: `Nuvori ${app.getVersion()}`, backgroundColor: '#eff3e9',
      icon: path.join(app.isPackaged ? path.dirname(process.execPath) : app.getAppPath(), 'smog_icon.ico'),
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true },
    });
    window.once('ready-to-show', () => window.show());
    window.webContents.on('will-navigate', (event, url) => {
      if (!isGameUrl(url)) { event.preventDefault(); const allowed = externalUrl(url); if (allowed) void shell.openExternal(allowed); }
    });
    window.webContents.setWindowOpenHandler(({ url }) => {
      const allowed = externalUrl(url); if (allowed) void shell.openExternal(allowed);
      return { action: 'deny' };
    });
    window.webContents.on('will-attach-webview', event => event.preventDefault());
    window.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && input.key === 'F11') { event.preventDefault(); window.setFullScreen(!window.isFullScreen()); }
    });
    ipcMain.handle('nuvori:sign-in', async (event, url) => {
      if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || !isGameUrl(event.senderFrame.url)) throw new Error('Untrusted sign-in request.');
      if (signingIn) throw new Error('Finish the sign-in already open in your browser, or try again in five minutes.');
      signingIn = true;
      try { handoff = await createOAuthHandoff(url); await shell.openExternal(handoff.url); const code = await handoff.completion; window.show(); window.focus(); return code; }
      finally { handoff?.close(); handoff = undefined; signingIn = false; }
    });
    await window.loadURL(`${GAME_ORIGIN}/`);
  }).catch(error => { dialog.showErrorBox('Nuvori could not start', error.message); app.quit(); });
  app.on('window-all-closed', () => { handoff?.close(); app.quit(); });
}
