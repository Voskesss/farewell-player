# Code Signing voor Farewell Player

Dit document beschrijft hoe je de Farewell Player app kunt ondertekenen voor distributie op macOS en Windows.

## Waarom Code Signing?

Zonder code signing krijgen gebruikers waarschuwingen:
- **macOS**: "App kan niet worden geopend omdat de ontwikkelaar niet kan worden geverifieerd"
- **Windows**: "Windows heeft je pc beschermd" (SmartScreen)

## macOS Code Signing

### Vereisten

1. **Apple Developer Account** ($99/jaar)
   - Registreer op: https://developer.apple.com/programs/

2. **Developer ID Application Certificate**
   - Ga naar: https://developer.apple.com/account/resources/certificates/list
   - Maak een "Developer ID Application" certificate aan
   - Download en installeer in Keychain Access

3. **Notarization** (vereist voor macOS 10.15+)
   - Apple scant je app op malware
   - Vereist een app-specific password

### Configuratie

1. Voeg toe aan `.env` of environment variables:

```bash
# Apple Developer credentials
APPLE_ID=jouw@email.com
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=XXXXXXXXXX

# Certificate naam (zoals in Keychain)
CSC_NAME="Developer ID Application: Jouw Naam (XXXXXXXXXX)"
```

2. Update `package.json` build config:

```json
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Jouw Naam (XXXXXXXXXX)",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist",
      "notarize": {
        "teamId": "XXXXXXXXXX"
      }
    }
  }
}
```

3. Maak `build/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
</dict>
</plist>
```

### Build & Sign

```bash
# Build met signing
npm run build:mac

# Of handmatig
npx electron-builder --mac --publish never
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
