// Godmarrow, the desktop app: one window running the game (index.html beside this file), nothing else.
// F11 or Alt+Enter toggles full screen; the window's size and full screen are remembered. Saves live in the app's own
// storage (the same localStorage the browser used, now private to the app).
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path'), fs = require('fs');
// let the GPU do the drawing, and never slow the game down when the window loses focus
for (const s of ['ignore-gpu-blocklist', 'enable-gpu-rasterization', 'enable-zero-copy', 'disable-background-timer-throttling', 'disable-renderer-backgrounding', 'disable-backgrounding-occluded-windows']) app.commandLine.appendSwitch(s);
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
Menu.setApplicationMenu(null);
const cfgFile = () => path.join(app.getPath('userData'), 'window.json');
const readCfg = () => { try { return JSON.parse(fs.readFileSync(cfgFile(), 'utf8')); } catch (e) { return {}; } };
// Steam Deck (and Steam's Game Mode in general) starts in full screen
const onDeck = process.platform === 'linux' && !!(process.env.SteamDeck || process.env.SteamAppId || process.env.SteamGameId || process.env.STEAM_COMPAT_APP_ID);
function start() {
  const cfg = readCfg();
  const win = new BrowserWindow({
    width: cfg.w || 1600, height: cfg.h || 900, minWidth: 960, minHeight: 540, fullscreen: cfg.fs != null ? cfg.fs : onDeck,
    backgroundColor: '#050407', title: 'Godmarrow', show: false, autoHideMenuBar: true,
    webPreferences: { backgroundThrottling: false, contextIsolation: true, sandbox: true, spellcheck: false }
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    if (i.key === 'F11' || (i.key === 'Enter' && i.alt)) { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (i.key === 'F12' && i.control && i.shift) win.webContents.toggleDevTools();
  });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.on('close', () => { try { const b = win.getNormalBounds(); fs.writeFileSync(cfgFile(), JSON.stringify({ w: b.width, h: b.height, fs: win.isFullScreen() })); } catch (e) { } });
}
app.whenReady().then(start);
app.on('window-all-closed', () => app.quit());
