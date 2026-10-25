// Learning mode explanations, keyed by control.
//
// Each control's testID is mapped to a key (see learnKeyFor below), so both
// decks share one explanation and all mixer channels share another. Every
// entry has:
//   title  what's printed on the hardware
//   what   what the control does
//   how    how DJs use it in a set
//   tip    optional: something to try right now in the sim
//   note   optional: where the sim differs from the real CDJ-3000X / DJM-V10

export const LEARN_CONTENT = {
  // ── Deck: top panel and screen buttons ────────────────────────────────
  'usb-stop': {
    title: 'USB / STOP',
    what: 'The USB port for the drive holding your rekordbox-exported music, and the STOP button that safely ejects it. The indicator lights while the drive is being read.',
    how: 'DJs plug in their USB stick at the start of a set and always press STOP (and wait for the light to go out) before pulling it out, so the drive and its rekordbox data don\'t get corrupted.',
    note: 'The sim\'s USB drive is always connected, so STOP has no effect here.',
  },
  'screen-source': {
    title: 'SOURCE',
    what: 'Shows the media you can play from: USB drives, an SD card, or other players and a laptop running rekordbox over PRO DJ LINK.',
    how: 'DJs use SOURCE to pick which drive to browse. With players linked, you can even play tracks from the USB stick plugged into the deck next to you.',
  },
  'screen-browse': {
    title: 'BROWSE',
    what: 'Opens the track browser for the current source, showing its folders and tracks.',
    how: 'Use it to find the next track, then load it with the rotary selector. In the sim, My Tracks lets you import your own songs.',
    tip: 'Press BROWSE, turn the rotary selector to pick a track, then press the rotary to load it.',
  },
  'screen-tag-list': {
    title: 'TAG LIST',
    what: 'A temporary playlist of tracks you marked with TAG TRACK, shared by all linked players.',
    how: 'While playing, DJs tag tracks they might want next so they don\'t have to dig through the whole library again.',
    note: 'Not simulated yet.',
  },
  'screen-playlist': {
    title: 'PLAYLIST',
    what: 'Lists the playlists you built in rekordbox. On the 3000X the Playlist Bank buttons along the top jump straight to up to four favourite playlists.',
    how: 'Most DJs organise music into playlists by genre, energy or gig before the set, then pick from those instead of browsing folders.',
  },
  'screen-search': {
    title: 'SEARCH',
    what: 'Opens an on-screen keyboard to find a track by typing part of its title or artist.',
    how: 'Handy when you know exactly which track you want and it\'s buried in a big library.',
    note: 'Not simulated yet.',
  },
  'screen-menu': {
    title: 'MENU / UTILITY',
    what: 'Returns the screen to the main playback view. Holding it opens UTILITY, the player\'s settings menu.',
    how: 'DJs tap it to get back to the waveform after browsing. UTILITY is where you change settings like the jog display or quantize beat value.',
  },
  'screen-back': {
    title: 'BACK',
    what: 'Goes up one level in the browser, or back to the playback screen.',
    how: 'Use it to leave a folder or playlist without loading anything.',
  },
  'tag-track': {
    title: 'TAG TRACK / REMOVE',
    what: 'Adds the highlighted track to the Tag List, or removes it if it\'s already there.',
    how: 'Tag tracks as ideas while you browse so you can come back to them in the next mix.',
    note: 'The Tag List itself isn\'t simulated yet.',
  },
  'track-filter': {
    title: 'TRACK FILTER / EDIT',
    what: 'Filters the browser to show only tracks that match conditions you set, such as a BPM range near the current track or a matching key. Holding it edits the conditions.',
    how: 'DJs use it to narrow a big library to tracks that will mix well with what\'s playing now.',
    note: 'Not simulated yet.',
  },
  shortcut: {
    title: 'SHORTCUT',
    what: 'Opens a shortcut screen with quick settings like quantize beat value, beat jump size and phase meter display.',
    how: 'Lets you change common settings mid-set without digging into UTILITY.',
    note: 'Not simulated yet.',
  },
  rotary: {
    title: 'ROTARY SELECTOR',
    what: 'Turn it to move the cursor up and down a list. Push it to open the highlighted folder or load the highlighted track onto this deck.',
    how: 'This is how most DJs browse on a CDJ: turn to find the track, push to load. Loading while the deck is playing is locked on the real player, so you load onto the deck that isn\'t on air.',
    tip: 'The ◀ and ▶ buttons turn it; the middle button pushes it.',
  },

  // ── Deck: the screen itself ───────────────────────────────────────────
  'display-player': {
    title: 'PLAYER NUMBER',
    what: 'The number this deck has on the PRO DJ LINK network. Players are usually numbered left to right.',
    how: 'The mixer, other players and rekordbox use this number, so you know which deck is which when syncing or sharing tracks.',
  },
  'display-track': {
    title: 'TRACK INFO',
    what: 'Title and artist of the loaded track.',
    how: 'A quick check that you loaded the track you meant to before you bring it in.',
  },
  'display-key': {
    title: 'KEY',
    what: 'The musical key of the track, detected by rekordbox (or by the sim when you import a song).',
    how: 'Harmonic mixing: tracks in the same or neighbouring keys blend without clashing. Many DJs use the key to choose the next track.',
  },
  'display-zoom': {
    title: 'ZOOMED WAVEFORM',
    what: 'A close-up of the music around the playhead (the red line in the middle), scrolling at a fixed speed. The thin white lines are the beat grid, one per beat; the red lines mark the first beat of each bar. Coloured marks at the top are hot cues, red triangles at the bottom are memory cues.',
    how: 'DJs read it to see what\'s coming: the next drop, a breakdown, or where the beats line up for a cue point. With two decks playing, compare where the grid lines cross the playhead to check your beatmatch.',
  },
  'phase-meter': {
    title: 'PHASE METER',
    what: 'Four boxes for the four beats of a bar. The white box is the beat this deck is on; the orange outline is the master deck\'s beat. The small bar on the right shows how far apart the beats are: centred and green means locked.',
    how: 'After matching BPMs, nudge the jog until the white box and orange outline sit together and the needle is centred. Then the two tracks are in time, bar for bar.',
    tip: 'Play deck A, set it as MASTER, play deck B and watch its phase meter. Nudge B\'s jog ring to line them up.',
  },
  'beat-countdown': {
    title: 'BEAT COUNTDOWN',
    what: 'Bars and beats left until the next memory cue, so "8.2" means 8 bars and 2 beats.',
    how: 'DJs mark the end of an intro or the start of an outro with a memory cue, then glance here to time the mix to the phrase.',
    tip: 'Press MEMORY a little ahead of the playhead, go back, and watch it count down.',
  },
  'overview-waveform': {
    title: 'OVERVIEW WAVEFORM',
    what: 'The whole track at a glance, with the playhead, hot cues and loops marked. Touch it while paused to jump there (needle search). Touch it while playing to preview that spot in your headphones without changing what the crowd hears (Touch Cue).',
    how: 'DJs glance at it to see how long until the next breakdown or the end of the track, and use needle search to quickly find a spot to cue from.',
    tip: 'Pause the deck and touch anywhere on the overview to jump there.',
  },
  'gate-cue': {
    title: 'GATE CUE',
    what: 'A 3000X touch key. When on, hot cue pads only play while you hold them: let go and the track stops and returns to the cue.',
    how: 'Lets DJs audition a hot cue, or play a short stab or vocal, without the track running away. Press PLAY while holding a pad to keep playing after you let go.',
    tip: 'Turn on GATE CUE, pause, then hold a lit hot cue pad.',
  },
  'time-toggle': {
    title: 'TIME (ELAPSED / REMAIN)',
    what: 'Shows how far into the track you are (ELAPSED) or how much is left (REMAIN). Tap to switch.',
    how: 'Most DJs keep it on REMAIN so they always know how long they have to get the next track ready.',
  },
  'display-tempo': {
    title: 'TEMPO %',
    what: 'How far the tempo fader has moved the track\'s speed from its original, with the current range (±6, ±10, ±16 or WIDE). MT lights when Master Tempo is on, Q when Quantize is on.',
    how: 'DJs watch it while beatmatching by ear, and to make sure they haven\'t pushed a track too far from its natural speed.',
  },
  'display-bpm': {
    title: 'BPM',
    what: 'The track\'s tempo in beats per minute, including any change from the tempo fader.',
    how: 'To beatmatch, set the incoming track to the same BPM as the one playing, then fine-tune with the jog wheel.',
    tip: 'Move the tempo fader and watch the BPM change.',
  },

  // ── Deck: pads and cue/loop buttons ───────────────────────────────────
  'time-mode': {
    title: 'TIME MODE / AUTO CUE',
    what: 'Switches the time display between elapsed and remaining. Holding it turns Auto Cue on or off, which sets the cue point just before the first sound when a track loads. A.CUE on the screen shows it\'s on.',
    how: 'With Auto Cue on, a freshly loaded track is ready to start on the first beat instead of a few seconds of silence. It\'s on by default, and the deck remembers the setting.',
    tip: 'Hold TIME MODE until A.CUE disappears from the screen, then load a track: it now starts at 0:00.',
  },
  quantize: {
    title: 'QUANTIZE',
    what: 'Snaps cues, loops and beat jumps to the nearest beat on the track\'s beat grid.',
    how: 'Keeps everything on beat even if your timing is a little off. Most DJs leave it on.',
    tip: 'With QUANTIZE on, set a hot cue mid-beat: it lands on the beat.',
  },
  'memory-save': {
    title: 'MEMORY',
    what: 'Saves the current position as a memory cue, saved with the track so it\'s there next time. Memory cues show as red triangles on the waveforms but aren\'t on pads. With Auto Cue on, a track loads at its first memory cue.',
    how: 'DJs mark useful spots like the first beat, the breakdown and the outro while preparing tracks, then step through them during a set.',
  },
  'memory-call': {
    title: 'CUE/LOOP CALL ◀ ▶',
    what: 'Jumps to the previous or next memory cue from where the track is, and waits there paused with it as the cue point.',
    how: 'A fast way to get to a pre-marked mix-in point without searching.',
  },
  'memory-delete': {
    title: 'DELETE',
    what: 'Tap it to delete the memory cue you last called. Hold it and press a HOT CUE pad to delete that hot cue.',
    how: 'Clean up cues you no longer need. Holding DELETE first means a stray pad press can never wipe a cue.',
    note: 'With a mouse you can\'t hold two buttons, so clicking DELETE makes it blink until you click a pad. Click DELETE again instead to delete the memory cue.',
  },
  hotcue: {
    title: 'HOT CUE A–H',
    what: 'Eight pads that each store a point in the track. Press an empty pad to save the current position (or, while a loop plays, the loop: it lights orange); press a lit pad to jump there and play instantly. To delete one, hold DELETE and press the pad.',
    how: 'DJs set hot cues on drops, vocals and breakdowns to jump around the track, remix live or start a mix from exactly the right beat. Hot cues stay with the track and come back every time it\'s loaded.',
    tip: 'Play a track, tap pad A to save a cue, then tap it again to jump back.',
  },
  'loop-in': {
    title: 'LOOP IN / CUE',
    what: 'Sets the start of a loop at the current position, and sets the cue point there too. While a loop plays, it switches to IN ADJUST (the button blinks): turn the jog to move the loop\'s start, and press it again to finish.',
    how: 'Press IN at the start of a phrase, then OUT a few beats later to loop it. It\'s also how you set a new cue point without stopping the track.',
  },
  'loop-out': {
    title: 'LOOP OUT',
    what: 'Sets the end of the loop at the current position and starts looping. While a loop plays, it switches to OUT ADJUST (the button blinks): turn the jog to move the loop\'s end, and press it again to finish.',
    how: 'Use it right after LOOP IN for a manual loop of any length.',
  },
  'loop-reloop-exit': {
    title: 'RELOOP / EXIT',
    what: 'While looping, EXIT lets the track play on past the loop. Otherwise RELOOP jumps back to the last loop and starts it again.',
    how: 'DJs exit the loop on the downbeat so the track carries on in time with the mix.',
  },
  'loop-4beat': {
    title: '4 BEAT LOOP / 1/2X',
    what: 'Starts a 4-beat loop instantly. While a loop plays, it halves the loop\'s length.',
    how: 'Instant loops keep the beat going during a transition. Halving a loop over and over builds tension before a drop.',
    tip: 'Play a track, press 4 BEAT, then press 1/2X a few times.',
  },
  'loop-8beat': {
    title: '8 BEAT LOOP / 2X',
    what: 'Starts an 8-beat loop instantly. While a loop plays, it doubles the loop\'s length.',
    how: 'An 8-beat loop is two bars, a natural length for extending an intro or outro while you mix the next track in.',
  },
  beatjump: {
    title: 'BEAT JUMP ◀ ▶',
    what: 'Jumps backward or forward by the number of beats shown, staying on beat.',
    how: 'DJs skip a section they don\'t want, or jump back to repeat a part, without losing the beat match.',
  },
  'beatjump-count': {
    title: 'BEAT JUMP SIZE',
    what: 'Shows how far BEAT JUMP moves. Touch it to pick 1/2, 1, 2, 4, 8, 16, 32 or 64 beats. The deck starts at 16.',
    how: '16 or 32 beats (4 or 8 bars) is common for skipping whole phrases; small jumps are for creative stutters.',
  },

  // ── Deck: jog area ────────────────────────────────────────────────────
  'jog-mode': {
    title: 'JOG MODE (VINYL / CDJ)',
    what: 'Switches the jog wheel between VINYL mode, where touching the top stops the track like a record, and CDJ mode, where the top only bends the pitch.',
    how: 'Scratch DJs use VINYL mode. Many club DJs use CDJ mode so an accidental touch doesn\'t stop the music.',
  },
  'vinyl-speed-adjust': {
    title: 'VINYL SPEED ADJUST',
    what: 'Sets how quickly the track comes back up to speed when you let go of the jog in VINYL mode.',
    how: 'Keep it low for tight scratches. Turn it up for a slow, turntable-style start after a spinback.',
    tip: 'In VINYL mode, flick the top of the jog backward and let go: the track swoops back, then rises to speed.',
    note: 'In the sim it only sets the start-up after a release; the stop on touch is always instant.',
  },
  'jog-adjust': {
    title: 'JOG ADJUST',
    what: 'Sets how heavy the jog wheel feels: how hard it is to turn and how long it keeps spinning after you let go.',
    how: 'Scratch DJs often like it light so the platter glides; others prefer it heavy so nudges stay small and controlled.',
    tip: 'Turn it all the way down, flick the jog and watch how long it coasts. Then turn it up and try again.',
  },
  'mode-slip': {
    title: 'SLIP',
    what: 'While SLIP is on, the track keeps counting in the background during loops, scratches, hot cues and reverse. When you let go, it picks up where it would have been. The button flashes while a slip action is running, and a blue line on the overview waveform shows where the track will come back in.',
    how: 'DJs use it for loops, stutters and scratches that never knock the track out of time with the mix.',
    tip: 'Turn on SLIP, start a 4-beat loop, wait, then EXIT: the track jumps ahead to where it would have been. With SLIP on, hot cues only play while you hold the pad.',
  },
  direction: {
    title: 'DIRECTION (FWD / REV / SLIP REV)',
    what: 'Plays the track forward or in reverse. FWD and REV stay where you put them. SLIP REV is spring-loaded: it plays backward only while held, then carries on as if it had never reversed.',
    how: 'A quick reverse "rewind" effect, often on a vocal or the last beat before a drop.',
    note: 'Reverse needs the mixer audio engine (web or a dev build). In Expo Go it only changes the display.',
  },
  'jog-wheel': {
    title: 'JOG WHEEL',
    what: 'The big platter. Turning the outer edge nudges the speed to bring two tracks into time. In VINYL mode, touching the top holds the track like a record, so dragging it plays the music forward or backward (scratching). The center screen shows the play position and cue.',
    how: 'After matching BPMs, DJs nudge the jog to line up the kick drums by ear. While paused, it moves through the track a frame at a time to find a precise cue point.',
    tip: 'Turn on VINYL with JOG MODE, play a track, then hold the top of the jog and drag it back and forth.',
  },
  'track-search': {
    title: 'TRACK SEARCH |◀◀ ▶▶|',
    what: '▶▶| loads the next track in the current folder or playlist. |◀◀ first jumps back to the start of the loaded track; press it again to load the previous track. A track loaded while playing starts playing.',
    how: 'A quick way to step through tracks in order without opening the browser. Never press it on the deck that\'s playing to the crowd!',
  },
  search: {
    title: 'SEARCH ◀◀ ▶▶',
    what: 'Fast-rewinds or fast-forwards through the track while held.',
    how: 'Use it to scrub to a rough position, then fine-tune with the jog wheel.',
  },
  'cue-button': {
    title: 'CUE',
    what: 'While paused, sets the cue point at the current position. While playing, jumps back to the cue point and pauses. Holding CUE while paused plays from the cue until you let go; press PLAY while holding it to keep playing. The ring is solid when you\'re paused on the cue, and blinks when you\'re paused anywhere else.',
    how: 'The classic way to start a mix: find the first beat with the jog, press CUE to mark it, then hit PLAY right on the beat of the track that\'s playing. DJs tap CUE to check the start is right.',
    tip: 'Pause, nudge the jog a little, press CUE. Now hold CUE: the track plays from there and snaps back when you let go.',
    note: 'With a mouse you can only hold one button, so CUE + PLAY needs a touch screen.',
  },
  'play-button': {
    title: 'PLAY / PAUSE',
    what: 'Starts and pauses playback. The ring is solid green while playing and blinks while paused. Pausing doesn\'t move the cue point.',
    how: 'Start the incoming track on the downbeat of the outgoing one.',
  },

  // ── Deck: tempo ───────────────────────────────────────────────────────
  'beat-sync': {
    title: 'BEAT SYNC / INST DOUBLES',
    what: 'Locks this deck\'s tempo and beats to the MASTER deck. The tempo fader stops having an effect while it\'s on (the TEMPO % turns grey). Hold it for INST DOUBLES, which loads the other deck\'s track at the same spot.',
    how: 'Sync takes care of beatmatching so you can focus on EQ, phrasing and effects. Learn to beatmatch by ear too, in case sync is off or the beat grid is wrong.',
    tip: 'Play deck A, then press BEAT SYNC on deck B and play it: the BPMs match and the beats line up.',
  },
  'sync-master': {
    title: 'MASTER',
    what: 'Makes this deck the tempo master. Decks with BEAT SYNC on follow its BPM and beats. The master\'s BPM is framed in orange.',
    how: 'The master is usually the track playing to the crowd. When you finish a mix, hand MASTER to the new track so the next one follows it.',
  },
  'tempo-range': {
    title: 'TEMPO RANGE',
    what: 'Sets how far the tempo fader can change the speed: ±6%, ±10%, ±16% or WIDE (±100%).',
    how: 'DJs use ±6% for fine control when beatmatching by ear, and a wider range only when mixing tracks with very different BPMs.',
  },
  'tempo-master': {
    title: 'MASTER TEMPO',
    what: 'Keeps the track\'s musical key the same when you change its speed with the tempo fader.',
    how: 'Without it, speeding up a track also raises its pitch, like a record. Most DJs keep it on, especially with vocals.',
  },
  'tempo-fader-thumb': {
    title: 'TEMPO FADER',
    what: 'Changes the playback speed. Like the real CDJ, it reads − at the top and + at the bottom: pull it toward you to speed up.',
    how: 'The main tool for beatmatching. Match the incoming track\'s BPM to the one playing, then keep small corrections on the fader so the beats stay locked.',
    tip: 'Drag it down and watch the BPM rise.',
  },
  'tempo-reset': {
    title: 'TEMPO RESET',
    what: 'Plays the track at its original speed, ignoring the tempo fader, until you press it again. The fader doesn\'t move.',
    how: 'Quickly hear a track at its natural tempo, or play it untouched after a mix. Remember the fader still holds its old setting for when you turn it off.',
  },

  // ── Deck: browse and Playlist Bank (3000X) ────────────────────────────
  'browse-list': {
    title: 'TRACK LIST',
    what: 'Folders and tracks on the selected source. Touch a row to open a folder or load a track. The loaded track is marked.',
    how: 'On the real touch screen DJs tap and scroll lists like a phone. The rotary selector does the same with a physical knob.',
  },
  'preview-toggle': {
    title: 'TOUCH PREVIEW COLUMN',
    what: 'Shows or hides the mini waveforms beside each track in the list.',
    how: 'Touch Preview lets you hear any part of a track in your headphones straight from the list, before loading it.',
  },
  'preview-wave': {
    title: 'TOUCH PREVIEW',
    what: 'Hold a track\'s mini waveform to hear that part of it, without loading it or touching what\'s playing. While holding, press a hot cue pad to save a hot cue on that track at the preview point (Preview Hot Cue).',
    how: 'DJs check whether a track fits before committing to it, and can prepare hot cues on the next track without loading it.',
    note: 'With a mouse you can only hold one thing, so clicking a preview keeps it playing until you press ■.',
  },
  'preview-stop': {
    title: 'STOP PREVIEW',
    what: 'Stops a Touch Preview that is playing.',
    how: 'Sim only: with a mouse, preview keeps playing after you click so you can press a hot cue pad. On a touch screen preview stops when you lift your finger.',
  },
  'playlist-bank': {
    title: 'PLAYLIST BANK',
    what: 'Four 3000X shortcut buttons for playlists. With a playlist open or highlighted, press a grey bank to register it. Press a lit bank to jump straight to that playlist.',
    how: 'DJs register the playlists they reach for most, like "Openers" or "Peak time", so one tap gets them there mid-set.',
  },
  'playlist-bank-deregister': {
    title: 'PLAYLIST BANK DEREGISTER',
    what: 'Turns on deregister mode: the next bank you press is cleared.',
    how: 'Free up a bank for a different playlist.',
  },

  // ── Mixer: channel strip ──────────────────────────────────────────────
  'ch-input': {
    title: 'INPUT SELECT',
    what: 'Chooses what plays through this channel: DIGITAL or LINE from a CDJ, PHONO from a turntable, or MULTI I/O from a laptop.',
    how: 'Set once when you plug in. If a deck is silent, a wrong input selector is one of the first things to check.',
  },
  'ch-trim': {
    title: 'TRIM',
    what: 'Sets the channel\'s input level before the EQ and fader.',
    how: 'DJs set TRIM so each track peaks at the same level on the meters. Then the faders control the mix, not differences between recordings.',
    tip: 'Play a deck and turn TRIM: the channel meter follows.',
  },
  'ch-eq-hi': {
    title: 'EQ HI',
    what: 'Boosts or cuts the treble: hi-hats, cymbals and vocal sparkle.',
    how: 'Cut the highs of the incoming track while mixing so two sets of hi-hats don\'t clash.',
  },
  'ch-eq-himid': {
    title: 'EQ HI MID',
    what: 'Boosts or cuts the upper midrange: vocals, synth leads and snares.',
    how: 'The DJM-V10\'s 4-band EQ gives finer control. Cut hi-mids to tuck one vocal under another.',
  },
  'ch-eq-lomid': {
    title: 'EQ LO MID',
    what: 'Boosts or cuts the lower midrange: the body of chords, pads and basslines.',
    how: 'Trim lo-mids to stop two tracks sounding muddy when blended.',
  },
  'ch-eq-low': {
    title: 'EQ LOW',
    what: 'Boosts or cuts the bass: kick drums and basslines.',
    how: 'The most important EQ in a mix. Two basslines at once sound muddy, so DJs swap the lows: cut the bass of the new track, then swap it with the old one on a phrase change.',
    tip: 'Play both decks and cut LOW on one channel.',
  },
  'ch-comp': {
    title: 'COMP',
    what: 'A one-knob compressor that evens out loud and quiet parts, making the channel sound denser and punchier.',
    how: 'A DJM-V10 feature for tightening up older or quieter recordings. Use a little: too much squashes the music.',
  },
  'ch-cue': {
    title: 'CUE (HEADPHONES)',
    what: 'Sends this channel to your headphones, whether or not its fader is up.',
    how: 'The key to mixing: listen to the next track in your headphones and beatmatch it before the crowd hears it.',
    tip: 'Pull channel 2\'s fader down, press its CUE, play deck B and turn HEADPHONES MIXING toward CUE: you hear deck B, the "crowd" doesn\'t.',
    note: 'The real V10 has two headphone outputs (CUE A and CUE B). The sim has one, which is what your device plays.',
  },
  'hp-mixing': {
    title: 'HEADPHONES MIXING',
    what: 'Blends what you hear in your headphones between the channels with CUE on (left) and the master mix (right).',
    how: 'Many DJs keep it near the middle so they hear the incoming track over the mix, then check each one by turning it fully left or right.',
    note: 'In the sim your device\'s speakers or headphones play the HEADPHONES output, so it starts at MASTER.',
  },
  'hp-level': {
    title: 'HEADPHONES LEVEL',
    what: 'How loud your headphones are.',
    how: 'Keep it as low as you can and still hear the beats clearly. Loud headphones in a loud booth damage hearing fast.',
  },
  'hp-split': {
    title: 'MONO SPLIT',
    what: 'Puts the cued channels in your left ear and the master in your right.',
    how: 'A classic way to beatmatch: compare the two tracks one in each ear, without moving the MIXING knob.',
  },
  'hp-pre-eq': {
    title: 'PRE EQ',
    what: 'Cues channels before their EQ and filter, so you hear the track untouched even while its EQ is cut.',
    how: 'Handy when the incoming track\'s bass is cut for the mix but you want to hear its kick to beatmatch.',
  },
  'ch-fader': {
    title: 'CHANNEL FADER',
    what: 'The channel\'s volume in the mix.',
    how: 'Most transitions bring the new track up on its fader while the old one comes down, often together with EQ swaps.',
    tip: 'Play deck A and move this fader: the meter and volume follow.',
  },
  'ch-assign': {
    title: 'CROSSFADER ASSIGN (A / THRU / B)',
    what: 'Puts this channel on side A or B of the crossfader, or THRU to bypass the crossfader completely.',
    how: 'Club DJs often set every channel to THRU and mix on the channel faders. Scratch and hip-hop DJs assign decks to A and B to cut quickly with the crossfader.',
  },
  'ch-meter': {
    title: 'CHANNEL LEVEL METER',
    what: 'Shows how loud this channel is after TRIM, EQ and FILTER, before its fader. The red segments mean it\'s going over 0 dB.',
    how: 'Set TRIM so the loud parts of every track peak in the orange and never hit the red. Then the faders control the mix and nothing distorts.',
    tip: 'Play a deck and turn its TRIM up until the red segments flicker, then back off.',
  },
  crossfader: {
    title: 'CROSSFADER',
    what: 'Fades between the channels assigned to A (left) and B (right). Channels set to THRU ignore it.',
    how: 'Slide it across for a quick blend, or flick it for scratch cuts. Many house and techno DJs leave it in the middle and use channel faders.',
  },

  // ── Mixer: mic ────────────────────────────────────────────────────────
  'mic-mode': {
    title: 'MIC (OFF / ON / TALK OVER)',
    what: 'Turns the mic on or off. TALK OVER turns the music down automatically while you speak.',
    how: 'Use TALK OVER for announcements so the crowd hears you clearly without you having to reach for the faders.',
  },
  'mic-level': {
    title: 'MIC LEVEL',
    what: 'Volume of the microphone.',
    how: 'Set it so your voice sits just above the music without feeding back.',
  },
  'mic-eq-hi': {
    title: 'MIC EQ HI',
    what: 'Boosts or cuts the treble of the mic.',
    how: 'Add a little for clearer speech, cut it if the mic sounds harsh or hissy.',
  },
  'mic-eq-low': {
    title: 'MIC EQ LOW',
    what: 'Boosts or cuts the bass of the mic.',
    how: 'Cut it to remove boominess and handling noise.',
  },

  // ── Mixer: filter ─────────────────────────────────────────────────────
  'filter-lpf': {
    title: 'LPF',
    what: 'Turns on the low-pass side of every channel\'s FILTER knob. A low-pass removes the highs for a muffled, underwater sound.',
    how: 'Turn a channel\'s FILTER knob left to sweep it in. Leave LPF off if you only ever want the knob to high-pass.',
  },
  'filter-hpf': {
    title: 'HPF',
    what: 'Turns on the high-pass side of every channel\'s FILTER knob. A high-pass removes the bass for a thin, distant sound.',
    how: 'Turn a channel\'s FILTER knob right to sweep it in. Sweeping a high-pass on the outgoing track clears room for the new one.',
  },
  'ch-filter': {
    title: 'FILTER',
    what: 'This channel\'s filter. Centre is off. Turn left for a low-pass (muffled), right for a high-pass (thin). The LPF and HPF buttons choose which sides work, and RESONANCE sets the edge.',
    how: 'Filters are one of the most used effects: slow sweeps over 8 or 16 bars build tension into a drop, or ease a track out of the mix.',
    tip: 'Play a deck and turn its FILTER knob slowly to the right, then back to the middle.',
  },
  'filter-resonance': {
    title: 'FILTER RESONANCE',
    what: 'Emphasises the frequencies right at the filter\'s cutoff, adding a sharper, whistling edge.',
    how: 'More resonance makes filter sweeps more dramatic. Go easy: high resonance can get piercing on a big system.',
  },

  // ── Mixer: send FX ────────────────────────────────────────────────────
  'sendfx-source': {
    title: 'SEND / RETURN (INT / EXT1 / EXT2)',
    what: 'Chooses where the send effect comes from: the mixer\'s built-in effects (INT) or an external effects unit plugged into EXT1 or EXT2.',
    how: 'Some DJs bring their own effects pedal or sampler and plug it in here.',
  },
  'sendfx-size': {
    title: 'SEND FX SIZE / FEEDBACK',
    what: 'Sets the size of the reverb space or the feedback of a delay.',
    how: 'Bigger sizes give long washes, useful for ending a track or covering a transition.',
  },
  'sendfx-time': {
    title: 'SEND FX TIME',
    what: 'Sets the delay or reverb time.',
    how: 'Set delays to a musical time so echoes land on the beat.',
  },
  'sendfx-tone': {
    title: 'SEND FX TONE',
    what: 'Filters the effect\'s sound, darker or brighter.',
    how: 'Darken a reverb so it doesn\'t fight the music\'s highs.',
  },
  'sendfx-send': {
    title: 'SEND LEVEL',
    what: 'How much of the channel goes into the send effect.',
    how: 'Ride it up on the last beat of a phrase to send a vocal off into a long echo.',
  },
  'sendfx-masterlevel': {
    title: 'SEND FX MIX LEVEL',
    what: 'The volume of the effect coming back into the mix.',
    how: 'Balance how loud the effect sounds against the dry music.',
  },
  'sendfx-mastermix': {
    title: 'MASTER MIX',
    what: 'Sends the whole master output through the send effect, not just one channel.',
    how: 'Put a reverb or echo over everything for a big ending or breakdown.',
  },

  // ── Mixer: master ─────────────────────────────────────────────────────
  'master-level': {
    title: 'MASTER LEVEL',
    what: 'The overall volume going to the main speakers.',
    how: 'Set it so the master meter peaks below the red. Turn up the venue\'s amps, not the mixer, if it needs to be louder.',
  },
  'master-booth': {
    title: 'BOOTH',
    what: 'The volume of the DJ booth monitor speakers, separate from the main speakers.',
    how: 'DJs set the booth loud enough to hear the mix clearly over the room, but not so loud it masks the headphones.',
  },
  'master-isolator-on': {
    title: 'ISOLATOR ON/OFF',
    what: 'Turns on the DJM-V10\'s master isolator, a 3-band EQ on the whole mix.',
    how: 'Isolators can kill a whole band for dramatic effects, like dropping all the bass from the room before a drop.',
  },
  'master-iso': {
    title: 'ISOLATOR HI / MID / LOW',
    what: 'Boosts or fully cuts one band of the whole master output.',
    how: 'Sweep the LOW isolator out and slam it back on the drop. Popular with house DJs who mix on rotary-style isolators.',
  },
  'master-meter': {
    title: 'MASTER METER',
    what: 'The level of the master output.',
    how: 'Keep it out of the red. A clipping mixer sounds harsh on a big system and can damage speakers.',
  },

  // ── Mixer: beat FX ────────────────────────────────────────────────────
  'beatfx-effect': {
    title: 'BEAT FX SELECT',
    what: 'Picks the Beat FX effect: echo, delay, spiral, reverb, flanger, filter, trans, roll and more. They sync to the BPM automatically.',
    how: 'Choose an effect before you need it so it\'s ready on the right beat.',
  },
  'beatfx-assign': {
    title: 'BEAT FX ASSIGN',
    what: 'Chooses which channel the Beat FX applies to, or the master output.',
    how: 'Usually the outgoing track, for example an echo-out on the last phrase.',
  },
  'beatfx-onoff': {
    title: 'BEAT FX ON/OFF',
    what: 'Turns the selected Beat FX on or off.',
    how: 'Tap it on the beat for an effect that lands in time, then off before it gets messy.',
  },
};

