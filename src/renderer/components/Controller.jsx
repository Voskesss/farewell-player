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
        bottomAccent: 'bg-emerald-500',
        icon: '🔄'
      }
    }
    if (session.speakerMode) {
      return {
        border: 'border-violet-400',
        bg: 'bg-violet-500/20',
        text: 'text-violet-300',
        badge: 'bg-violet-500',
        bottomAccent: 'bg-violet-500',
        icon: '🎤'
      }
    }
    return {
      border: 'border-blue-400',
      bg: 'bg-blue-500/20',
      text: 'text-blue-300',
      badge: 'bg-blue-500',
      bottomAccent: 'bg-blue-500',
      icon: '🎵'
    }
  }

  /** Unieke rand/vulkleur per tijdblok (volgorde); icoon blijft uit getSessionColors */
  const BLOCK_PALETTE = useMemo(
    () => [
      { border: 'border-sky-400', bottomAccent: 'bg-sky-600', badge: 'bg-sky-600', bg: 'bg-sky-500/15', text: 'text-sky-200' },
      { border: 'border-teal-400', bottomAccent: 'bg-teal-600', badge: 'bg-teal-600', bg: 'bg-teal-500/15', text: 'text-teal-200' },
      { border: 'border-amber-400', bottomAccent: 'bg-amber-600', badge: 'bg-amber-600', bg: 'bg-amber-500/15', text: 'text-amber-200' },
      { border: 'border-rose-400', bottomAccent: 'bg-rose-600', badge: 'bg-rose-600', bg: 'bg-rose-500/15', text: 'text-rose-200' },
      { border: 'border-indigo-400', bottomAccent: 'bg-indigo-600', badge: 'bg-indigo-600', bg: 'bg-indigo-500/15', text: 'text-indigo-200' },
      { border: 'border-cyan-400', bottomAccent: 'bg-cyan-600', badge: 'bg-cyan-600', bg: 'bg-cyan-500/15', text: 'text-cyan-200' },
      { border: 'border-fuchsia-400', bottomAccent: 'bg-fuchsia-600', badge: 'bg-fuchsia-600', bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-200' },
      { border: 'border-lime-400', bottomAccent: 'bg-lime-600', badge: 'bg-lime-600', bg: 'bg-lime-500/15', text: 'text-lime-200' }
    ],
    []
  )

  const getSessionBlockColors = useCallback(
    (session, sessionIndex) => {
      const base = getSessionColors(session)
      const p = BLOCK_PALETTE[sessionIndex % BLOCK_PALETTE.length]
      return { ...base, ...p }
    },
    [BLOCK_PALETTE]
  )

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

  const getSessionIndexForSlide = useCallback(
    (slideIndex) => {
      for (let i = 0; i < sessionSlideRanges.length; i++) {
        const r = sessionSlideRanges[i]
        if (slideIndex >= r.start && slideIndex <= r.end) return i
      }
      return 0
    },
    [sessionSlideRanges]
  )

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

  // Bediening altijd fullscreen (zelfde venster als app); bij terug naar startscherm weer uit
  useEffect(() => {
    if (!window.electronAPI?.setMainWindowFullscreen) return undefined
    window.electronAPI.setMainWindowFullscreen(true).catch(() => {})
    return () => {
      window.electronAPI.setMainWindowFullscreen(false).catch(() => {})
    }
  }, [])

  // Geen dubbel geluid: zelfde video speelde in controller én op publieksscherm
  useEffect(() => {
    const v = videoRef.current
    if (!v || !slides[currentSlideIndex]?.isVideo) return
    if (presentationWindowOpen) {
      v.muted = true
      v.volume = 0
    } else {
      const s = slides[currentSlideIndex]
      v.muted = s.videoMuted ?? true
      v.volume = (s.videoVolume ?? 100) / 100
    }
  }, [presentationWindowOpen, currentSlideIndex, slides])

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
        {/* Midden: huidige + volgende dia naast elkaar | rechts: alle tijdblokken + muziek */}
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 min-w-0 flex flex-col p-3 pt-2 gap-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 shrink-0">
              <span className="tabular-nums font-medium text-slate-300">
                ⏱ {t('controller.elapsed')}: {formatTime(sessionElapsedTime[currentSessionIndex] || 0)}
                {getSessionTotalDuration(currentSessionIndex)
                  ? ` / ${formatTime(getSessionTotalDuration(currentSessionIndex))}`
                  : ''}
              </span>
              <span className="tabular-nums font-medium text-slate-300">
                {wallNow.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="flex-1 min-h-0 flex gap-3 lg:gap-4">
              <div className="flex-1 min-w-0 min-h-0 flex flex-col">
                <div className="flex-1 min-h-0 bg-black rounded-lg overflow-hidden flex items-center justify-center relative border border-slate-700/80 shadow-inner">
                  {currentSlide?.isVideo ? (
                    <>
                      <video
                        ref={videoRef}
                        src={currentSlide.url}
                        className="max-w-full max-h-full object-contain"
                        controls={!presentationWindowOpen}
                        muted={
                          presentationWindowOpen ? true : (currentSlide.videoMuted ?? true)
                        }
                        onEnded={() => {
                          console.log('[Controller] Video onEnded triggered')
                          handleVideoEnded()
                        }}
                        onLoadedMetadata={(e) => {
                          if (currentSlide.videoStart > 0) {
                            e.target.currentTime = currentSlide.videoStart
                          }
                          if (presentationWindowOpen) {
                            e.target.muted = true
                            e.target.volume = 0
                          } else {
                            e.target.volume = (currentSlide.videoVolume ?? 100) / 100
                          }
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
              </div>

              <div className="w-[30%] min-w-[10.5rem] max-w-xs lg:max-w-sm shrink-0 flex flex-col gap-2 min-h-0">
                <h2 className="text-sm font-normal text-slate-200 shrink-0">
                  {t('controller.nextSlidePreview')}
                </h2>
                <div className="flex-1 min-h-0 min-w-0 bg-black rounded-lg overflow-hidden flex items-center justify-center border border-slate-700 shadow-md">
                  {nextSlide ? (
                    nextSlide.isVideo ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-2">
                        <svg className="w-10 h-10 mb-1 opacity-80 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        <span className="text-xs text-center">{t('controller.slide')} {currentSlideIndex + 2}</span>
                      </div>
                    ) : (
                      <img
                        src={nextSlide.url}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    )
                  ) : (
                    <span className="text-xs text-slate-500 px-2 text-center">{t('controller.endOfPresentation')}</span>
                  )}
                </div>
                {nextSlide && (
                  <p className="text-center text-xs text-slate-500 shrink-0">
                    {t('controller.slide')} {currentSlideIndex + 2} {t('controller.of')} {slides.length}
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0 px-0.5">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                <span>
                  {t('controller.slide')} {currentSlideIndex + 1} {t('controller.of')} {slides.length}
                </span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-300"
                  style={{
                    width: slides.length ? `${((currentSlideIndex + 1) / slides.length) * 100}%` : '0%'
                  }}
                />
              </div>
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

          <aside className="w-72 xl:w-80 flex-shrink-0 flex flex-col border-l border-slate-800 bg-[#0c0c0c] min-h-0">
            <h2 className="text-sm font-medium text-slate-100 px-3 pt-3 pb-2 shrink-0 border-b border-slate-800">
              {t('controller.timeBlocks')}
            </h2>
            <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-2">
              {sessionSlideRanges.map((range, sessionIdx) => {
                const session = range.session
                const isCurrentSession = sessionIdx === currentSessionIndex
                const hasAudio = session.audio?.url || session.audio?.file || session.audioTracks?.length > 0
                const colors = getSessionBlockColors(session, sessionIdx)
                const slideCount = range.end - range.start + 1
                return (
                  <button
                    type="button"
                    key={`session-${sessionIdx}`}
                    onClick={() => goToSlide(range.start)}
                    className={`w-full text-left rounded-lg p-3 border transition ${
                      isCurrentSession
                        ? `${colors.bg} border-l-4 ${colors.border} ring-1 ring-white/10`
                        : `border-slate-800 border-l-4 ${colors.border} bg-slate-900/50 hover:bg-slate-800/80`
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 text-white ${colors.badge}`}
                      >
                        {sessionIdx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-medium truncate ${isCurrentSession ? 'text-white' : 'text-slate-200'}`}>
                          {session.name || `${t('controller.session')} ${sessionIdx + 1}`}
                          <span className="ml-1">{colors.icon}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {slideCount} {t('controller.slides')}
                          {hasAudio && ` · 🎵`}
                        </div>
                        {isCurrentSession && (
                          <div className={`text-xs font-mono mt-1 tabular-nums ${colors.text}`}>
                            ⏱ {formatTime(sessionElapsedTime[sessionIdx] || 0)}
                            {getSessionTotalDuration(sessionIdx)
                              ? ` / ${formatTime(getSessionTotalDuration(sessionIdx))}`
                              : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="shrink-0 border-t border-slate-800 p-2 max-h-[40vh] overflow-y-auto">
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
          </aside>
        </div>
        {/* Filmstrook — alle dia's (groter, PowerPoint-achtig + dia-nummer) */}
        <div
          className="flex-shrink-0 min-h-[11rem] h-[22vh] max-h-[260px] border-t border-slate-800 bg-[#0a0a0a] flex flex-col gap-1.5 py-2 pl-3 pr-2"
          style={{ willChange: 'scroll-position' }}
        >
          <div className="text-xs text-slate-500 font-medium shrink-0">
            {t('controller.allSlides')} · {t('controller.slide')} {currentSlideIndex + 1} {t('controller.of')} {slides.length}
          </div>
          <div className="flex-1 min-h-0 flex items-stretch gap-2 sm:gap-2.5 overflow-x-auto overflow-y-hidden pb-1 scroll-smooth">
            {slides.map((slide, idx) => {
              const sIdx = getSessionIndexForSlide(idx)
              const range = sessionSlideRanges[sIdx]
              const sc = getSessionBlockColors(range.session, sIdx)
              const isFirstInBlock = idx === range.start && sIdx > 0
              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => goToSlide(idx)}
                  className={`flex flex-col shrink-0 h-full max-h-full w-[7.5rem] sm:w-36 md:w-40 rounded-lg overflow-hidden border-[3px] transition-all ${
                    isFirstInBlock ? 'ml-2 border-l-2 border-l-slate-500 pl-2 rounded-l-none' : ''
                  } ${
                    idx === currentSlideIndex
                      ? 'border-orange-500 shadow-[0_0_0_1px_rgba(249,115,22,0.5)] scale-[1.03] z-10'
                      : 'border-slate-700 hover:border-slate-500 opacity-90 hover:opacity-100 hover:scale-[1.01]'
                  }`}
                >
                  <div className="flex-1 min-h-0 w-full bg-black relative">
                    {slide.isVideo ? (
                      <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                        <svg className="w-7 h-7 sm:w-8 sm:h-8 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    ) : (
                      <img src={slide.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    )}
                  </div>
                  <div
                    className={`shrink-0 text-center text-[11px] sm:text-xs py-1 font-medium tabular-nums text-white ${
                      idx === currentSlideIndex ? 'bg-orange-600' : sc.bottomAccent
                    }`}
                  >
                    {idx + 1}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )

}
