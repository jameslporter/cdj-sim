import { useCallback, useSyncExternalStore } from 'react';
import { loadJSON, saveJSON } from './storage';

/**
 * A small store of something saved with each track (hot cues, memory cues),
 * the way rekordbox writes them to the USB: load a track on either deck and
 * they come back. Shared by both decks, remembered on the device.
 */
export function createPerTrackStore(storageKey, empty) {
  let byTrack = {};
  const listeners = new Set();
  const notify = () => listeners.forEach((l) => l());

  // Load the saved copy once. Anything set before it arrived wins.
  loadJSON(storageKey, {}).then((saved) => {
    if (!saved || typeof saved !== 'object') return;
    byTrack = { ...saved, ...byTrack };
    notify();
  });

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const getSnapshot = () => byTrack;

  const get = (trackId) => byTrack[trackId] ?? empty;

  // `update` is the new value, or a function of the current one.
  const set = (trackId, update) => {
    const next = typeof update === 'function' ? update(get(trackId)) : update;
    byTrack = { ...byTrack, [trackId]: next };
    saveJSON(storageKey, byTrack);
    notify();
  };

  function useStore() {
    const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    const getFor = useCallback((trackId) => all[trackId] ?? empty, [all]);
    return { get: getFor, set };
  }

  return { get, set, useStore };
}
