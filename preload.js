const { contextBridge, ipcRenderer } = require('electron');

// Expose API to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () =>
    ipcRenderer.invoke('dialog:openFile'),
  saveFile: (defaultName, ext) =>
    ipcRenderer.invoke('dialog:saveFile', { defaultName, ext }),
  convertFile: (inputPath, outputPath, targetFormat) =>
    ipcRenderer.invoke('file:convert', { inputPath, outputPath, targetFormat }),
  showInFolder: (filePath) =>
    ipcRenderer.invoke('shell:showInFolder', filePath),
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close:    () => ipcRenderer.send('window:close'),
});