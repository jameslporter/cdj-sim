import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';

const SIZE = 300;
const RING = SIZE - 14;
const PLATTER = SIZE - 30;
const LCD = 118;

// CDJ-3000X jog wheel: gloss-black bezel, illumination ring, matte platter
// with a brushed-metal edge, and the round colour LCD in the centre that
// shows the playback position.
export default function JogWheel({ isPlaying, pitch, reverse, vinylMode, held, onHoldChange, idPrefix = '' }) {
  const rotation = useRef(new Animated.Value(0)).current;
  const loopRef = useRef(null);

  useEffect(() => {
    if (isPlaying && !held) {
      const rate = 1 + pitch / 100;
      // A real platter display turns at 33⅓ rpm: one turn every 1.8 s.
      const durationMs = 1800 / rate;
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

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'],
  });

  const ringColor = held ? cdj.ledOrange : cdj.jogRing;

  return (
    <Pressable
      testID={`${idPrefix}jog-wheel`}
      style={styles.bezel}
      onPressIn={() => vinylMode && onHoldChange(true)}
      onPressOut={() => vinylMode && onHoldChange(false)}
    >
      <View
        style={[
          styles.ring,
          { borderColor: ringColor, boxShadow: `0px 0px 14px ${ringColor}88, inset 0px 0px 8px ${ringColor}55` },
        ]}
      />
      <View style={styles.platter}>
        <View style={[styles.groove, { width: PLATTER - 40, height: PLATTER - 40, borderRadius: (PLATTER - 40) / 2 }]} />
        <View style={[styles.groove, { width: PLATTER - 80, height: PLATTER - 80, borderRadius: (PLATTER - 80) / 2 }]} />
        <Animated.View style={[styles.platterSpin, { transform: [{ rotate }] }]}>
          <View style={styles.platterNotch} />
        </Animated.View>

        <View style={[styles.lcdBezel, held && styles.lcdBezelHeld]}>
          <View style={styles.lcd}>
            <View style={styles.lcdTrack} />
            <Animated.View style={[styles.lcdSpin, { transform: [{ rotate }] }]}>
              <View style={styles.lcdPointer} />
            </Animated.View>
            <View style={styles.cueDot} />
            <Text style={styles.lcdMode}>{vinylMode ? 'VINYL' : 'CDJ'}</Text>
            <Text style={styles.lcdGlyph}>{isPlaying && !held ? '▶' : '❚❚'}</Text>
            <Text style={styles.lcdSub}>{reverse ? 'REV' : held ? 'TOUCH' : ' '}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bezel: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: cdj.jogBezel,
    borderWidth: 1,
    borderColor: '#2c2e31',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0px 2px 6px rgba(255, 255, 255, 0.06), 0px 6px 14px rgba(0, 0, 0, 0.7)',
  },
  ring: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
  },
  platter: {
    width: PLATTER,
    height: PLATTER,
    borderRadius: PLATTER / 2,
    backgroundColor: cdj.jogPlatter,
    borderWidth: 5,
    borderColor: cdj.jogEdge,
    borderTopColor: '#5a5e63',
    borderBottomColor: '#25272a',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 3px 8px rgba(0, 0, 0, 0.8)',
  },
  groove: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: cdj.jogPlatterRing,
  },
  platterSpin: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  platterNotch: {
    width: 3,
    height: 14,
    marginTop: 6,
    borderRadius: 1,
    backgroundColor: '#3c3f44',
  },
  lcdBezel: {
    width: LCD + 12,
    height: LCD + 12,
    borderRadius: (LCD + 12) / 2,
    backgroundColor: '#0a0a0b',
    borderWidth: 1,
    borderColor: '#34373b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lcdBezelHeld: {
    borderColor: cdj.ledOrange,
  },
  lcd: {
    width: LCD,
    height: LCD,
    borderRadius: LCD / 2,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lcdTrack: {
    position: 'absolute',
    width: LCD - 10,
    height: LCD - 10,
    borderRadius: (LCD - 10) / 2,
    borderWidth: 3,
    borderColor: '#1b2330',
  },
  lcdSpin: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  lcdPointer: {
    width: 4,
    height: 14,
    marginTop: 3,
    borderRadius: 2,
    backgroundColor: cdj.screenText,
  },
  cueDot: {
    position: 'absolute',
    top: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: cdj.cueMarker,
  },
  lcdMode: {
    color: cdj.screenTextDim,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  lcdGlyph: {
    color: cdj.screenText,
    fontSize: 24,
    marginVertical: 2,
  },
  lcdSub: {
    color: cdj.ledOrange,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
