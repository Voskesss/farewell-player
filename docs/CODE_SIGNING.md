# Code Signing voor Farewell Player

Dit document beschrijft hoe je de Farewell Player app kunt ondertekenen voor distributie op macOS en Windows.

## Waarom Code Signing?

Zonder code signing krijgen gebruikers waarschuwingen:
- **macOS**: "App kan niet worden geopend omdat de ontwikkelaar niet kan worden geverifieerd"
- **Windows**: "Windows heeft je pc beschermd" (SmartScreen)

---

## macOS – Nu je Apple Developer bent

### Stap 1: Certificaat aanmaken

1. Ga naar [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/certificates/list).
2. Klik **+** om een nieuw certificaat te maken.
3. Kies **Developer ID Application** → Continue → maak een Certificate Signing Request (CSR) via Keychain Access als dat gevraagd wordt.
4. Download het certificaat en dubbelklik om het in **Sleutelhangertoegang** te installeren.
5. Noteer je **Team ID** (bij Membership-details) en de **exacte naam** van het certificaat in Keychain (bijv. `Developer ID Application: The Last Farewell (ABC123XYZ)`).

### Stap 2: App-specifiek wachtwoord

1. Ga naar [appleid.apple.com](https://appleid.apple.com) → **Sign-In and Security** → **App-Specific Passwords**.
2. Maak een nieuw wachtwoord aan (bijv. "Farewell Player notarize") en kopieer het (eenmalig zichtbaar).

### Stap 3: Environment variables

1. Kopieer in de projectmap: `cp .env.example .env`
2. Open `.env` en vul in:
   - **APPLE_ID** – het e-mailadres van je Apple ID
   - **APPLE_APP_SPECIFIC_PASSWORD** – het app-specifieke wachtwoord uit stap 2
   - **APPLE_TEAM_ID** – je Team ID (10 tekens)
   - **CSC_NAME** – de exacte certificaatnaam uit Keychain, tussen aanhalingstekens

### Stap 4: Build met signen en notariseren

```bash
# Laad .env en bouw (Mac)
source .env 2>/dev/null || export $(grep -v '^#' .env | xargs)
npm run build:mac
```

Of in één regel (zonder publish naar GitHub):

```bash
export $(grep -v '^#' .env | xargs) && npx electron-builder --mac --publish never
```

De app wordt dan ondertekend en daarna naar Apple gestuurd voor notarisatie. Dat kan een paar minuten duren. Daarna opent de app bij gebruikers zonder Gatekeeper-waarschuwing.

---

## macOS Code Signing (referentie)

### Vereisten

1. **Apple Developer Account** ($99/jaar) – https://developer.apple.com/programs/
2. **Developer ID Application** certificaat – zie stap 1 hierboven
3. **Notarization** (vereist voor macOS 10.15+) – zie app-specific password hierboven

### Configuratie

De projectmap heeft al:
- `build/entitlements.mac.plist` voor hardened runtime
- `package.json` met `mac.hardenedRuntime`, `gatekeeperAssess`, entitlements

Je hoeft alleen de **environment variables** in `.env` in te vullen (zie `.env.example`). `electron-builder` gebruikt automatisch:
- **CSC_NAME** voor code signing
- **APPLE_ID**, **APPLE_APP_SPECIFIC_PASSWORD**, **APPLE_TEAM_ID** voor notarization

### Build & Sign

```bash
# Met .env geladen
export $(grep -v '^#' .env | xargs)
npm run build:mac
```

## Windows Code Signing

### Vereisten

1. **EV Code Signing Certificate** (~€300-500/jaar)
   - Aanbieders: DigiCert, Sectigo, GlobalSign
   - EV certificate vereist hardware token (USB)

2. **SignTool** (onderdeel van Windows SDK)

### Configuratie

1. Voeg toe aan environment variables:

```bash
# Windows signing
CSC_LINK=path/to/certificate.pfx
CSC_KEY_PASSWORD=jouw_wachtwoord

# Of voor EV certificate met hardware token
WIN_CSC_LINK=path/to/certificate.pfx
WIN_CSC_KEY_PASSWORD=jouw_wachtwoord
```

2. Update `package.json`:

```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/certificate.pfx",
      "certificatePassword": "${env.WIN_CSC_KEY_PASSWORD}",
      "signingHashAlgorithms": ["sha256"]
    }
  }
}
```

### Build & Sign

```bash
# Build met signing (op Windows machine)
npm run build:win
```

## Alternatieven zonder Code Signing

### macOS
Gebruikers kunnen de app handmatig toestaan:
1. Rechtermuisknop op app → "Open"
2. Klik "Open" in de waarschuwing

Of via Terminal:
```bash
xattr -cr /Applications/Farewell\ Player.app
```

### Windows
Gebruikers kunnen SmartScreen omzeilen:
1. Klik "Meer info"
2. Klik "Toch uitvoeren"

## Kosten Overzicht

| Platform | Certificaat | Kosten/jaar |
|----------|-------------|-------------|
| macOS | Apple Developer | €99 |
| Windows | EV Code Signing | €300-500 |
| **Totaal** | | **€400-600/jaar** |

## Aanbeveling

Voor een professionele uitstraling bij uitvaartondernemers:

1. **Start met macOS** - Apple Developer Account is goedkoper
2. **Windows later** - EV certificate is duurder maar belangrijk voor zakelijke klanten
3. **Documenteer workarounds** - Voor gebruikers die de app zonder signing willen gebruiken

## Handige Links

- [Apple Developer Program](https://developer.apple.com/programs/)
- [Electron Builder Code Signing](https://www.electron.build/code-signing)
- [Apple Notarization](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [DigiCert Code Signing](https://www.digicert.com/signing/code-signing-certificates)
