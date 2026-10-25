import { useEffect, useState } from 'react';

// On/off at the deck's LED blink rate while `enabled`; always on otherwise.
export default function useBlink(enabled, periodMs = 500) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (!enabled) {
      setOn(true);
      return undefined;
    }
    const id = setInterval(() => setOn((v) => !v), periodMs);
    return () => clearInterval(id);
  }, [enabled, periodMs]);
  return on;
}
