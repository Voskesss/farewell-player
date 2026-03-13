# Sectie Kleuren in Farewell Player

Dit document beschrijft hoe je gekleurde sectie-indicatoren implementeert in de Farewell Player, consistent met de `farewell-next` editor.

---

## 1. Kleurenschema per sessie type

De Player is al dark-themed. Gebruik deze kleuren voor sectie-indicatoren:

| Sessie Type | Border Kleur | Achtergrond | Tekst/Badge |
|-------------|--------------|-------------|-------------|
| **Loop** (`loopMode: true`) | `border-emerald-400` | `bg-emerald-500/20` | `text-emerald-300` |
| **Spreker** (`speakerMode: true`) | `border-violet-400` | `bg-violet-500/20` | `text-violet-300` |
| **Muziek** (default) | `border-blue-400` | `bg-blue-500/20` | `text-blue-300` |

### Alternatief met CSS variabelen

```css
:root {
  /* Loop sessie (emerald) */
  --session-loop-border: #34d399;
  --session-loop-bg: rgba(16, 185, 129, 0.2);
  --session-loop-text: #6ee7b7;
  
  /* Spreker sessie (violet) */
  --session-speaker-border: #a78bfa;
  --session-speaker-bg: rgba(139, 92, 246, 0.2);
  --session-speaker-text: #c4b5fd;
  
  /* Muziek sessie (blue) */
  --session-music-border: #60a5fa;
  --session-music-bg: rgba(59, 130, 246, 0.2);
  --session-music-text: #93c5fd;
}
```

---

## 2. Manifest structuur

In het `.farewell` bestand heeft elke sessie deze velden:

```json
{
  "sessions": [
    {
      "id": "session-1",
      "name": "Inloop / Binnenkomst",
      "loopMode": true,
      "speakerMode": false,
      "slides": [...],
      "audio": {...}
    },
    {
      "id": "session-2", 
      "name": "Speaker - Grandpa",
      "loopMode": false,
      "speakerMode": true,
      "slides": [...]
    },
    {
      "id": "session-3",
      "name": "jaren 70",
      "loopMode": false,
      "speakerMode": false,
      "slides": [...],
      "audio": {...}
    }
  ]
}
```

### Type bepalen

```js
function getSessionType(session) {
  if (session.loopMode) return 'loop'
  if (session.speakerMode) return 'speaker'
  return 'music'
}
```

---

## 3. Controller.jsx implementatie

Bestand: `src/renderer/components/Controller.jsx`

### a) Kleur helper functie

```jsx
const getSessionColors = (session) => {
  if (session.loopMode) {
    return {
      border: 'border-emerald-400',
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-300',
      badge: 'bg-emerald-500',
      icon: '🔄'
    }
  }
  if (session.speakerMode) {
    return {
      border: 'border-violet-400',
      bg: 'bg-violet-500/20', 
      text: 'text-violet-300',
      badge: 'bg-violet-500',
      icon: '🎤'
    }
  }
  return {
    border: 'border-blue-400',
    bg: 'bg-blue-500/20',
    text: 'text-blue-300',
    badge: 'bg-blue-500',
    icon: '🎵'
  }
}
```

### b) Sessie card renderen

```jsx
{presentation.sessions.map((session, idx) => {
  const colors = getSessionColors(session)
  const isActive = idx === currentSessionIndex
  
  return (
    <div 
      key={session.id}
      className={`
        rounded-xl border-2 p-3 cursor-pointer transition-all
        ${colors.border} ${colors.bg}
        ${isActive ? 'ring-2 ring-white/30' : 'opacity-70 hover:opacity-100'}
      `}
      onClick={() => goToSession(idx)}
    >
      {/* Nummer badge */}
      <div className={`w-8 h-8 ${colors.badge} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
        {idx + 1}
      </div>
      
      {/* Sessie naam */}
      <span className={`${colors.text} font-medium`}>
        {session.name}
      </span>
      
      {/* Type indicator */}
      <span className="text-lg">{colors.icon}</span>
    </div>
  )
})}
```

---

## 4. Overzicht/Timeline weergave

Als je een timeline of progress bar hebt:

```jsx
const SessionTimeline = ({ sessions, currentSessionIndex }) => {
  return (
    <div className="flex gap-1">
      {sessions.map((session, idx) => {
        const colors = getSessionColors(session)
        const isActive = idx === currentSessionIndex
        const isPast = idx < currentSessionIndex
        
        return (
          <div
            key={session.id}
            className={`
              h-1 flex-1 rounded-full transition-all
              ${isActive ? colors.badge : isPast ? 'bg-slate-500' : 'bg-slate-700'}
            `}
          />
        )
      })}
    </div>
  )
}
```

---

## 5. CSS in index.css (optioneel)

```css
/* Sessie type kleuren */
.session-loop {
  border-color: #34d399;
  background-color: rgba(16, 185, 129, 0.2);
}
.session-loop .session-text { color: #6ee7b7; }
.session-loop .session-badge { background-color: #10b981; }

.session-speaker {
  border-color: #a78bfa;
  background-color: rgba(139, 92, 246, 0.2);
}
.session-speaker .session-text { color: #c4b5fd; }
.session-speaker .session-badge { background-color: #8b5cf6; }

.session-music {
  border-color: #60a5fa;
  background-color: rgba(59, 130, 246, 0.2);
}
.session-music .session-text { color: #93c5fd; }
.session-music .session-badge { background-color: #3b82f6; }
```

---

## 6. Verwacht resultaat

| Sessie Type | Visueel |
|-------------|---------|
| Loop | Groene tint, 🔄 icoon |
| Spreker | Paarse tint, 🎤 icoon |
| Muziek | Blauwe tint, 🎵 icoon |

Alle kleuren zijn semi-transparant met heldere borders, consistent met de `farewell-next` editor in dark mode.

---

## 7. Screenshots referentie

Zie de `farewell-next` editor in dark mode voor het exacte kleurenschema. De sessie cards hebben:
- Semi-transparante achtergrond (20% opacity van de hoofdkleur)
- Heldere border (-400 variant van Tailwind kleuren)
- Nummer badge met volle kleur
- Type icoon (loop/spreker/muziek)
