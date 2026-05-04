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
      padding: 16px;
      padding-bottom: env(safe-area-inset-bottom, 16px);
    }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    
    .header h1 {
      font-size: 20px;
      font-weight: 600;
      color: #94a3b8;
    }
    
    .header .title {
      font-size: 16px;
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
      margin-bottom: 20px;
      font-size: 14px;
      color: #94a3b8;
    }
    
    .status .playing {
      color: #22c55e;
    }
    
    .status .paused {
      color: #f59e0b;
    }
    
    /* Sessies grid */
    .sessions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
      max-height: 35vh;
      overflow-y: auto;
    }
    
    .session {
      background: #334155;
      border-radius: 12px;
      padding: 12px;
      border: 2px solid transparent;
    }
    
    .session.active {
      border-color: #3b82f6;
      background: #1e3a5f;
    }
    
    .session-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .session-name {
      font-weight: 600;
      font-size: 14px;
    }
    
    .session-info {
      font-size: 12px;
      color: #94a3b8;
    }
    
    .slides {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 4px;
    }
    
    .slide {
      width: 48px;
      height: 36px;
      background: #475569;
      border-radius: 6px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: #94a3b8;
      border: 2px solid transparent;
      cursor: pointer;
    }
    
    .slide.active {
      border-color: #3b82f6;
      background: #3b82f6;
      color: white;
    }
    
    .slide.video::after {
      content: '▶';
      font-size: 8px;
    }
    
    /* Grote controls */
    .main-controls {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .btn {
      border: none;
      border-radius: 16px;
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
      transform: scale(0.95);
      opacity: 0.8;
    }
    
    .btn-large {
      width: 80px;
      height: 80px;
      font-size: 32px;
    }
    
    .btn-play {
      background: #3b82f6;
      color: white;
    }
    
    .btn-play.playing {
      background: #f59e0b;
    }
    
    .btn-nav {
      width: 64px;
      height: 64px;
      background: #475569;
      color: white;
      font-size: 24px;
    }
    
    /* Navigatie knoppen */
    .nav-row {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .btn-session {
      flex: 1;
      max-width: 160px;
      height: 48px;
      background: #334155;
      color: white;
      font-size: 13px;
      gap: 6px;
    }
    
    /* Footer info */
    .footer {
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }
    
    .connection {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    
    .connection-dot {
      width: 8px;
      height: 8px;
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
        
        let slidesHTML = '';
        for (let i = range.start; i <= range.end; i++) {
          const slide = slides[i];
          const isSlideActive = i === state.currentSlideIndex;
          const isVideo = slide?.isVideo ? 'video' : '';
          slidesHTML += '<div class="slide ' + (isSlideActive ? 'active' : '') + ' ' + isVideo + '" onclick="send(\\'goToSlide\\', {index: ' + i + '})">' + (i + 1) + '</div>';
        }
        
        sessionsHTML += '<div class="session ' + (isActive ? 'active' : '') + '" onclick="send(\\'goToSession\\', {index: ' + idx + '})">' +
          '<div class="session-header">' +
            '<span class="session-name">' + name + '</span>' +
            '<span class="session-info">' + slideCount + ' slide' + (slideCount > 1 ? 's' : '') + '</span>' +
          '</div>' +
          '<div class="slides">' + slidesHTML + '</div>' +
        '</div>';
      });
      
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
          '<button class="btn btn-nav" onclick="send(\\'prevSlide\\')">◀</button>' +
          '<button class="btn btn-large btn-play ' + (state.isPlaying ? 'playing' : '') + '" onclick="send(\\'togglePlay\\')">' +
            (state.isPlaying ? '⏸' : '▶') +
          '</button>' +
          '<button class="btn btn-nav" onclick="send(\\'nextSlide\\')">▶</button>' +
        '</div>' +
        
        '<div class="nav-row">' +
          '<button class="btn btn-session" onclick="send(\\'prevSession\\')">◀◀ Vorige sessie</button>' +
          '<button class="btn btn-session" onclick="send(\\'nextSession\\')">Volgende sessie ▶▶</button>' +
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
