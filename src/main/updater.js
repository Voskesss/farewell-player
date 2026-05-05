import pkg from 'electron-updater'
const { autoUpdater } = pkg
import { getLogger } from './logger.js'

/**
 * Auto-updater configuratie voor Farewell Player
 * Checkt automatisch op updates en installeert ze
 */

let logger = null
let mainWindowRef = null

function sendToRenderer(channel, data) {
  try {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send(channel, data)
    }
  } catch (err) {
    if (logger) logger.warn('Failed to send to renderer', { channel, error: err.message })
  }
}

export function initAutoUpdater(mainWindow) {
  logger = getLogger()
  mainWindowRef = mainWindow
  
  // Configuratie
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  // Windows: verifyUpdateCodeSignature faalt als EV-certificaat-CN ≠ ingebakken publisherName ("The Last Farewell").
  if (process.platform === 'win32') {
    autoUpdater.verifyUpdateCodeSignature = false
  }

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    logger.info('Checking for updates...')
  })
  
  autoUpdater.on('update-available', (info) => {
    logger.info('Update available', { version: info.version })
    sendToRenderer('update-available', info)
  })
  
  autoUpdater.on('update-not-available', (info) => {
    logger.info('No updates available', { currentVersion: info.version })
  })
  
  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent)
    logger.info('Download progress', { percent })
    sendToRenderer('update-progress', { ...progress, percent })
  })
  
  autoUpdater.on('update-downloaded', (info) => {
    logger.info('Update downloaded', { version: info.version })
    sendToRenderer('update-downloaded', info)
  })
  
  autoUpdater.on('error', (error) => {
    logger.error('Auto-updater error', { message: error.message, stack: error.stack })
    
    // Check voor readonly error (app draait vanuit DMG of readonly locatie)
    let userMessage = error.message
    if (error.message.includes('EROFS') || error.message.includes('read-only') || error.message.includes('readonly')) {
      userMessage = 'Update kan niet worden geïnstalleerd omdat de app in een alleen-lezen locatie staat. Sleep de app naar de map Programma\'s en probeer opnieuw.'
      logger.warn('App appears to be in readonly location (possibly running from DMG)')
    }
    
    sendToRenderer('update-error', { message: userMessage, originalError: error.message })
  })
  
  // Check for updates after startup
  setTimeout(() => {
    logger.info('Starting update check...')
    autoUpdater.checkForUpdates().catch(err => {
      logger.warn('Failed to check for updates', { error: err.message })
    })
  }, 5000)
}

export function quitAndInstall() {
  autoUpdater.quitAndInstall(false, true)
}

export function retryUpdate() {
  if (logger) logger.info('Retrying update check...')
  return autoUpdater.checkForUpdates().catch(err => {
    if (logger) logger.warn('Failed to retry update', { error: err.message })
    throw err
  })
}
