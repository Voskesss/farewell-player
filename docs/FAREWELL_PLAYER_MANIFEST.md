# Farewell Player — manifest & `.farewell`-pakket (referentie)

**Bron van waarheid in deze repo:** `src/utils/exportToFarewell.js`  
Als de export wijzigt, moet **de desktop player** (Windows / macOS / Linux) hetzelfde contract volgen. Bij twijfel: diff in dat bestand bekijken.

---

## 1. Wat is een `.farewell` bestand?

- Een **ZIP**-archief, extensie **`.farewell`**.
- Tekstcodering waar van toepassing: **UTF-8** (namen van sessies/tracks).

### Mapstructuur (root van het ZIP)

| Pad | Inhoud |
|-----|--------|
| **`manifest.json`** | Verplicht. Volledige show-structuur (zie hieronder). |
| **`slides/`** | Slide-media: `001.jpg` … `NNN.jpg` **of** `NNN.mp4` voor video-slides (globaal oplopend over alle sessies). |
| **`audio/`** | Lokale muziektracks als **MP3** of **getrimde WAV** (zie §4). |
| **`thumbnail.jpg`** | Optioneel; eerste slide als preview (JPEG, klein formaat). |

**Let op:** video-slides staan **`slides/`** in als `.mp4`, **niet** in een aparte `/video/` map — dat is oude documentatie.

---

## 2. `manifest.json` — top-level

```json
{
  "version": "1.0",
  "name": "Naam van de presentatie",
  "created": "2026-04-27T12:00:00.000Z",
  "createdBy": "The Last Farewell",

  "sessions": [ /* zie §3 */ ],
  "settings": { /* zie §5 */ },
  "externalMusic": [ /* zie §6 */ ]
}
```

- **`version`:** string, nu `"1.0"`. Player moet bij onbekende major version minstens een duidelijke melding tonen.
- **`externalMusic`:** kan `[]` zijn; bevat verwijzingen naar Spotify/YouTube (alleen instructie voor apart apparaat, geen ingesloten audio).

---

## 3. Sessie-object (`sessions[]`)

Elke sessie heeft o.a.:

| Veld | Type | Notes |
|------|------|--------|
| `id` | string | Bijv. `session-1`, `session-2`. |
| `name` | string | Weergavenaam. |
| `slides` | array | Lijst van **slide-objects** (zie §4), volgorde = afspeelvolgorde. |
| `audio` | object \| weggelaten | **Eerste** lokale track (backwards compatibility); zelfde vorm als element in `audioTracks`. |
| `audioTracks` | array \| `null` | Alle lokale tracks; `null` of weggelaten als er geen audio is. |
| `slideDuration` | number | Standaard seconden per slide voor die sessie (fallback waar geen slide-specifieke `duration`). |
| `manualDuration` | number \| niet gezet | Totaal in secondes als gebruiker **handmatige** sessieduur heeft gekozen (`manualDuration === true` in editor). |
| `videoMode` | boolean | `true` = foto/video-sessie (video-timing leidend). |
| `videoDuration` | number \| null | Som van (getrimde) video-lengtes in video-modus indien beschikbaar. |
| `bgMusicVolume` | number \| null | Alleen relevant bij `videoMode` (achtergrondmuziek onder video). |
| `loop` / `loopMode` | boolean | In video-modus export: **altijd `false`** (video’s spelen 1×). Anders kan loop aan staan. |
| `speakerMode` | boolean | Spreker / notities. |
| `speakerNotes` | string \| null | |
| `transition` | string | Bijv. `fade`. |
| `transitionDuration` | number | Milliseconden. |
| `themeId` | string \| null | Thema-id voor UI/kleuren indien nodig. |

---

## 4. Slide-object (`sessions[].slides[]`)

| Veld | Type | Notes |
|------|------|--------|
| `file` | string | Bestandsnaam onder `slides/`, bijv. `001.jpg` of `005.mp4`. |
| `isVideo` | boolean | `true` als `file` een **MP4** is. |
| `pauseHere` | boolean | Pauze na deze slide. |
| `duration` | number (optioneel) | Alleen als gebruiker **handmatige** slide-duur heeft gezet (seconden). |
| **Video-only** | | |
| `videoStart` | number | Start in seconden (trim). |
| `videoEnd` | number \| null | Eind (trim). |
| `videoDuration` | number \| null | Bruto duur bronvideo (info). |
| `videoMuted` | boolean | `true` = geen video-audio. |
| `videoAudioEnabled` | boolean | Spiegel van editor: geluid aan/uit voor video-audio. |
| `videoVolume` | number | 0–100 indien audio aan. |
| `musicDucking` | boolean | Ducken van achtergrondmuziek bij video-audio (editor). |

