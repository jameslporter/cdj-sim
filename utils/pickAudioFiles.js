import * as DocumentPicker from 'expo-document-picker';

/**
 * Open the system file picker (browser dialog, iOS Files, Android picker)
 * for audio files. Resolves with [{ name, uri, mimeType, size, file? }] —
 * `file` is the browser File on web. Empty if the user cancels.
 */
export async function pickAudioFiles() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['audio/*'],
    multiple: true,
    copyToCacheDirectory: true,
    base64: false,
  });
  if (result.canceled) return [];
  return result.assets;
}
