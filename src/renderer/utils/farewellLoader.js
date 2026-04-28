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
  
  // Bouw een map van slide info uit manifest sessies (voor video trim settings)
  const slideInfoMap = {}
  let slideIdx = 0
  for (const session of (manifest.sessions || [])) {
    for (const slideInfo of (session.slides || [])) {
      // slideInfo kan een string zijn (oude format) of object (nieuwe format met video settings)
      const fileName = typeof slideInfo === 'string' ? slideInfo : slideInfo.file
      slideInfoMap[fileName] = typeof slideInfo === 'object' ? slideInfo : { file: fileName }
      slideIdx++
    }
  }
  
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
      
      // Haal video trim settings uit manifest
      const info = slideInfoMap[path] || {}
      
      // Bepaal video audio: gebruik videoAudioEnabled als beschikbaar, anders videoMuted
      // videoAudioEnabled = true betekent geluid AAN (nieuw format)
      // videoMuted = false betekent geluid AAN (oud format)
      let videoMuted = true  // default: muted
      if (info.videoAudioEnabled !== undefined) {
        // Nieuw format: videoAudioEnabled = true -> muted = false
        videoMuted = !info.videoAudioEnabled
      } else if (info.videoMuted !== undefined) {
        // Oud format: gebruik direct
        videoMuted = info.videoMuted
      }
      
      slides.push({
        path,
        url,
        isVideo,
        type: isVideo ? 'video' : 'image',
        // Video trim settings
        videoStart: info.videoStart || 0,
        videoEnd: info.videoEnd || null,
        videoMuted: videoMuted,
        videoVolume: info.videoVolume ?? 100,
        musicDucking: info.musicDucking || false
      })
    }
  }
  
  // Laad audio als blob URLs en koppel aan sessies
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
      const fullPath = `audio/${path}`
      
      audioTracks.push({
        path: fullPath,
        url,
        name: path.replace(/^\d+_/, '').replace(/\.(mp3|wav|m4a)$/i, '')
      })
    }
  }
  
  // Koppel audio URLs aan sessies (ondersteun meerdere tracks)
  console.log('All loaded audio tracks:', audioTracks.map(t => t.path))
  
  const sessionsWithAudio = (manifest.sessions || []).map(session => {
    let updatedSession = { ...session }
    
    // Helper functie om audio te matchen (flexibel met extensies)
    const findAudioTrack = (manifestFile) => {
      if (!manifestFile) return null
      const fileName = manifestFile.split('/').pop()
      const fileNameWithoutExt = fileName.replace(/\.(mp3|wav|m4a|ogg)$/i, '')
      
      // Probeer exacte match, bestandsnaam match, of match zonder extensie
      return audioTracks.find(t => {
        const trackFileName = t.path.split('/').pop()
        const trackNameWithoutExt = trackFileName.replace(/\.(mp3|wav|m4a|ogg)$/i, '')
        
        return t.path === manifestFile || 
          t.path === `audio/${fileName}` ||
          t.path.endsWith(fileName) ||
          trackNameWithoutExt === fileNameWithoutExt
      })
    }
    
    // Koppel enkele audio track (backwards compatibility)
    if (session.audio?.file) {
      const matchingTrack = findAudioTrack(session.audio.file)
      console.log('Single audio match:', session.audio.file, '->', matchingTrack?.path)
      if (matchingTrack) {
        updatedSession.audio = {
          ...session.audio,
          url: matchingTrack.url
        }
      }
    }
    
    // Koppel meerdere audio tracks
    if (session.audioTracks?.length > 0) {
      console.log('Session', session.id, 'audioTracks from manifest:', session.audioTracks.map(t => t.file))
      updatedSession.audioTracks = session.audioTracks.map(track => {
        const matchingTrack = findAudioTrack(track.file)
        console.log('Multi audio match:', track.file, '->', matchingTrack?.path)
        return {
          ...track,
          url: matchingTrack?.url || null
        }
      }).filter(t => t.url)
      console.log('Matched audioTracks:', updatedSession.audioTracks.length)
    }
    
    return updatedSession
  })
  
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
    sessions: sessionsWithAudio,
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
