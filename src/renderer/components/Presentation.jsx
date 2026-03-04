import { useState, useEffect, useRef } from 'react'

export default function Presentation({
  presentation,
  currentSlideIndex,
  isPlaying,
  onVideoEnded
}) {
  const [displayedSlideIndex, setDisplayedSlideIndex] = useState(currentSlideIndex)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const videoRef = useRef(null)

  // Sync met controller
  useEffect(() => {
    if (currentSlideIndex !== displayedSlideIndex) {
      setIsTransitioning(true)
      
      // Fade out, dan switch, dan fade in
      setTimeout(() => {
        setDisplayedSlideIndex(currentSlideIndex)
        setIsTransitioning(false)
      }, 500) // Half van transition duration
    }
  }, [currentSlideIndex, displayedSlideIndex])

  // Auto-play video's wanneer slide verandert
  useEffect(() => {
    const currentSlide = presentation?.slides[displayedSlideIndex]
    if (videoRef.current && currentSlide?.isVideo) {
      // Reset video naar begin en speel af
      videoRef.current.currentTime = 0
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
    if (onVideoEnded) {
      onVideoEnded()
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
  const transitionDuration = presentation.settings?.transitionDuration || 1000

  return (
    <div className="presentation-slide bg-black w-screen h-screen overflow-hidden">
      {currentSlide?.isVideo ? (
        <video
          ref={videoRef}
          src={currentSlide.url}
          className="w-full h-full object-cover"
          style={{
            opacity: isTransitioning ? 0 : 1,
            transition: `opacity ${transitionDuration / 2}ms ease-in-out`
          }}
          autoPlay
          muted={false}
          onEnded={handleVideoEnded}
        />
      ) : (
        <img
          src={currentSlide?.url}
          alt=""
          className="w-full h-full object-cover"
          style={{
            opacity: isTransitioning ? 0 : 1,
            transition: `opacity ${transitionDuration / 2}ms ease-in-out`
          }}
        />
      )}
    </div>
  )
}
