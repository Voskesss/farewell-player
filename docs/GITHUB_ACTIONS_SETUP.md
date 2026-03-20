# GitHub Actions Setup voor Automatische Builds

## Overzicht

De workflow bouwt automatisch Mac en Windows versies wanneer je een nieuwe tag pusht.

## Stap 1: Secrets instellen

Ga naar: https://github.com/Voskesss/farewell-player/settings/secrets/actions

Voeg deze secrets toe:

### Voor Mac signing (optioneel maar aanbevolen):

| Secret | Waarde |
|--------|--------|
| `APPLE_ID` | josklijnhout@hotmail.com |
| `APPLE_APP_SPECIFIC_PASSWORD` | Je app-specifieke wachtwoord (xxxx-xxxx-xxxx-xxxx) |
| `APPLE_TEAM_ID` | G3N6YWNG5R |
| `MAC_CERTIFICATE` | Base64-encoded .p12 certificaat (zie onder) |
| `MAC_CERTIFICATE_PASSWORD` | Wachtwoord van het .p12 bestand |

### Mac certificaat exporteren:

1. Open **Sleutelhangertoegang** (Keychain Access)
2. Zoek je "Developer ID Application" certificaat
3. Rechtsklik → **Exporteer**
4. Sla op als `.p12` met een wachtwoord
5. In terminal: `base64 -i certificaat.p12 | pbcopy`
6. Plak in GitHub als `MAC_CERTIFICATE` secret

## Stap 2: Nieuwe release maken

```bash
# Verhoog versie in package.json (bijv. naar 1.3.0)
# Commit je wijzigingen
git add .
git commit -m "Release v1.3.0"

# Maak een tag
git tag v1.3.0

# Push alles
git push && git push --tags
```

## Stap 3: Wachten

1. Ga naar https://github.com/Voskesss/farewell-player/actions
2. Je ziet de build draaien (duurt ~10-15 minuten)
3. Als klaar → Release staat automatisch op GitHub Releases

## Zonder Mac signing

Als je de Mac secrets niet instelt, wordt de Mac versie gebouwd maar **niet ondertekend**. 
Gebruikers moeten dan rechtsklikken → Open bij eerste keer.

Windows heeft geen signing nodig voor basis gebruik.

## Troubleshooting

- **Build faalt**: Check de logs in Actions tab
- **Signing faalt**: Check of secrets correct zijn
- **Release mist bestanden**: Check of artifact upload stappen gelukt zijn
