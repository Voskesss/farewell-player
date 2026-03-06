import { app } from 'electron'
import fs from 'fs'
import path from 'path'

/**
 * Structured Logger voor Farewell Player
 * Schrijft logs naar bestand voor troubleshooting bij uitvaarten
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
}

class Logger {
  constructor() {
    this.logDir = path.join(app.getPath('userData'), 'logs')
    this.currentLogFile = null
    this.minLevel = LOG_LEVELS.INFO
    
    // Maak log directory aan
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }
    
    // Bepaal log bestandsnaam (per dag)
    this.rotateLogFile()
    
    // Cleanup oude logs (ouder dan 7 dagen)
    this.cleanupOldLogs()
  }
  
  rotateLogFile() {
    const date = new Date().toISOString().split('T')[0]
    this.currentLogFile = path.join(this.logDir, `farewell-player-${date}.log`)
  }
  
  cleanupOldLogs() {
    try {
      const files = fs.readdirSync(this.logDir)
      const now = Date.now()
      const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 dagen
      
      files.forEach(file => {
        const filePath = path.join(this.logDir, file)
        const stats = fs.statSync(filePath)
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath)
        }
      })
    } catch (error) {
      console.error('Failed to cleanup old logs:', error)
    }
  }
  
  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString()
    const dataStr = data ? ` | ${JSON.stringify(data)}` : ''
    return `[${timestamp}] [${level}] ${message}${dataStr}\n`
  }
  
  write(level, levelName, message, data) {
    if (level < this.minLevel) return
    
    const formatted = this.formatMessage(levelName, message, data)
    
    // Console output
    switch (level) {
      case LOG_LEVELS.ERROR:
        console.error(formatted.trim())
        break
      case LOG_LEVELS.WARN:
        console.warn(formatted.trim())
        break
      default:
        console.log(formatted.trim())
    }
    
    // File output
    try {
      fs.appendFileSync(this.currentLogFile, formatted)
    } catch (error) {
      console.error('Failed to write to log file:', error)
    }
  }
  
  debug(message, data = null) {
    this.write(LOG_LEVELS.DEBUG, 'DEBUG', message, data)
  }
  
  info(message, data = null) {
    this.write(LOG_LEVELS.INFO, 'INFO', message, data)
  }
  
  warn(message, data = null) {
    this.write(LOG_LEVELS.WARN, 'WARN', message, data)
  }
  
  error(message, data = null) {
    this.write(LOG_LEVELS.ERROR, 'ERROR', message, data)
  }
  
  // Log een crash/error van de renderer
  logRendererError(errorData) {
    this.error('Renderer error', errorData)
  }
  
  // Log app lifecycle events
  logAppEvent(event, data = null) {
    this.info(`App event: ${event}`, data)
  }
  
  // Log presentatie events
  logPresentationEvent(event, data = null) {
    this.info(`Presentation: ${event}`, data)
  }
  
  // Haal log bestand pad op (voor support)
  getLogFilePath() {
    return this.currentLogFile
  }
  
  // Haal alle recente logs op
  getRecentLogs(lines = 100) {
    try {
      const content = fs.readFileSync(this.currentLogFile, 'utf-8')
      const allLines = content.split('\n')
      return allLines.slice(-lines).join('\n')
    } catch (error) {
      return 'No logs available'
    }
  }
}

// Singleton instance
let loggerInstance = null

export function getLogger() {
  if (!loggerInstance) {
    loggerInstance = new Logger()
  }
  return loggerInstance
}

export default Logger
