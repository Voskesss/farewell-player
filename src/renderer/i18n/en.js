export const en = {
  // App info
  app: {
    name: 'Farewell Player',
    tagline: 'Offline presentation player for funeral presentations',
    version: 'Version',
    madeBy: 'The Last Farewell',
  },

  // DropZone
  dropZone: {
    title: 'Farewell Player',
    subtitle: 'Offline presentation player for funeral presentations',
    dropHere: 'Drop a',
    fileType: '.farewell',
    dropHereEnd: 'file here',
    orClick: 'or click to select a file',
  },

  // Controller - Navigation
  controller: {
    // Button tooltips
    resetToStart: 'Reset to start',
    previousSession: 'Previous session',
    previousSlide: 'Previous slide',
    play: 'Play',
    pause: 'Pause',
    nextSlide: 'Next slide',
    nextSession: 'Next session',
    closePresentation: 'Close presentation',
    exitToHome: 'Back to start',
    
    // Keyboard shortcuts
    shortcuts: {
      arrows: 'Previous / Next slide',
      upDown: 'Previous / Next session',
      reset: 'Reset to start',
      space: 'Play / Pause',
      escape: 'Close presentation',
    },
    
    // Session info
    session: 'Session',
    slide: 'Slide',
    of: 'of',
    slides: 'slides',
    secondsPerSlide: 's/slide',
    
    // Session types
    sessionTypes: {
      loop: 'Loop',
      speaker: 'Speaker',
      music: 'Music',
    },
    
    // Audio
    audioAvailable: 'Audio available',
    speakerNotes: 'Speaker notes',
    
    // Display selection
    selectDisplay: 'Select display',
    startPresentation: 'Show on external display',
    startPresentationShort: 'Project',
    projectExternalTooltip:
      'Opens the presentation fullscreen on the selected display (pick «External» first). This window stays your control panel.',
    stopPresentationTooltip: 'Close the presentation window on the other screen',
    projectExternalBanner:
      'Pick the display (often 📺 External), then press the button — slides go fullscreen on that monitor.',
    stopPresentation: 'Stop presentation',
    stopPresentationShort: 'Stop',
    presentationActive: 'Presentation active',
    primaryDisplay: 'Primary',
    externalDisplay: 'External',

    // Presenter view (v3)
    elapsed: 'Elapsed',
    nextSlidePreview: 'Next slide',
    notes: 'Notes',
    sessions: 'Sections',
    timeBlocks: 'Time blocks',
    endOfPresentation: 'End of presentation',
    allSlides: 'All slides',
    nextWithinTimeBlock: 'Still in this time block',
    nextNewTimeBlock: 'Next time block: {name}',
    remoteAutoStart: 'Remote auto-start',
    remoteAutoStartTooltip: 'Remote "next" also starts playback automatically (on = R500/clicker, off = keyboard)',
    remoteHint:
      'Remote: works on the presentation window (projector screen). Page Down, Enter, period, or arrow right/down = next slide; Page Up, comma, or arrow left/up = previous; Space or media play/pause toggles play/pause. Without a remote: focus that window and try those keys. In-app remapping is not available yet; many clickers can be set to Page Down/Page Up in the vendor software.',
  },

  // Music Player
  musicPlayer: {
    embedded: 'Embedded',
    local: 'Own MP3',
    noAudio: 'No audio available',
    chooseOther: 'Choose other music',
    selectFile: 'Select MP3 file',
    clickToAdd: 'Click to add your own music',
    looping: 'looping',
    volume: 'Volume',
  },

  // Update notifications
  update: {
    available: 'Update available',
    ready: 'Update ready!',
    downloading: 'Downloading...',
    downloadProgress: 'Downloading... {percent}%',
    clickToInstall: 'Click to install',
    installNow: 'Install now',
    later: 'Later',
    error: 'Error',
    retry: 'Try again',
    checkForUpdates: 'Check for updates',
    checking: 'Checking...',
  },

  // Remote control
  remote: {
    title: 'Connect phone/tablet as controller',
    instructions: 'Scan the QR code with your phone or tablet, or open the URL in a browser.',
    selectNetwork: 'Select network',
    orOpenUrl: 'Or open this URL:',
    sameWifi: 'Make sure your device is on the same WiFi network.',
    openRemote: 'Connect controller',
    pinCode: 'PIN code',
  },

  // Errors
  errors: {
    fileNotFound: 'File not found',
    invalidFile: 'Invalid file',
    loadError: 'Loading error',
    dropFarewellFile: 'Drop a .farewell file here',
  },

  // Time formatting
  time: {
    hours: 'h',
    minutes: 'm',
    seconds: 's',
  },

  // Tour
  tour: {
    startTour: 'Start tour',
    back: 'Back',
    close: 'Close',
    finish: 'Done',
    next: 'Next',
    skip: 'Skip',
    filmstrip: 'Here you see all slides of the presentation. Click on a slide to jump directly to it. The orange border shows the current slide.',
    remoteButton: 'Click here to connect a phone or tablet as a remote control. Scan the QR code with your device to control the presentation remotely.',
    timeblocks: 'These are the time blocks of your presentation. Each block can have its own settings like music, duration, or speaker mode. Click on a block to jump to it.',
    controls: 'Use these controls to operate the presentation: play/pause, go to the next or previous slide, or to the next time block. You can also use keyboard shortcuts (Space, arrows, etc.).',
    displaySelect: 'Choose here which screen to show the presentation on. Select an external screen or projector.',
    startPresentation: 'Click here to start the presentation on the selected external screen. The presentation window opens fullscreen on the projector.',
  },
}
