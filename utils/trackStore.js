// The user's own tracks, stored on the device with no backend. It works the
// same on web, iOS and Android:
//  - track info (title, BPM, waveform…) lives in AsyncStorage;
//  - the audio itself goes through ./audioFiles, the one platform-specific
//    piece: IndexedDB on web, the app's documents folder on iOS/Android.
//
// Other features (e.g. Playlist Bank) should read tracks through
// `listUserTracks()` + `subscribe()`, or the `useTrackLibrary()` hook.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyzeAudio } from './audioAnalysis';
import { packBands, packPeaks, unpackBands, unpackPeaks } from './peakPacking';
import { deleteAudio, getAudioUri, isAudioStorageSupported, readPickedBytes, saveAudio } from './audioFiles';

const STORAGE_KEY = 'cdj-sim/user-tracks/v1';

export const isTrackStoreSupported = isAudioStorageSupported;

let cache = null; // array of track metadata, oldest first
let loading = null;
const listeners = new Set();

function toStored(track) {
  return { ...track, peaks: packPeaks(track.peaks), bands: packBands(track.bands) };
}

function fromStored(track) {
  return { ...track, source: 'user', peaks: unpackPeaks(track.peaks), bands: unpackBands(track.bands) };
}

async function persist(next) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next.map(toStored)));
  cache = next;
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

/** All imported tracks, oldest first. Cached after the first read. */
export function listUserTracks() {
  if (cache) return Promise.resolve(cache);
  if (!loading) {
    loading = AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        cache = raw ? JSON.parse(raw).map(fromStored) : [];
        return cache;
      })
      .catch(() => {
        cache = [];
        return cache;
      });
  }
  return loading;
}

/**
 * Analyse and store picked files ([{ name, uri, file? }] from
 * pickAudioFiles). Resolves with the tracks that were added; files that
 * couldn't be read are reported in `failed` instead of throwing.
 */
export async function importAudioFiles(pickedFiles, { onProgress } = {}) {
  const list = Array.from(pickedFiles || []);
  const added = [];
  const failed = [];
  await listUserTracks();

  for (let i = 0; i < list.length; i += 1) {
    const picked = list[i];
    onProgress?.({ index: i, total: list.length, name: picked.name });
    try {
      const info = await analyzeAudio({ name: picked.name, bytes: await readPickedBytes(picked) });
      if (!info.analyzed && !/^audio\//.test(picked.mimeType || '')) throw new Error('Not an audio file');
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
        bands: info.bands,
        fileName: picked.name,
        mimeType: picked.mimeType || 'audio/mpeg',
        size: picked.size ?? null,
        addedAt: Date.now() + i,
      };
      await saveAudio(track, picked);
      await persist([...cache, track]);
      added.push(track);
    } catch (err) {
      failed.push({ name: picked.name, error: String(err?.message || err) });
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
  await persist(cache.map((t) => (t.id === id ? next : t)));
  return next;
}

export async function deleteUserTrack(id) {
  await listUserTracks();
  const track = cache.find((t) => t.id === id);
  if (!track) return;
  await deleteAudio(track);
  await persist(cache.filter((t) => t.id !== id));
}

/** A URI the audio player can open for an imported track. */
export async function getUserTrackUri(id) {
  const track = (await listUserTracks()).find((t) => t.id === id);
  if (!track) throw new Error('Track not found');
  return getAudioUri(track);
}
