import { memo, useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { colors } from '../constants/theme';
import { clamp } from '../utils/format';

function valueToY(value, min, max, trackHeight, thumbHeight) {
  return ((max - value) / (max - min)) * (trackHeight - thumbHeight);
}

function yToValue(y, min, max, trackHeight, thumbHeight) {
  const ratio = y / (trackHeight - thumbHeight);
  return clamp(max - ratio * (max - min), min, max);
}

function VerticalFader({
  value,
  min,
  max,
  onChange,
  step = null,
  trackHeight = 220,
  thumbHeight = 28,
  trackWidth = 40,
  thumbWidth = 52,
  centerTick = false,
  accentColor = colors.accent,
  trackStyle,
  thumbStyle,
  centerTickStyle,
  testID,
}) {
  const startYRef = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startYRef.current = valueToY(valueRef.current, min, max, trackHeight, thumbHeight);
      },
      onPanResponderMove: (_evt, gesture) => {
        const newY = clamp(startYRef.current + gesture.dy, 0, trackHeight - thumbHeight);
        let next = yToValue(newY, min, max, trackHeight, thumbHeight);
        if (step) next = Math.round(next / step) * step;
        onChange(next);
      },
    })
  ).current;

  const thumbY = valueToY(value, min, max, trackHeight, thumbHeight);

  return (
    <View style={[styles.track, { width: trackWidth, height: trackHeight }, trackStyle]}>
      {centerTick ? <View style={[styles.centerTick, { width: trackWidth - 16 }, centerTickStyle]} /> : null}
      <View
        testID={testID}
        style={[
          styles.thumb,
          { top: thumbY, width: thumbWidth, height: thumbHeight, borderColor: accentColor },
          thumbStyle,
        ]}
        {...panResponder.panHandlers}
      >
        <View style={[styles.thumbLine, { backgroundColor: accentColor }]} />
      </View>
    </View>
  );
}

export default memo(VerticalFader);

const styles = StyleSheet.create({
  track: {
    backgroundColor: '#151515',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerTick: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#3a3a3a',
  },
  thumb: {
    position: 'absolute',
    borderRadius: 4,
    backgroundColor: '#3a3a3a',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbLine: {
    width: '65%',
    height: 2,
  },
});
