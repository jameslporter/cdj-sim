import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { clamp } from '../utils/format';

const SEGMENTS = 14;

export default function VuMeter({ level, height = 120, width = 10 }) {
  const [displayLevel, setDisplayLevel] = useState(0);

  useEffect(() => {
    if (level <= 0) {
      setDisplayLevel(0);
      return undefined;
    }
    const id = setInterval(() => {
      setDisplayLevel(clamp(level + (Math.random() - 0.5) * 0.12, 0, 1));
    }, 120);
    return () => clearInterval(id);
  }, [level]);

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

const styles = StyleSheet.create({
  column: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    gap: 2,
  },
});
