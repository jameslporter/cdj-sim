// Audio: Kevin MacLeod (incompetech.com), CC BY 4.0 — see assets/audio/CREDITS.md
export const DEMO_TRACKS = [
  {
    title: 'EDM Detection Mode',
    artist: 'Kevin MacLeod',
    bpm: 128,
    duration: 366,
    key: '1A',
    file: require('../assets/audio/edm-detection-mode.mp3'),
  },
  {
    title: 'Blippy Trance',
    artist: 'Kevin MacLeod',
    bpm: 138,
    duration: 120,
    key: '8A',
    file: require('../assets/audio/blippy-trance.mp3'),
  },
  {
    title: 'Neon Laser Horizon',
    artist: 'Kevin MacLeod',
    bpm: 160,
    duration: 179,
    key: '5A',
    file: require('../assets/audio/neon-laser-horizon.mp3'),
  },
];

// A simulated USB drive's root listing, as the CDJ's BROWSE screen would show
// it — rekordbox-exported USB drives put every track under a "Contents"
// folder at the root, which is what we mirror here.
export const USB_LIBRARY = [
  {
    type: 'folder',
    name: 'Contents',
    children: DEMO_TRACKS.map((_, i) => ({ type: 'track', trackIndex: i })),
  },
];

