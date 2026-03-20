import { useState, useCallback, useEffect } from 'react'

export default function DropZone({ onFileLoad }) {
  const [isDragging, setIsDragging] = useState(false)
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(setAppVersion)
    }
  }, [])

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
      alert('Sleep een .farewell bestand hierheen')
    }
  }, [onFileLoad])

  const handleOpenDialog = async () => {
    if (!window.electronAPI) {
      alert('Electron API niet beschikbaar')
      return
    }
    
    const filePath = await window.electronAPI.openFileDialog()
    if (filePath) {
      onFileLoad(filePath)
    }
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Farewell Player</h1>
        <p className="text-slate-400">Offline presentatie speler voor uitvaartpresentaties</p>
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
          Sleep een <span className="font-mono text-primary-400">.farewell</span> bestand hierheen
        </p>
        <p className="text-slate-500 text-sm">
          of klik om een bestand te selecteren
        </p>
      </div>

      <div className="mt-8 text-center">
        <p className="text-slate-500 text-sm">
          Versie {appVersion || '...'} • The Last Farewell
        </p>
      </div>
    </div>
  )
}
