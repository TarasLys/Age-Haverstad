// preload.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendTendersWithMap: (mailOptions) => ipcRenderer.invoke('sendTendersWithMap', mailOptions)
});

// const { contextBridge, ipcRenderer } = require('electron');

// contextBridge.exposeInMainWorld('electronAPI', {
//   sendTendersWithMap: (args) => ipcRenderer.invoke('sendTendersWithMap', args)
// });