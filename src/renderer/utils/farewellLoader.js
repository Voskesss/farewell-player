import JSZip from 'jszip'

/**
 * Laad en parse een .farewell bestand
 * @param {string} filePath - Pad naar het .farewell bestand
 * @returns {Object} Presentatie data met slides, audio, en manifest
 */
export async function loadFarewellFile(filePath) {
  // Lees bestand via Electron API
  const buffer = await window.electronAPI.readFile(filePath)
  
  if (!buffer) {
    throw new Error('Kon bestand niet lezen')
  }

  // Parse ZIP
  const zip = await JSZip.loadAsync(buffer)
  
  // Lees manifest
  const manifestFile = zip.file('manifest.json')
  if (!manifestFile) {
    throw new Error('Geen manifest.json gevonden in presentatie')
  }
  
  const manifestText = await manifestFile.async('text')
  const manifest = JSON.parse(manifestText)
  
  // Laad slides als blob URLs
  const slides = []
  const slidesFolder = zip.folder('slides')
  
  if (slidesFolder) {
    const slideFiles = []
    slidesFolder.forEach((relativePath, file) => {
      if (!file.dir) {
        slideFiles.push({ path: relativePath, file })
      }
    })
    
    // Sorteer op bestandsnaam (001.jpg, 002.jpg, etc.)
    slideFiles.sort((a, b) => a.path.localeCompare(b.path))
    
    for (const { path, file } of slideFiles) {
      const blob = await file.async('blob')
      const url = URL.createObjectURL(blob)
      const isVideo = /\.(mp4|webm|mov)$/i.test(path)
      
      slides.push({
        path,
        url,
        isVideo,
        type: isVideo ? 'video' : 'image'
      })
    }
  }
  
  // Laad audio als blob URLs
  const audioTracks = []
  const audioFolder = zip.folder('audio')
  
  if (audioFolder) {
    const audioFiles = []
    audioFolder.forEach((relativePath, file) => {
      if (!file.dir) {
        audioFiles.push({ path: relativePath, file })
      }
    })
    
    // Sorteer op bestandsnaam
    audioFiles.sort((a, b) => a.path.localeCompare(b.path))
    
    for (const { path, file } of audioFiles) {
      const blob = await file.async('blob')
      const url = URL.createObjectURL(blob)
      
      audioTracks.push({
        path,
        url,
        name: path.replace(/^\d+_/, '').replace(/\.(mp3|wav|m4a)$/i, '')
      })
    }
  }
  
  // Laad thumbnail indien aanwezig
  let thumbnailUrl = null
  const thumbnailFile = zip.file('thumbnail.jpg')
  if (thumbnailFile) {
    const blob = await thumbnailFile.async('blob')
    thumbnailUrl = URL.createObjectURL(blob)
  }
  
  return {
    manifest,
    slides,
    audioTracks,
    thumbnailUrl,
    name: manifest.name || 'Presentatie',
    sessions: manifest.sessions || [],
    settings: manifest.settings || {
      transition: 'fade',
      transitionDuration: 1000,
      defaultSlideDuration: 5
    },
    externalMusic: manifest.externalMusic || []
  }
}

/**
 * Cleanup blob URLs wanneer presentatie wordt gesloten
 * @param {Object} presentation - Presentatie data
 */
export function cleanupPresentation(presentation) {
  if (!presentation) return
  
  // Revoke slide URLs
  presentation.slides?.forEach(slide => {
    if (slide.url) URL.revokeObjectURL(slide.url)
  })
  
  // Revoke audio URLs
  presentation.audioTracks?.forEach(track => {
    if (track.url) URL.revokeObjectURL(track.url)
  })
  
  // Revoke thumbnail
  if (presentation.thumbnailUrl) {
    URL.revokeObjectURL(presentation.thumbnailUrl)
  }
}
