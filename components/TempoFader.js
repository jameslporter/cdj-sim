import { useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { colors } from '../constants/theme';
import { clamp } from '../utils/format';

const TRACK_HEIGHT = 220;
const THUMB_HEIGHT = 28;

function pitchToY(pitch, range) {
  return ((range - pitch) / (range * 2)) * (TRACK_HEIGHT - THUMB_HEIGHT);
}

function yToPitch(y, range) {
  const ratio = y / (TRACK_HEIGHT - THUMB_HEIGHT);
  return clamp(range - ratio * range * 2, -range, range);
}

export default function TempoFader({ pitch, range, onChange }) {
  const startYRef = useRef(0);
  const pitchRef = useRef(pitch);
  const rangeRef = useRef(range);
  pitchRef.current = pitch;
  rangeRef.current = range;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startYRef.current = pitchToY(pitchRef.current, rangeRef.current);
      },
      onPanResponderMove: (_evt, gesture) => {
        const newY = clamp(startYRef.current + gesture.dy, 0, TRACK_HEIGHT - THUMB_HEIGHT);
        onChange(Math.round(yToPitch(newY, rangeRef.current) * 10) / 10);
      },
    })
  ).current;

  const thumbY = pitchToY(pitch, range);

  return (
    <View style={styles.track}>
      <View style={styles.centerTick} />
      <View testID="tempo-fader-thumb" style={[styles.thumb, { top: thumbY }]} {...panResponder.panHandlers}>
        <View style={styles.thumbLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 40,
    height: TRACK_HEIGHT,
    backgroundColor: '#151515',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerTick: {
    position: 'absolute',
    width: 24,
    height: 2,
    backgroundColor: '#3a3a3a',
  },
  thumb: {
    position: 'absolute',
    width: 52,
    height: THUMB_HEIGHT,
    borderRadius: 4,
    backgroundColor: '#3a3a3a',
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbLine: {
    width: 34,
    height: 2,
    backgroundColor: colors.accent,
  },
});
