import { useCallback, useSyncExternalStore } from 'react';
import { loadJSON, saveJSON } from '../utils/storage';

// Hot cues are saved with the track, the way rekordbox writes them to the
// USB: load a track on either deck and its cues come back. One store shared
// by both decks, remembered in the browser between visits.
const STORAGE_KEY = 'cdj-sim:hot-cues:v1';
export const EMPTY_HOT_CUES = Object.freeze(Array(8).fill(null));

let cuesByTrack = loadJSON(STORAGE_KEY, {});
const listeners = new Set();

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
  listeners.forEach((l) => l());
}

export default function useTrackHotCues() {
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const get = useCallback((trackId) => all[trackId] ?? EMPTY_HOT_CUES, [all]);
  return { get, set: setTrackHotCues };
}
