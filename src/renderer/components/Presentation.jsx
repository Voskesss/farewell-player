import { useState, useEffect, useRef, useMemo } from 'react'

// Bepaal welke sessie bij een globale slide index hoort (voor per-sessie transition)
function getSessionForSlideIndex(presentation, globalIndex) {
  if (!presentation?.sessions?.length) return null
  let count = 0
  for (const session of presentation.sessions) {
    const n = session.slides?.length || 0
    if (globalIndex < count + n) return session
    count += n
  }
  return presentation.sessions[0] || null
}

export default function Presentation({
  presentation,
  currentSlideIndex,
  isPlaying,
  onVideoEnded
}) {
  const [displayedSlideIndex, setDisplayedSlideIndex] = useState(currentSlideIndex)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [prevSlideIndex, setPrevSlideIndex] = useState(null)
  const videoRef = useRef(null)

  // Bepaal transition type: per sessie of globaal
  const transitionType = useMemo(() => {
    const session = getSessionForSlideIndex(presentation, currentSlideIndex)
    return session?.transition || presentation?.settings?.transition || 'fade'
  }, [presentation, currentSlideIndex])

  const transitionDuration = presentation?.settings?.transitionDuration || 1000
  const halfDuration = transitionType === 'none' ? 0 : transitionDuration / 2

  const getTransitionClass = () => {
    switch (transitionType) {
      case 'wipe':
        return 'farewell-wipe'
      case 'zoom':
        return 'farewell-zoom'
      case 'fadeBlack':
        return 'farewell-fade-black'
      case 'fade':
        return 'farewell-fade'
      default:
        return ''
    }
  }

  // Sync met controller: pas transition toe op basis van type
  useEffect(() => {
    if (currentSlideIndex !== displayedSlideIndex) {
      if (transitionType === 'none') {
        // Direct wisselen
        setPrevSlideIndex(null)
        setDisplayedSlideIndex(currentSlideIndex)
        setIsTransitioning(false)
      } else {
        // Animatie: bewaar vorige slide voor wipe/zoom
        setPrevSlideIndex(displayedSlideIndex)
        setIsTransitioning(true)

        setTimeout(() => {
          setDisplayedSlideIndex(currentSlideIndex)
          setIsTransitioning(false)
          setPrevSlideIndex(null)
        }, halfDuration)
      }
    }
  }, [currentSlideIndex, displayedSlideIndex, transitionType, halfDuration])

  // Auto-play video's wanneer slide verandert
  useEffect(() => {
    const currentSlide = presentation?.slides[displayedSlideIndex]
    if (videoRef.current && currentSlide?.isVideo) {
      // Reset video naar starttijd (trim) en speel af
      videoRef.current.currentTime = currentSlide.videoStart || 0
      videoRef.current.volume = (currentSlide.videoVolume ?? 100) / 100
      videoRef.current.muted = currentSlide.videoMuted ?? true
      videoRef.current.play().catch(err => {
        console.warn('Video autoplay geblokkeerd:', err)
      })
    }
  }, [displayedSlideIndex, presentation])

  // Pauzeer/hervat video op basis van isPlaying
  useEffect(() => {
    if (videoRef.current && presentation?.slides[displayedSlideIndex]?.isVideo) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {})
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying, displayedSlideIndex, presentation])

  // Video ended handler
  const handleVideoEnded = () => {
    console.log('[Presentation] Video ended, calling onVideoEnded')
    if (onVideoEnded) {
      onVideoEnded()
    }
  }

  // Video time update handler - stop bij eindtijd (trim)
  const handleVideoTimeUpdate = (e) => {
    const currentSlide = presentation?.slides[displayedSlideIndex]
    if (currentSlide?.videoEnd && e.target.currentTime >= currentSlide.videoEnd) {
      e.target.pause()
      // Trigger video ended
      handleVideoEnded()
    }
  }

  if (!presentation || !presentation.slides || presentation.slides.length === 0) {
    return (
      <div className="presentation-slide">
        <div className="text-white text-2xl">Wachten op presentatie...</div>
      </div>
    )
  }

  const currentSlide = presentation.slides[displayedSlideIndex]
  const prevSlide = prevSlideIndex != null ? presentation.slides[prevSlideIndex] : null

  return (
    <div className="presentation-slide bg-black w-screen h-screen overflow-hidden">
      {/* Onderlaag: vorige slide (voor wipe/zoom effect) */}
      {(transitionType === 'wipe' || transitionType === 'zoom') && prevSlide && (
        <img
          src={prevSlide.url}
          alt=""
          className="w-full h-full object-cover"
          style={{ position: 'absolute', inset: 0, zIndex: 0 }}
          aria-hidden="true"
        />
      )}

      {/* Huidige slide met animatie */}
      {currentSlide?.isVideo ? (
        <video
          key={displayedSlideIndex}
          ref={videoRef}
          src={currentSlide.url}
          className={`w-full h-full object-cover ${getTransitionClass()}`}
          style={{ position: 'absolute', inset: 0, zIndex: 1 }}
          autoPlay
          muted={currentSlide.videoMuted ?? true}
          onEnded={handleVideoEnded}
          onTimeUpdate={handleVideoTimeUpdate}
        />
      ) : (
        <img
          key={displayedSlideIndex}
          src={currentSlide?.url}
          alt=""
          className={`w-full h-full object-cover ${getTransitionClass()}`}
          style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        />
      )}
    </div>
  )
}
