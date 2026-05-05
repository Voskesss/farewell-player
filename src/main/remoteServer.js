import express from 'express'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import { networkInterfaces } from 'os'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let server = null
let wss = null
let controllerWindow = null
let actualPort = null
let currentState = {
  presentation: null,
  currentSlideIndex: 0,
  isPlaying: false,
  sessionSlideRanges: []
}

// Genereer een willekeurige 4-cijferige PIN
let accessPin = null

function generatePin() {
  accessPin = String(Math.floor(1000 + Math.random() * 9000))
  return accessPin
}

export function getAccessPin() {
  return accessPin
}

export function getActualPort() {
  return actualPort
}

// Vind een vrije poort
function findFreePort(startPort, maxAttempts = 10) {
  return new Promise((resolve, reject) => {
    let attempts = 0
    
    function tryPort(port) {
      const testServer = createServer()
      
      testServer.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          attempts++
          if (attempts < maxAttempts) {
            tryPort(port + 1)
          } else {
            reject(new Error(`Geen vrije poort gevonden na ${maxAttempts} pogingen`))
          }
        } else {
          reject(err)
        }
      })
      
      testServer.once('listening', () => {
        testServer.close(() => {
          resolve(port)
        })
      })
      
      testServer.listen(port, '0.0.0.0')
    }
    
    tryPort(startPort)
  })
}

// Krijg lokale IP-adressen
export function getLocalIPs() {
  const nets = networkInterfaces()
  const results = []
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip loopback en non-IPv4
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address)
      }
    }
  }
  return results
}

// Start de remote server
export async function startRemoteServer(mainWindow, preferredPort = 3001) {
  controllerWindow = mainWindow
  
  // Genereer nieuwe PIN bij opstarten
  generatePin()
  console.log('[RemoteServer] Access PIN:', accessPin)
  
  // Vind vrije poort
  try {
    actualPort = await findFreePort(preferredPort)
    if (actualPort !== preferredPort) {
      console.log(`[RemoteServer] Port ${preferredPort} in use, using ${actualPort}`)
    }
  } catch (err) {
    console.error('[RemoteServer] Could not find free port:', err)
    actualPort = preferredPort // Probeer toch de gewenste poort
  }
  
  const app = express()
  
  // Serve PIN invoer pagina
  app.get('/', (req, res) => {
    res.send(getPinPageHTML())
  })
  
  // Valideer PIN en geef remote control pagina
  app.get('/remote', (req, res) => {
    const pin = req.query.pin
    if (pin !== accessPin) {
      return res.redirect('/?error=invalid')
    }
    res.send(getRemoteHTML())
  })
  
  // API endpoint voor huidige state
  app.get('/api/state', (req, res) => {
    res.json(currentState)
  })
  
  server = createServer(app)
  
  // WebSocket server voor realtime updates
  wss = new WebSocketServer({ server })
  
  wss.on('connection', (ws, req) => {
    // Check PIN in query string
    const url = new URL(req.url, `http://${req.headers.host}`)
    const pin = url.searchParams.get('pin')
    
    if (pin !== accessPin) {
      console.log('[RemoteServer] Client rejected - invalid PIN')
      ws.close(4001, 'Invalid PIN')
      return
    }
    
    console.log('[RemoteServer] Client connected (authenticated)')
    
    // Stuur huidige state naar nieuwe client
    ws.send(JSON.stringify({ type: 'state', data: currentState }))
    
    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message.toString())
        
        // Ping command - alleen voor heartbeat, niet doorsturen
        if (msg.command === 'ping') {
          // Stuur pong terug zodat client weet dat verbinding werkt
          ws.send(JSON.stringify({ type: 'pong' }))
          return
        }
        
        console.log('[RemoteServer] Received command:', msg.command)
        
        // Stuur commando naar controller window
        if (controllerWindow && !controllerWindow.isDestroyed()) {
          controllerWindow.webContents.send('remote-command', msg)
        }
      } catch (err) {
        console.error('[RemoteServer] Error parsing message:', err)
      }
    })
    
    ws.on('close', () => {
      console.log('[RemoteServer] Client disconnected')
    })
  })
  
  return new Promise((resolve) => {
    server.listen(actualPort, '0.0.0.0', () => {
      const ips = getLocalIPs()
      console.log(`[RemoteServer] Running on port ${actualPort}`)
      console.log('[RemoteServer] Available at:', ips.map(ip => `http://${ip}:${actualPort}`))
      resolve({ port: actualPort, ips })
    })
  })
}

