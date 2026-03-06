# Auto-Updates voor Farewell Player

Dit document beschrijft hoe het auto-update systeem werkt en welke stappen nodig zijn om het in productie te nemen.

---

## Hoe Het Werkt

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Jouw Computer  │     │  GitHub Releases │     │  Gebruiker PC   │
│  (development)  │────▶│  (hosting)       │────▶│  (Farewell App) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
     npm run build           latest.yml              auto-download
     + upload                + .dmg/.exe             + install
```

### Flow:

1. **Jij bouwt nieuwe versie** → `npm run build`
2. **Upload naar GitHub Releases** → `.dmg`, `.exe`, `latest.yml`, `latest-mac.yml`
3. **Gebruiker start app** → App checkt GitHub voor updates (5 sec na startup)
4. **Update gevonden** → Download automatisch op achtergrond
5. **Melding verschijnt** → "Update beschikbaar - Nu installeren?"
6. **Gebruiker klikt** → App herstart met nieuwe versie

---

## Wat Al Gebouwd Is

| Component | Bestand | Functie |
|-----------|---------|---------|
| Update checker | `src/main/updater.js` | Checkt GitHub voor nieuwe versies |
| Update UI | `src/renderer/components/UpdateNotification.jsx` | Toont melding aan gebruiker |
| IPC handlers | `src/main/preload.cjs` | Communicatie main ↔ renderer |
| Build config | `package.json` (publish sectie) | Configuratie voor GitHub releases |
| Logging | `src/main/logger.js` | Logs naar bestand voor troubleshooting |
| Error handling | `src/renderer/components/ErrorBoundary.jsx` | Crash-proof UI |

---

## Stappen Om In Productie Te Nemen

### Stap 1: GitHub Repository Aanmaken (5 min, gratis)

1. Ga naar https://github.com/new
2. Maak repository: `farewell-player`
3. Kies: **Private** (aanbevolen) of Public
4. Klik "Create repository"

> **Let op:** De repo naam moet overeenkomen met `package.json`:
> ```json
> "publish": {
>   "provider": "github",
>   "owner": "thelastfarewell",
>   "repo": "farewell-player"
> }
> ```

### Stap 2: GitHub Personal Access Token Maken (5 min, gratis)

1. Ga naar https://github.com/settings/tokens
2. Klik "Generate new token (classic)"
3. Naam: `farewell-player-releases`
4. Scopes aanvinken:
   - `repo` (voor private repo)
   - OF `public_repo` (voor public repo)
5. Klik "Generate token"
6. **Kopieer de token** (je ziet hem maar 1x!)

### Stap 3: Token Opslaan (2 min)

Voeg toe aan je shell profile (`~/.zshrc` of `~/.bash_profile`):

```bash
export GH_TOKEN="ghp_jouw_token_hier"
```

Dan:
```bash
source ~/.zshrc
```

### Stap 4: Eerste Release Maken (10 min)

```bash
# 1. Zorg dat versie correct is in package.json
# "version": "1.0.0"

# 2. Build de app
cd /Users/josklijnhout/uitvaart_powerpoint/farewell-player
npm run build

# 3. Upload naar GitHub (automatisch)
npm run publish

# OF handmatig:
# - Ga naar GitHub repo → Releases → "Create a new release"
# - Tag: v1.0.0
# - Upload bestanden uit dist/ folder:
#   - Farewell Player-1.0.0-arm64.dmg
#   - Farewell Player-1.0.0-arm64-mac.zip
#   - latest-mac.yml
```

### Stap 5: Testen

1. Installeer versie 1.0.0 op een test computer
2. Maak versie 1.0.1 en upload naar GitHub
3. Start de app → Na 5 seconden zou melding moeten verschijnen
4. Klik "Nu installeren" → App herstart met nieuwe versie

---

## Code Signing (Optioneel maar Aanbevolen)

Zonder code signing werkt de app, maar gebruikers zien waarschuwingen:
- **macOS**: "kan niet worden geopend omdat de ontwikkelaar niet kan worden geverifieerd"
- **Windows**: SmartScreen waarschuwing

### macOS Code Signing

| Wat | Details |
|-----|---------|
| **Nodig** | Apple Developer Account |
| **Kosten** | €99/jaar |
| **Aanvragen** | https://developer.apple.com/programs/enroll/ |
| **Wachttijd** | 1-2 dagen |

Na goedkeuring:
1. Download certificaat via Xcode of Apple Developer portal
2. Installeer in Keychain
3. Build commando vindt automatisch het certificaat

### Windows Code Signing

| Wat | Details |
|-----|---------|
| **Nodig** | Code Signing Certificate |
| **Kosten** | €300-500/jaar |
| **Aanbieders** | DigiCert, Sectigo, GlobalSign |
| **Wachttijd** | 1-3 dagen (verificatie) |

Na ontvangst:
1. Voeg toe aan `package.json`:
```json
"win": {
  "certificateFile": "path/to/certificate.pfx",
  "certificatePassword": "wachtwoord"
}
```

---

## Nieuwe Versie Uitbrengen (Workflow)

Elke keer als je een update wilt uitbrengen:

```bash
# 1. Verhoog versie in package.json
# "version": "1.0.0" → "1.0.1"

# 2. Commit changes
git add .
git commit -m "Release v1.0.1"
git tag v1.0.1

# 3. Build en upload
npm run build
npm run publish

# OF handmatig uploaden naar GitHub Releases
```

---

## Troubleshooting

### App checkt niet op updates
- Controleer of `app.isPackaged` true is (werkt alleen in productie build)
- Check logs: `~/Library/Application Support/farewell-player/logs/`

### Update download mislukt
- Controleer internetverbinding
- Check of GitHub releases correct zijn geüpload
- Bekijk `latest-mac.yml` of `latest.yml` in releases

### Gebruiker ziet geen melding
- Update wordt op achtergrond gedownload
- Melding verschijnt pas als download klaar is
- Check console logs in DevTools

---

## Bestanden Overzicht

```
farewell-player/
├── src/
│   ├── main/
│   │   ├── main.js          # Initialiseert updater
│   │   ├── updater.js       # Auto-update logica
│   │   ├── logger.js        # Logging naar bestand
│   │   └── preload.cjs      # IPC handlers
│   └── renderer/
│       └── components/
│           ├── UpdateNotification.jsx  # Update UI
│           └── ErrorBoundary.jsx       # Crash handling
├── build/
│   └── entitlements.mac.plist  # macOS signing config
├── package.json                 # Build + publish config
└── docs/
    ├── AUTO_UPDATES.md          # Dit bestand
    └── CODE_SIGNING.md          # Signing instructies
```

---

## Samenvatting Prioriteiten

| # | Taak | Tijd | Kosten | Noodzakelijk? |
|---|------|------|--------|---------------|
| 1 | GitHub repo aanmaken | 5 min | Gratis | ✅ Ja |
| 2 | GitHub token maken | 5 min | Gratis | ✅ Ja |
| 3 | Eerste release uploaden | 10 min | Gratis | ✅ Ja |
| 4 | Apple Developer Account | 1-2 dagen | €99/jaar | ⚠️ Aanbevolen |
| 5 | Windows Certificate | 1-3 dagen | €300-500/jaar | ⚠️ Aanbevolen |

**Minimaal nodig voor werkende auto-updates:** Stappen 1-3 (gratis, ~20 min)
