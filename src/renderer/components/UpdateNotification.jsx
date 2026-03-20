import { useState, useEffect } from 'react'

/**
 * Update notification component
 * Toont een subtiele melding wanneer er een update beschikbaar is
 */
export default function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState(null)
  const [downloadProgress, setDownloadProgress] = useState(null)
  const [updateReady, setUpdateReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!window.electronAPI) return

    // Luister naar update events
    window.electronAPI.onUpdateAvailable((info) => {
      console.log('[UpdateNotification] Update available:', info.version)
      setUpdateInfo(info)
      setIsDownloading(true)
      setError(null)
    })

    window.electronAPI.onUpdateProgress((progress) => {
      console.log('[UpdateNotification] Progress:', progress.percent)
      setDownloadProgress(progress.percent || 0)
    })

    window.electronAPI.onUpdateDownloaded((info) => {
      console.log('[UpdateNotification] Update downloaded:', info.version)
      setUpdateReady(true)
      setIsDownloading(false)
      setDownloadProgress(null)
    })

    // Error handling
    if (window.electronAPI.onUpdateError) {
      window.electronAPI.onUpdateError((err) => {
        console.error('[UpdateNotification] Error:', err)
        setError(err.message)
        setIsDownloading(false)
      })
    }
  }, [])

  const handleInstall = (e) => {
    e.stopPropagation()
    if (window.electronAPI) {
      window.electronAPI.installUpdate()
    }
  }

  const handleDismiss = (e) => {
    e.stopPropagation()
    setDismissed(true)
  }

  // Niets tonen als geen update of dismissed
  if (!updateInfo || dismissed) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div 
        className={`bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 ${updateReady ? 'cursor-pointer hover:bg-slate-750 hover:border-primary-500/50' : ''}`}
        onClick={updateReady ? handleInstall : undefined}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-white font-medium text-sm">
              {updateReady ? 'Update klaar!' : 'Update beschikbaar'}
            </h4>
            <p className="text-slate-400 text-xs mt-0.5">
              Versie {updateInfo.version} {updateReady ? '- Klik om te installeren' : 'wordt gedownload...'}
            </p>

            {/* Download progress */}
            {isDownloading && (
              <div className="mt-2">
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary-500 transition-all duration-300"
                    style={{ width: `${downloadProgress || 0}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {downloadProgress > 0 ? `Downloaden... ${downloadProgress}%` : 'Start download...'}
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-2">
                <p className="text-xs text-red-400">
                  Fout: {error}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Herstart de app om opnieuw te proberen
                </p>
              </div>
            )}

            {/* Actions - alleen tonen als update klaar is */}
            {updateReady && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition"
                >
                  Later
                </button>
                <button
                  onClick={handleInstall}
                  className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition"
                >
                  Nu installeren
                </button>
              </div>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="text-slate-500 hover:text-white transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
