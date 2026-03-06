import { autoUpdater } from 'electron-updater'
import { getLogger } from './logger.js'

/**
 * Auto-updater configuratie voor Farewell Player
 * Checkt automatisch op updates en installeert ze
 */

let logger = null

export function initAutoUpdater(mainWindow) {
  logger = getLogger()
  
  // Configuratie
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  
  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    logger.info('Checking for updates...')
  })
  
  autoUpdater.on('update-available', (info) => {
    logger.info('Update available', { version: info.version })
    
    // Notify renderer
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info)
    }
  })
  
  autoUpdater.on('update-not-available', (info) => {
    logger.info('No updates available', { currentVersion: info.version })
  })
  
  autoUpdater.on('download-progress', (progress) => {
    logger.info('Download progress', { 
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total
    })
    
    // Notify renderer
    if (mainWindow) {
      mainWindow.webContents.send('update-progress', progress)
    }
  })
  
  autoUpdater.on('update-downloaded', (info) => {
    logger.info('Update downloaded', { version: info.version })
    
    // Notify renderer - user can choose to restart
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', info)
    }
  })
  
  autoUpdater.on('error', (error) => {
    logger.error('Auto-updater error', { message: error.message, stack: error.stack })
  })
  
  // Check for updates (silent, don't bother user during presentation)
  // Only check once at startup
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      logger.warn('Failed to check for updates', { error: err.message })
    })
  }, 5000) // Wait 5 seconds after app start
}

export function quitAndInstall() {
  autoUpdater.quitAndInstall()
}
