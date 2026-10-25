import { useEffect, useRef, useState } from 'react';

// The deck's position, re-read every animation frame while `running` (about
// 30 times a second) so the waveform scrolls smoothly instead of jumping
// with the player's slower status updates. When stopped it just returns
// `fallback`.
export default function useLivePosition(getPosition, running, fallback) {
  const [position, setPosition] = useState(fallback);
  const getRef = useRef(getPosition);
  getRef.current = getPosition;

  useEffect(() => {
    if (!running) return undefined;
    let frame;
    let last = 0;
    const tick = (t) => {
      if (t - last >= 30) {
        last = t;
        setPosition(getRef.current());
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  return running ? position : fallback;
}
