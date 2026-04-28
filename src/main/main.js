import { app, BrowserWindow, ipcMain, dialog, powerSaveBlocker, screen } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { getLogger } from './logger.js'
import { initAutoUpdater, quitAndInstall } from './updater.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Logger instance
let logger = null

// Houd referenties naar windows om garbage collection te voorkomen
let controllerWindow = null
let presentationWindow = null
let powerSaveId = null

// Development mode check
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createControllerWindow() {
  controllerWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Farewell Player - Bediening',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  })

  if (isDev) {
    controllerWindow.loadURL('http://localhost:5173')
    controllerWindow.webContents.openDevTools()
  } else {
    controllerWindow.loadFile(path.join(__dirname, '../../dist-renderer/index.html'))
  }

  controllerWindow.on('closed', () => {
    controllerWindow = null
    // Sluit ook presentatie venster als controller sluit
    if (presentationWindow) {
      presentationWindow.close()
    }
    // Stop power save blocker
    if (powerSaveId !== null) {
      powerSaveBlocker.stop(powerSaveId)
      powerSaveId = null
    }
  })
}

/**
 * Publieksscherm (PowerPoint-achtig): tweede venster, bij voorkeur op een **externe** monitor,
 * fullscreen zonder kader. Bediening blijft op het controller-venster (primary / gekozen scherm).
 * Zie docs/PLAYER_V3_PLAN.md
 */
function createPresentationWindow(displayId = null) {
  // Vind het externe scherm (of gebruik primaire als geen extern)
  const displays = screen.getAllDisplays()
  const primaryDisplay = screen.getPrimaryDisplay()
  
  let targetDisplay = primaryDisplay
  if (displayId) {
    targetDisplay = displays.find(d => d.id === displayId) || primaryDisplay
  } else {
    // Zoek een extern scherm (niet primair)
    const externalDisplay = displays.find(d => d.id !== primaryDisplay.id)
    if (externalDisplay) {
      targetDisplay = externalDisplay
    }
  }

  presentationWindow = new BrowserWindow({
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    width: targetDisplay.bounds.width,
    height: targetDisplay.bounds.height,
    fullscreen: true,
    frame: false,
    kiosk: false, // Kiosk uit voor development - makkelijker te sluiten
    alwaysOnTop: false, // Uit voor development
    skipTaskbar: false,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  })

  if (isDev) {
    presentationWindow.loadURL('http://localhost:5173/#/presentation')
  } else {
    presentationWindow.loadFile(path.join(__dirname, '../../dist-renderer/index.html'), {
      hash: '/presentation'
    })
  }

  // Verberg cursor op presentatie scherm
  presentationWindow.webContents.on('did-finish-load', () => {
    presentationWindow.webContents.insertCSS('* { cursor: none !important; }')
  })

  // ESC sluit het presentatie venster
  presentationWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape' && input.type === 'keyDown') {
      presentationWindow.close()
    }
  })

  presentationWindow.on('closed', () => {
    presentationWindow = null
  })

  // Start power save blocker
  if (powerSaveId === null) {
    powerSaveId = powerSaveBlocker.start('prevent-display-sleep')
  }

  return presentationWindow
}

// IPC Handlers

// Open bestand dialog voor .farewell bestanden
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(controllerWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Farewell Presentatie', extensions: ['farewell'] }
    ]
  })
  
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  
  return result.filePaths[0]
})

// Open audio dialog voor eigen muziek
ipcMain.handle('open-audio-dialog', async () => {
  const result = await dialog.showOpenDialog(controllerWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Audio bestanden', extensions: ['mp3', 'wav', 'm4a', 'ogg', 'flac'] }
    ]
  })
  
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  
  return result.filePaths[0]
})

// Lees bestand
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const buffer = fs.readFileSync(filePath)
    return buffer
  } catch (error) {
    console.error('Error reading file:', error)
    return null
  }
})

// Open presentatie venster
ipcMain.handle('open-presentation-window', async (event, displayId) => {
  if (presentationWindow) {
    presentationWindow.focus()
    return true
  }
  createPresentationWindow(displayId)
  return true
})

// Sluit presentatie venster
ipcMain.handle('close-presentation-window', async () => {
  if (presentationWindow) {
    presentationWindow.close()
  }
  return true
})

// Stuur commando naar presentatie venster
ipcMain.handle('send-to-presentation', async (event, command, data) => {
  if (presentationWindow) {
    presentationWindow.webContents.send('presentation-command', { command, data })
    return true
  }
  return false
})

// Stuur commando van presentatie naar controller venster
ipcMain.handle('send-to-controller', async (event, command, data) => {
  if (controllerWindow) {
    controllerWindow.webContents.send('controller-command', { command, data })
    return true
  }
  return false
})

// Haal beschikbare schermen op
ipcMain.handle('get-displays', async () => {
  const displays = screen.getAllDisplays()
  const primaryDisplay = screen.getPrimaryDisplay()
  
  return displays.map(d => ({
    id: d.id,
    label: d.label || `Scherm ${d.id}`,
    width: d.bounds.width,
    height: d.bounds.height,
    isPrimary: d.id === primaryDisplay.id
  }))
})

// Log error van renderer
ipcMain.handle('log-error', async (event, errorData) => {
  if (logger) {
    logger.logRendererError(errorData)
  }
  return true
})

// Haal log bestand pad op
ipcMain.handle('get-log-path', async () => {
  if (logger) {
    return logger.getLogFilePath()
  }
  return null
})

// Installeer update en herstart
ipcMain.handle('install-update', async () => {
  quitAndInstall()
  return true
})

// Haal app versie op
ipcMain.handle('get-app-version', async () => {
  return app.getVersion()
})

// App lifecycle
app.whenReady().then(() => {
  // Initialiseer logger
  logger = getLogger()
  logger.logAppEvent('App started', { version: app.getVersion() })
  
  createControllerWindow()
  
  // Initialiseer auto-updater (alleen in productie)
  if (app.isPackaged) {
    initAutoUpdater(controllerWindow)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createControllerWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (logger) {
    logger.logAppEvent('All windows closed')
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Voorkom meerdere instanties
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (controllerWindow) {
      if (controllerWindow.isMinimized()) controllerWindow.restore()
      controllerWindow.focus()
    }
  })
}
