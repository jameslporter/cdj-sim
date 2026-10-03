import { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { clamp } from '../utils/format';

const SEGMENTS = 14;

function VuMeter({ level, height = 120, width = 10 }) {
  const [displayLevel, setDisplayLevel] = useState(0);
  const levelRef = useRef(level);
  levelRef.current = level;

  // One interval for the component's whole lifetime — restarting this on every
  // `level` change (which happens on every pixel of a fader/crossfader drag)
  // meant up to 4 VU meters were tearing down and recreating a timer per
  // pointer-move event, which is what made drags feel less smooth over time.
  useEffect(() => {
    const id = setInterval(() => {
      const current = levelRef.current;
      setDisplayLevel(current <= 0 ? 0 : clamp(current + (Math.random() - 0.5) * 0.12, 0, 1));
    }, 120);
    return () => clearInterval(id);
  }, []);

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