// Stop de server
export function stopRemoteServer() {
  if (wss) {
    wss.clients.forEach(client => client.close())
    wss.close()
    wss = null
  }
  if (server) {
    server.close()
    server = null
  }
  console.log('[RemoteServer] Stopped')
}

// Update state en broadcast naar alle clients
export function updateRemoteState(newState) {
  currentState = { ...currentState, ...newState }
  
  if (wss) {
    const message = JSON.stringify({ type: 'state', data: currentState })
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message)
      }
    })
  }
}

// Genereer PIN invoer pagina
function getPinPageHTML() {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="theme-color" content="#0f172a">
  <title>Farewell Remote</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      color: white;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .logo { font-size: 48px; margin-bottom: 20px; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    p { color: #94a3b8; margin-bottom: 24px; font-size: 14px; }
    .pin-form { display: flex; flex-direction: column; align-items: center; gap: 16px; }
    .pin-inputs { display: flex; gap: 10px; }
    .pin-input {
      width: 50px;
      height: 60px;
      font-size: 24px;
      text-align: center;
      border: 2px solid #334155;
      border-radius: 10px;
      background: #1e293b;
      color: white;
      outline: none;
    }
    .pin-input:focus { border-color: #3b82f6; }
    .error { color: #ef4444; font-size: 13px; margin-top: -8px; }
    .btn {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 14px 32px;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      width: 100%;
      max-width: 230px;
    }
    .btn:active { background: #2563eb; }
    .hint { color: #64748b; font-size: 12px; margin-top: 24px; text-align: center; }
  </style>
</head>
<body>
  <div class="logo">🔒</div>
  <h1>Farewell Remote</h1>
  <p>Voer de PIN in die wordt getoond in de app</p>
  
  <form class="pin-form" onsubmit="submitPin(event)">
    <div class="pin-inputs">
      <input type="tel" class="pin-input" maxlength="1" pattern="[0-9]" inputmode="numeric" autofocus>
      <input type="tel" class="pin-input" maxlength="1" pattern="[0-9]" inputmode="numeric">
      <input type="tel" class="pin-input" maxlength="1" pattern="[0-9]" inputmode="numeric">
      <input type="tel" class="pin-input" maxlength="1" pattern="[0-9]" inputmode="numeric">
    </div>
    <div class="error" id="error" style="display:none;">Onjuiste PIN, probeer opnieuw</div>
    <button type="submit" class="btn">Verbinden</button>
  </form>
  
  <p class="hint">De PIN wordt getoond in Farewell Player<br>bij de Remote Control knop</p>
  
  <script>
    const inputs = document.querySelectorAll('.pin-input');
    const error = document.getElementById('error');
    
    // Check for error in URL
    if (location.search.includes('error=invalid')) {
      error.style.display = 'block';
    }
    
    // Auto-focus volgende input
    inputs.forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        if (e.target.value && idx < inputs.length - 1) {
          inputs[idx + 1].focus();
        }
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && idx > 0) {
          inputs[idx - 1].focus();
        }
      });
    });
    
    function submitPin(e) {
      e.preventDefault();
      const pin = Array.from(inputs).map(i => i.value).join('');
      if (pin.length === 4) {
        window.location.href = '/remote?pin=' + pin;
      }
    }
  </script>
</body>
</html>`;
}

// Genereer de remote control HTML pagina
function getRemoteHTML() {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="theme-color" content="#0f172a">
  <title>Farewell Remote</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }
    
    html {
      touch-action: manipulation;
      overflow: hidden;
      position: fixed;
      width: 100%;
      height: 100%;
      background-color: #0f172a;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #0f172a;
      color: white;
      min-height: 100vh;
      min-height: -webkit-fill-available;
      padding: 12px;
      padding-top: max(12px, env(safe-area-inset-top));
      padding-bottom: max(12px, env(safe-area-inset-bottom));
      padding-left: max(12px, env(safe-area-inset-left));
      padding-right: max(12px, env(safe-area-inset-right));
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: none;
    }
    
    .header {
      text-align: center;
      margin-bottom: 8px;
    }
    
    .header h1 {
      font-size: 16px;
      font-weight: 600;
      color: #94a3b8;
    }
    
    .header .title {
      font-size: 14px;
      color: #64748b;
      margin-top: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .status {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 8px;
      font-size: 12px;
      color: #94a3b8;
    }
    
    .status .time {
      font-family: monospace;
      font-size: 12px;
    }
    
    .status .playing {
      color: #22c55e;
    }
    
    .status .paused {
      color: #f59e0b;
    }
    
    .paused-banner {
      background: #f59e0b;
      color: #0f172a;
      text-align: center;
      padding: 8px;
      font-weight: 700;
      font-size: 14px;
      border-radius: 8px;
      margin-bottom: 12px;
    }
    
    /* Sessies */
    /* Actief tijdblok sectie */
    .active-session {
      margin-bottom: 12px;
    }
    
    .session {
      border-radius: 10px;
      padding: 10px;
      border-left: 4px solid;
    }
    
    .session.active-main {
      background: rgba(255,255,255,0.08);
    }
    
    /* Sessie kleuren - matchen met Controller */
    .session.color-0, .session-compact.color-0 { background: rgba(59,130,246,0.15); border-color: #3b82f6; }
    .session.color-1, .session-compact.color-1 { background: rgba(16,185,129,0.15); border-color: #10b981; }
    .session.color-2, .session-compact.color-2 { background: rgba(245,158,11,0.15); border-color: #f59e0b; }
    .session.color-3, .session-compact.color-3 { background: rgba(239,68,68,0.15); border-color: #ef4444; }
    .session.color-4, .session-compact.color-4 { background: rgba(168,85,247,0.15); border-color: #a855f7; }
    .session.color-5, .session-compact.color-5 { background: rgba(236,72,153,0.15); border-color: #ec4899; }
    .session.color-6, .session-compact.color-6 { background: rgba(6,182,212,0.15); border-color: #06b6d4; }
    .session.color-7, .session-compact.color-7 { background: rgba(217,70,239,0.15); border-color: #d946ef; }
    .session.color-8, .session-compact.color-8 { background: rgba(132,204,22,0.15); border-color: #84cc16; }
    
    /* Loop sessie */
    .session.loop, .session-compact.loop { border-style: dashed; }
    
    /* Speaker sessie */
    .session.speaker, .session-compact.speaker { background: rgba(139,92,246,0.2); border-color: #8b5cf6; }
    
    .session-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .session-name {
      font-weight: 600;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .session-badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(255,255,255,0.15);
    }
    
    .session-badge-small {
      font-size: 10px;
    }
    
    .session-info {
      font-size: 11px;
    }
    
    /* Scheiding tussen actief tijdblok en lijst */
    .section-divider {
      display: flex;
      align-items: center;
      margin: 6px 0;
      color: #64748b;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .section-divider::before,
    .section-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #334155;
    }
    
    .section-divider span {
      padding: 0 10px;
    }
    
    /* Alle tijdblokken - compact */
    .all-sessions {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 10px;
      max-height: 22vh;
      overflow-y: auto;
    }
    
    .session-compact {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 10px;
      border-radius: 6px;
      border-left: 3px solid;
      cursor: pointer;
      font-size: 12px;
    }
    
    .session-compact.active {
      box-shadow: 0 0 0 2px rgba(255,255,255,0.8);
      background: rgba(255,255,255,0.15) !important;
      font-weight: 600;
    }
    
    .session-compact:active {
      opacity: 0.7;
    }
    
    .session-compact .session-info {
      font-size: 11px;
      color: #94a3b8;
    }
    
    /* Slides met thumbnails */
    .slides {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 4px;
      -webkit-overflow-scrolling: touch;
    }
    
    .slide {
      width: 56px;
      height: 42px;
      background: #1e293b;
      border-radius: 6px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: #64748b;
      border: 2px solid transparent;
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }
    
    .slide img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      position: absolute;
      top: 0;
      left: 0;
    }
    
    .slide .number {
      position: relative;
      z-index: 1;
      background: rgba(0,0,0,0.6);
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 9px;
    }
    
    .slide.active {
      border-color: white;
      box-shadow: 0 0 8px rgba(255,255,255,0.4);
    }
    
    .slide.video::before {
      content: '';
      position: absolute;
      top: 4px;
      right: 4px;
      width: 0;
      height: 0;
      border-left: 6px solid white;
      border-top: 4px solid transparent;
      border-bottom: 4px solid transparent;
      z-index: 2;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
    }
    
    /* Grote controls */
    .main-controls {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      margin-bottom: 12px;
    }
    
    .btn {
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      transition: transform 0.1s, opacity 0.1s;
      -webkit-user-select: none;
      user-select: none;
    }
    
    .btn:active {
      transform: scale(0.92);
      opacity: 0.8;
    }
    
    .btn-large {
      width: 64px;
      height: 64px;
    }
    
    .btn-play {
      background: #3b82f6;
      color: white;
    }
    
    .btn-play.playing {
      background: #f59e0b;
    }
    
    .btn-play svg {
      width: 32px;
      height: 32px;
    }
    
    .btn-nav {
      width: 48px;
      height: 48px;
      background: #334155;
      color: white;
    }
    
    .btn-nav svg {
      width: 24px;
      height: 24px;
    }
    
    /* Navigatie knoppen */
    .nav-row {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 10px;
    }
    
    .btn-session {
      flex: 1;
      max-width: 140px;
      height: 38px;
      background: #334155;
      color: white;
      font-size: 11px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    
    /* Footer info */
    .footer {
      text-align: center;
      color: #64748b;
      font-size: 11px;
    }
    
    .connection {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    
    .connection-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
    }
    
    .connection-dot.disconnected {
      background: #ef4444;
    }
    
    .no-presentation {
      text-align: center;
      padding: 60px 20px;
      color: #64748b;
    }
    
    .no-presentation h2 {
      font-size: 18px;
      margin-bottom: 8px;
      color: #94a3b8;
    }
    
    .refresh-btn {
      margin-top: 20px;
      padding: 12px 24px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      cursor: pointer;
    }
    
    .refresh-btn:active {
      background: #2563eb;
    }
    
    /* Muziek panel - compact onder actieve sessie */
    .music-bar {
      background: #1e293b;
      border-radius: 8px;
      padding: 6px 10px;
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .music-bar.no-music {
      display: none;
    }
    
    .music-icon {
      font-size: 14px;
    }
    
    .music-info {
      flex: 1;
      min-width: 0;
    }
    
    .music-track {
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .music-status {
      font-size: 11px;
      color: #64748b;
    }
    
    .music-status.playing {
      color: #22c55e;
    }
    
    .music-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #334155;
      border: none;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    
    .music-btn:active {
      background: #475569;
    }
    
    .music-btn svg {
      width: 16px;
      height: 16px;
    }
    
  </style>
</head>
<body>
  <div id="app">
    <div class="no-presentation">
      <h2>Verbinden...</h2>
      <p>Wachten op presentatie</p>
    </div>
  </div>
  
  <script>
    // Taal - wordt overgenomen van de app, fallback naar browser
    let lang = 'nl';
    const browserLang = (navigator.language || navigator.userLanguage || 'nl').split('-')[0];
    lang = ['nl', 'en', 'de'].includes(browserLang) ? browserLang : 'nl';
    
    const translations = {
      nl: {
        title: 'Farewell Remote',
        connecting: 'Verbinden...',
        waitingPresentation: 'Wachten op presentatie',
        disconnected: 'Verbinding verbroken',
        reconnecting: 'Opnieuw verbinden...',
        noPresentation: 'Geen presentatie',
        openPresentation: 'Open een presentatie in Farewell Player',
        slide: 'Slide',
        of: 'van',
        playing: 'Speelt',
        paused: 'Gepauzeerd',
        slides: 'slides',
        loop: 'Loop',
        speaker: 'Spreker',
        prevSession: 'Vorig tijdblok',
        nextSession: 'Volgend tijdblok',
        connected: 'Verbonden',
        notConnected: 'Niet verbonden',
        session: 'Sessie',
        allSessions: 'Alle tijdblokken',
        refresh: 'Ververs',
        music: 'Muziek',
        noMusic: 'Geen muziek',
        musicPlaying: 'Speelt',
        musicPaused: 'Gestopt'
      },
      en: {
        title: 'Farewell Remote',
        connecting: 'Connecting...',
        waitingPresentation: 'Waiting for presentation',
        disconnected: 'Connection lost',
        reconnecting: 'Reconnecting...',
        noPresentation: 'No presentation',
        openPresentation: 'Open a presentation in Farewell Player',
        slide: 'Slide',
        of: 'of',
        playing: 'Playing',
        paused: 'Paused',
        slides: 'slides',
        loop: 'Loop',
        speaker: 'Speaker',
        prevSession: 'Previous session',
        nextSession: 'Next session',
        connected: 'Connected',
        notConnected: 'Not connected',
        session: 'Session',
        allSessions: 'All sessions',
        refresh: 'Refresh',
        music: 'Music',
        noMusic: 'No music',
        musicPlaying: 'Playing',
        musicPaused: 'Paused'
      },
      de: {
        title: 'Farewell Remote',
        connecting: 'Verbinden...',
        waitingPresentation: 'Warten auf Präsentation',
        disconnected: 'Verbindung getrennt',
        reconnecting: 'Erneut verbinden...',
        noPresentation: 'Keine Präsentation',
        openPresentation: 'Öffnen Sie eine Präsentation in Farewell Player',
        slide: 'Folie',
        of: 'von',
        playing: 'Läuft',
        paused: 'Pausiert',
        slides: 'Folien',
        loop: 'Schleife',
        speaker: 'Sprecher',
        prevSession: 'Vorheriger Block',
        nextSession: 'Nächster Block',
        connected: 'Verbunden',
        notConnected: 'Nicht verbunden',
        session: 'Sitzung',
        allSessions: 'Alle Blöcke',
        refresh: 'Aktualisieren',
        music: 'Musik',
        noMusic: 'Keine Musik',
        musicPlaying: 'Spielt',
        musicPaused: 'Angehalten'
      }
    };
    
    // Dynamische vertaling functie (update bij taal wijziging)
    function getT() {
      return translations[lang];
    }
    
    let state = {
      presentation: null,
      currentSlideIndex: 0,
      isPlaying: false,
      sessionSlideRanges: []
    };
    let ws = null;
    let connected = false;
    let hasReloaded = sessionStorage.getItem('farewell_reloaded') === 'true';
    
    // Safari iOS fix: auto-reload na 2s als nog geen presentatie (buiten WebSocket)
    if (!hasReloaded) {
      setTimeout(function() {
        if (!state.presentation) {
          console.log('Auto-reload: no presentation after 2s');
          sessionStorage.setItem('farewell_reloaded', 'true');
          location.reload();
        }
      }, 2000);
    }
    let lastCommandTime = 0;
    let lastActiveSessionIdx = -1;
    let lastSlideIdx = -1;
    let savedSlidesScrollLeft = 0; // Bewaar scroll positie van slides container
    const DEBOUNCE_MS = 300;
    
    function connect() {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Haal PIN uit URL query string
      const urlParams = new URLSearchParams(window.location.search);
      const pin = urlParams.get('pin') || '';
      ws = new WebSocket(protocol + '//' + location.host + '?pin=' + pin);
      
      ws.onopen = () => {
        connected = true;
        console.log('Connected to server');
        render();
        
        // Start heartbeat om verbinding te testen
        window.lastPong = Date.now();
        if (window.heartbeatInterval) clearInterval(window.heartbeatInterval);
        window.heartbeatInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            // Check of we recent een pong hebben ontvangen
            const timeSinceLastPong = Date.now() - (window.lastPong || 0);
            if (timeSinceLastPong > 30000) {
              // Meer dan 30 seconden geen pong - verbinding is dood
              console.log('No pong received in 30s, reconnecting...');
              ws.close();
              return;
            }
            // Stuur een ping
            try {
              ws.send(JSON.stringify({ command: 'ping' }));
            } catch(e) {
              console.log('Heartbeat failed, reconnecting...');
              ws.close();
            }
          }
        }, 10000); // Elke 10 seconden
      };
      
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'state') {
          state = msg.data;
          // Update taal als meegegeven door app
          if (state.language && ['nl', 'en', 'de'].includes(state.language)) {
            lang = state.language;
          }
          render();
        } else if (msg.type === 'pong') {
          // Heartbeat response - verbinding werkt
          window.lastPong = Date.now();
        }
      };
      
      ws.onclose = () => {
        connected = false;
        console.log('Disconnected, reconnecting...');
        if (window.heartbeatInterval) clearInterval(window.heartbeatInterval);
        render();
        setTimeout(connect, 2000);
      };
      
      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        ws.close();
      };
    }
    
    function send(command, data = {}) {
      // Debounce - voorkom snelle dubbele commands
      const now = Date.now();
      if (now - lastCommandTime < DEBOUNCE_MS) {
        console.log('Command debounced:', command);
        return;
      }
      lastCommandTime = now;
      
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('Sending command:', command);
        ws.send(JSON.stringify({ command, ...data }));
      } else {
        console.log('WebSocket not open, state:', ws?.readyState, '- reconnecting...');
        // Probeer te reconnecten
        if (ws) {
          try { ws.close(); } catch(e) {}
        }
        connect();
      }
    }
    
    function getSessionForSlide(slideIndex) {
      for (let i = 0; i < state.sessionSlideRanges.length; i++) {
        const r = state.sessionSlideRanges[i];
        if (slideIndex >= r.start && slideIndex <= r.end) return i;
      }
      return 0;
    }
    
    function formatTime(seconds) {
      if (!seconds && seconds !== 0) return '--:--';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return mins + ':' + (secs < 10 ? '0' : '') + secs;
    }
    
    function getSessionType(session) {
      if (session?.loop || session?.loopMode) return 'loop';
      if (session?.speakerMode || (!session?.audio?.url && !session?.audioTracks?.length)) return 'speaker';
      return 'normal';
    }
    
    function getMusicBarHTML() {
      const t = translations[lang]; // Haal actuele vertaling op
      const musicInfo = state.musicInfo;
      const playIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
      const pauseIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
      
      if (!musicInfo || !musicInfo.trackName) {
        return '<div class="music-bar no-music">' +
          '<span class="music-icon">🔇</span>' +
          '<div class="music-info">' +
            '<div class="music-track" style="color: #64748b;">' + t.noMusic + '</div>' +
          '</div>' +
        '</div>';
      }
      
      return '<div class="music-bar">' +
        '<span class="music-icon">🎵</span>' +
        '<div class="music-info">' +
          '<div class="music-track">' + musicInfo.trackName + '</div>' +
          '<div class="music-status ' + (musicInfo.isPlaying ? 'playing' : '') + '">' +
            (musicInfo.isPlaying ? '● ' + t.musicPlaying : '○ ' + t.musicPaused) +
          '</div>' +
        '</div>' +
        '<button class="music-btn" data-action="toggleMusic">' +
          (musicInfo.isPlaying ? pauseIcon : playIcon) +
        '</button>' +
      '</div>';
    }
    
    // Voorkom zoom bij dubbeltik
    document.addEventListener('dblclick', (e) => e.preventDefault());
    
    // Voorkom context menu
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    function render() {
      const app = document.getElementById('app');
      const t = translations[lang]; // Haal actuele vertaling op
      
      if (!connected) {
        app.innerHTML = '<div class="no-presentation"><h2>' + t.disconnected + '</h2><p>' + t.reconnecting + '</p><button class="refresh-btn" onclick="location.reload()">↻ ' + t.refresh + '</button></div>';
        return;
      }
      
      if (!state.presentation) {
        app.innerHTML = '<div class="no-presentation"><h2>' + t.noPresentation + '</h2><p>' + t.openPresentation + '</p><button class="refresh-btn" onclick="location.reload()">↻ ' + t.refresh + '</button></div>';
        return;
      }
      
      const currentSessionIdx = getSessionForSlide(state.currentSlideIndex);
      const slides = state.presentation.slides || [];
      
      // Bouw actief tijdblok HTML (bovenaan, met slides)
      let activeSessionHTML = '';
      const activeRange = state.sessionSlideRanges[currentSessionIdx];
      if (activeRange) {
        const session = activeRange.session || {};
        const name = session.name || t.session + ' ' + (currentSessionIdx + 1);
        const slideCount = activeRange.end - activeRange.start + 1;
        const sessionType = getSessionType(session);
        const colorClass = 'color-' + (currentSessionIdx % 9);
        
        let badge = '';
        if (sessionType === 'loop') badge = '<span class="session-badge">🔄 ' + t.loop + '</span>';
        else if (sessionType === 'speaker') badge = '<span class="session-badge">🎤 ' + t.speaker + '</span>';
        
        let slidesHTML = '';
        for (let i = activeRange.start; i <= activeRange.end; i++) {
          const slide = slides[i];
          const isSlideActive = i === state.currentSlideIndex;
          const isVideo = slide?.isVideo ? 'video' : '';
          const thumbnail = slide?.thumbnail;
          
          slidesHTML += '<div class="slide ' + (isSlideActive ? 'active' : '') + ' ' + isVideo + '" data-index="' + i + '">';
          if (thumbnail) {
            slidesHTML += '<img src="' + thumbnail + '" alt="" draggable="false" />';
          }
          slidesHTML += '<span class="number">' + (i + 1) + '</span>';
          slidesHTML += '</div>';
        }
        
        const typeClass = sessionType !== 'normal' ? sessionType : '';
        activeSessionHTML = '<div class="session active-main ' + colorClass + ' ' + typeClass + '">' +
          '<div class="session-header">' +
            '<span class="session-name">' + name + badge + '</span>' +
            '<span class="session-info">' + slideCount + ' ' + t.slides + '</span>' +
          '</div>' +
          '<div class="slides">' + slidesHTML + '</div>' +
        '</div>';
      }
      
      // Bouw alle tijdblokken HTML (compact, actieve is gemarkeerd)
      let allSessionsHTML = '';
      state.sessionSlideRanges.forEach((range, idx) => {
        const isActive = idx === currentSessionIdx;
        const session = range.session || {};
        const name = session.name || t.session + ' ' + (idx + 1);
        const slideCount = range.end - range.start + 1;
        const sessionType = getSessionType(session);
        const colorClass = 'color-' + (idx % 9);
        
        let badge = '';
        if (sessionType === 'loop') badge = '<span class="session-badge-small">🔄</span>';
        else if (sessionType === 'speaker') badge = '<span class="session-badge-small">🎤</span>';
        
        const typeClass = sessionType !== 'normal' ? sessionType : '';
        const activeClass = isActive ? 'active' : '';
        allSessionsHTML += '<div class="session-compact ' + colorClass + ' ' + typeClass + ' ' + activeClass + '" data-session="' + idx + '">' +
          '<span class="session-name">' + name + badge + '</span>' +
          '<span class="session-info">' + slideCount + ' ' + t.slides + '</span>' +
        '</div>';
      });
      
      // SVG icons voor play/pause
      const playIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
      const pauseIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
      const prevIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>';
      const nextIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
      
      // Bewaar slides scroll positie voor render
      const slidesContainer = document.querySelector('.active-session .slides');
      if (slidesContainer) {
        savedSlidesScrollLeft = slidesContainer.scrollLeft;
      }
      
      app.innerHTML =
        '<div class="header">' +
          '<h1>' + t.title + '</h1>' +
          '<div class="title">' + (state.presentation.name || 'Presentatie') + '</div>' +
        '</div>' +

        '<div class="status">' +
          '<span>' + t.slide + ' ' + (state.currentSlideIndex + 1) + ' ' + t.of + ' ' + slides.length + '</span>' +
          '<span class="time">⏱ ' + formatTime(state.timeInfo?.elapsed) +
            (state.timeInfo?.total ? ' / ' + formatTime(state.timeInfo.total) : '') +
          '</span>' +
          '<span class="' + (state.isPlaying ? 'playing' : 'paused') + '">' +
            (state.isPlaying ? '● ' + t.playing : '● ' + t.paused) +
          '</span>' +
        '</div>' +
        
        // Actief tijdblok bovenaan met slides
        '<div class="active-session">' + activeSessionHTML + '</div>' +
        
        // Muziek bar (compact, onder actieve sessie)
        getMusicBarHTML() +
        
        // Scheiding
        '<div class="section-divider"><span>' + t.allSessions + '</span></div>' +
        
        // Alle tijdblokken (actieve is gemarkeerd)
        '<div class="all-sessions">' + allSessionsHTML + '</div>' +
        
        '<div class="main-controls">' +
          '<button class="btn btn-nav" data-action="prevSlide">' + prevIcon + '</button>' +
          '<button class="btn btn-large btn-play ' + (state.isPlaying ? 'playing' : '') + '" data-action="togglePlay">' +
            (state.isPlaying ? pauseIcon : playIcon) +
          '</button>' +
          '<button class="btn btn-nav" data-action="nextSlide">' + nextIcon + '</button>' +
        '</div>' +
        
        '<div class="nav-row">' +
          '<button class="btn btn-session" data-action="prevSession">◀◀ ' + t.prevSession + '</button>' +
          '<button class="btn btn-session" data-action="nextSession">' + t.nextSession + ' ▶▶</button>' +
        '</div>' +
        
        '<div class="footer">' +
          '<div class="connection">' +
            '<span class="connection-dot ' + (connected ? '' : 'disconnected') + '"></span>' +
            '<span>' + (connected ? t.connected : t.notConnected) + '</span>' +
          '</div>' +
        '</div>';
      
      // Event delegation voor robuustere klik-handling
      attachEventListeners();

      // Scroll naar boven bij sessie wissel (actief tijdblok staat bovenaan)
      if (lastActiveSessionIdx !== currentSessionIdx) {
        lastActiveSessionIdx = currentSessionIdx;
        window.scrollTo(0, 0);
      }
      
      // Herstel of center slides scroll positie
      const newSlidesContainer = document.querySelector('.active-session .slides');
      if (newSlidesContainer) {
        if (lastSlideIdx !== state.currentSlideIndex) {
          // Slide wissel: center de actieve slide
          lastSlideIdx = state.currentSlideIndex;
          const activeSlide = newSlidesContainer.querySelector('.slide.active');
          if (activeSlide) {
            const slideLeft = activeSlide.offsetLeft;
            const slideWidth = activeSlide.offsetWidth;
            const containerWidth = newSlidesContainer.offsetWidth;
            const targetScroll = slideLeft - (containerWidth / 2) + (slideWidth / 2);
            newSlidesContainer.scrollLeft = Math.max(0, targetScroll);
          }
        } else {
          // Geen slide wissel: herstel vorige scroll positie
          newSlidesContainer.scrollLeft = savedSlidesScrollLeft;
        }
      }
    }

    // Track touch voor scroll vs tap detectie
    let touchStartY = 0;
    let touchStartX = 0;
    let touchStartTime = 0;
    let isScrolling = false;
    const SCROLL_THRESHOLD = 10; // pixels beweging voor scroll detectie
    const TAP_MAX_DURATION = 300; // ms
    
    document.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      touchStartTime = Date.now();
      isScrolling = false;
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
      const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
      const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
      if (deltaY > SCROLL_THRESHOLD || deltaX > SCROLL_THRESHOLD) {
        isScrolling = true;
      }
    }, { passive: true });
    
    function isTap() {
      const duration = Date.now() - touchStartTime;
      return !isScrolling && duration < TAP_MAX_DURATION;
    }
    
    function attachEventListeners() {
      const app = document.getElementById('app');
      const isTouchDevice = 'ontouchend' in window;
      
      // Buttons gebruiken click (werkt op beide)
      app.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const action = btn.dataset.action;
          send(action);
        });
      });
      
      // Slides en sessions: op touch devices check voor tap vs scroll
      app.querySelectorAll('.slide[data-index]').forEach(slide => {
        if (isTouchDevice) {
          slide.addEventListener('touchend', (e) => {
            if (!isTap()) return; // Was scrolling, niet reageren
            e.preventDefault();
            e.stopPropagation();
            const index = parseInt(slide.dataset.index, 10);
            if (!isNaN(index)) {
              send('goToSlide', { index });
            }
          }, { passive: false });
        } else {
          slide.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const index = parseInt(slide.dataset.index, 10);
            if (!isNaN(index)) {
              send('goToSlide', { index });
            }
          });
        }
      });
      
      // Compacte sessies (andere tijdblokken)
      app.querySelectorAll('.session-compact[data-session]').forEach(session => {
        if (isTouchDevice) {
          session.addEventListener('touchend', (e) => {
            if (!isTap()) return;
            e.preventDefault();
            e.stopPropagation();
            const index = parseInt(session.dataset.session, 10);
            if (!isNaN(index)) {
              send('goToSession', { index });
            }
          }, { passive: false });
        } else {
          session.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const index = parseInt(session.dataset.session, 10);
            if (!isNaN(index)) {
              send('goToSession', { index });
            }
          });
        }
      });
    }
    
    // Reconnect wanneer pagina weer zichtbaar wordt (mobiel: terugkomen van andere app)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('Page visible again, checking connection...');
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          console.log('Connection lost, reconnecting...');
          connect();
        } else {
          // Test of verbinding nog werkt met een ping
          try {
            ws.send(JSON.stringify({ command: 'ping' }));
          } catch(e) {
            console.log('Connection dead, reconnecting...');
            connect();
          }
        }
      }
    });
    
    // Safari iOS: pageshow event voor back/forward cache
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        console.log('Page restored from cache, reconnecting...');
        connect();
      }
    });
    
    // Start
    connect();
  </script>
</body>
</html>`;
}
