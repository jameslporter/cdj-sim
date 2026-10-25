import { memo, useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { colors } from '../constants/theme';
import { clamp } from '../utils/format';
import { useLearnTarget } from '../hooks/useLearningMode';
import { dragResponderConfig, dragSurfaceStyle } from '../utils/dragControl';

function valueToX(value, min, max, trackWidth, thumbWidth) {
  return ((value - min) / (max - min)) * (trackWidth - thumbWidth);
}

function xToValue(x, min, max, trackWidth, thumbWidth) {
  const ratio = x / (trackWidth - thumbWidth);
  return clamp(min + ratio * (max - min), min, max);
}

function HorizontalFader({
  value,
  min,
  max,
  onChange,
  trackWidth = 200,
  trackHeight = 36,
  thumbWidth = 28,
  thumbHeight = 32,
  centerTick = false,
  accentColor = colors.accent,
  testID,
}) {
  const startXRef = useRef(0);
  const startPageXRef = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  const panResponder = useRef(
    PanResponder.create({
      ...dragResponderConfig,
      onPanResponderGrant: (evt) => {
        startXRef.current = valueToX(valueRef.current, min, max, trackWidth, thumbWidth);
        startPageXRef.current = evt.nativeEvent.pageX;
      },
      // Computed from the raw event's pageX rather than gestureState.dx, as a
      // defensive measure against relying on react-native-web's own delta
      // tracking during rapid successive gestures.
      onPanResponderMove: (evt) => {
        const dx = evt.nativeEvent.pageX - startPageXRef.current;
        const newX = clamp(startXRef.current + dx, 0, trackWidth - thumbWidth);
        onChange(xToValue(newX, min, max, trackWidth, thumbWidth));
      },
    })
  ).current;

  const learn = useLearnTarget(testID);
  const thumbX = valueToX(value, min, max, trackWidth, thumbWidth);

  return (
    <View {...learn.props} style={[styles.track, { width: trackWidth, height: trackHeight }, dragSurfaceStyle, learn.style]}>
      {centerTick ? <View style={[styles.centerTick, { height: trackHeight - 16 }]} /> : null}
      <View
        testID={testID}
        style={[
          styles.thumb,
          { left: thumbX, width: thumbWidth, height: thumbHeight, borderColor: accentColor },
          dragSurfaceStyle,
        ]}
        {...panResponder.panHandlers}
      >
        <View style={[styles.thumbLine, { backgroundColor: accentColor }]} />
      </View>
    </View>
  );
}

export default memo(HorizontalFader);

const styles = StyleSheet.create({
  track: {
    backgroundColor: '#151515',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    justifyContent: 'center',
  },
  centerTick: {
    position: 'absolute',
    left: '50%',
    width: 2,
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
    width: 2,
    height: '65%',
  },
});
