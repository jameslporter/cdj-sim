// The CDJ-3000X UTILITY settings the sim models (hold MENU/UTILITY), with the
// factory setting (from the CDJ-3000 manual) first. `shortcut` ones also appear on the SHORTCUT screen.
export const UTILITY_SETTINGS = [
  {
    key: 'playMode',
    label: 'PLAY MODE',
    options: ['SINGLE', 'CONTINUE'],
    help: 'CONTINUE plays the next track in the list when one ends. SINGLE stops.',
    shortcut: true,
  },
  {
    key: 'loadLock',
    label: 'LOAD LOCK',
    options: ['UNLOCK', 'LOCK'],
    help: 'LOCK stops a new track loading while this deck is playing.',
    shortcut: true,
  },
  {
    key: 'quantizeBeat',
    label: 'QUANTIZE BEAT VALUE',
    options: ['1', '1/2', '1/4', '1/8'],
    help: 'The grid that hot cues, loops and beat jumps snap to with QUANTIZE on.',
    shortcut: true,
  },
  {
    key: 'autoCueLevel',
    label: 'AUTO CUE LEVEL',
    options: ['MEMORY', '-36dB', '-42dB', '-48dB', '-54dB', '-60dB', '-66dB', '-72dB', '-78dB'],
    help: 'Where Auto Cue parks a track: its first memory cue (MEMORY), or the first sound louder than this level.',
  },
  {
    key: 'slipFlashing',
    label: 'SLIP FLASHING',
    options: ['ON', 'OFF'],
    help: 'Whether the SLIP button flashes while the slip playhead is running.',
  },
  {
    key: 'onAirDisplay',
    label: 'ON AIR DISPLAY',
    options: ['ON', 'OFF'],
    help: 'Lights the jog ring and player number red while the mixer channel is live.',
  },
  {
    key: 'jogRingIndicator',
    label: 'JOG RING INDICATOR',
    options: ['ON', 'OFF'],
    help: 'Blinks the jog ring when the track is about to end.',
  },
  {
    key: 'hotCueColor',
    label: 'HOT CUE COLOR',
    options: ['OFF', 'ON'],
    help: 'ON lights each hot cue pad in its own colour. OFF lights them all green.',
  },
  {
    key: 'playerNumber',
    label: 'PLAYER No.',
    options: ['AUTO', '1', '2', '3', '4', '5', '6'],
    help: 'The player number on the PRO DJ LINK network. AUTO numbers players in the order they connect.',
  },
];

export const DEFAULT_SETTINGS = Object.fromEntries(UTILITY_SETTINGS.map((s) => [s.key, s.options[0]]));

/** QUANTIZE BEAT VALUE as a fraction of a beat. */
export const quantizeBeats = (value) => ({ 1: 1, '1/2': 0.5, '1/4': 0.25, '1/8': 0.125 })[value] ?? 1;
