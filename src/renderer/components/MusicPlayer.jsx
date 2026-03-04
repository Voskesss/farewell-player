import { useState, useRef, useEffect } from 'react'

/**
 * MusicPlayer component - Geïntegreerde muziek speler
 * 
 * Ondersteunt:
 * - Embedded audio uit .farewell bestand
 * - Eigen lokale MP3 bestanden toevoegen
 * - Spotify embed (in-app)
 * - YouTube embed (in-app)
 */
export default function MusicPlayer({ 
  session, 
  audioTracks = [],
  externalMusic = [],
  isCurrentSession,
  onAudioStateChange
}) {
  const [activeTab, setActiveTab] = useState('embedded') // embedded, local, spotify, youtube
  const [localAudioUrl, setLocalAudioUrl] = useState(null)
  const [localAudioName, setLocalAudioName] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)

  // Bepaal welke audio beschikbaar is
  const hasEmbeddedAudio = session?.audio?.url
  const hasExternalMusic = externalMusic.length > 0
  const spotifyTrack = externalMusic.find(m => m.spotifyUrl)
  const youtubeTrack = externalMusic.find(m => m.youtubeUrl)

  // Extract Spotify track ID
  const getSpotifyEmbedUrl = (spotifyUrl) => {
    if (!spotifyUrl) return null
    const match = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/)
    if (match) {
      return `https://open.spotify.com/embed/track/${match[1]}?utm_source=generator&theme=0`
    }
    return null
  }

  // Extract YouTube video ID
  const getYouTubeEmbedUrl = (youtubeUrl) => {
    if (!youtubeUrl) return null
    const match = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0`
    }
    return null
  }

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
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
      onAudioStateChange?.(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
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
  const currentAudioUrl = activeTab === 'local' ? localAudioUrl : session?.audio?.url

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
        {spotifyTrack && (
          <button
            onClick={() => setActiveTab('spotify')}
            className={`flex-1 px-3 py-2 text-xs font-medium transition ${
              activeTab === 'spotify' 
                ? 'bg-green-600 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            🎧 Spotify
          </button>
        )}
        {youtubeTrack && (
          <button
            onClick={() => setActiveTab('youtube')}
            className={`flex-1 px-3 py-2 text-xs font-medium transition ${
              activeTab === 'youtube' 
                ? 'bg-red-600 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            ▶️ YouTube
          </button>
        )}
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
                    isPlaying ? 'bg-primary-500' : 'bg-slate-700'
                  }`}>
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {activeTab === 'local' ? localAudioName : (session?.audio?.file?.split('/').pop() || 'Audio')}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatTime(currentTime)} / {formatTime(duration)}
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
                      isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary-500 hover:bg-primary-600'
                    }`}
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
                  onEnded={() => setIsPlaying(false)}
                />

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

        {/* Spotify Embed */}
        {activeTab === 'spotify' && spotifyTrack && (
          <div>
            <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-2 mb-3">
              <p className="text-xs text-amber-400 flex items-center gap-1">
                <span>⚡</span> Vereist internetverbinding
              </p>
            </div>
            <iframe
              src={getSpotifyEmbedUrl(spotifyTrack.spotifyUrl)}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-lg"
            />
          </div>
        )}

        {/* YouTube Embed */}
        {activeTab === 'youtube' && youtubeTrack && (
          <div>
            <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-2 mb-3">
              <p className="text-xs text-amber-400 flex items-center gap-1">
                <span>⚡</span> Vereist internetverbinding
              </p>
            </div>
            <div className="aspect-video rounded-lg overflow-hidden">
              <iframe
                src={getYouTubeEmbedUrl(youtubeTrack.youtubeUrl)}
                width="100%"
                height="100%"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-lg"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
