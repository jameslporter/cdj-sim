import { getUserTrackUri } from './trackStore';

// Demo tracks are bundled assets; imported tracks play from wherever the
// device stored them (IndexedDB blob on web, a file on iOS/Android).
export async function resolveAudioSource(track) {
  if (track.source === 'user') return { uri: await getUserTrackUri(track.id) };
  return track.file;
}
