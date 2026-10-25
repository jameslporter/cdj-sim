import { useSyncExternalStore } from 'react';
import { loadJSON, saveJSON } from '../utils/storage';

// The TAG LIST: a temporary list of tracks marked with TAG TRACK. Like the
// real players on a PRO DJ LINK network, both decks share one list. It's
// remembered on the device.
const KEY = 'cdj-sim:tag-list:v1';
let ids = [];
const listeners = new Set();
const notify = () => listeners.forEach((l) => l());

loadJSON(KEY, []).then((saved) => {
  if (!Array.isArray(saved)) return;
  ids = [...new Set([...ids, ...saved])];
  notify();
});

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => ids;

function setIds(next) {
  ids = next;
  saveJSON(KEY, ids);
  notify();
}

export const tagList = {
  has: (id) => ids.includes(id),
  /** Add the track, or take it off if it's already tagged. Returns the new state. */
  toggle(id) {
    if (ids.includes(id)) {
      setIds(ids.filter((x) => x !== id));
      return false;
    }
    setIds([...ids, id]);
    return true;
  },
  remove: (id) => setIds(ids.filter((x) => x !== id)),
  clear: () => setIds([]),
};

/** The tagged track ids, in the order they were tagged. */
export default function useTagList() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
