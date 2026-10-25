// iOS / Android: imported audio is moved into the app's documents folder,
// which the OS doesn't clear, so the only limit is free space on the device.
// Web uses audioFiles.web.js; both expose the same functions.
import { Directory, File, Paths } from 'expo-file-system';

const TRACKS_DIR = 'tracks';

function tracksDir() {
  const dir = new Directory(Paths.document, TRACKS_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

function audioFile(track) {
  return new File(tracksDir(), track.audioFile);
}

export const isAudioStorageSupported = true;

/** The picked file's contents, for analysis. */
export async function readPickedBytes(picked) {
  const bytes = await new File(picked.uri).bytes();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

/** Keep the picked file for this track (sets track.audioFile). */
export async function saveAudio(track, picked) {
  const ext = (picked.name.match(/\.[a-z0-9]+$/i)?.[0] ?? '.mp3').toLowerCase();
  track.audioFile = `${track.id}${ext}`;
  // The picker hands us a private copy in the cache folder, so move it.
  await new File(picked.uri).move(audioFile(track));
}

/** A URI the audio player can open. */
export async function getAudioUri(track) {
  const file = audioFile(track);
  if (!file.exists) throw new Error('Audio for this track is missing');
  return file.uri;
}

export async function deleteAudio(track) {
  const file = audioFile(track);
  if (file.exists) file.delete();
}
