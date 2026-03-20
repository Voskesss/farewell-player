// Preload moet CommonJS blijven voor Electron
const { contextBridge, ipcRenderer } = require('electron')

// Expose veilige API naar renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Bestand operaties
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  openAudioDialog: () => ipcRenderer.invoke('open-audio-dialog'),
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
  },
  
  // Stuur commando's van presentatie naar controller
  sendToController: (command, data) => ipcRenderer.invoke('send-to-controller', command, data),
  
  // Ontvang commando's van presentatie (voor controller venster)
  onControllerCommand: (callback) => {
    ipcRenderer.on('controller-command', (event, data) => callback(data))
  },
  
  // Verwijder controller listener
  removeControllerCommandListener: () => {
    ipcRenderer.removeAllListeners('controller-command')
  },
  
  // Logging
  logError: (errorData) => ipcRenderer.invoke('log-error', errorData),
  getLogPath: () => ipcRenderer.invoke('get-log-path'),
  
  // Auto-updates
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, info) => callback(info))
  },
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-progress', (event, progress) => callback(progress))
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, info) => callback(info))
  },
  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', (event, error) => callback(error))
  },
  installUpdate: () => ipcRenderer.invoke('install-update'),
  
  // App versie
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
})
