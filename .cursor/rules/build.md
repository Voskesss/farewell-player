# Build instructies voor Farewell Player

## Mac Build met Signing + Notarisatie

**BELANGRIJK:** Voor Mac builds ALTIJD de environment variables laden voor notarisatie:

```bash
source .env && npm run build
```

Of expliciet:
```bash
# Gebruik een lokale .env (nooit committen). Voorbeeldwaarden staan in .env.example
source .env 2>/dev/null || true
export APPLE_ID
export APPLE_APP_SPECIFIC_PASSWORD
export APPLE_TEAM_ID
export CSC_NAME
npm run build
```

Of met expliciete exports (vul zelf in of zet in `.env`):

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
npm run build
```

Zonder deze env variables wordt de notarisatie overgeslagen en krijgen gebruikers een Gatekeeper waarschuwing ("kan niet worden geopend omdat Apple het bestand niet kan controleren op kwaadaardige software").

## Release naar GitHub

Na een succesvolle build met notarisatie:

```bash
npm version patch --no-git-tag-version
source .env && npm run build
git add -A && git commit -m "v1.x.x: beschrijving"
git push origin main
git tag v1.x.x && git push origin v1.x.x
gh release create v1.x.x --title "v1.x.x - titel" --notes "release notes" \
  dist/farewell-player-1.x.x-universal.dmg \
  dist/farewell-player-1.x.x-universal.zip \
  dist/latest-mac.yml
```

## Verificatie

Na de build moet je zien:
- `• notarization successful` (niet "skipped macOS notarization")
