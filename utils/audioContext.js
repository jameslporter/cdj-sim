// The one Web Audio context the sim shares: react-native-audio-api is the Web
// Audio API on web, iOS and Android alike. Decks, the mixer and the scratch
// voices all live in it so they can be wired together.
//
// react-native-audio-api is a native module, so it's missing in Expo Go.
// There getAudioApi() is null and the sim falls back to expo-audio players.

let api;
export function getAudioApi() {
  if (api === undefined) {
    try {
      api = require('react-native-audio-api');
    } catch {
      api = null;
    }
  }
  return api;
}

let context = null;
export function getAudioContext() {
  const audio = getAudioApi();
  if (!audio) return null;
  if (!context) {
    try {
      context = new audio.AudioContext({ sampleRate: 44100 });
    } catch {
      return null;
    }
    preloadTimeStretch(audio);
  }
  return context;
}

// On web, MASTER TEMPO's time-stretcher is a WebAssembly module served from
// public/react-native-audio-api (copied there by react-native-audio-api's
// setup-rn-audio-api-web script). Load it from under the app's base URL so it
// also works when the site is served from a sub-path (GitHub Pages).
function preloadTimeStretch(audio) {
  if (typeof audio.LoadCustomWasm !== 'function') return; // native has it built in
  let base = '';
  try {
    base = require('expo-constants').default.expoConfig?.experiments?.baseUrl ?? '';
  } catch {
    // no base URL
  }
  audio.LoadCustomWasm(`${base.replace(/\/$/, '')}/react-native-audio-api`);
}

/** Browsers start audio suspended until a touch or click; call from one. */
export function resumeAudioContext() {
  const ctx = getAudioContext();
  if (ctx && ctx.state !== 'running') ctx.resume?.()?.catch?.(() => {});
}

// A playable source (require() number, { uri }, or a URI string) as
// something decodeAudioData accepts.
export async function sourceToDecodable(source) {
  if (typeof source === 'number') {
    const { Asset } = require('expo-asset');
    const asset = Asset.fromModule(source);
    await asset.downloadAsync();
    return asset.localUri || asset.uri;
  }
  return source?.uri ?? source;
}
