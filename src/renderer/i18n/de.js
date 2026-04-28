export const de = {
  // App info
  app: {
    name: 'Farewell Player',
    tagline: 'Offline-Präsentationsplayer für Trauerpräsentationen',
    version: 'Version',
    madeBy: 'The Last Farewell',
  },

  // DropZone
  dropZone: {
    title: 'Farewell Player',
    subtitle: 'Offline-Präsentationsplayer für Trauerpräsentationen',
    dropHere: 'Ziehen Sie eine',
    fileType: '.farewell',
    dropHereEnd: 'Datei hierher',
    orClick: 'oder klicken Sie, um eine Datei auszuwählen',
  },

  // Controller - Navigation
  controller: {
    // Button tooltips
    resetToStart: 'Zurück zum Anfang',
    previousSession: 'Vorherige Sitzung',
    previousSlide: 'Vorherige Folie',
    play: 'Abspielen',
    pause: 'Pause',
    nextSlide: 'Nächste Folie',
    nextSession: 'Nächste Sitzung',
    closePresentation: 'Präsentation schließen',
    
    // Keyboard shortcuts
    shortcuts: {
      arrows: 'Vorherige / Nächste Folie',
      upDown: 'Vorherige / Nächste Sitzung',
      reset: 'Zurück zum Anfang',
      space: 'Abspielen / Pause',
      escape: 'Präsentation schließen',
    },
    
    // Session info
    session: 'Sitzung',
    slide: 'Folie',
    of: 'von',
    slides: 'Folien',
    secondsPerSlide: 's/Folie',
    
    // Session types
    sessionTypes: {
      loop: 'Schleife',
      speaker: 'Redner',
      music: 'Musik',
    },
    
    // Audio
    audioAvailable: 'Audio verfügbar',
    speakerNotes: 'Rednernotizen',
    
    // Display selection
    selectDisplay: 'Bildschirm auswählen',
    startPresentation: 'Auf externem Bildschirm anzeigen',
    stopPresentation: 'Präsentation beenden',
    presentationActive: 'Präsentation aktiv',
    primaryDisplay: 'Primär',
    externalDisplay: 'Extern',

    // Presentatoransicht (v3)
    elapsed: 'Verstrichen',
    nextSlidePreview: 'Nächste Folie',
    notes: 'Notizen',
    sessions: 'Abschnitte',
    timeBlocks: 'Zeitblöcke',
    endOfPresentation: 'Ende der Präsentation',
    allSlides: 'Alle Folien',
    nextWithinTimeBlock: 'Noch in diesem Zeitblock',
    nextNewTimeBlock: 'Nächster Zeitblock: {name}',
    remoteHint:
      'Fernbedienung: gilt für das Präsentationsfenster (Beamer). Page Down, Enter, Punkt oder Pfeil rechts/unten = nächste Folie; Page Up, Komma oder Pfeil links/oben = vorherige; Leertaste oder Media Play/Pause = Play/Pause. Ohne Fernbedienung: Fenster fokussieren und diese Tasten testen. Umlegen in der App (noch) nicht möglich; viele Presenter können in der Hersteller-Software auf Page Down/Page Up gestellt werden.',
  },

  // Music Player
  musicPlayer: {
    embedded: 'Eingebettet',
    local: 'Eigene MP3',
    noAudio: 'Kein Audio verfügbar',
    chooseOther: 'Andere Musik wählen',
    selectFile: 'MP3-Datei auswählen',
    clickToAdd: 'Klicken um eigene Musik hinzuzufügen',
    looping: 'wiederholend',
    volume: 'Lautstärke',
  },

  // Update notifications
  update: {
    available: 'Update verfügbar',
    ready: 'Update bereit!',
    downloading: 'Herunterladen...',
    downloadProgress: 'Herunterladen... {percent}%',
    clickToInstall: 'Zum Installieren klicken',
    installNow: 'Jetzt installieren',
    later: 'Später',
    error: 'Fehler',
    restartToRetry: 'App neu starten, um es erneut zu versuchen',
  },

  // Errors
  errors: {
    fileNotFound: 'Datei nicht gefunden',
    invalidFile: 'Ungültige Datei',
    loadError: 'Ladefehler',
    dropFarewellFile: 'Ziehen Sie eine .farewell Datei hierher',
  },

  // Time formatting
  time: {
    hours: 'h',
    minutes: 'm',
    seconds: 's',
  },
}
