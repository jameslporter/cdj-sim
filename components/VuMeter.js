import { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { clamp } from '../utils/format';

const SEGMENTS = 14;
// Meter scale in dB: the bottom segment lights at -28 dB, the top at +4 dB.
// The two red segments mean the signal is above 0 dB: turn TRIM down.
const FLOOR_DB = -28;
const RANGE_DB = 32;
const FALL_PER_TICK = 0.06;

const peakToLevel = (peak) => (peak <= 0 ? 0 : clamp((20 * Math.log10(peak) - FLOOR_DB) / RANGE_DB, 0, 1));

/**
 * A segment level meter. With `getPeak` it shows the real audio level (a 0–1
 * linear peak, polled about 30 times a second, falling back gently like a
 * hardware meter). Without it, `level` (0–1) is shown with a little movement,
 * for setups where the audio can't be measured.
 */
function VuMeter({ level = 0, getPeak, height = 120, width = 10 }) {
  const [displayLevel, setDisplayLevel] = useState(0);
  const levelRef = useRef(level);
  levelRef.current = level;
  const peakRef = useRef(getPeak);
  peakRef.current = getPeak;

  // One interval for the component's whole lifetime, so fader drags don't
  // restart timers.
  useEffect(() => {
    const id = setInterval(
      () => {
        if (peakRef.current) {
          const next = peakToLevel(peakRef.current());
          setDisplayLevel((prev) => (next >= prev ? next : Math.max(next, prev - FALL_PER_TICK)));
        } else {
          const current = levelRef.current;
          setDisplayLevel(current <= 0 ? 0 : clamp(current + (Math.random() - 0.5) * 0.12, 0, 1));
        }
      },
      getPeak ? 33 : 120
    );
    return () => clearInterval(id);
  }, [getPeak != null]); // eslint-disable-line react-hooks/exhaustive-deps

  const litCount = Math.round(displayLevel * SEGMENTS);
  const segmentHeight = (height - (SEGMENTS - 1) * 2) / SEGMENTS;

  return (
    <View style={[styles.column, { width, height }]}>
      {Array.from({ length: SEGMENTS }).map((_, i) => {
        const lit = i >= SEGMENTS - litCount;
        let color = '#1c1c1c';
        if (lit) {
          if (i < 2) color = '#ff4d4d';
          else if (i < 4) color = '#ffb238';
          else color = '#4fd87a';
        }
        return <View key={i} style={{ height: segmentHeight, borderRadius: 1, backgroundColor: color }} />;
      })}
    </View>
  );
}

export default memo(VuMeter);

const styles = StyleSheet.create({
  column: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    gap: 2,
  },
});
