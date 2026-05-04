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
    exitToHome: 'Zurück zum Start',
    
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
    startPresentationShort: 'Zeigen',
    projectExternalTooltip:
      'Öffnet die Präsentation im Vollbild auf dem gewählten Bildschirm (zuerst «Extern» wählen). Dieses Fenster bleibt die Steuerung.',
    stopPresentationTooltip: 'Präsentationsfenster auf dem anderen Bildschirm schließen',
    projectExternalBanner:
      'Bildschirm wählen (oft 📺 Extern), dann Knopf — Folien erscheinen dort im Vollbild.',
    stopPresentation: 'Präsentation beenden',
    stopPresentationShort: 'Beenden',
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
    remoteAutoStart: 'Fernbedienung Auto-Start',
    remoteAutoStartTooltip: 'Fernbedienung "weiter" startet auch automatisch die Wiedergabe (an = R500/Presenter, aus = Tastatur)',
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
    retry: 'Erneut versuchen',
    checkForUpdates: 'Nach Updates suchen',
    checking: 'Überprüfen...',
  },

  // Remote control
  remote: {
    title: 'Handy/Tablet als Controller verbinden',
    instructions: 'Scannen Sie den QR-Code mit Ihrem Handy oder Tablet, oder öffnen Sie die URL in einem Browser.',
    selectNetwork: 'Netzwerk auswählen',
    orOpenUrl: 'Oder öffnen Sie diese URL:',
    sameWifi: 'Stellen Sie sicher, dass Ihr Gerät im selben WiFi-Netzwerk ist.',
    openRemote: 'Controller verbinden',
    pinCode: 'PIN-Code',
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

  // Tour
  tour: {
    startTour: 'Rundgang starten',
    back: 'Zurück',
    close: 'Schließen',
    finish: 'Fertig',
    next: 'Weiter',
    skip: 'Überspringen',
    filmstrip: 'Hier sehen Sie alle Folien der Präsentation. Klicken Sie auf eine Folie, um direkt dorthin zu springen. Der orangefarbene Rand zeigt die aktuelle Folie.',
    remoteButton: 'Klicken Sie hier, um ein Handy oder Tablet als Fernbedienung zu verbinden. Scannen Sie den QR-Code mit Ihrem Gerät, um die Präsentation fernzusteuern.',
    timeblocks: 'Dies sind die Zeitblöcke Ihrer Präsentation. Jeder Block kann eigene Einstellungen wie Musik, Dauer oder Referentenmodus haben. Klicken Sie auf einen Block, um dorthin zu springen.',
    controls: 'Mit diesen Steuerelementen bedienen Sie die Präsentation: Abspielen/Pause, zur nächsten oder vorherigen Folie, oder zum nächsten Zeitblock. Sie können auch Tastenkürzel verwenden (Leertaste, Pfeiltasten, usw.).',
    displaySelect: 'Wählen Sie hier, auf welchem Bildschirm die Präsentation angezeigt werden soll. Wählen Sie einen externen Bildschirm oder Beamer.',
    startPresentation: 'Klicken Sie hier, um die Präsentation auf dem ausgewählten externen Bildschirm zu starten. Das Präsentationsfenster öffnet sich im Vollbildmodus auf dem Beamer.',
  },
}
