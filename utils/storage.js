import AsyncStorage from '@react-native-async-storage/async-storage';

// Small key/value persistence for every platform: AsyncStorage keeps it in
// the app's storage on iOS/Android and in localStorage on web. Failures
// (blocked or full storage) are swallowed so the sim keeps working; it just
// won't remember.
export async function loadJSON(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function saveJSON(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}