// Which part of the setup a testID belongs to, for the panel's header.
function areaFor(testID) {
  let m = testID.match(/^deck([AB])-/);
  if (m) return `DECK ${m[1]} · CDJ-3000X`;
  m = testID.match(/^mixer-ch(\d)-/);
  if (m) return `DJM-V10 · CHANNEL ${m[1]}`;
  m = testID.match(/^mixer-mic(\d)-/);
  if (m) return `DJM-V10 · MIC ${m[1]}`;
  if (testID.startsWith('mixer-')) return 'DJM-V10 MIXER';
  return '';
}

// testID suffixes that share one explanation.
const ALIASES = [
  [/^usb\d-stop$/, 'usb-stop'],
  [/^browse-(prev|next|load)$/, 'rotary'],
  [/^preview-wave-\d+$/, 'preview-wave'],
  [/^playlist-bank-(\d+|bar)$/, 'playlist-bank'],
  [/^hotcue-[A-H]$/, 'hotcue'],
  [/^memory-call-(back|forward)$/, 'memory-call'],
  [/^beatjump-(back|forward)$/, 'beatjump'],
  [/^beatjump-(size-.*|panel)$/, 'beatjump-count'],
  [/^track-search-(back|forward)$/, 'track-search'],
  [/^search-(back|forward)$/, 'search'],
  [/^direction(-.*)?$/, 'direction'],
  [/^(ch-assign|mic-mode|filter-mode|sendfx-source)(-.*)?$/, '$1'],
  [/^master-iso-(hi|mid|low)$/, 'master-iso'],
];

// Map a control's testID (e.g. "deckB-hotcue-C", "mixer-ch2-eq-low") to its
// LEARN_CONTENT key, or null when there's nothing to explain.
export function learnKeyFor(testID) {
  if (!testID) return null;
  let key = testID
    .replace(/^deck[AB]-/, '')
    .replace(/^mixer-ch\d-/, 'ch-')
    .replace(/^mixer-mic\d-/, 'mic-')
    .replace(/^mixer-/, '');
  for (const [pattern, replacement] of ALIASES) {
    if (pattern.test(key)) {
      key = key.replace(pattern, replacement);
      break;
    }
  }
  return LEARN_CONTENT[key] ? key : null;
}

export function learnEntryFor(testID) {
  const key = learnKeyFor(testID);
  if (!key) return null;
  return { key, area: areaFor(testID), ...LEARN_CONTENT[key] };
}
