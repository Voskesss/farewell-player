## Overgangen in Farewell Player (.farewell)

Dit document beschrijft hoe je de overgangstypen uit `manifest.json` in de Farewell Player implementeert.

### Ondersteunde types

| Type | Beschrijving |
|------|-------------|
| `none` | Direct wisselen, geen animatie |
| `fade` | Klassieke fade (opacity) |
| `wipe` | Nieuwe slide schuift over de vorige heen + transparantie |
| `zoom` | Nieuwe slide zoomt zacht in terwijl hij infadet |
| `fadeBlack` | Korte fade via zwart naar de nieuwe slide |

---

### 1. Manifest (komt uit farewell-next)

In het `.farewell` bestand staat:

```json
{
  "sessions": [
    {
      "id": "session-1",
      "transition": "wipe",
      ...
    }
  ],
  "settings": {
    "transition": "fade",
    "transitionDuration": 1000
  }
}
```

- **Per sessie**: `session.transition` (overschrijft globaal)
- **Globaal**: `settings.transition` (fallback)

---

### 2. Presentation.jsx aanpassen

Bestand: `src/renderer/components/Presentation.jsx`

#### a) Imports en helper

```js
import { useState, useEffect, useRef, useMemo } from 'react'

function getSessionForSlideIndex(presentation, globalIndex) {
  if (!presentation?.sessions?.length) return null
  let count = 0
  for (const session of presentation.sessions) {
    const n = session.slides?.length || 0
    if (globalIndex < count + n) return session
    count += n
  }
  return presentation.sessions[0] || null
}
```

#### b) State en computed values

```js
const [displayedSlideIndex, setDisplayedSlideIndex] = useState(currentSlideIndex)
const [isTransitioning, setIsTransitioning] = useState(false)
const [prevSlideIndex, setPrevSlideIndex] = useState(null)
const videoRef = useRef(null)

// Bepaal transition type: per sessie of globaal
const transitionType = useMemo(() => {
  const session = getSessionForSlideIndex(presentation, currentSlideIndex)
  return session?.transition || presentation?.settings?.transition || 'fade'
}, [presentation, currentSlideIndex])

const transitionDuration = presentation?.settings?.transitionDuration || 1000
const halfDuration = transitionType === 'none' ? 0 : transitionDuration / 2
```

#### c) Effect voor slide-wissel

```js
useEffect(() => {
  if (currentSlideIndex !== displayedSlideIndex) {
    if (transitionType === 'none') {
      // Direct wisselen
      setPrevSlideIndex(null)
      setDisplayedSlideIndex(currentSlideIndex)
      setIsTransitioning(false)
    } else {
      // Animatie: bewaar vorige slide voor wipe/zoom
      setPrevSlideIndex(displayedSlideIndex)
      setIsTransitioning(true)

      setTimeout(() => {
        setDisplayedSlideIndex(currentSlideIndex)
        setIsTransitioning(false)
        setPrevSlideIndex(null)
      }, halfDuration)
    }
  }
}, [currentSlideIndex, displayedSlideIndex, transitionType, halfDuration])
```

#### d) CSS-class bepalen

```js
const getTransitionClass = () => {
  switch (transitionType) {
    case 'wipe': return 'farewell-wipe'
    case 'zoom': return 'farewell-zoom'
    case 'fadeBlack': return 'farewell-fade-black'
    case 'fade': return 'farewell-fade'
    default: return ''
  }
}
```

#### e) JSX render

```jsx
const currentSlide = presentation.slides[displayedSlideIndex]
const prevSlide = prevSlideIndex != null ? presentation.slides[prevSlideIndex] : null

return (
  <div className="presentation-slide bg-black w-screen h-screen overflow-hidden">
    {/* Onderlaag: vorige slide (voor wipe/zoom effect) */}
    {(transitionType === 'wipe' || transitionType === 'zoom') && prevSlide && (
      <img
        src={prevSlide.url}
        alt=""
        className="w-full h-full object-cover"
        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
        aria-hidden="true"
      />
    )}

    {/* Huidige slide met animatie */}
    {currentSlide?.isVideo ? (
      <video
        ref={videoRef}
        src={currentSlide.url}
        className={`w-full h-full object-cover ${getTransitionClass()}`}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        autoPlay
        muted={currentSlide.videoMuted ?? true}
        onEnded={onVideoEnded}
      />
    ) : (
      <img
        src={currentSlide?.url}
        alt=""
        className={`w-full h-full object-cover ${getTransitionClass()}`}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      />
    )}
  </div>
)
```

---

### 3. CSS animaties

Bestand: `src/renderer/index.css`

Voeg onderaan toe:

```css
/* ===== SLIDE TRANSITIONS ===== */

/* Fade: klassieke opacity fade */
@keyframes farewell-fade-anim {
  from { opacity: 0; }
  to { opacity: 1; }
}
.farewell-fade {
  animation: farewell-fade-anim 0.6s ease-out forwards;
}

/* Wipe: schuift van rechts over vorige heen + transparantie */
@keyframes farewell-wipe-anim {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
.farewell-wipe {
  animation: farewell-wipe-anim 0.8s ease-out forwards;
}

/* Zoom: zoomt zacht in terwijl hij infadet */
@keyframes farewell-zoom-anim {
  from { transform: scale(1.12); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.farewell-zoom {
  animation: farewell-zoom-anim 1s ease-out forwards;
}

/* Fade via zwart: eerst kort zwart, dan fade in */
@keyframes farewell-fade-black-anim {
  0% { opacity: 0; }
  40% { opacity: 0; }
  100% { opacity: 1; }
}
.farewell-fade-black {
  animation: farewell-fade-black-anim 1s ease-out forwards;
}
```

---

### 4. Verwacht gedrag

| Type | Wat je ziet |
|------|-------------|
| `none` | Direct volgende slide, geen animatie |
| `fade` | Vorige vervaagt, nieuwe verschijnt (0,6s) |
| `wipe` | Nieuwe slide schuift van rechts over vorige heen (0,8s) |
| `zoom` | Nieuwe slide zoomt van 112% naar 100% + fade (1s) |
| `fadeBlack` | Kort zwart (~0,4s), dan nieuwe slide (1s totaal) |

---

### 5. Testen

1. Exporteer vanuit farewell-next een `.farewell` met verschillende secties en overgangen.
2. Open in de player.
3. Controleer per sectie of de juiste overgang wordt getoond.
4. Let vooral op:
   - `none` → echt direct, geen fade
   - `wipe` → vorige slide zichtbaar, nieuwe schuift erover
   - `zoom` → duidelijk inzoomen
   - `fadeBlack` → korte zwarte pauze tussen slides
