import express from 'express'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import { networkInterfaces } from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let server = null
let wss = null
let controllerWindow = null
let currentState = {
  presentation: null,
  currentSlideIndex: 0,
  isPlaying: false,
  sessionSlideRanges: []
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
export function startRemoteServer(mainWindow, port = 3001) {
  controllerWindow = mainWindow
  
  const app = express()
  
  // Serve static remote control page
  app.get('/', (req, res) => {
    res.send(getRemoteHTML())
  })
  
  // API endpoint voor huidige state
  app.get('/api/state', (req, res) => {
    res.json(currentState)
  })
  
  server = createServer(app)
  
  // WebSocket server voor realtime updates
  wss = new WebSocketServer({ server })
  
  wss.on('connection', (ws) => {
    console.log('[RemoteServer] Client connected')
    
    // Stuur huidige state naar nieuwe client
    ws.send(JSON.stringify({ type: 'state', data: currentState }))
    
    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message.toString())
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
  
  server.listen(port, '0.0.0.0', () => {
    const ips = getLocalIPs()
    console.log(`[RemoteServer] Running on port ${port}`)
    console.log('[RemoteServer] Available at:', ips.map(ip => `http://${ip}:${port}`))
  })
  
  return { port, ips: getLocalIPs() }
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

// Genereer de remote control HTML pagina
function getRemoteHTML() {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Farewell Remote</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      color: white;
      min-height: 100vh;
      padding: 12px;
      padding-bottom: env(safe-area-inset-bottom, 12px);
    }
    
    .header {
      text-align: center;
      margin-bottom: 16px;
    }
    
    .header h1 {
      font-size: 18px;
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
      gap: 16px;
      margin-bottom: 16px;
      font-size: 13px;
      color: #94a3b8;
    }
    
    .status .playing {
      color: #22c55e;
    }
    
    .status .paused {
      color: #f59e0b;
    }
    
    /* Sessies */
    .sessions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
      max-height: 45vh;
      overflow-y: auto;
    }
    
    .session {
      border-radius: 10px;
      padding: 10px;
      border-left: 4px solid;
    }
    
    /* Sessie kleuren - matchen met Controller */
    .session.color-0 { background: rgba(59,130,246,0.15); border-color: #3b82f6; }
    .session.color-1 { background: rgba(16,185,129,0.15); border-color: #10b981; }
    .session.color-2 { background: rgba(245,158,11,0.15); border-color: #f59e0b; }
    .session.color-3 { background: rgba(239,68,68,0.15); border-color: #ef4444; }
    .session.color-4 { background: rgba(168,85,247,0.15); border-color: #a855f7; }
    .session.color-5 { background: rgba(236,72,153,0.15); border-color: #ec4899; }
    .session.color-6 { background: rgba(6,182,212,0.15); border-color: #06b6d4; }
    .session.color-7 { background: rgba(217,70,239,0.15); border-color: #d946ef; }
    .session.color-8 { background: rgba(132,204,22,0.15); border-color: #84cc16; }
    
    .session.active {
      box-shadow: 0 0 0 2px white;
    }
    
    /* Loop sessie */
    .session.loop { border-style: dashed; }
    
    /* Speaker sessie */
    .session.speaker { background: rgba(139,92,246,0.2); border-color: #8b5cf6; }
    
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
    
    .session-info {
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
      gap: 20px;
      margin-bottom: 20px;
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
      width: 72px;
      height: 72px;
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
      width: 56px;
      height: 56px;
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
      gap: 10px;
      margin-bottom: 16px;
    }
    
    .btn-session {
      flex: 1;
      max-width: 150px;
      height: 44px;
      background: #334155;
      color: white;
      font-size: 12px;
      border-radius: 10px;
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
    let state = {
      presentation: null,
      currentSlideIndex: 0,
      isPlaying: false,
      sessionSlideRanges: []
    };
    let ws = null;
    let connected = false;
    
    function connect() {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(protocol + '//' + location.host);
      
      ws.onopen = () => {
        connected = true;
        console.log('Connected to server');
        render();
      };
      
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'state') {
          state = msg.data;
          render();
        }
      };
      
      ws.onclose = () => {
        connected = false;
        console.log('Disconnected, reconnecting...');
        render();
        setTimeout(connect, 2000);
      };
      
      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        ws.close();
      };
    }
    
    function send(command, data = {}) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ command, ...data }));
      }
    }
    
    function getSessionForSlide(slideIndex) {
      for (let i = 0; i < state.sessionSlideRanges.length; i++) {
        const r = state.sessionSlideRanges[i];
        if (slideIndex >= r.start && slideIndex <= r.end) return i;
      }
      return 0;
    }
    
    function getSessionType(session) {
      if (session?.loop || session?.loopMode) return 'loop';
      if (session?.speakerMode || (!session?.audio?.url && !session?.audioTracks?.length)) return 'speaker';
      return 'normal';
    }
    
    function render() {
      const app = document.getElementById('app');
      
      if (!connected) {
        app.innerHTML = '<div class="no-presentation"><h2>Verbinding verbroken</h2><p>Opnieuw verbinden...</p></div>';
        return;
      }
      
      if (!state.presentation) {
        app.innerHTML = '<div class="no-presentation"><h2>Geen presentatie</h2><p>Open een presentatie in Farewell Player</p></div>';
        return;
      }
      
      const currentSessionIdx = getSessionForSlide(state.currentSlideIndex);
      const slides = state.presentation.slides || [];
      
      let sessionsHTML = '';
      state.sessionSlideRanges.forEach((range, idx) => {
        const isActive = idx === currentSessionIdx;
        const session = range.session || {};
        const name = session.name || 'Sessie ' + (idx + 1);
        const slideCount = range.end - range.start + 1;
        const sessionType = getSessionType(session);
        const colorClass = 'color-' + (idx % 9);
        
        let badge = '';
        if (sessionType === 'loop') badge = '<span class="session-badge">🔄 Loop</span>';
        else if (sessionType === 'speaker') badge = '<span class="session-badge">🎤 Spreker</span>';
        
        let slidesHTML = '';
        for (let i = range.start; i <= range.end; i++) {
          const slide = slides[i];
          const isSlideActive = i === state.currentSlideIndex;
          const isVideo = slide?.isVideo ? 'video' : '';
          const thumbUrl = slide?.url || '';
          
          slidesHTML += '<div class="slide ' + (isSlideActive ? 'active' : '') + ' ' + isVideo + '" onclick="event.stopPropagation(); send(\\'goToSlide\\', {index: ' + i + '})">';
          if (thumbUrl && !slide?.isVideo) {
            slidesHTML += '<img src="' + thumbUrl + '" alt="" loading="lazy" />';
          }
          slidesHTML += '<span class="number">' + (i + 1) + '</span>';
          slidesHTML += '</div>';
        }
        
        const typeClass = sessionType !== 'normal' ? sessionType : '';
        sessionsHTML += '<div class="session ' + colorClass + ' ' + typeClass + ' ' + (isActive ? 'active' : '') + '" onclick="send(\\'goToSession\\', {index: ' + idx + '})">' +
          '<div class="session-header">' +
            '<span class="session-name">' + name + badge + '</span>' +
            '<span class="session-info">' + slideCount + ' slide' + (slideCount > 1 ? 's' : '') + '</span>' +
          '</div>' +
          '<div class="slides">' + slidesHTML + '</div>' +
        '</div>';
      });
      
      // SVG icons voor play/pause
      const playIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
      const pauseIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
      const prevIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>';
      const nextIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
      
      app.innerHTML = 
        '<div class="header">' +
          '<h1>Farewell Remote</h1>' +
          '<div class="title">' + (state.presentation.name || 'Presentatie') + '</div>' +
        '</div>' +
        
        '<div class="status">' +
          '<span>Slide ' + (state.currentSlideIndex + 1) + ' / ' + slides.length + '</span>' +
          '<span class="' + (state.isPlaying ? 'playing' : 'paused') + '">' + 
            (state.isPlaying ? '● Speelt' : '● Gepauzeerd') + 
          '</span>' +
        '</div>' +
        
        '<div class="sessions">' + sessionsHTML + '</div>' +
        
        '<div class="main-controls">' +
          '<button class="btn btn-nav" onclick="send(\\'prevSlide\\')">' + prevIcon + '</button>' +
          '<button class="btn btn-large btn-play ' + (state.isPlaying ? 'playing' : '') + '" onclick="send(\\'togglePlay\\')">' +
            (state.isPlaying ? pauseIcon : playIcon) +
          '</button>' +
          '<button class="btn btn-nav" onclick="send(\\'nextSlide\\')">' + nextIcon + '</button>' +
        '</div>' +
        
        '<div class="nav-row">' +
          '<button class="btn btn-session" onclick="send(\\'prevSession\\')">◀◀ Vorige</button>' +
          '<button class="btn btn-session" onclick="send(\\'nextSession\\')">Volgende ▶▶</button>' +
        '</div>' +
        
        '<div class="footer">' +
          '<div class="connection">' +
            '<span class="connection-dot ' + (connected ? '' : 'disconnected') + '"></span>' +
            '<span>' + (connected ? 'Verbonden' : 'Niet verbonden') + '</span>' +
          '</div>' +
        '</div>';
    }
    
    // Start
    connect();
  </script>
</body>
</html>`;
}
