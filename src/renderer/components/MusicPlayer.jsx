import { useState, useRef, useEffect } from 'react'

/**
 * MusicPlayer component - Geïntegreerde muziek speler
 * 
 * Ondersteunt:
 * - Meerdere embedded audio tracks uit .farewell bestand
 * - Eigen lokale MP3 bestanden toevoegen
 * - Playlist functionaliteit met next/prev
 * - Loop modus voor sessies
 */
export default function MusicPlayer({ 
  session, 
  audioTracks = [],
  isCurrentSession,
  onAudioStateChange,
  isPlaying: externalIsPlaying = false,  // Playing state van Controller
  onAudioRefChange,  // Callback om audio element ref door te geven aan controller
  onAudioDuration,   // Callback wanneer audio duur bekend is
  onAudioEnded,      // Callback wanneer audio klaar is
  shouldLoopAudio = false  // True als handmatige duur > audio duur
}) {
  const [activeTab, setActiveTab] = useState('embedded') // embedded, local
  const [localAudioUrl, setLocalAudioUrl] = useState(null)
  const [localAudioName, setLocalAudioName] = useState(null)
  const [internalIsPlaying, setInternalIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const audioRef = useRef(null)

  // Haal alle embedded tracks op (meerdere tracks per sessie)
  const embeddedTracks = session?.audioTracks?.length > 0 
    ? session.audioTracks 
    : (session?.audio?.url || session?.audio?.file ? [session.audio] : [])
  
  const hasEmbeddedAudio = embeddedTracks.length > 0 && embeddedTracks.some(t => t?.url)
  const currentTrack = embeddedTracks[currentTrackIndex]
  
  // Debug logging
  console.log('MusicPlayer session:', session?.id, 'audioTracks:', session?.audioTracks, 'audio:', session?.audio, 'embeddedTracks:', embeddedTracks)

  // Lokaal bestand selecteren
  const handleSelectLocalFile = async () => {
    if (window.electronAPI) {
      const filePath = await window.electronAPI.openAudioDialog()
      if (filePath) {
        // Lees bestand en maak blob URL
        const buffer = await window.electronAPI.readFile(filePath)
        if (buffer) {
          const blob = new Blob([buffer], { type: 'audio/mpeg' })
          const url = URL.createObjectURL(blob)
          
          // Cleanup oude URL
          if (localAudioUrl) {
            URL.revokeObjectURL(localAudioUrl)
          }
          
          setLocalAudioUrl(url)
          setLocalAudioName(filePath.split('/').pop())
          setActiveTab('local')
        }
      }
    }
  }

  // Audio controls
  const togglePlay = () => {
    if (audioRef.current) {
      if (internalIsPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setInternalIsPlaying(!internalIsPlaying)
      onAudioStateChange?.(!internalIsPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration
      setDuration(dur)
      // Geef duur door aan Controller voor sessie timing
      if (onAudioDuration && dur > 0) {
        console.log('[MusicPlayer] Audio duration:', dur)
        onAudioDuration(dur)
      }
    }
  }

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    if (audioRef.current) {
      audioRef.current.currentTime = percent * duration
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (localAudioUrl) {
        URL.revokeObjectURL(localAudioUrl)
      }
    }
  }, [localAudioUrl])

  // Bepaal huidige audio source
  const currentAudioUrl = activeTab === 'local' ? localAudioUrl : currentTrack?.url

  // Ga naar volgende track
  const handleEnded = () => {
    if (currentTrackIndex < embeddedTracks.length - 1) {
      setCurrentTrackIndex(currentTrackIndex + 1)
      setCurrentTime(0)
    } else {
      setInternalIsPlaying(false)
      onAudioStateChange?.(false)
    }
  }

  // Ga naar vorige track
  const goToPrevTrack = () => {
    if (currentTrackIndex > 0) {
      setCurrentTrackIndex(currentTrackIndex - 1)
      setCurrentTime(0)
    }
  }

  // Ga naar volgende track
  const goToNextTrack = () => {
    if (currentTrackIndex < embeddedTracks.length - 1) {
      setCurrentTrackIndex(currentTrackIndex + 1)
      setCurrentTime(0)
    } else if (session?.loop) {
      setCurrentTrackIndex(0)
      setCurrentTime(0)
    }
  }

  // Reset track index wanneer sessie verandert
  useEffect(() => {
    setCurrentTrackIndex(0)
    setCurrentTime(0)
  }, [session?.id])

  // Stop muziek wanneer sessie niet meer actief is
  useEffect(() => {
    if (!isCurrentSession && audioRef.current && internalIsPlaying) {
      console.log('[MusicPlayer] Stopping audio - session no longer active:', session?.id)
      audioRef.current.pause()
      setInternalIsPlaying(false)
      onAudioStateChange?.(false)
    }
  }, [isCurrentSession, session?.id, internalIsPlaying, onAudioStateChange])

  // Sync externe isPlaying state met audio element
  useEffect(() => {
    if (!audioRef.current || !currentAudioUrl) return
    
    if (externalIsPlaying && !internalIsPlaying) {
      console.log('[MusicPlayer] Starting audio (external play):', session?.id)
      audioRef.current.play().then(() => {
        setInternalIsPlaying(true)
        onAudioStateChange?.(true)
      }).catch(err => {
        console.warn('[MusicPlayer] Play blocked:', err)
      })
    } else if (!externalIsPlaying && internalIsPlaying) {
      console.log('[MusicPlayer] Pausing audio (external pause):', session?.id)
      audioRef.current.pause()
      setInternalIsPlaying(false)
      onAudioStateChange?.(false)
    }
  }, [externalIsPlaying, internalIsPlaying, currentAudioUrl, session?.id, onAudioStateChange])

  // Geef audio ref door aan controller via callback
  useEffect(() => {
    if (onAudioRefChange && audioRef.current) {
      onAudioRefChange(audioRef.current)
    }
  }, [onAudioRefChange, audioRef.current])

  return (
    <div className={`rounded-lg overflow-hidden ${isCurrentSession ? 'bg-slate-800' : 'bg-slate-800/50'}`}>
      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {hasEmbeddedAudio && (
          <button
            onClick={() => setActiveTab('embedded')}
            className={`flex-1 px-3 py-2 text-xs font-medium transition ${
              activeTab === 'embedded' 
                ? 'bg-primary-600 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            🎵 Embedded
          </button>
        )}
        <button
          onClick={() => setActiveTab('local')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition ${
            activeTab === 'local' 
              ? 'bg-primary-600 text-white' 
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          📁 Eigen MP3
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Embedded of Local Audio */}
        {(activeTab === 'embedded' || activeTab === 'local') && (
          <div>
            {activeTab === 'local' && !localAudioUrl ? (
              <button
                onClick={handleSelectLocalFile}
                className="w-full p-4 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-primary-500 hover:text-primary-400 transition"
              >
                <div className="text-center">
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <p className="text-sm font-medium">Selecteer MP3 bestand</p>
                  <p className="text-xs mt-1">Klik om eigen muziek toe te voegen</p>
                </div>
              </button>
            ) : currentAudioUrl ? (
              <div>
                {/* Track info */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    internalIsPlaying ? 'bg-primary-500' : 'bg-slate-700'
                  }`}>
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {activeTab === 'local' 
                        ? localAudioName 
                        : (currentTrack?.name || currentTrack?.file?.split('/').pop() || 'Audio')}
                      {session?.loop && <span className="ml-2 text-xs text-amber-400">🔁</span>}
                    </p>
                    <p className="text-xs text-slate-400 tabular-nums">
                      {formatTime(currentTime)} / {formatTime(duration)}
                      {embeddedTracks.length > 1 && activeTab === 'embedded' && (
                        <span> • Track {currentTrackIndex + 1}/{embeddedTracks.length}</span>
                      )}
                      {session?.loop && ' • herhalend'}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div 
                  className="h-2 bg-slate-700 rounded-full cursor-pointer mb-3"
                  onClick={handleSeek}
                >
                  <div 
                    className="h-full bg-primary-500 rounded-full transition-all"
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => { if (audioRef.current) audioRef.current.currentTime -= 10 }}
                    className="p-2 text-slate-400 hover:text-white transition"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={togglePlay}
                    className={`p-4 rounded-full transition ${
                      internalIsPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary-500 hover:bg-primary-600'
                    }`}
                  >
                    {internalIsPlaying ? (
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
                    onClick={() => { if (audioRef.current) audioRef.current.currentTime += 10 }}
                    className="p-2 text-slate-400 hover:text-white transition"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
                    </svg>
                  </button>
                </div>

                {/* Hidden audio element */}
                <audio
                  ref={audioRef}
                  src={currentAudioUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => {
                    // Bepaal of we moeten loopen: sessie loop OF handmatige duur langer dan audio
                    const shouldLoop = session?.loop || shouldLoopAudio
                    
                    // Bij meerdere tracks: ga naar volgende
                    if (activeTab === 'embedded' && embeddedTracks.length > 1) {
                      if (currentTrackIndex < embeddedTracks.length - 1) {
                        // Volgende track
                        setCurrentTrackIndex(prev => prev + 1)
                        setTimeout(() => {
                          if (audioRef.current) {
                            audioRef.current.play()
                          }
                        }, 100)
                        return
                      } else if (shouldLoop) {
                        // Loop: terug naar eerste track
                        console.log('[MusicPlayer] Looping back to first track (shouldLoop:', shouldLoop, ')')
                        setCurrentTrackIndex(0)
                        setTimeout(() => {
                          if (audioRef.current) {
                            audioRef.current.play()
                          }
                        }, 100)
                        return
                      }
                    }
                    // Enkele track met loop
                    if (shouldLoop && embeddedTracks.length === 1) {
                      console.log('[MusicPlayer] Looping single track (shouldLoop:', shouldLoop, ')')
                      if (audioRef.current) {
                        audioRef.current.currentTime = 0
                        audioRef.current.play()
                      }
                      return
                    }
                    // Geen loop: audio is klaar - meld aan Controller
                    console.log('[MusicPlayer] Audio ended - notifying controller')
                    setInternalIsPlaying(false)
                    onAudioStateChange?.(false)
                    onAudioEnded?.()  // Trigger sessie stop check
                  }}
                />

                {/* Track navigatie voor meerdere tracks */}
                {activeTab === 'embedded' && embeddedTracks.length > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-slate-700">
                    <button
                      onClick={goToPrevTrack}
                      disabled={currentTrackIndex === 0}
                      className={`p-2 rounded-lg transition ${
                        currentTrackIndex === 0 
                          ? 'text-slate-600 cursor-not-allowed' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
                      </svg>
                    </button>
                    <div className="flex gap-1">
                      {embeddedTracks.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentTrackIndex(idx)}
                          className={`w-2 h-2 rounded-full transition ${
                            idx === currentTrackIndex ? 'bg-primary-500' : 'bg-slate-600 hover:bg-slate-500'
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={goToNextTrack}
                      disabled={currentTrackIndex === embeddedTracks.length - 1 && !session?.loop}
                      className={`p-2 rounded-lg transition ${
                        currentTrackIndex === embeddedTracks.length - 1 && !session?.loop
                          ? 'text-slate-600 cursor-not-allowed' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 18l8.5-6L6 6v12zm2 0V6l6.5 6L8 18zm8-12v12h2V6h-2z" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Verander muziek knop voor local */}
                {activeTab === 'local' && localAudioUrl && (
                  <button
                    onClick={handleSelectLocalFile}
                    className="w-full mt-3 p-2 text-xs text-slate-400 hover:text-white border border-slate-600 rounded-lg transition"
                  >
                    Andere muziek kiezen
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-slate-500">
                <p className="text-sm">Geen audio beschikbaar</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
