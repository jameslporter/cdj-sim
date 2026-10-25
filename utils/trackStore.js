// Browser-side store for the user's own tracks. Everything lives in the
// browser's IndexedDB (no backend): one object store holds track metadata,
// a second holds the raw audio Blobs so the list can be read without
// loading every file into memory.
//
// Other features (e.g. Playlist Bank) should read tracks through
// `listUserTracks()` + `subscribe()`, or the `useTrackLibrary()` hook.

import { analyzeAudioFile } from './audioAnalysis';

const DB_NAME = 'cdj-sim';
const DB_VERSION = 1;
const META_STORE = 'tracks';
const AUDIO_STORE = 'audio';

export const ACCEPTED_AUDIO_TYPES = ['audio/*', '.mp3', '.m4a', '.aac', '.wav', '.aiff', '.aif', '.flac', '.ogg'];

export const isTrackStoreSupported = typeof indexedDB !== 'undefined';

let dbPromise = null;
let cache = null; // array of track metadata, oldest first
const listeners = new Set();
const objectUrls = new Map(); // track id -> blob: URL

function openDb() {
  if (!isTrackStoreSupported) return Promise.reject(new Error('IndexedDB is not available'));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(AUDIO_STORE)) db.createObjectStore(AUDIO_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
}

function emit() {
  for (const fn of listeners) fn(cache);
}

function newId() {
  return `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Subscribe to library changes. Returns an unsubscribe function. */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** All imported tracks (metadata only), oldest first. Cached after first read. */
export async function listUserTracks() {
  if (cache) return cache;
  if (!isTrackStoreSupported) {
    cache = [];
    return cache;
  }
  const db = await openDb();
  const all = await promisify(db.transaction(META_STORE).objectStore(META_STORE).getAll());
  cache = all.sort((a, b) => a.addedAt - b.addedAt);
  emit();
  return cache;
}

/**
 * Analyse and store audio files (a FileList or File[]). Resolves with the
 * tracks that were added; files that couldn't be decoded are reported in
 * `failed` instead of throwing.
 */
export async function importAudioFiles(files, { onProgress } = {}) {
  const list = Array.from(files || []);
  const added = [];
  const failed = [];
  await listUserTracks();
  const db = await openDb();

  // Ask the browser not to evict the library under storage pressure.
  navigator.storage?.persist?.().catch(() => {});

  for (let i = 0; i < list.length; i += 1) {
    const file = list[i];
    onProgress?.({ index: i, total: list.length, name: file.name });
    try {
      const info = await analyzeAudioFile(file);
      const track = {
        id: newId(),
        source: 'user',
        title: info.title,
        artist: info.artist,
        bpm: info.bpm,
        key: info.key,
        duration: info.duration,
        firstBeat: info.firstBeat,
        peaks: info.peaks,
        fileName: file.name,
        mimeType: file.type || 'audio/mpeg',
        size: file.size,
        addedAt: Date.now() + i,
      };
      const tx = db.transaction([META_STORE, AUDIO_STORE], 'readwrite');
      tx.objectStore(META_STORE).put(track);
      tx.objectStore(AUDIO_STORE).put(file, track.id);
      await txDone(tx);
      added.push(track);
      cache = [...cache, track];
      emit();
    } catch (err) {
      failed.push({ name: file.name, error: String(err?.message || err) });
    }
  }
  return { added, failed };
}

/** Change stored fields of a track (e.g. a corrected BPM or title). */
export async function updateUserTrack(id, changes) {
  await listUserTracks();
  const current = cache.find((t) => t.id === id);
  if (!current) return null;
  const next = { ...current, ...changes, id, source: 'user' };
  const db = await openDb();
  const tx = db.transaction(META_STORE, 'readwrite');
  tx.objectStore(META_STORE).put(next);
  await txDone(tx);
  cache = cache.map((t) => (t.id === id ? next : t));
  emit();
  return next;
}

export async function deleteUserTrack(id) {
  await listUserTracks();
  const db = await openDb();
  const tx = db.transaction([META_STORE, AUDIO_STORE], 'readwrite');
  tx.objectStore(META_STORE).delete(id);
  tx.objectStore(AUDIO_STORE).delete(id);
  await txDone(tx);
  // Don't revoke the blob: URL — a deck may still be playing this track.
  // It's released when the page closes.
  objectUrls.delete(id);
  cache = cache.filter((t) => t.id !== id);
  emit();
}

/** A playable `blob:` URL for an imported track (created once, then reused). */
export async function getUserTrackUrl(id) {
  if (objectUrls.has(id)) return objectUrls.get(id);
  const db = await openDb();
  const blob = await promisify(db.transaction(AUDIO_STORE).objectStore(AUDIO_STORE).get(id));
  if (!blob) throw new Error('Audio for this track is missing');
  const url = URL.createObjectURL(blob);
  objectUrls.set(id, url);
  return url;
}

/** How much browser storage the library uses, if the browser can tell us. */
export async function getStorageEstimate() {
  try {
    return (await navigator.storage?.estimate?.()) ?? null;
  } catch {
    return null;
  }
}
