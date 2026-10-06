const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('nuvoriDesktop', Object.freeze({
  platform: 'windows',
  signIn: url => ipcRenderer.invoke('nuvori:sign-in', url),
}));
