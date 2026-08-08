import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../constants/theme';

export default function Waveform({ progressRatio, loopRange, height = 44, barCount = 60 }) {
  const bars = useMemo(() => {
    const result = [];
    for (let i = 0; i < barCount; i += 1) {
      const h = 6 + Math.abs(Math.sin(i * 0.45) * 22) + Math.abs(Math.cos(i * 0.13) * 10);
      result.push(Math.min(height, h));
    }
    return result;
  }, [barCount, height]);

  return (
    <View style={[styles.waveform, { height }]}>
      {loopRange ? (
        <View
          style={[
            styles.loopRegion,
            {
              left: `${loopRange.startRatio * 100}%`,
              width: `${Math.max(0, (loopRange.endRatio - loopRange.startRatio) * 100)}%`,
            },
          ]}
        />
      ) : null}
      {bars.map((h, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            {
              height: h,
              backgroundColor: i / bars.length <= progressRatio ? colors.accent : colors.accentDim,
            },
          ]}
        />
      ))}

      <View style={[styles.playhead, { left: `${Math.min(100, Math.max(0, progressRatio * 100))}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  waveform: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    position: 'relative',
  },
  bar: {
    flex: 1,
    minWidth: 1,
    borderRadius: 1,
  },
  loopRegion: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(79, 157, 255, 0.22)',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.blue,
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.red,
  },
});
