import { useCallback, useSyncExternalStore } from 'react';
import { loadJSON, saveJSON } from '../utils/storage';

// Hot cues are saved with the track, the way rekordbox writes them to the
// USB: load a track on either deck and its cues come back. One store shared
// by both decks, remembered on the device between sessions.
const STORAGE_KEY = 'cdj-sim:hot-cues:v1';
export const EMPTY_HOT_CUES = Object.freeze(Array(8).fill(null));

let cuesByTrack = {};
const listeners = new Set();
const notify = () => listeners.forEach((l) => l());

// Load saved cues once at startup. Anything set before loading finished
// wins over the saved copy.
loadJSON(STORAGE_KEY, {}).then((saved) => {
  if (!saved || typeof saved !== 'object') return;
  cuesByTrack = { ...saved, ...cuesByTrack };
  notify();
});

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => cuesByTrack;

export function getTrackHotCues(trackId) {
  return cuesByTrack[trackId] ?? EMPTY_HOT_CUES;
}

// `update` is the new 8-slot array, or a function of the current one.
export function setTrackHotCues(trackId, update) {
  const current = getTrackHotCues(trackId);
  const next = typeof update === 'function' ? update(current) : update;
  cuesByTrack = { ...cuesByTrack, [trackId]: next };
  saveJSON(STORAGE_KEY, cuesByTrack);
  notify();
}

export default function useTrackHotCues() {
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const get = useCallback((trackId) => all[trackId] ?? EMPTY_HOT_CUES, [all]);
  return { get, set: setTrackHotCues };
}
