import { getUserTrackUrl } from './trackStore';

// Demo tracks are bundled assets; imported tracks play from a blob: URL
// read out of the browser's IndexedDB.
export async function resolveAudioSource(track) {
  if (track.source === 'user') return { uri: await getUserTrackUrl(track.id) };
  return track.file;
}
