const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose secure API bridge to renderer process
 */
contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,
  version: process.env.npm_package_version || '1.0.0',

  // System actions
  print: (options) => ipcRenderer.invoke('app:print', options),
  showNotification: (payload) => ipcRenderer.invoke('app:notify', payload),

  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // Navigation listener from desktop menu
  onMenuNavigate: (callback) => {
    const subscription = (_event, route) => callback(route);
    ipcRenderer.on('menu:navigate', subscription);
    return () => ipcRenderer.removeListener('menu:navigate', subscription);
  }
});
