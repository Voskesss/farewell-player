import { useState, useEffect } from 'react'
import Controller from './components/Controller'
import Presentation from './components/Presentation'
import DropZone from './components/DropZone'
import { loadFarewellFile } from './utils/farewellLoader'

export default function App() {
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

    window.electronAPI.onPresentationCommand(({ command, data }) => {
      switch (command) {
        case 'load':
          setPresentation(data.presentation)
          setCurrentSlideIndex(0)
          break
        case 'goto':
          setCurrentSlideIndex(data.index)
          break
        case 'next':
          setCurrentSlideIndex(prev => Math.min(prev + 1, (presentation?.slides?.length || 1) - 1))
          break
        case 'prev':
          setCurrentSlideIndex(prev => Math.max(prev - 1, 0))
          break
        case 'play':
          setIsPlaying(true)
          break
        case 'pause':
          setIsPlaying(false)
          break
      }
    })

    return () => {
      window.electronAPI?.removePresentationCommandListener()
    }
  }, [isPresentationMode, presentation])

  // Bestand laden
  const handleFileLoad = async (filePath) => {
    try {
      const data = await loadFarewellFile(filePath)
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

  // Presentatie modus - toon alleen de slide
  if (isPresentationMode) {
    return (
      <Presentation
        presentation={presentation}
        currentSlideIndex={currentSlideIndex}
        isPlaying={isPlaying}
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
