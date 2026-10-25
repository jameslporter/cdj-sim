import { memo, useRef } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { clamp } from '../utils/format';
import { useLearnTarget } from '../hooks/useLearningMode';

const SWEEP_DEG = 270;
const START_DEG = -135;
const DRAG_RANGE_PX = 150;

function Knob({
  value,
  min = 0,
  max = 1,
  onChange,
  size = 40,
  label,
  bipolar = false,
  color = colors.accent,
  testID,
}) {
  const valueRef = useRef(value);
  const startValueRef = useRef(value);
  valueRef.current = value;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startValueRef.current = valueRef.current;
      },
      onPanResponderMove: (_evt, gestureState) => {
        const delta = (-gestureState.dy / DRAG_RANGE_PX) * (max - min);
        onChange(clamp(startValueRef.current + delta, min, max));
      },
    })
  ).current;

  const learn = useLearnTarget(testID);
  const ratio = (value - min) / (max - min);
  const rotation = START_DEG + ratio * SWEEP_DEG;

  return (
    <View style={[styles.wrap, learn.style]} testID={testID} {...learn.withHandlers(panResponder.panHandlers)}>
      <View style={[styles.knob, { width: size, height: size, borderRadius: size / 2 }]}>
        {bipolar ? <View style={styles.centerNotch} /> : null}
        <View style={[styles.indicator, { transform: [{ rotate: `${rotation}deg` }] }]}>
          <View style={[styles.indicatorDot, { backgroundColor: color }]} />
        </View>
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

export default memo(Knob);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 3,
  },
  knob: {
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: colors.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerNotch: {
    position: 'absolute',
    top: 3,
    width: 2,
    height: 4,
    backgroundColor: '#3a3a3a',
  },
  indicator: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
  },
  indicatorDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginTop: 4,
  },
  label: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
