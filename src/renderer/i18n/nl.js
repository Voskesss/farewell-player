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

  // Systeemvereisten
  requirements: {
    title: 'Systeemvereisten',
    mac: 'macOS 10.13 (High Sierra) of hoger',
    windows: 'Windows 10 of hoger',
    recommended: 'Aanbevolen: computer van 2015 of nieuwer',
    remote: 'Telefoon remote: zelfde WiFi-netwerk, moderne browser (Chrome aanbevolen)',
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
    remoteAutoStart: 'Remote auto-start',
    remoteAutoStartTooltip: 'Afstandsbediening "volgende" start ook automatisch afspelen (aan = R500/clicker, uit = toetsenbord)',
    remoteHint:
      'Afstandsbediening: werkt op het presentatievenster (beamerscherm). PageDown, Enter, punt of pijl rechts/omlaag = volgende dia; PageUp, komma of pijl links/omhoog = vorige; spatie of mediatoets play/pauze. Zonder remote: klik het presentatievenster actief en test met die toetsen. Toewijzing in de app zelf instellen kan (nog) niet; veel clickers kun je bij de fabrikant op PageDown/PageUp zetten.',
    editPresentationHint: 'Wil je de presentatie wijzigen? Ga naar je profiel op thelastfarewell.nl en exporteer opnieuw.',
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
    retry: 'Opnieuw proberen',
    checkForUpdates: 'Controleer op updates',
    checking: 'Controleren...',
  },

  // Remote control
  remote: {
    title: 'Verbind telefoon/tablet als controller',
    instructions: 'Scan de QR-code met je telefoon of tablet, of open de URL in een browser.',
    selectNetwork: 'Netwerk selecteren',
    orOpenUrl: 'Of open deze URL:',
    sameWifi: 'Zorg dat je apparaat op hetzelfde WiFi-netwerk zit.',
    openRemote: 'Verbind controller',
    pinCode: 'PIN code',
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

  // Tour
  tour: {
    startTour: 'Rondleiding starten',
    back: 'Terug',
    close: 'Sluiten',
    finish: 'Klaar',
    next: 'Volgende',
    skip: 'Overslaan',
    filmstrip: 'Hier zie je alle slides van de presentatie. Klik op een slide om direct daarheen te springen. De oranje rand toont de huidige slide.',
    remoteButton: 'Klik hier om een telefoon of tablet als afstandsbediening te verbinden. Scan de QR-code met je apparaat om de presentatie op afstand te bedienen.',
    timeblocks: 'Dit zijn de tijdblokken van je presentatie. Elk blok kan eigen instellingen hebben zoals muziek, duur of speaker-modus. Klik op een blok om daarheen te springen.',
    controls: 'Hiermee bedien je de presentatie: afspelen/pauzeren, naar de volgende of vorige slide, of naar het volgende tijdblok. Je kunt ook sneltoetsen gebruiken (Space, pijltjes, etc.).',
    displaySelect: 'Kies hier op welk scherm je de presentatie wilt tonen. Selecteer een extern scherm of beamer.',
    startPresentation: 'Klik hier om de presentatie te starten op het geselecteerde externe scherm. Het presentatievenster opent fullscreen op de beamer.',
    exitButton: 'Met deze knop sluit je de presentatie volledig af en ga je terug naar het beginscherm om een andere presentatie te laden.',
    finished: 'Dat was de rondleiding! Klik op deze knop als je de tour nog een keer wilt zien. Veel succes met je presentatie!',
  },
}
