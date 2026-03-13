# Farewell Player - Release Instructies

## Stap 1: Upload naar GitHub Releases

1. Ga naar: https://github.com/Voskesss/farewell-player/releases
2. Klik **"Create a new release"**
3. Tag: `v1.0.0`
4. Titel: `Farewell Player 1.0.0`
5. Upload de bestanden:
   - **macOS**: `dist/Farewell Player-1.0.0-universal.dmg` (179 MB - werkt op Intel + Apple Silicon)
   - **Windows**: `dist/Farewell Player Setup 1.0.0.exe` (van Windows computer)
6. Klik **"Publish release"**

## Stap 2: Download URL's invullen in Admin

Na publicatie zijn de download URL's:

- **macOS**: `https://github.com/Voskesss/farewell-player/releases/download/v1.0.0/Farewell.Player-1.0.0-universal.dmg`
- **Windows**: `https://github.com/Voskesss/farewell-player/releases/download/v1.0.0/Farewell.Player.Setup.1.0.0.exe`

Vul deze in bij:
- Admin → Export & Muziek → Farewell Player Download
- macOS Download URL (.dmg)
- Windows Download URL (.exe)

## Nieuwe versie uitbrengen

Bij een nieuwe versie (bijv. 1.1.0):

1. Update `version` in `package.json`
2. Bouw op Mac: `npm run build:mac`
3. Bouw op Windows: `npm run build:win`
4. Maak nieuwe GitHub release met tag `v1.1.0`
5. Upload beide bestanden
6. Update versienummer en URL's in admin

## Auto-updates

De app checkt automatisch op updates via GitHub releases. Gebruikers krijgen een melding als er een nieuwe versie beschikbaar is.
