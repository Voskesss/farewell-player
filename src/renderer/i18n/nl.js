export const nl = {
  // App info
  app: {
    name: 'Farewell Player',
    tagline: 'Offline presentatie speler voor uitvaartpresentaties',
    version: 'Versie',
    madeBy: 'The Last Farewell',
  },

  // DropZone
  dropZone: {
    title: 'Farewell Player',
    subtitle: 'Offline presentatie speler voor uitvaartpresentaties',
    dropHere: 'Sleep een',
    fileType: '.farewell',
    dropHereEnd: 'bestand hierheen',
    orClick: 'of klik om een bestand te selecteren',
  },

  // Controller - Navigation
  controller: {
    // Tooltips voor knoppen
    resetToStart: 'Reset naar begin',
    previousSession: 'Vorige sessie',
    previousSlide: 'Vorige slide',
    play: 'Afspelen',
    pause: 'Pauzeer',
    nextSlide: 'Volgende slide',
    nextSession: 'Volgende sessie',
    closePresentation: 'Sluit presentatie',
    exitToHome: 'Terug naar beginscherm',
    
    // Keyboard shortcuts
    shortcuts: {
      arrows: 'Vorige / Volgende slide',
      upDown: 'Vorige / Volgende sessie',
      reset: 'Reset naar begin',
      space: 'Afspelen / Pauzeren',
      escape: 'Sluit presentatie',
    },
    
    // Session info
    session: 'Sessie',
    slide: 'Slide',
    of: 'van',
    slides: 'slides',
    secondsPerSlide: 's/slide',
    
    // Session types
    sessionTypes: {
      loop: 'Loop',
      speaker: 'Spreker',
      music: 'Muziek',
    },
    
    // Audio
    audioAvailable: 'Audio beschikbaar',
    speakerNotes: 'Spreker notities',
    
    // Display selection
    selectDisplay: 'Selecteer scherm',
    startPresentation: 'Projecteer op extern scherm',
    startPresentationShort: 'Projecteer',
    projectExternalTooltip:
      'Opent de presentatie fullscreen op het gekozen scherm (kies eerst in de lijst meestal «Extern»). Dit venster blijft je bediening.',
    stopPresentationTooltip: 'Sluit het presentatievenster op het andere scherm',
    projectExternalBanner:
      'Kies het scherm hiernaast (vaak 📺 Extern), daarna op de knop — de dia verschijnt fullscreen op die monitor.',
    stopPresentation: 'Stop presentatie',
    stopPresentationShort: 'Stop',
    presentationActive: 'Presentatie actief',
    primaryDisplay: 'Primair',
    externalDisplay: 'Extern',

    // Presentatorweergave (v3)
    elapsed: 'Verstreken',
    nextSlidePreview: 'Volgende dia',
    notes: 'Notities',
    sessions: 'Sessies',
    timeBlocks: 'Tijdblokken',
    endOfPresentation: 'Einde van de presentatie',
    allSlides: 'Alle dia\'s',
    nextWithinTimeBlock: 'Nog in dit tijdblok',
    nextNewTimeBlock: 'Volgend tijdblok: {name}',
    remoteHint:
      'Afstandsbediening: werkt op het presentatievenster (beamerscherm). PageDown, Enter, punt of pijl rechts/omlaag = volgende dia; PageUp, komma of pijl links/omhoog = vorige; spatie of mediatoets play/pauze. Zonder remote: klik het presentatievenster actief en test met die toetsen. Toewijzing in de app zelf instellen kan (nog) niet; veel clickers kun je bij de fabrikant op PageDown/PageUp zetten.',
  },

  // Music Player
  musicPlayer: {
    embedded: 'Ingebed',
    local: 'Eigen MP3',
    noAudio: 'Geen audio beschikbaar',
    chooseOther: 'Andere muziek kiezen',
    selectFile: 'Selecteer MP3 bestand',
    clickToAdd: 'Klik om eigen muziek toe te voegen',
    looping: 'herhalend',
    volume: 'Volume',
  },

  // Update notifications
  update: {
    available: 'Update beschikbaar',
    ready: 'Update klaar!',
    downloading: 'Downloaden...',
    downloadProgress: 'Downloaden... {percent}%',
    clickToInstall: 'Klik om te installeren',
    installNow: 'Nu installeren',
    later: 'Later',
    error: 'Fout',
    restartToRetry: 'Herstart de app om opnieuw te proberen',
  },

  // Errors
  errors: {
    fileNotFound: 'Bestand niet gevonden',
    invalidFile: 'Ongeldig bestand',
    loadError: 'Fout bij laden',
    dropFarewellFile: 'Sleep een .farewell bestand hierheen',
  },

  // Time formatting
  time: {
    hours: 'u',
    minutes: 'm',
    seconds: 's',
  },
}
