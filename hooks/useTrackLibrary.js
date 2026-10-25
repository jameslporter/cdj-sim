import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEMO_TRACKS } from '../constants/tracks';
import { pickAudioFiles } from '../utils/pickAudioFiles';
import {
  deleteUserTrack,
  importAudioFiles,
  isTrackStoreSupported,
  listUserTracks,
  subscribe,
  updateUserTrack,
} from '../utils/trackStore';

/**
 * The shared track library: the bundled demo tracks plus whatever the user
 * imported (kept in the browser's IndexedDB). Every track has the same
 * shape — { id, source: 'demo' | 'user', title, artist, bpm, key, duration,
 * firstBeat, peaks? } — so decks, browse lists and playlists can treat
 * them alike. Use `useTrackLibrary()` anywhere; all callers share one store.
 */
export default function useTrackLibrary() {
  const [userTracks, setUserTracks] = useState([]);
  const [loaded, setLoaded] = useState(!isTrackStoreSupported);
  const [importState, setImportState] = useState(null); // { index, total, name } while importing
  const [lastImport, setLastImport] = useState(null); // { added, failed } from the last import

  useEffect(() => {
    let alive = true;
    const unsubscribe = subscribe((tracks) => alive && setUserTracks(tracks));
    listUserTracks()
      .then((tracks) => alive && setUserTracks(tracks))
      .catch(() => {})
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const importFiles = useCallback(async (files) => {
    if (!files || files.length === 0) return { added: [], failed: [] };
    setImportState({ index: 0, total: files.length, name: files[0]?.name });
    try {
      const result = await importAudioFiles(files, { onProgress: setImportState });
      setLastImport(result);
      return result;
    } finally {
      setImportState(null);
    }
  }, []);

  // Opens the system file picker, then imports what was chosen.
  const pickAndImport = useCallback(async () => {
    const files = await pickAudioFiles();
    return importFiles(files);
  }, [importFiles]);

  const allTracks = useMemo(() => [...DEMO_TRACKS, ...userTracks], [userTracks]);

  return {
    demoTracks: DEMO_TRACKS,
    userTracks,
    allTracks,
    loaded,
    importSupported: isTrackStoreSupported,
    importing: importState,
    lastImport,
    importFiles,
    pickAndImport,
    removeTrack: deleteUserTrack,
    updateTrack: updateUserTrack,
  };
}
