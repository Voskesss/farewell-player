# Farewell Player v3 — plan (PowerPoint-achtige presentator + manifest)

## Wat je al hebt (vergelijkbaar met PowerPoint)

PowerPoint in presentatormodus gebruikt **twee beelden**:

1. **Publieksscherm** — alleen de volledige dia (of video).
2. **Bedieningsscherm** — huidige dia groot, volgende dia, notities, filmstrook, timers.

In deze Electron-app gebeurt het kernstuk al zo:

- **`createPresentationWindow` in `src/main/main.js`** opent een **tweede venster** op het **externe scherm** (als er een tweede monitor is), **fullscreen**, zonder vensterkader — dat is je **publieksscherm**.
- Het **controller-venster** blijft op je **primaire** monitor — dat is je **bediening**.

Dat is hetzelfde idee als “presentatie op extern beeld”: het publiek ziet alleen wat in het presentatievenster staat.

## Wat nog mist voor “echt PowerPoint-gevoel” (v3 UI)

Richting van de gewenste UI (zoals je screenshot):

| Onderdeel | Status | Opmerking |
|-----------|--------|-----------|
| Grote huidige slide (bediening) | **Ja (v3 UI)** | Donkere presenter-layout, hoofdpreview links |
| Volgende slide-preview | **Ja** | Rechterkolom, `currentSlideIndex + 1` |
| Notities-paneel | **Ja (sessie)** | `speakerNotes` van actieve sessie; per-dia later mogelijk |
| Filmstrook onderaan | **Ja** | Horizontale thumbnails, klik = springen |
| Timer (verstreken / klok) | **Deels** | Verstreken + totaal per sessie + wandklok |
| Schermen wisselen | Deels | Display-keuze in topbar (zoals eerder) |

Implementatie in **fases** (niets “overboord”):

1. **Manifest-sync** — loader en playback strikt volgens `docs/FAREWELL_PLAYER_MANIFEST.md` (bron: `farewell-next` `exportToFarewell.js`).
2. **Presenter-layout** — nieuwe layout-component naast bestaande logica: hoofdpreview + “volgende” + strook.
3. **Notities** — sessie-`speakerNotes` tonen; later uitbreiden als export per-slide notities krijgt.
4. **Polish** — timers, typografie, sneltoetsen documenteren in UI.

## Contract

- **Speler:** `docs/FAREWELL_PLAYER_MANIFEST.md` in deze repo (kopie; bij twijfel diff met farewell-next).
- **Export:** altijd `exportToFarewell.js` in farewell-next als bron van waarheid.
