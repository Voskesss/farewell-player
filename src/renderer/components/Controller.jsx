import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import MusicPlayer from './MusicPlayer'

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
          // Ga naar vorige sessie
          if (currentSessionIndex > 0) {
            const prevSession = sessionSlideRanges[currentSessionIndex - 1]
            goToSlide(prevSession.start)
          }
          break
        case 'End':
          e.preventDefault()
          // Ga naar volgende sessie
          if (currentSessionIndex < sessionSlideRanges.length - 1) {
            const nextSession = sessionSlideRanges[currentSessionIndex + 1]
            goToSlide(nextSession.start)
          }
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

  // Check of huidige sessie speakerMode heeft (handmatig doorklikken)
  const currentSessionIsSpeakerMode = sessionSlideRanges[currentSessionIndex]?.session?.speakerMode

  // Auto-play timer met sessie-specifieke duration en loop support
  // Pauzeer timer als huidige slide een video is (video bepaalt eigen timing)
  // Pauzeer timer als sessie speakerMode heeft (handmatig doorklikken)
  useEffect(() => {
    // Skip timer voor video slides - video onEnded handler gaat naar volgende slide
    // Skip timer voor speakerMode sessies - handmatig doorklikken
    if (isPlaying && !currentSlideIsVideo && !currentSessionIsSpeakerMode) {
      const advanceSlide = () => {
        const currentRange = sessionSlideRanges[currentSessionIndex]
        const isLastSlideInSession = currentSlideIndex === currentRange?.end
        const sessionHasLoop = currentRange?.session?.loop
        
        setCurrentSlideIndex(prev => {
          let next = prev + 1
          
          // Check of we aan het einde van de sessie zijn
          if (isLastSlideInSession && sessionHasLoop) {
            // Loop terug naar begin van deze sessie
            next = currentRange.start
          } else if (isLastSlideInSession) {
            // Einde van sessie - check of volgende sessie speakerMode heeft
            const nextSessionIdx = currentSessionIndex + 1
            const nextSession = sessionSlideRanges[nextSessionIdx]?.session
            if (nextSession?.speakerMode) {
              // Pauzeer bij start van speakerMode sessie
              setIsPlaying(false)
            }
          }
          
          if (next >= slides.length) {
            // Einde van presentatie
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
  }, [isPlaying, currentSlideIndex, getCurrentSlideDuration, slides.length, currentSlideIsVideo, currentSessionIsSpeakerMode, sessionSlideRanges, currentSessionIndex])

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
              onClick={() => {
                // Ga naar vorige sessie
                if (currentSessionIndex > 0) {
                  const prevSession = sessionSlideRanges[currentSessionIndex - 1]
                  goToSlide(prevSession.start)
                }
              }}
              disabled={currentSessionIndex === 0}
              className="p-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
              title="Vorige sessie"
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
              onClick={() => {
                // Ga naar volgende sessie
                if (currentSessionIndex < sessionSlideRanges.length - 1) {
                  const nextSession = sessionSlideRanges[currentSessionIndex + 1]
                  goToSlide(nextSession.start)
                }
              }}
              disabled={currentSessionIndex === sessionSlideRanges.length - 1}
              className="p-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
              title="Volgende sessie"
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
              const hasAudio = session.audio?.url || session.audio?.file || session.audioTracks?.length > 0
              
              return (
                <div 
                  key={sessionIdx}
                  className={`border-b border-slate-700 ${isCurrentSession ? 'bg-slate-700/50' : ''}`}
                >
                  {/* Sessie header */}
                  <div 
                    className={`p-3 cursor-pointer transition ${
                      isCurrentSession 
                        ? 'bg-primary-600/20 border-l-4 border-primary-500' 
                        : 'hover:bg-slate-700/30 border-l-4 border-transparent'
                    }`}
                    onClick={() => goToSlide(range.start)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                          isCurrentSession ? 'bg-primary-500 text-white' : 'bg-slate-600 text-slate-300'
                        }`}>
                          {sessionIdx + 1}
                        </span>
                        <div>
                          <span className={`font-medium block ${isCurrentSession ? 'text-white' : 'text-slate-300'}`}>
                            {session.name || `Sessie ${sessionIdx + 1}`}
                            {session.loop && <span className="ml-2 text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">🔁 Loop</span>}
                            {session.speakerMode && <span className="ml-2 text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">🎤 Spreker</span>}
                          </span>
                          <span className="text-xs text-slate-500">
                            {sessionSlides.length} slides • {session.slideDuration || settings.defaultSlideDuration || 5}s
                            {session.speakerNotes && ' • 📝'}
                          </span>
                        </div>
                      </div>
                      {/* Expand indicator */}
                      <svg 
                        className={`w-5 h-5 transition-transform ${isCurrentSession ? 'text-primary-400 rotate-180' : 'text-slate-500'}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Muziek speler - ALLEEN voor huidige sessie */}
                  {isCurrentSession && (
                    <div className="px-3 pb-2">
                      <MusicPlayer
                        session={session}
                        audioTracks={audioTracks}
                        isCurrentSession={isCurrentSession}
                        onAudioStateChange={(playing) => {
                          if (playing) {
                            setPlayingAudioSession(sessionIdx)
                          } else {
                            setPlayingAudioSession(null)
                          }
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Collapsed audio indicator voor niet-actieve sessies */}
                  {!isCurrentSession && hasAudio && (
                    <div className="px-3 pb-2">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>🎵 Audio beschikbaar</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Spreker notities (alleen voor huidige sessie) */}
                  {isCurrentSession && session.speakerNotes && (
                    <div className="px-3 pb-2">
                      <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-2">
                        <div className="flex items-center gap-1 text-xs text-amber-400 mb-1">
                          <span>📝</span> Spreker notities
                        </div>
                        <p className="text-xs text-amber-200/80 whitespace-pre-wrap">{session.speakerNotes}</p>
                      </div>
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