Volgorde van bestandsnamen: **één globale teller** over alle sessies: `001`, `002`, … (zero-padded 3 cijfers).

---

## 5. Audio-track (`audio` / `audioTracks[]`)

Lokale tracks die in ZIP zitten:

| Veld | Type | Notes |
|------|------|--------|
| `file` | string | Pad binnen ZIP, bv. `audio/01_tracknaam.mp3` of `.wav`. |
| `name` | string | Weergavenaam. |
| `duration` | number | Seconden (indien bekend). |
| `trimStart` / `trimEnd` | number | Trim in seconden (`trimEnd` kan `null`). |
| `fadeIn` / `fadeOut` | boolean | |
| `autoPlay` | boolean | Alleen eerste track heeft typisch `true`. |

### Bestandsnaam-patroon (`exportToFarewell`)

- Sessie-index: `sessionIdx+1` als 2 cijfers: `01`, `02`, …
- Meerdere tracks per sessie: `01_1_…`, `01_2_…` (suffix `_k` voor k-de track): patroon  
  `audio/${audioNum}${trackNum}_${baseName}.${ext}`  
  met `trackNum` = `_1`, `_2` alleen bij meerdere lokale tracks.
- **Extensie:** normaal **`.mp3`**. Als trim naar WAV lukt: **`.wav`**.  
  Als trim **faalt**, schrijft de export alsnog **MP3** en past het manifest de `file`-verwijzing aan (player moet beide kunnen lezen).

---

## 6. `externalMusic[]` (geen bestand in ZIP)

```json
{
  "sessionId": "session-1",
  "type": "spotify" | "youtube",
  "name": "…",
  "artist": "…",
  "spotifyUrl": "…",
  "youtubeUrl": "…",
  "note": "Speel dit nummer af via een apart apparaat"
}
```

Player: geen embedded playback; alleen tonen / instructie.

---

## 7. `settings` (globaal)

```json
{
  "transition": "fade",
  "transitionDuration": 1000,
  "defaultSlideDuration": 5
}
```

- `transitionDuration` is in **milliseconden**.
- Sessie mag eigen `transition` / `transitionDuration` overschrijven.

---

## 8. Checklist per platform (Player-app)

Zelfde logica op **Windows, macOS en Linux**; verschillen vooral in OS-integratie:

1. **ZIP openen:** `.farewell` = ZIP; inhoud naar tijdelijke map extracten (rechten + padlengtes).
2. **`manifest.json` parsen:** JSON strict; ontbrekende optionele velden gracefully defaults.
3. **Paden:** binnen ZIP forward slashes gebruiken (`slides/001.jpg`). Op schijf omzetten naar OS-paden (`path.join`).
4. **Video in slides:** `.mp4` in `slides/` met hardware/software decode waar nodig (Electron/Chromium gedrag verschilt licht per OS).
5. **Audio:** MP3 en WAV; let op sample rate bij WAV (export trim = 44,1 kHz PCM waar getrimd).
6. **Meerdere schermen / kiosk:** zie ook `docs/offline-player-plan.md` (functioneel), niet voor manifest-structuur.
7. **Handmatige duur:** respecteer `duration` op slide en `manualDuration` op sessie wanneer aanwezig (zelfde semantiek als web-preview).
8. **`version`:** bij `version !== "1.0"` compatibiliteitswaarschuwing.

---

## 9. Wijzigingen in deze export (samenvatting)

- Slides zijn **JPEG 2048×1152** of **MP4** in **`slides/`** (geen aparte video-map).
- **Meerdere audio tracks** per sessie via `audioTracks`; `audio` blijft eerste track voor oude readers.
- **Video-slides:** trim, audio aan/uit, volume, ducking in manifest.
- **Video-modus sessies:** `loop`/`loopMode` geforceerd false in export; timing kan via `videoDuration` + slide-trims.
- **External music:** alleen metadata + `note`.

---

## 10. Koppeling met andere docs

- Algemeen offline idee: `docs/offline-player-plan.md` (diagrammen / kiosk).  
  **Manifest-inhoud daar kan verouderd zijn** — dit bestand + `exportToFarewell.js` zijn leidend.
- Export-sync: `docs/export-sync-checklist.md` (breder dan alleen Player).

---

*Laatst afgestemd op `exportToFarewell.js` in farewell-next (houd dit bestand bij bij exportwijzigingen).*
