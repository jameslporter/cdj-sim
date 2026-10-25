import { useState } from 'react';
import { loadJSON, saveJSON } from '../utils/storage';

export const PLAYLIST_BANK_SLOTS = 4;

// Playlist Bank (CDJ-3000X): each player can bank up to four playlists for
// one-touch access on the PLAYLIST screen. Slots hold playlist ids and are
// remembered per deck.
export default function usePlaylistBank(storageKey) {
  const [slots, setSlots] = useState(() => {
    const saved = loadJSON(storageKey, null);
    return Array.isArray(saved) && saved.length === PLAYLIST_BANK_SLOTS ? saved : Array(PLAYLIST_BANK_SLOTS).fill(null);
  });
  const [deregistering, setDeregistering] = useState(false);

  const update = (next) => {
    setSlots(next);
    saveJSON(storageKey, next);
  };

  const register = (slot, playlistId) => {
    const next = [...slots];
    next[slot] = playlistId;
    update(next);
  };

  const deregister = (slot) => {
    const next = [...slots];
    next[slot] = null;
    update(next);
    setDeregistering(false);
  };

  return {
    slots,
    deregistering,
    toggleDeregister: () => setDeregistering((d) => !d),
    register,
    deregister,
  };
}
