const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script for the Custom Close Confirmation Dialog
 */
contextBridge.exposeInMainWorld('dialogAPI', {
  cancel: () => ipcRenderer.send('close-dialog:action', 'cancel'),
  closeApp: () => ipcRenderer.send('close-dialog:action', 'close')
});
