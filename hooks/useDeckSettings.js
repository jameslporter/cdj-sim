import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, UTILITY_SETTINGS } from '../constants/utilitySettings';
import { loadJSON, saveJSON } from '../utils/storage';

// One player's UTILITY settings, remembered on the device (the real player
// keeps them in its own memory).
export default function useDeckSettings(deckId) {
  const key = `cdj-sim:utility:v1:${deckId}`;
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    loadJSON(key, null).then((saved) => {
      if (saved && typeof saved === 'object') setSettings((s) => ({ ...s, ...saved }));
    });
  }, [key]);

  const setSetting = useCallback(
    (name, value) => {
      setSettings((s) => {
        const next = { ...s, [name]: value };
        saveJSON(key, next);
        return next;
      });
    },
    [key]
  );

  // Step a setting to its next option (wrapping), like turning the rotary.
  const cycleSetting = useCallback(
    (name, dir = 1) => {
      const def = UTILITY_SETTINGS.find((s) => s.key === name);
      if (!def) return;
      setSettings((s) => {
        const i = def.options.indexOf(s[name]);
        const next = { ...s, [name]: def.options[(i + dir + def.options.length) % def.options.length] };
        saveJSON(key, next);
        return next;
      });
    },
    [key]
  );

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveJSON(key, DEFAULT_SETTINGS);
  }, [key]);

  return { settings, setSetting, cycleSetting, reset };
}
