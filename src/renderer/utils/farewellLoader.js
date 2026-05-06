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
  
  // Verzamel slides die niet ingeladen konden worden, zodat we de gebruiker kunnen waarschuwen
  // zonder de hele presentatie te laten falen op één corrupte foto
  const failedSlides = []

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
      try {
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
        
        // isVideo: manifest mag expliciet zetten; anders extensie (FAREWELL_PLAYER_MANIFEST.md §4)
        const isVideoFromManifest = typeof info.isVideo === 'boolean' ? info.isVideo : isVideo

        slides.push({
          path,
          url,
          isVideo: isVideoFromManifest,
          type: isVideoFromManifest ? 'video' : 'image',
          pauseHere: info.pauseHere,
          duration: typeof info.duration === 'number' ? info.duration : undefined,
          // Video trim settings
          videoStart: info.videoStart || 0,
          videoEnd: info.videoEnd || null,
          videoDuration: info.videoDuration ?? null,
          videoMuted: videoMuted,
          videoVolume: info.videoVolume ?? 100,
          musicDucking: info.musicDucking || false
        })
      } catch (err) {
        // Eén corrupte foto/video mag de hele presentatie niet laten falen.
        // We loggen het en slaan de slide over.
        console.error(`[farewellLoader] Kon slide niet laden: ${path}`, err)
        failedSlides.push(path)
      }
    }
  }
  
  // Laad audio als blob URLs en koppel aan sessies
  const audioTracks = []
  const failedAudio = []
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
      try {
        const blob = await file.async('blob')
        const url = URL.createObjectURL(blob)
        const fullPath = `audio/${path}`
        
        audioTracks.push({
          path: fullPath,
          url,
          name: path.replace(/^\d+_/, '').replace(/\.(mp3|wav|m4a)$/i, '')
        })
      } catch (err) {
        console.error(`[farewellLoader] Kon audio niet laden: ${path}`, err)
        failedAudio.push(path)
      }
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
    try {
      const blob = await thumbnailFile.async('blob')
      thumbnailUrl = URL.createObjectURL(blob)
    } catch (err) {
      console.warn('[farewellLoader] Kon thumbnail niet laden', err)
    }
  }
  
  const manifestVersionStr = manifest.version != null ? String(manifest.version) : '1.0'
  const manifestCompatibilityWarning =
    /^1\./.test(manifestVersionStr)
      ? null
      : `Dit .farewell-bestand meldt manifest-versie "${manifestVersionStr}". Deze player is getest voor 1.x. Controleer of alles correct afspeelt.`

  // Bouw waarschuwing op als er items zijn overgeslagen door fouten
  let loadWarnings = null
  if (failedSlides.length > 0 || failedAudio.length > 0) {
    const parts = []
    if (failedSlides.length > 0) {
      parts.push(`${failedSlides.length} slide(s) overgeslagen door een fout: ${failedSlides.slice(0, 5).join(', ')}${failedSlides.length > 5 ? '…' : ''}`)
    }
    if (failedAudio.length > 0) {
      parts.push(`${failedAudio.length} audiotrack(s) overgeslagen door een fout: ${failedAudio.slice(0, 5).join(', ')}${failedAudio.length > 5 ? '…' : ''}`)
    }
    loadWarnings = parts.join('\n')
  }

  return {
    manifest,
    manifestCompatibilityWarning,
    loadWarnings,
    failedSlides,
    failedAudio,
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
