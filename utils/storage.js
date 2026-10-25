// Tiny persistence helper. On web it uses localStorage; elsewhere (or when
// storage is blocked, e.g. a private window) it quietly does nothing, so
// callers always get their fallback value back.
function getStore() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    // Access can throw when site data is blocked.
  }
  return null;
}

export function loadJSON(key, fallback) {
  const store = getStore();
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  const store = getStore();
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or blocked storage: the sim keeps working, it just won't remember.
  }
}
