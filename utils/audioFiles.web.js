// Web: the audio itself goes in IndexedDB, the browser's store for large
// files (localStorage is capped at ~5 MB). Native uses audioFiles.native.js;
// both expose the same functions.

const DB_NAME = 'cdj-sim-audio';
const STORE = 'audio';

let dbPromise = null;
const objectUrls = new Map(); // track id -> blob: URL

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

function run(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Storage transaction aborted'));
      })
  );
}

export const isAudioStorageSupported = typeof indexedDB !== 'undefined';

/** The picked file's contents, for analysis. */
export async function readPickedBytes(picked) {
  if (picked.file) return picked.file.arrayBuffer();
  return (await fetch(picked.uri)).arrayBuffer();
}

/** Keep a copy of the picked file for this track. */
export async function saveAudio(track, picked) {
  const blob = picked.file ?? (await (await fetch(picked.uri)).blob());
  await run('readwrite', (store) => store.put(blob, track.id));
  // Ask the browser not to clear the library under storage pressure.
  navigator.storage?.persist?.().catch(() => {});
}

/** A URI the audio player can open. */
export async function getAudioUri(track) {
  if (objectUrls.has(track.id)) return objectUrls.get(track.id);
  const blob = await run('readonly', (store) => store.get(track.id));
  if (!blob) throw new Error('Audio for this track is missing');
  const url = URL.createObjectURL(blob);
  objectUrls.set(track.id, url);
  return url;
}

export async function deleteAudio(track) {
  await run('readwrite', (store) => store.delete(track.id));
  // Don't revoke the blob: URL: a deck may still be playing it. It's
  // released when the page closes.
  objectUrls.delete(track.id);
}
