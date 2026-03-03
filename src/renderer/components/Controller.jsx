import { useState, useEffect, useRef, useCallback } from 'react'

export default function Controller({
  presentation,
  currentSlideIndex,
  setCurrentSlideIndex,
  isPlaying,
  setIsPlaying,
  onClose
}) {
  const [displays, setDisplays] = useState([])
  const [selectedDisplay, setSelectedDisplay] = useState(null)
  const [presentationWindowOpen, setPresentationWindowOpen] = useState(false)
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0)
  const audioRef = useRef(null)
  const autoPlayTimerRef = useRef(null)

  const { slides, audioTracks, settings, name, externalMusic } = presentation

  // Haal beschikbare schermen op
  useEffect(() => {
    const fetchDisplays = async () => {
      if (window.electronAPI) {
        const displayList = await window.electronAPI.getDisplays()
        setDisplays(displayList)
        // Selecteer automatisch extern scherm als beschikbaar
        const external = displayList.find(d => !d.isPrimary)
        setSelectedDisplay(external?.id || displayList[0]?.id)
      }
    }
    fetchDisplays()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          setIsPlaying(prev => !prev)
          break
        case 'ArrowRight':
          e.preventDefault()
          goToSlide(currentSlideIndex + 1)
          break
        case 'ArrowLeft':
          e.preventDefault()
          goToSlide(currentSlideIndex - 1)
          break
        case 'Home':
          e.preventDefault()
          goToSlide(0)
          break
        case 'End':
          e.preventDefault()
          goToSlide(slides.length - 1)
          break
        case 'Escape':
          e.preventDefault()
          closePresentationWindow()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentSlideIndex, slides.length])

  // Auto-play timer
  useEffect(() => {
    if (isPlaying) {
      const duration = (settings.defaultSlideDuration || 5) * 1000
      autoPlayTimerRef.current = setInterval(() => {
        setCurrentSlideIndex(prev => {
          const next = prev + 1
          if (next >= slides.length) {
            setIsPlaying(false)
            return prev
          }
          // Sync met presentatie venster
          if (window.electronAPI) {
            window.electronAPI.sendToPresentation('goto', { index: next })
          }
          return next
        })
      }, duration)
    } else {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current)
      }
    }

    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current)
      }
    }
  }, [isPlaying, settings.defaultSlideDuration, slides.length])

  const goToSlide = useCallback((index) => {
    const clampedIndex = Math.max(0, Math.min(index, slides.length - 1))
    setCurrentSlideIndex(clampedIndex)
    
    // Sync met presentatie venster
    if (window.electronAPI) {
      window.electronAPI.sendToPresentation('goto', { index: clampedIndex })
    }
  }, [slides.length, setCurrentSlideIndex])

  const openPresentationWindow = async () => {
    if (window.electronAPI) {
      await window.electronAPI.openPresentationWindow(selectedDisplay)
      setPresentationWindowOpen(true)
      
      // Stuur presentatie data naar nieuw venster
      setTimeout(() => {
        window.electronAPI.sendToPresentation('load', { presentation })
        window.electronAPI.sendToPresentation('goto', { index: currentSlideIndex })
      }, 500)
    }
  }

  const closePresentationWindow = async () => {
    if (window.electronAPI) {
      await window.electronAPI.closePresentationWindow()
      setPresentationWindowOpen(false)
      setIsPlaying(false)
    }
  }

  const togglePlay = () => {
    const newState = !isPlaying
    setIsPlaying(newState)
    
    if (window.electronAPI) {
      window.electronAPI.sendToPresentation(newState ? 'play' : 'pause', {})
    }
  }

  const currentSlide = slides[currentSlideIndex]

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition"
            title="Sluit presentatie"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-white">{name}</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Scherm selectie */}
          <select
            value={selectedDisplay || ''}
            onChange={(e) => setSelectedDisplay(Number(e.target.value))}
            className="bg-slate-700 text-white px-3 py-2 rounded-lg text-sm"
          >
            {displays.map(d => (
              <option key={d.id} value={d.id}>
                {d.isPrimary ? '🖥️ Primair' : '📺 Extern'} ({d.width}x{d.height})
              </option>
            ))}
          </select>

          {/* Presentatie venster toggle */}
          <button
            onClick={presentationWindowOpen ? closePresentationWindow : openPresentationWindow}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              presentationWindowOpen
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            {presentationWindowOpen ? 'Stop Presentatie' : 'Start Presentatie'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Slide preview */}
        <div className="flex-1 flex flex-col p-6">
          <div className="flex-1 bg-black rounded-xl overflow-hidden flex items-center justify-center">
            {currentSlide?.isVideo ? (
              <video
                src={currentSlide.url}
                className="max-w-full max-h-full object-contain"
                controls
              />
            ) : (
              <img
                src={currentSlide?.url}
                alt={`Slide ${currentSlideIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={() => goToSlide(0)}
              className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
              title="Eerste slide (Home)"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={() => goToSlide(currentSlideIndex - 1)}
              disabled={currentSlideIndex === 0}
              className="p-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
              title="Vorige slide (←)"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={togglePlay}
              className={`p-4 rounded-full transition ${
                isPlaying 
                  ? 'bg-amber-600 hover:bg-amber-700' 
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
              title={isPlaying ? 'Pauzeer (Spatie)' : 'Afspelen (Spatie)'}
            >
              {isPlaying ? (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => goToSlide(currentSlideIndex + 1)}
              disabled={currentSlideIndex === slides.length - 1}
              className="p-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
              title="Volgende slide (→)"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => goToSlide(slides.length - 1)}
              className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
              title="Laatste slide (End)"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Slide counter */}
          <div className="text-center mt-2 text-slate-400">
            Slide {currentSlideIndex + 1} van {slides.length}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden">
          {/* Audio section */}
          {audioTracks.length > 0 && (
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-sm font-medium text-slate-400 mb-2">🎵 Audio</h3>
              <select
                value={currentAudioIndex}
                onChange={(e) => setCurrentAudioIndex(Number(e.target.value))}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg text-sm mb-2"
              >
                {audioTracks.map((track, i) => (
                  <option key={i} value={i}>{track.name}</option>
                ))}
              </select>
              <audio
                ref={audioRef}
                src={audioTracks[currentAudioIndex]?.url}
                controls
                className="w-full"
              />
            </div>
          )}

          {/* Externe muziek waarschuwing */}
          {externalMusic.length > 0 && (
            <div className="p-4 border-b border-slate-700 bg-amber-900/30">
              <h3 className="text-sm font-medium text-amber-400 mb-2">⚠️ Externe Muziek</h3>
              {externalMusic.map((track, i) => (
                <div key={i} className="text-sm text-amber-200 mb-2">
                  <p className="font-medium">{track.name}</p>
                  <p className="text-amber-300/70">{track.artist}</p>
                  {track.spotifyUrl && (
                    <a
                      href={track.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 hover:underline text-xs"
                    >
                      Open in Spotify →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Slide strip */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-2">Slides</h3>
            <div className="grid grid-cols-3 gap-2">
              {slides.map((slide, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className={`aspect-video rounded overflow-hidden border-2 transition ${
                    i === currentSlideIndex
                      ? 'border-primary-500'
                      : 'border-transparent hover:border-slate-600'
                  }`}
                >
                  {slide.isVideo ? (
                    <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                      <svg className="w-6 h-6 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  ) : (
                    <img
                      src={slide.url}
                      alt={`Slide ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
