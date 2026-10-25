// Audio: Kevin MacLeod (incompetech.com), CC BY 4.0 — see assets/audio/CREDITS.md
// Every track (demo or imported) shares one shape — see hooks/useTrackLibrary.js.
import { unpackBands, unpackPeaks } from '../utils/peakPacking';
import { DEMO_WAVEFORMS } from './demoWaveforms';

export const DEMO_TRACKS = [
  {
    id: 'demo-edm-detection-mode',
    source: 'demo',
    title: 'EDM Detection Mode',
    artist: 'Kevin MacLeod',
    bpm: 128,
    duration: 366,
    key: '1A',
    firstBeat: 0,
    file: require('../assets/audio/edm-detection-mode.mp3'),
  },
  {
    id: 'demo-blippy-trance',
    source: 'demo',
    title: 'Blippy Trance',
    artist: 'Kevin MacLeod',
    bpm: 138,
    duration: 120,
    key: '8A',
    firstBeat: 0,
    file: require('../assets/audio/blippy-trance.mp3'),
  },
  {
    id: 'demo-neon-laser-horizon',
    source: 'demo',
    title: 'Neon Laser Horizon',
    artist: 'Kevin MacLeod',
    bpm: 160,
    duration: 179,
    key: '5A',
    firstBeat: 0,
    file: require('../assets/audio/neon-laser-horizon.mp3'),
  },
].map((t) => ({
  ...t,
  // Real waveform levels, analysed ahead of time (scripts/analyze-demo-waveforms.mjs).
  peaks: unpackPeaks(DEMO_WAVEFORMS[t.id]?.peaks),
  bands: unpackBands(DEMO_WAVEFORMS[t.id]?.bands),
}));

// Folder names on the simulated USB drive's BROWSE screen. rekordbox-exported
// drives put every track under "Contents"; imported tracks get their own folder.
export const DEMO_FOLDER = 'Contents';
export const USER_FOLDER = 'My Tracks';
