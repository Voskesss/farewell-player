// Preload moet CommonJS blijven voor Electron
const { contextBridge, ipcRenderer } = require('electron')

// Expose veilige API naar renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Bestand operaties
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  
  // Presentatie venster
  openPresentationWindow: (displayId) => ipcRenderer.invoke('open-presentation-window', displayId),
  closePresentationWindow: () => ipcRenderer.invoke('close-presentation-window'),
  sendToPresentation: (command, data) => ipcRenderer.invoke('send-to-presentation', command, data),
  
  // Schermen
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  
  // Ontvang commando's van controller (voor presentatie venster)
  onPresentationCommand: (callback) => {
    ipcRenderer.on('presentation-command', (event, data) => callback(data))
  },
  
  // Verwijder listener
  removePresentationCommandListener: () => {
    ipcRenderer.removeAllListeners('presentation-command')
  }
})
