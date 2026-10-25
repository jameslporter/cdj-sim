import { ACCEPTED_AUDIO_TYPES } from './trackStore';

/**
 * Open the browser's file picker for audio files. Resolves with the chosen
 * File objects (empty if the user cancels or the platform has no DOM).
 */
export function pickAudioFiles() {
  if (typeof document === 'undefined') return Promise.resolve([]);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = ACCEPTED_AUDIO_TYPES.join(',');
    input.style.display = 'none';
    let settled = false;
    const finish = (files) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(files);
    };
    input.addEventListener('change', () => finish(Array.from(input.files || [])));
    input.addEventListener('cancel', () => finish([]));
    document.body.appendChild(input);
    input.click();
  });
}
