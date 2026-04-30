import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from '../i18n'

export default function DropZone({ onFileLoad }) {
  const { t, language, setLanguage, availableLanguages } = useTranslation()
  const [isDragging, setIsDragging] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const [checkingUpdates, setCheckingUpdates] = useState(false)

  useEffect(() => {
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(setAppVersion)
    }
  }, [])

  const handleCheckUpdates = async () => {
    if (!window.electronAPI?.retryUpdate) return
    setCheckingUpdates(true)
    try {
      await window.electronAPI.retryUpdate()
    } catch {
      // Error wordt afgehandeld door UpdateNotification component
    }
    setTimeout(() => setCheckingUpdates(false), 2000)
  }

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const farewellFile = files.find(f => f.name.endsWith('.farewell'))
    
    if (farewellFile) {
      onFileLoad(farewellFile.path)
    } else {
      alert(t('errors.dropFarewellFile'))
    }
  }, [onFileLoad, t])

  const handleOpenDialog = async () => {
    if (!window.electronAPI) {
      return
    }
    
    const filePath = await window.electronAPI.openFileDialog()
    if (filePath) {
      onFileLoad(filePath)
    }
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Language selector + update button */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
        <div className="flex gap-1">
          {availableLanguages.map(lang => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`px-2 py-1 text-sm rounded transition ${
                language === lang.code 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              title={lang.name}
            >
              {lang.flag}
            </button>
          ))}
        </div>
        <button
          onClick={handleCheckUpdates}
          disabled={checkingUpdates}
          className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 rounded transition flex items-center gap-1.5"
        >
          <svg className={`w-3.5 h-3.5 ${checkingUpdates ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {checkingUpdates ? t('update.checking') : t('update.checkForUpdates')}
        </button>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">{t('dropZone.title')}</h1>
        <p className="text-slate-400">{t('dropZone.subtitle')}</p>
      </div>

      <div
        className={`drop-zone w-full max-w-lg aspect-video rounded-2xl flex flex-col items-center justify-center p-8 cursor-pointer transition-all ${
          isDragging ? 'active' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleOpenDialog}
      >
        <svg 
          className="w-16 h-16 text-slate-500 mb-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
          />
        </svg>
        
        <p className="text-lg text-white mb-2">
          {t('dropZone.dropHere')} <span className="font-mono text-primary-400">{t('dropZone.fileType')}</span> {t('dropZone.dropHereEnd')}
        </p>
        <p className="text-slate-500 text-sm">
          {t('dropZone.orClick')}
        </p>
      </div>

      <div className="mt-8 text-center">
        <p className="text-slate-500 text-sm">
          {t('app.version')} {appVersion || '...'} • {t('app.madeBy')}
        </p>
      </div>
    </div>
  )
}
