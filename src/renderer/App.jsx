import { useState, useEffect } from 'react'
import Controller from './components/Controller'
import Presentation from './components/Presentation'
import DropZone from './components/DropZone'
import ErrorBoundary from './components/ErrorBoundary'
import UpdateNotification from './components/UpdateNotification'
import { I18nProvider } from './i18n'
import { loadFarewellFile } from './utils/farewellLoader'

function AppContent() {
  const [presentation, setPresentation] = useState(null)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPresentationMode, setIsPresentationMode] = useState(false)

  // Check of we in presentatie modus zijn (via URL hash)
  useEffect(() => {
    const checkMode = () => {
      setIsPresentationMode(window.location.hash === '#/presentation')
    }
    checkMode()
    window.addEventListener('hashchange', checkMode)
    return () => window.removeEventListener('hashchange', checkMode)
  }, [])

  // Luister naar commando's van controller (alleen in presentatie modus)
  useEffect(() => {
    if (!isPresentationMode || !window.electronAPI) return

    console.log('[Presentation Window] Listening for commands...')

    window.electronAPI.onPresentationCommand(({ command, data }) => {
      console.log('[Presentation Window] Received command:', command, data)
      switch (command) {
        case 'load':
          console.log('[Presentation Window] Loading presentation:', data.presentation?.name, 'slides:', data.presentation?.slides?.length)
          setPresentation(data.presentation)
          setCurrentSlideIndex(0)
          break
        case 'goto':
          console.log('[Presentation Window] Going to slide:', data.index)
          setCurrentSlideIndex(data.index)
          break
        case 'next':
          setCurrentSlideIndex(prev => Math.min(prev + 1, (presentation?.slides?.length || 1) - 1))
          break
        case 'prev':
          setCurrentSlideIndex(prev => Math.max(prev - 1, 0))
          break
        case 'play':
          console.log('[Presentation Window] Playing')
          setIsPlaying(true)
          break
        case 'pause':
          console.log('[Presentation Window] Pausing')
          setIsPlaying(false)
          break
      }
    })

    return () => {
      window.electronAPI?.removePresentationCommandListener()
    }
  }, [isPresentationMode, presentation])

  // Afstandsbediening / toetsenbord: keys op het presentatievenster gaan naar de controller
  // (veel clickers sturen PageDown/PageUp of pijltjes; zonder dit bereikt de key alleen dit venster)
  useEffect(() => {
    if (!isPresentationMode || !window.electronAPI) return

    const forward = (command) => {
      window.electronAPI.sendToController(command, {}).catch(() => {})
    }

    const onKeyDown = (e) => {
      switch (e.code) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault()
          forward('remoteNextSlide')
          break
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault()
          forward('remotePrevSlide')
          break
        case 'Space':
          e.preventDefault()
          forward('remotePlayPause')
          break
        case 'Period':
        case 'NumpadDecimal':
          e.preventDefault()
          forward('remoteNextSlide')
          break
        case 'Comma':
          e.preventDefault()
          forward('remotePrevSlide')
          break
        case 'Enter':
        case 'NumpadEnter':
          e.preventDefault()
          forward('remoteNextSlide')
          break
        case 'MediaPlayPause':
          e.preventDefault()
          forward('remotePlayPause')
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isPresentationMode])

  // Bestand laden
  const handleFileLoad = async (filePath) => {
    try {
      const data = await loadFarewellFile(filePath)
      if (data.manifestCompatibilityWarning) {
        console.warn('[App]', data.manifestCompatibilityWarning)
        alert(data.manifestCompatibilityWarning)
      }
      setPresentation(data)
      setCurrentSlideIndex(0)
      
      // Stuur ook naar presentatie venster als die open is
      if (window.electronAPI) {
        window.electronAPI.sendToPresentation('load', { presentation: data })
      }
    } catch (error) {
      console.error('Fout bij laden presentatie:', error)
      alert('Kon presentatie niet laden: ' + error.message)
    }
  }

  // Handler voor video ended in presentatie modus - stuur naar controller
  const handleVideoEnded = () => {
    console.log('[App] handleVideoEnded called, sending to controller')
    if (window.electronAPI) {
      window.electronAPI.sendToController('videoEnded')
    }
  }

  // Presentatie modus - toon alleen de slide
  if (isPresentationMode) {
    return (
      <Presentation
        presentation={presentation}
        currentSlideIndex={currentSlideIndex}
        isPlaying={isPlaying}
        onVideoEnded={handleVideoEnded}
      />
    )
  }

  // Controller modus
  if (!presentation) {
    return <DropZone onFileLoad={handleFileLoad} />
  }

  return (
    <Controller
      presentation={presentation}
      currentSlideIndex={currentSlideIndex}
      setCurrentSlideIndex={setCurrentSlideIndex}
      isPlaying={isPlaying}
      setIsPlaying={setIsPlaying}
      onClose={() => setPresentation(null)}
    />
  )
}

// Wrap de hele app in ErrorBoundary en I18nProvider
export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <AppContent />
        <UpdateNotification />
      </I18nProvider>
    </ErrorBoundary>
  )
}
