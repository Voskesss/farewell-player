import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

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
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0)
  const [playingAudioSession, setPlayingAudioSession] = useState(null)
  const audioRefs = useRef({})
  const autoPlayTimerRef = useRef(null)

  const { slides, audioTracks, settings, name, externalMusic, sessions } = presentation

  // Bereken slide ranges per sessie
  const sessionSlideRanges = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return [{ start: 0, end: slides.length - 1, session: { name: 'Presentatie', slides: slides.map((_, i) => i) } }]
    }
    
    let currentIndex = 0
    return sessions.map((session, idx) => {
      const slideCount = session.slides?.length || 0
      const range = {
        start: currentIndex,
        end: currentIndex + slideCount - 1,
        session,
        sessionIndex: idx
      }
      currentIndex += slideCount
      return range
    })
  }, [sessions, slides])

  // Bepaal huidige sessie op basis van slide index
  const getCurrentSessionFromSlide = useCallback((slideIndex) => {
    for (let i = 0; i < sessionSlideRanges.length; i++) {
      const range = sessionSlideRanges[i]
      if (slideIndex >= range.start && slideIndex <= range.end) {
        return i
      }
    }
    return 0
  }, [sessionSlideRanges])

  // Update sessie wanneer slide verandert
  useEffect(() => {
    const newSessionIndex = getCurrentSessionFromSlide(currentSlideIndex)
    if (newSessionIndex !== currentSessionIndex) {
      setCurrentSessionIndex(newSessionIndex)
    }
  }, [currentSlideIndex, getCurrentSessionFromSlide, currentSessionIndex])

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

  // Haal slide duration voor huidige sessie
  const getCurrentSlideDuration = useCallback(() => {
    const currentRange = sessionSlideRanges[currentSessionIndex]
    const sessionDuration = currentRange?.session?.slideDuration
    return (sessionDuration || settings.defaultSlideDuration || 5) * 1000
  }, [currentSessionIndex, sessionSlideRanges, settings.defaultSlideDuration])

  // Check of huidige slide een video is
  const currentSlideIsVideo = slides[currentSlideIndex]?.isVideo

  // Auto-play timer met sessie-specifieke duration
  // Pauzeer timer als huidige slide een video is (video bepaalt eigen timing)
  useEffect(() => {
    // Skip timer voor video slides - video onEnded handler gaat naar volgende slide
    if (isPlaying && !currentSlideIsVideo) {
      const advanceSlide = () => {
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
      }
      
      // Gebruik huidige sessie duration
      const duration = getCurrentSlideDuration()
      autoPlayTimerRef.current = setTimeout(advanceSlide, duration)
    }

    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current)
      }
    }
  }, [isPlaying, currentSlideIndex, getCurrentSlideDuration, slides.length, currentSlideIsVideo])

  const goToSlide = useCallback((index) => {
    const clampedIndex = Math.max(0, Math.min(index, slides.length - 1))
    setCurrentSlideIndex(clampedIndex)
    
    // Sync met presentatie venster
    if (window.electronAPI) {
      window.electronAPI.sendToPresentation('goto', { index: clampedIndex })
    }
  }, [slides.length, setCurrentSlideIndex])

  // Handler voor wanneer video eindigt - ga naar volgende slide
  const handleVideoEnded = useCallback(() => {
    if (isPlaying) {
      const next = currentSlideIndex + 1
      if (next < slides.length) {
        goToSlide(next)
      } else {
        setIsPlaying(false)
      }
    }
  }, [isPlaying, currentSlideIndex, slides.length, goToSlide, setIsPlaying])

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
          <div className="flex-1 bg-black rounded-xl overflow-hidden flex items-center justify-center relative">
            {currentSlide?.isVideo ? (
              <>
                <video
                  src={currentSlide.url}
                  className="max-w-full max-h-full object-contain"
                  controls
                  onEnded={handleVideoEnded}
                />
                {/* Video indicator */}
                <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  VIDEO
                </div>
              </>
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

        {/* Sidebar - Sessie gebaseerd */}
        <div className="w-96 bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden">
          {/* Sessies lijst */}
          <div className="flex-1 overflow-y-auto">
            {sessionSlideRanges.map((range, sessionIdx) => {
              const session = range.session
              const isCurrentSession = sessionIdx === currentSessionIndex
              const sessionSlides = slides.slice(range.start, range.end + 1)
              const hasAudio = session.audio?.url || session.audio?.file
              const sessionExternalMusic = externalMusic?.filter(m => m.sessionId === session.id) || []
              
              return (
                <div 
                  key={sessionIdx}
                  className={`border-b border-slate-700 ${isCurrentSession ? 'bg-slate-700/50' : ''}`}
                >
                  {/* Sessie header */}
                  <div 
                    className={`p-3 cursor-pointer hover:bg-slate-700/30 transition ${isCurrentSession ? 'bg-primary-900/30' : ''}`}
                    onClick={() => goToSlide(range.start)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCurrentSession ? 'bg-primary-500 text-white' : 'bg-slate-600 text-slate-300'
                        }`}>
                          {sessionIdx + 1}
                        </span>
                        <span className={`font-medium ${isCurrentSession ? 'text-white' : 'text-slate-300'}`}>
                          {session.name || `Sessie ${sessionIdx + 1}`}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {sessionSlides.length} slides
                      </span>
                    </div>
                    
                    {/* Slide duur indicator */}
                    {session.slideDuration && (
                      <div className="mt-1 text-xs text-slate-500">
                        ⏱️ {session.slideDuration}s per slide
                      </div>
                    )}
                  </div>
                  
                  {/* Audio controls voor deze sessie */}
                  {hasAudio && (
                    <div className="px-3 pb-2">
                      <div className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const audioEl = audioRefs.current[sessionIdx]
                            if (audioEl) {
                              if (playingAudioSession === sessionIdx) {
                                audioEl.pause()
                                setPlayingAudioSession(null)
                              } else {
                                // Stop andere audio
                                Object.values(audioRefs.current).forEach(el => el?.pause())
                                audioEl.play()
                                setPlayingAudioSession(sessionIdx)
                              }
                            }
                          }}
                          className={`p-2 rounded-full transition ${
                            playingAudioSession === sessionIdx 
                              ? 'bg-amber-500 hover:bg-amber-600' 
                              : 'bg-primary-500 hover:bg-primary-600'
                          }`}
                        >
                          {playingAudioSession === sessionIdx ? (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-300 truncate">🎵 {session.audio.file?.split('/').pop() || 'Audio'}</p>
                          {session.audio.duration && (
                            <p className="text-xs text-slate-500">{Math.floor(session.audio.duration / 60)}:{String(Math.floor(session.audio.duration % 60)).padStart(2, '0')}</p>
                          )}
                        </div>
                        <audio
                          ref={el => audioRefs.current[sessionIdx] = el}
                          src={session.audio.url}
                          onEnded={() => setPlayingAudioSession(null)}
                          className="hidden"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Externe muziek voor deze sessie */}
                  {sessionExternalMusic.length > 0 && (
                    <div className="px-3 pb-2">
                      {sessionExternalMusic.map((track, i) => (
                        <div key={i} className="p-2 bg-amber-900/30 rounded-lg border border-amber-700/50">
                          <div className="flex items-center gap-2">
                            <span className="text-amber-400">⚠️</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-amber-200 font-medium truncate">{track.name}</p>
                              <p className="text-xs text-amber-400/70">{track.artist}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2">
                            {track.spotifyUrl && (
                              <a
                                href={track.spotifyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 text-center text-xs py-1 px-2 bg-green-600 hover:bg-green-700 text-white rounded transition"
                              >
                                🎧 Spotify
                              </a>
                            )}
                            {track.youtubeUrl && (
                              <a
                                href={track.youtubeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 text-center text-xs py-1 px-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
                              >
                                ▶️ YouTube
                              </a>
                            )}
                          </div>
                          <p className="text-xs text-amber-500 mt-1">⚡ Vereist internet</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Slides van deze sessie (alleen tonen als huidige sessie) */}
                  {isCurrentSession && (
                    <div className="px-3 pb-3">
                      <div className="grid grid-cols-4 gap-1">
                        {sessionSlides.map((slide, localIdx) => {
                          const globalIdx = range.start + localIdx
                          return (
                            <button
                              key={globalIdx}
                              onClick={() => goToSlide(globalIdx)}
                              className={`aspect-video rounded overflow-hidden border-2 transition ${
                                globalIdx === currentSlideIndex
                                  ? 'border-primary-400 ring-2 ring-primary-400/50'
                                  : 'border-transparent hover:border-slate-500'
                              }`}
                            >
                              {slide.isVideo ? (
                                <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                                  <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                              ) : (
                                <img
                                  src={slide.url}
                                  alt={`Slide ${globalIdx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Footer met totaal overzicht */}
          <div className="p-3 bg-slate-900 border-t border-slate-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">
                Sessie {currentSessionIndex + 1} / {sessionSlideRanges.length}
              </span>
              <span className="text-slate-500">
                Slide {currentSlideIndex + 1} / {slides.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
