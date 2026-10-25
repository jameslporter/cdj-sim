import { StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';
import VerticalFader from './VerticalFader';

const TRACK_HEIGHT = 250;
const THUMB_HEIGHT = 26;

// Long-throw CDJ-3000X tempo slider: a narrow slot with a printed scale and
// a brushed-metal cap.
export default function TempoFader({ pitch, range, onChange, testID }) {
  const ticks = [];
  for (let i = 0; i <= 10; i += 1) {
    ticks.push(
      <View
        key={i}
        style={[
          styles.tick,
          i === 5 && styles.tickCenter,
          { top: THUMB_HEIGHT / 2 + (i / 10) * (TRACK_HEIGHT - THUMB_HEIGHT) },
        ]}
      />
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.scaleLabel}>−</Text>
      <View style={styles.faderArea}>
        <View style={styles.scaleLeft}>{ticks}</View>
        <VerticalFader
          // Like the hardware, slider up = slower (−), down = faster (+), so
          // the fader works on the negated pitch.
          value={-pitch}
          min={-range}
          max={range}
          step={0.1}
          centerTick
          onChange={(v) => onChange(-v || 0)}
          trackHeight={TRACK_HEIGHT}
          thumbHeight={THUMB_HEIGHT}
          trackWidth={12}
          thumbWidth={46}
          accentColor="#d9dcdf"
          trackStyle={styles.track}
          thumbStyle={styles.thumb}
          centerTickStyle={styles.centerTick}
          testID={testID}
        />
        <View style={styles.scaleRight}>{ticks}</View>
      </View>
      <Text style={styles.scaleLabel}>+</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 2,
  },
  scaleLabel: {
    color: cdj.silk,
    fontSize: 11,
    fontWeight: '700',
  },
  faderArea: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
    position: 'relative',
  },
  scaleLeft: {
    width: 8,
    position: 'relative',
  },
  scaleRight: {
    width: 8,
    position: 'relative',
  },
  tick: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: cdj.silkDim,
  },
  tickCenter: {
    height: 2,
    backgroundColor: cdj.silk,
  },
  track: {
    backgroundColor: '#030303',
    borderColor: '#2b2d31',
    borderRadius: 6,
  },
  centerTick: {
    width: 0,
    height: 0,
  },
  thumb: {
    backgroundColor: '#a9adb2',
    borderColor: '#e1e3e6',
    borderRadius: 3,
    boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.8)',
  },
});
