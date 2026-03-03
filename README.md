# Farewell Player

Offline presentatie speler voor uitvaartpresentaties. Speelt `.farewell` bestanden af die zijn geëxporteerd vanuit The Last Farewell web-app.

## Features

- 🖥️ **Dual-screen support**: Controller op laptop, presentatie op extern scherm
- 🎵 **Audio playback**: MP3 bestanden embedded in presentatie
- 🎬 **Video support**: MP4 video slides
- ⌨️ **Keyboard shortcuts**: Spatie, pijltjes, Home, End, Escape
- 🔒 **Kiosk mode**: Fullscreen zonder afleidingen

## Development

```bash
# Installeer dependencies
npm install

# Start development mode
npm run dev
```

## Build

```bash
# Build voor macOS
npm run build:mac

# Build voor Windows
npm run build:win

# Build voor Linux
npm run build:linux
```

## Keyboard Shortcuts

| Toets | Actie |
|-------|-------|
| `Spatie` | Play/Pause |
| `→` | Volgende slide |
| `←` | Vorige slide |
| `Home` | Eerste slide |
| `End` | Laatste slide |
| `Escape` | Stop presentatie |

## .farewell Bestandsformaat

Een `.farewell` bestand is een ZIP-archief met:

```
presentatie.farewell
├── manifest.json      # Metadata en configuratie
├── slides/
│   ├── 001.jpg       # Slide afbeeldingen
│   ├── 002.jpg
│   └── ...
├── audio/
│   ├── 01_track.mp3  # Audio bestanden
│   └── ...
└── thumbnail.jpg      # Preview afbeelding
```

## License

MIT - The Last Farewell
