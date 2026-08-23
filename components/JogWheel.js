import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

const SIZE = 210;

export default function JogWheel({ isPlaying, pitch, reverse, vinylMode, held, onHoldChange, idPrefix = '' }) {
  const rotation = useRef(new Animated.Value(0)).current;
  const loopRef = useRef(null);

  useEffect(() => {
    if (isPlaying && !held) {
      const rate = 1 + pitch / 100;
      const durationMs = 1400 / rate;
      rotation.setValue(0);
      loopRef.current = Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: durationMs,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
    }
    return () => loopRef.current?.stop();
  }, [isPlaying, pitch, held, rotation]);

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'],
  });

  return (
    <Pressable
      testID={`${idPrefix}jog-wheel`}
      style={styles.jogWheel}
      onPressIn={() => vinylMode && onHoldChange(true)}
      onPressOut={() => vinylMode && onHoldChange(false)}
    >
      <Animated.View style={[styles.jogWheelInner, { transform: [{ rotate: rotateInterpolate }] }]}>
        <View style={styles.jogWheelMarker} />
      </Animated.View>
      <View style={[styles.jogWheelCenter, held && styles.jogWheelCenterHeld]}>
        <Text style={styles.jogWheelCenterText}>{isPlaying && !held ? '▶' : '❚❚'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  jogWheel: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: '#161616',
    borderWidth: 6,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jogWheelInner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  jogWheelMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginTop: 14,
  },
  jogWheelCenter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#0d0d0d',
    borderWidth: 2,
    borderColor: '#2c2c2c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jogWheelCenterHeld: {
    borderColor: colors.amber,
  },
  jogWheelCenterText: {
    color: colors.accent,
    fontSize: 26,
  },
});
