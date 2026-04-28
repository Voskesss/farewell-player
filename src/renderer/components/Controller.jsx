import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import MusicPlayer from './MusicPlayer'
import { useTranslation } from '../i18n'

export default function Controller({
  presentation,
  currentSlideIndex,
  setCurrentSlideIndex,
  isPlaying,
  setIsPlaying,
  onClose
}) {
  const { t } = useTranslation()
  const [displays, setDisplays] = useState([])
  const [selectedDisplay, setSelectedDisplay] = useState(null)
  const [presentationWindowOpen, setPresentationWindowOpen] = useState(false)
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0)
  const [, setPlayingAudioSession] = useState(null)
  const [sessionElapsedTime, setSessionElapsedTime] = useState({}) // Elapsed time per sessie in seconden
  const [audioDurations, setAudioDurations] = useState({}) // Audio duur per sessie
  const [audioEnded, setAudioEnded] = useState({}) // Track of audio klaar is per sessie
  const audioRefs = useRef({})
  const autoPlayTimerRef = useRef(null)
  const videoRef = useRef(null)
  const elapsedTimerRef = useRef(null)
  const videoEndedDebounceRef = useRef(null)
  const [wallNow, setWallNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setWallNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const { slides, audioTracks, settings, name, externalMusic, sessions } = presentation

  // Helper: bepaal sessie type kleuren (uit SECTION_COLORS.md)
  const getSessionColors = (session) => {
    if (session.loop || session.loopMode) {
      return {
        border: 'border-emerald-400',
        bg: 'bg-emerald-500/20',
        text: 'text-emerald-300',
        badge: 'bg-emerald-500',
        icon: '🔄'
      }
    }
    if (session.speakerMode) {
      return {
        border: 'border-violet-400',
        bg: 'bg-violet-500/20',
        text: 'text-violet-300',
        badge: 'bg-violet-500',
        icon: '🎤'
      }
    }
    return {
      border: 'border-blue-400',
      bg: 'bg-blue-500/20',
      text: 'text-blue-300',
      badge: 'bg-blue-500',
      icon: '🎵'
    }
  }

  // Reset alles naar begin
  const resetToStart = useCallback(() => {
    console.log('[Controller] Resetting to start')
    // Stop afspelen
    setIsPlaying(false)
    // Ga naar slide 0
    setCurrentSlideIndex(0)
    setCurrentSessionIndex(0)
    // Reset elapsed times
    setSessionElapsedTime({})
    // Reset audio ended states
    setAudioEnded({})
    // Stop en reset alle audio
    Object.values(audioRefs.current).forEach(audio => {
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
    })
    // Sync met presentatie venster
    if (window.electronAPI) {
      window.electronAPI.sendToPresentation('goto', { index: 0 })
      window.electronAPI.sendToPresentation('pause', {})
    }
  }, [setCurrentSlideIndex, setIsPlaying])

  // Helper: format tijd als mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Debug: log sessie data bij laden
  useEffect(() => {
    console.log('[Controller] Sessions loaded:', sessions?.map(s => ({
      id: s.id,
      name: s.name,
      loop: s.loop,
      loopMode: s.loopMode,
      speakerMode: s.speakerMode,
      slideDuration: s.slideDuration,
      slidesCount: s.slides?.length,
      audioTracks: s.audioTracks?.length || 0
    })))
  }, [sessions])

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

  // Update sessie wanneer slide verandert EN check pauseHere op eerste slide
  useEffect(() => {
    const newSessionIndex = getCurrentSessionFromSlide(currentSlideIndex)
    if (newSessionIndex !== currentSessionIndex) {
      const oldSessionIndex = currentSessionIndex
      setCurrentSessionIndex(newSessionIndex)
      
      // Check of we naar een nieuwe sessie gaan (niet binnen sessie navigeren)
      const isSessionSwitch = oldSessionIndex !== newSessionIndex
      
      if (isSessionSwitch) {
        const oldSession = sessionSlideRanges[oldSessionIndex]?.session
        const newSession = sessionSlideRanges[newSessionIndex]?.session
        const newSessionRange = sessionSlideRanges[newSessionIndex]
        
        // Check of vorige sessie een LOPENDE loop was
        // isPlaying is true als de loop nog speelde toen we wisselden
        const wasPlayingLoopSession = isPlaying && (oldSession?.loop || oldSession?.loopMode)
        
        // Check of eerste slide van nieuwe sessie pauseHere heeft
        const firstSlideIndex = newSessionRange?.start
        const firstSlide = slides[firstSlideIndex]
        const pauseHere = firstSlide?.pauseHere
        
        // Pauzeer ook altijd bij speaker mode (geen audio)
        const hasAudio = newSession?.audio?.url || newSession?.audioTracks?.length > 0
        const isSpeakerMode = newSession?.speakerMode || !hasAudio
        
        console.log('[Controller] Session switch:', {
          from: oldSessionIndex,
          to: newSessionIndex,
          wasPlayingLoopSession,
          isPlaying,
          firstSlidePauseHere: pauseHere,
          speakerMode: isSpeakerMode,
          hasAudio
        })
        
        // Logica:
        // 1. Als we vanuit een LOPENDE loop komen → ALTIJD pauzeren
        // 2. Anders: respecteer pauseHere
        //    - pauseHere=true of speakerMode → pauzeer
        //    - pauseHere=false → auto-start
        //    - pauseHere=undefined → pauzeer (default)
        if (wasPlayingLoopSession) {
          console.log('[Controller] Pausing - came from playing loop session')
          setIsPlaying(false)
        } else if (pauseHere === true || isSpeakerMode) {
          console.log('[Controller] Pausing - pauseHere=true or speaker mode')
          setIsPlaying(false)
        } else if (pauseHere === false) {
          console.log('[Controller] Auto-starting - pauseHere=false')
          setIsPlaying(true)
        } else {
          // pauseHere undefined - default pauzeren
          console.log('[Controller] Pausing - pauseHere not set (default)')
          setIsPlaying(false)
        }
      }
    }
  }, [currentSlideIndex, getCurrentSessionFromSlide, currentSessionIndex, sessionSlideRanges, isPlaying, setIsPlaying, slides])

  // Elapsed time timer per sessie - update elke seconde wanneer playing
  // + check of sessie moet stoppen
  useEffect(() => {
    if (isPlaying) {
      elapsedTimerRef.current = setInterval(() => {
        setSessionElapsedTime(prev => {
          const newElapsed = (prev[currentSessionIndex] || 0) + 1
          return {
            ...prev,
            [currentSessionIndex]: newElapsed
          }
        })
      }, 1000)
    }
    
    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current)
      }
    }
  }, [isPlaying, currentSessionIndex])

  // Reset elapsed time en audioEnded wanneer naar nieuwe sessie gaat
  useEffect(() => {
    // Reset alleen als we naar een nieuwe sessie gaan die nog geen tijd heeft
    if (sessionElapsedTime[currentSessionIndex] === undefined) {
      setSessionElapsedTime(prev => ({
        ...prev,
        [currentSessionIndex]: 0
      }))
    }
    // Reset audioEnded voor nieuwe sessie
    setAudioEnded(prev => ({
      ...prev,
      [currentSessionIndex]: false
    }))
  }, [currentSessionIndex])

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
        case 'ArrowUp':
          e.preventDefault()
          // Ga naar vorige sessie
          if (currentSessionIndex > 0) {
            const prevSession = sessionSlideRanges[currentSessionIndex - 1]
            goToSlide(prevSession.start)
          }
          break
        case 'ArrowDown':
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
        case 'KeyR':
          e.preventDefault()
          resetToStart()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentSlideIndex, slides.length])

  // Haal slide duration (in ms): manifest per-slide `duration` wint, anders sessie/default (FAREWELL_PLAYER_MANIFEST.md §4)
  const getCurrentSlideDuration = useCallback(() => {
    const slide = slides[currentSlideIndex]
    if (slide && typeof slide.duration === 'number' && slide.duration > 0) {
      return slide.duration * 1000
    }
    const currentRange = sessionSlideRanges[currentSessionIndex]
    const sessionDuration = currentRange?.session?.slideDuration
    return (sessionDuration || settings.defaultSlideDuration || 5) * 1000
  }, [currentSlideIndex, slides, currentSessionIndex, sessionSlideRanges, settings.defaultSlideDuration])

  // CENTRALE LOGICA: Bereken totale sessie duur
  // Prioriteit: handmatige duur > audio duur > (slides * slideDuration)
  const getSessionTotalDuration = useCallback((sessionIdx) => {
    const range = sessionSlideRanges[sessionIdx]
    if (!range) return null
    
    const session = range.session
    const slideCount = session.slides?.length || (range.end - range.start + 1)
    const slideDurationSec = session.slideDuration || settings.defaultSlideDuration || 5
    
    // Check of er een handmatig ingestelde sessie duur is
    // Dit is wanneer de gebruiker expliciet een duur heeft ingesteld
    const manualDuration = session.manualDuration // in seconden
    
    // Audio duur (indien beschikbaar)
    const audioDur = audioDurations[sessionIdx] || 0
    
    // Bereken slides-gebaseerde duur
    const slideBasedDuration = slideCount * slideDurationSec
    
    // Loop sessies hebben geen vaste duur - ze stoppen bij spatie
    if (session.loop || session.loopMode) {
      return null // null = geen automatische stop
    }
    
    // Spreker sessies hebben geen vaste duur - ze stoppen bij spatie
    if (session.speakerMode) {
      return null
    }
    
    // Prioriteit: handmatige duur > audio duur > slides duur
    if (manualDuration && manualDuration > 0) {
      console.log(`[Controller] Session ${sessionIdx} using manual duration: ${manualDuration}s`)
      return manualDuration
    }
    
    if (audioDur > 0) {
      console.log(`[Controller] Session ${sessionIdx} using audio duration: ${audioDur}s`)
      return audioDur
    }
    
    console.log(`[Controller] Session ${sessionIdx} using slide-based duration: ${slideBasedDuration}s`)
    return slideBasedDuration
  }, [sessionSlideRanges, settings.defaultSlideDuration, audioDurations])

  // Check of huidige sessie moet stoppen
  const shouldSessionStop = useCallback(() => {
    const session = sessionSlideRanges[currentSessionIndex]?.session
    if (!session) return false
    
    // Loop sessies stoppen niet automatisch
    if (session.loop || session.loopMode) return false
    
    // Spreker sessies stoppen niet automatisch
    if (session.speakerMode) return false
    
    const totalDuration = getSessionTotalDuration(currentSessionIndex)
    const elapsed = sessionElapsedTime[currentSessionIndex] || 0
    
    // Check 1: Tijd verstreken (handmatige duur of audio duur)
    if (totalDuration && elapsed >= totalDuration) {
      console.log(`[Controller] Session ${currentSessionIndex} stopping: elapsed (${elapsed}s) >= duration (${totalDuration}s)`)
      return true
    }
    
    // Check 2: Audio is gestopt - ALLEEN stoppen als er GEEN handmatige duur is
    // Als handmatige duur > audio duur, blijf slides loopen tot handmatige duur bereikt
    const hasAudio = session.audio?.url || session.audioTracks?.length > 0
    const hasManualDuration = session.manualDuration && session.manualDuration > 0
    
    if (hasAudio && audioEnded[currentSessionIndex] && !hasManualDuration) {
      console.log(`[Controller] Session ${currentSessionIndex} stopping: audio ended (no manual duration)`)
      return true
    }
    
    return false
  }, [currentSessionIndex, sessionSlideRanges, getSessionTotalDuration, sessionElapsedTime, audioEnded])

  // Check of huidige slide een video is
  const currentSlideIsVideo = slides[currentSlideIndex]?.isVideo

  // Auto-play video wanneer isPlaying true is en huidige slide een video is
  useEffect(() => {
    if (videoRef.current && currentSlideIsVideo) {
      if (isPlaying) {
        const currentSlide = slides[currentSlideIndex]
        // Reset naar starttijd als nodig
        if (currentSlide.videoStart > 0) {
          videoRef.current.currentTime = currentSlide.videoStart
        }
        videoRef.current.play().catch(err => {
          console.warn('[Controller] Video autoplay geblokkeerd:', err)
        })
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying, currentSlideIndex, currentSlideIsVideo, slides])

  // Check of huidige sessie speakerMode heeft (handmatig doorklikken)
  const currentSessionIsSpeakerMode = sessionSlideRanges[currentSessionIndex]?.session?.speakerMode

  // Refs voor loop check (om te voorkomen dat useEffect elke seconde reset)
  const audioDurationsRef = useRef(audioDurations)
  const sessionElapsedTimeRef = useRef(sessionElapsedTime)
  
  useEffect(() => {
    audioDurationsRef.current = audioDurations
  }, [audioDurations])
  
  useEffect(() => {
    sessionElapsedTimeRef.current = sessionElapsedTime
  }, [sessionElapsedTime])

  // SIMPELE SLIDE TIMER: Alleen voor slide wisseling binnen sessie
  // Sessie stop logica zit nu in shouldSessionStop()
  useEffect(() => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current)
      autoPlayTimerRef.current = null
    }
    
    // Skip voor video slides en speaker mode
    if (isPlaying && !currentSlideIsVideo && !currentSessionIsSpeakerMode) {
      const advanceSlide = () => {
        const currentRange = sessionSlideRanges[currentSessionIndex]
        const isLastSlideInSession = currentSlideIndex === currentRange?.end
        const session = currentRange?.session
        const sessionHasLoop = session?.loop || session?.loopMode
        
        // Check of audio nog speelt (voor loop beslissing)
        const audioElement = audioRefs.current[currentSessionIndex]
        const audioStillPlaying = audioElement && !audioElement.paused && !audioElement.ended
        
        setCurrentSlideIndex(prev => {
          let next = prev + 1
          
          if (isLastSlideInSession) {
            // Check of handmatige duur langer is dan audio - dan ook loopen
            // Gebruik refs om te voorkomen dat timer elke seconde reset
            const manualDur = session?.manualDuration || 0
            const elapsed = sessionElapsedTimeRef.current[currentSessionIndex] || 0
            const shouldLoopForManualDuration = manualDur > 0 && elapsed < manualDur
            
            // Loop terug als: loop mode OF audio nog speelt OF handmatige duur nog niet bereikt
            if (sessionHasLoop || audioStillPlaying || shouldLoopForManualDuration) {
              console.log('[Controller] Looping to session start:', currentRange.start, 
                '(loop:', sessionHasLoop, 'audio:', audioStillPlaying, 'manualDur:', shouldLoopForManualDuration, ')')
              next = currentRange.start
            } else {
              // Niet loopen - shouldSessionStop() handelt sessie wissel af
              // Blijf op laatste slide, elapsed timer triggert sessie wissel
              console.log('[Controller] Last slide, waiting for session end')
              return prev
            }
          }
          
          if (next >= slides.length) {
            setIsPlaying(false)
            return prev
          }
          
          if (window.electronAPI) {
            window.electronAPI.sendToPresentation('goto', { index: next })
          }
          return next
        })
      }
      
      const duration = getCurrentSlideDuration()
      autoPlayTimerRef.current = setTimeout(advanceSlide, duration)
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

  // Check elke seconde of sessie moet stoppen en naar volgende gaan
  useEffect(() => {
    if (!isPlaying) return
    
    if (shouldSessionStop()) {
      // Ga naar volgende sessie
      const nextSessionIdx = currentSessionIndex + 1
      if (nextSessionIdx < sessionSlideRanges.length) {
        const nextRange = sessionSlideRanges[nextSessionIdx]
        console.log(`[Controller] Auto-advancing to session ${nextSessionIdx}`)
        goToSlide(nextRange.start)
      } else {
        // Einde presentatie
        console.log('[Controller] End of presentation')
        setIsPlaying(false)
      }
    }
  }, [isPlaying, sessionElapsedTime, shouldSessionStop, currentSessionIndex, sessionSlideRanges, goToSlide])

  // Handler voor wanneer video eindigt - check loop logica
  const handleVideoEnded = useCallback(() => {
    // Debounce - voorkom dubbele triggers binnen 500ms
    const now = Date.now()
    if (videoEndedDebounceRef.current && now - videoEndedDebounceRef.current < 500) {
      console.log('[Controller] Video ended debounced - ignoring duplicate')
      return
    }
    videoEndedDebounceRef.current = now
    
    if (!isPlaying) return
    
    const currentRange = sessionSlideRanges[currentSessionIndex]
    const isLastSlideInSession = currentSlideIndex === currentRange?.end
    const session = currentRange?.session
    const sessionHasLoop = session?.loop || session?.loopMode
    
    console.log('[Controller] Video ended:', {
      currentSlide: currentSlideIndex,
      isLastInSession: isLastSlideInSession,
      sessionHasLoop
    })
    
    // Video's loopen ALLEEN als sessie expliciet loop mode heeft
    // NIET als alleen audio nog speelt - audio volgt video, niet andersom
    if (isLastSlideInSession && sessionHasLoop) {
      // Loop terug naar begin van sessie
      console.log('[Controller] Video ended - looping back to session start (loop mode):', currentRange.start)
      goToSlide(currentRange.start)
      return
    }
    
    // Anders: ga naar volgende slide
    const next = currentSlideIndex + 1
    if (next < slides.length) {
      console.log('[Controller] Video ended - advancing to next slide')
      goToSlide(next)
    } else {
      console.log('[Controller] Video ended - end of presentation')
      setIsPlaying(false)
    }
  }, [isPlaying, currentSlideIndex, slides.length, goToSlide, setIsPlaying, sessionSlideRanges, currentSessionIndex])

  // Luister naar commando's van presentatie venster (bijv. video ended)
  useEffect(() => {
    if (!window.electronAPI) return

    window.electronAPI.onControllerCommand(({ command, data }) => {
      console.log('[Controller] Received command from presentation:', command)
      switch (command) {
        case 'videoEnded':
          // Video is klaar in presentatie venster - ga naar volgende slide
          console.log('[Controller] Video ended, advancing to next slide')
          handleVideoEnded()
          break
      }
    })

    return () => {
      window.electronAPI?.removeControllerCommandListener()
    }
  }, [handleVideoEnded])

  const openPresentationWindow = async () => {
    if (window.electronAPI) {
      console.log('[Controller] Opening presentation window on display:', selectedDisplay)
      await window.electronAPI.openPresentationWindow(selectedDisplay)
      setPresentationWindowOpen(true)
      
      // Stuur presentatie data naar nieuw venster met retry mechanisme
      let retries = 0
      const maxRetries = 5
      const sendData = () => {
        console.log('[Controller] Sending presentation data (attempt', retries + 1, '):', presentation?.name, 'slides:', presentation?.slides?.length)
        window.electronAPI.sendToPresentation('load', { presentation })
        window.electronAPI.sendToPresentation('goto', { index: currentSlideIndex })
        
        // Sync playing state
        if (isPlaying) {
          window.electronAPI.sendToPresentation('play')
        }
        
        // Retry als window nog niet klaar is
        retries++
        if (retries < maxRetries) {
          setTimeout(sendData, 300)
        }
      }
      
      // Start na korte delay
      setTimeout(sendData, 200)
    }
  }

  const closePresentationWindow = async () => {
    if (window.electronAPI) {
      await window.electronAPI.closePresentationWindow()
      setPresentationWindowOpen(false)
      setIsPlaying(false)
    }
  }

  // Sync playing state naar presentation window
  useEffect(() => {
    if (presentationWindowOpen && window.electronAPI) {
      console.log('[Controller] Syncing playing state to presentation:', isPlaying)
      window.electronAPI.sendToPresentation(isPlaying ? 'play' : 'pause', {})
    }
  }, [isPlaying, presentationWindowOpen])

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const currentSlide = slides[currentSlideIndex]
  const nextSlide = currentSlideIndex + 1 < slides.length ? slides[currentSlideIndex + 1] : null
  const activeRange = sessionSlideRanges[currentSessionIndex]
  const activeSession = activeRange?.session

  return (
    <div className="h-screen flex flex-col bg-[#141414] text-slate-100">
      {/* Top bar — PowerPoint-achtig */}
      <header className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 bg-black/50 border-b border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition shrink-0"
            title={t('controller.closePresentation')}
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-white truncate">{name}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={selectedDisplay || ''}
            onChange={(e) => setSelectedDisplay(Number(e.target.value))}
            className="bg-slate-800 text-white px-2 py-1.5 rounded-lg text-xs max-w-[200px]"
          >
            {displays.map(d => (
              <option key={d.id} value={d.id}>
                {d.isPrimary ? `🖥️ ${t('controller.primaryDisplay')}` : `📺 ${t('controller.externalDisplay')}`} ({d.width}×{d.height})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={presentationWindowOpen ? closePresentationWindow : openPresentationWindow}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              presentationWindowOpen
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            {presentationWindowOpen ? t('controller.stopPresentation') : t('controller.startPresentation')}
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex min-h-0">
          {/* Links: timers + hoofddia + bediening */}
          <div className="flex-1 flex flex-col min-w-0 p-3 gap-2">
            <div className="flex justify-between items-center text-xs text-slate-500 px-1">
              <span className="tabular-nums">
                ⏱ {t('controller.elapsed')}: {formatTime(sessionElapsedTime[currentSessionIndex] || 0)}
                {getSessionTotalDuration(currentSessionIndex)
                  ? ` / ${formatTime(getSessionTotalDuration(currentSessionIndex))}`
                  : ''}
              </span>
              <span className="tabular-nums text-slate-400">
                {wallNow.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="flex-1 min-h-0 bg-black rounded-lg overflow-hidden flex items-center justify-center relative border border-slate-800 shadow-inner">
              {currentSlide?.isVideo ? (
                <>
                  <video
                    ref={videoRef}
                    src={currentSlide.url}
                    className="max-w-full max-h-full object-contain"
                    controls
                    muted={currentSlide.videoMuted ?? true}
                    onEnded={() => {
                      console.log('[Controller] Video onEnded triggered')
                      handleVideoEnded()
                    }}
                    onLoadedMetadata={(e) => {
                      if (currentSlide.videoStart > 0) {
                        e.target.currentTime = currentSlide.videoStart
                      }
                      e.target.volume = (currentSlide.videoVolume ?? 100) / 100
                    }}
                    onTimeUpdate={(e) => {
                      if (currentSlide.videoEnd && e.target.currentTime >= currentSlide.videoEnd) {
                        e.target.pause()
                        console.log('[Controller] Video reached end time, triggering handleVideoEnded')
                        handleVideoEnded()
                      }
                    }}
                  />
                  <div className="absolute top-3 left-3 bg-red-600/95 text-white px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
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

            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={resetToStart}
                  className="p-2.5 bg-red-800 hover:bg-red-700 rounded-lg transition"
                  title={`${t('controller.resetToStart')} (R)`}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (currentSessionIndex > 0) {
                      const prevSession = sessionSlideRanges[currentSessionIndex - 1]
                      goToSlide(prevSession.start)
                    }
                  }}
                  disabled={currentSessionIndex === 0}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg transition"
                  title={`${t('controller.previousSession')} (↑)`}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => goToSlide(currentSlideIndex - 1)}
                  disabled={currentSlideIndex === 0}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg transition"
                  title={`${t('controller.previousSlide')} (←)`}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  className={`p-3 rounded-full transition ${
                    isPlaying ? 'bg-amber-600 hover:bg-amber-700' : 'bg-primary-600 hover:bg-primary-700'
                  }`}
                  title={isPlaying ? `${t('controller.pause')} (Space)` : `${t('controller.play')} (Space)`}
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
                  type="button"
                  onClick={() => goToSlide(currentSlideIndex + 1)}
                  disabled={currentSlideIndex === slides.length - 1}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg transition"
                  title={`${t('controller.nextSlide')} (→)`}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (currentSessionIndex < sessionSlideRanges.length - 1) {
                      const nextSession = sessionSlideRanges[currentSessionIndex + 1]
                      goToSlide(nextSession.start)
                    }
                  }}
                  disabled={currentSessionIndex === sessionSlideRanges.length - 1}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg transition"
                  title={`${t('controller.nextSession')} (↓)`}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="text-[10px] text-slate-500 flex flex-wrap justify-center gap-x-3 gap-y-0.5 max-w-3xl">
                <span><kbd className="font-mono text-slate-400">Space</kbd> {t('controller.shortcuts.space')}</span>
                <span><kbd className="font-mono text-slate-400">←→</kbd> {t('controller.shortcuts.arrows')}</span>
                <span><kbd className="font-mono text-slate-400">↑↓</kbd> {t('controller.shortcuts.upDown')}</span>
                <span><kbd className="font-mono text-slate-400">R</kbd> {t('controller.shortcuts.reset')}</span>
              </div>
              <div className="text-xs text-slate-500">
                {t('controller.slide')} {currentSlideIndex + 1} {t('controller.of')} {slides.length}
                {' · '}
                {t('controller.session')} {currentSessionIndex + 1}/{sessionSlideRanges.length}
              </div>
            </div>
          </div>

          {/* Rechts: volgende dia + notities + muziek + sessies */}
          <aside className="w-[min(100%,20rem)] sm:w-80 xl:w-[22rem] flex-shrink-0 flex flex-col border-l border-slate-800 bg-[#0f0f0f] min-h-0">
            <div className="p-3 border-b border-slate-800 flex-shrink-0">
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                {t('controller.nextSlidePreview')}
              </h2>
              <div className="aspect-video bg-black rounded-md overflow-hidden flex items-center justify-center border border-slate-800">
                {nextSlide ? (
                  nextSlide.isVideo ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500">
                      <svg className="w-8 h-8 mb-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span className="text-xs">{t('controller.slide')} {currentSlideIndex + 2}</span>
                    </div>
                  ) : (
                    <img
                      src={nextSlide.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <span className="text-xs text-slate-600 px-2 text-center">{t('controller.endOfPresentation')}</span>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-[100px] flex flex-col p-3 border-b border-slate-800 overflow-hidden">
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                {t('controller.notes')}
              </h2>
              <div className="flex-1 overflow-y-auto rounded-md bg-amber-950/25 border border-amber-900/30 p-2.5 text-sm text-amber-100/90 leading-relaxed whitespace-pre-wrap">
                {activeSession?.speakerNotes?.trim()
                  ? activeSession.speakerNotes
                  : <span className="text-slate-600 text-xs">—</span>}
              </div>
            </div>

            <div className="flex-shrink-0 p-2 border-b border-slate-800 overflow-y-auto max-h-[38vh]">
              {activeSession && (
                <MusicPlayer
                  session={activeSession}
                  audioTracks={audioTracks}
                  isCurrentSession
                  shouldAutoPlay={false}
                  isPlaying={isPlaying}
                  shouldLoopAudio={
                    Boolean(
                      activeSession.manualDuration > 0 &&
                        audioDurations[currentSessionIndex] > 0 &&
                        activeSession.manualDuration > audioDurations[currentSessionIndex]
                    )
                  }
                  onAudioRefChange={(ref) => {
                    audioRefs.current[currentSessionIndex] = ref
                  }}
                  onAudioStateChange={(playing) => {
                    if (playing) setPlayingAudioSession(currentSessionIndex)
                    else setPlayingAudioSession(null)
                  }}
                  onAudioDuration={(dur) => {
                    setAudioDurations((prev) => ({ ...prev, [currentSessionIndex]: dur }))
                  }}
                  onAudioEnded={() => {
                    setAudioEnded((prev) => ({ ...prev, [currentSessionIndex]: true }))
                  }}
                />
              )}
            </div>

            <div className="flex-shrink-0 p-2 overflow-y-auto min-h-0 max-h-40">
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2 px-1">
                {t('controller.sessions')}
              </h2>
              <div className="flex flex-col gap-1" style={{ willChange: 'contents' }}>
                {sessionSlideRanges.map((range, sessionIdx) => {
                  const session = range.session
                  const isCurrentSession = sessionIdx === currentSessionIndex
                  const hasAudio = session.audio?.url || session.audio?.file || session.audioTracks?.length > 0
                  const colors = getSessionColors(session)
                  return (
                    <button
                      type="button"
                      key={`session-${sessionIdx}`}
                      onClick={() => goToSlide(range.start)}
                      className={`text-left rounded-lg px-2 py-1.5 border transition ${
                        isCurrentSession
                          ? `${colors.bg} border-l-4 ${colors.border}`
                          : 'border-transparent hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                            isCurrentSession ? `${colors.badge} text-white` : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {sessionIdx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className={`text-xs font-medium truncate ${isCurrentSession ? 'text-white' : 'text-slate-400'}`}>
                            {session.name || `${t('controller.session')} ${sessionIdx + 1}`}
                            <span className="ml-1">{colors.icon}</span>
                          </div>
                          {!isCurrentSession && hasAudio && (
                            <div className="text-[10px] text-slate-600">🎵 {t('controller.audioAvailable')}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>
        </div>

        {/* Filmstrook — alle dia's */}
        <div
          className="flex-shrink-0 h-[5.5rem] border-t border-slate-800 bg-black/40 flex items-stretch gap-1.5 px-2 py-1.5 overflow-x-auto"
          style={{ willChange: 'scroll-position' }}
        >
          <span className="text-[10px] text-slate-600 uppercase tracking-wide self-center pr-1 shrink-0 hidden sm:inline">
            {t('controller.allSlides')}
          </span>
          {slides.map((slide, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => goToSlide(idx)}
              className={`h-full aspect-video shrink-0 rounded overflow-hidden border-2 transition ${
                idx === currentSlideIndex
                  ? 'border-primary-500 ring-2 ring-primary-500/40 scale-[1.02]'
                  : 'border-slate-800 hover:border-slate-600 opacity-80 hover:opacity-100'
              }`}
            >
              {slide.isVideo ? (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              ) : (
                <img src={slide.url} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

}
