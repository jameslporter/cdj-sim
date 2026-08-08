import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TRACK_TITLE = 'Strobe';
const TRACK_ARTIST = 'Deadmau5';
const BASE_BPM = 128;
const DURATION_SEC = 332; // 5:32
const PITCH_RANGE = 8; // +/- percent
const FADER_TRACK_HEIGHT = 220;
const FADER_THUMB_HEIGHT = 28;

function formatTime(totalSeconds) {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = Math.floor(clamped % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pitchToY(pitch) {
  return ((PITCH_RANGE - pitch) / (PITCH_RANGE * 2)) * (FADER_TRACK_HEIGHT - FADER_THUMB_HEIGHT);
}

function yToPitch(y) {
  const ratio = y / (FADER_TRACK_HEIGHT - FADER_THUMB_HEIGHT);
  return clamp(PITCH_RANGE - ratio * PITCH_RANGE * 2, -PITCH_RANGE, PITCH_RANGE);
}

export default function CdjSimulator() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [pitch, setPitch] = useState(0);

  const intervalRef = useRef(null);
  const pitchRef = useRef(pitch);
  const fadeStartYRef = useRef(0);
  const rotation = useRef(new Animated.Value(0)).current;
  const rotationLoopRef = useRef(null);

  useEffect(() => {
    pitchRef.current = pitch;
  }, [pitch]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          const rate = 1 + pitchRef.current / 100;
          const next = prev + 0.1 * rate;
          if (next >= DURATION_SEC) {
            setIsPlaying(false);
            return DURATION_SEC;
          }
          return next;
        });
      }, 100);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      const rate = 1 + pitch / 100;
      const durationMs = 1400 / rate;
      rotation.setValue(0);
      rotationLoopRef.current = Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: durationMs,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      rotationLoopRef.current.start();
    } else {
      rotationLoopRef.current?.stop();
    }
    return () => rotationLoopRef.current?.stop();
  }, [isPlaying, pitch, rotation]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        fadeStartYRef.current = pitchToY(pitchRef.current);
      },
      onPanResponderMove: (_evt, gesture) => {
        const newY = clamp(
          fadeStartYRef.current + gesture.dy,
          0,
          FADER_TRACK_HEIGHT - FADER_THUMB_HEIGHT
        );
        setPitch(Math.round(yToPitch(newY) * 10) / 10);
      },
    })
  ).current;

  const waveformBars = useMemo(() => {
    const bars = [];
    for (let i = 0; i < 70; i += 1) {
      const h = 6 + Math.abs(Math.sin(i * 0.45) * 22) + Math.abs(Math.cos(i * 0.13) * 10);
      bars.push(h);
    }
    return bars;
  }, []);

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const displayedBpm = (BASE_BPM * (1 + pitch / 100)).toFixed(2);
  const progressRatio = elapsed / DURATION_SEC;
  const thumbY = pitchToY(pitch);

  const handlePlayPress = () => {
    setIsPlaying((prev) => {
      if (!prev && elapsed >= DURATION_SEC) {
        setElapsed(0);
      }
      return !prev;
    });
  };

  const handleCuePress = () => {
    setIsPlaying(false);
    setElapsed(0);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.deckLabel}>DECK A</Text>
          <Text style={styles.modelLabel}>CDJ-3000</Text>
        </View>

        <View style={styles.display}>
          <View style={styles.trackInfo}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {TRACK_TITLE}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {TRACK_ARTIST}
            </Text>
          </View>

          <View style={styles.metricsRow}>
            <View>
              <Text style={styles.metricLabel}>BPM</Text>
              <Text style={styles.bpmValue}>{displayedBpm}</Text>
            </View>
            <View style={styles.timeBlock}>
              <Text style={styles.metricLabel}>TIME</Text>
              <Text style={styles.timeValue}>{formatTime(elapsed)}</Text>
            </View>
            <View>
              <Text style={styles.metricLabel}>REMAIN</Text>
              <Text style={styles.timeValue}>-{formatTime(DURATION_SEC - elapsed)}</Text>
            </View>
          </View>

          <View style={styles.waveform}>
            {waveformBars.map((h, i) => (
              <View
                key={i}
                style={[
                  styles.waveformBar,
                  {
                    height: h,
                    backgroundColor: i / waveformBars.length <= progressRatio ? '#4fd8c4' : '#245452',
                  },
                ]}
              />
            ))}
            <View style={[styles.playhead, { left: `${progressRatio * 100}%` }]} />
          </View>
        </View>

        <View style={styles.mainRow}>
          <View style={styles.jogSection}>
            <View style={styles.jogWheel}>
              <Animated.View style={[styles.jogWheelInner, { transform: [{ rotate: rotateInterpolate }] }]}>
                <View style={styles.jogWheelMarker} />
              </Animated.View>
              <View style={styles.jogWheelCenter}>
                <Text style={styles.jogWheelCenterText}>{isPlaying ? '▶' : '❚❚'}</Text>
              </View>
            </View>

            <View style={styles.transportRow}>
              <Pressable
                style={({ pressed }) => [styles.cueButton, pressed && styles.buttonPressed]}
                onPress={handleCuePress}
              >
                <Text style={styles.cueButtonText}>CUE</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.playButton,
                  isPlaying && styles.playButtonActive,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handlePlayPress}
              >
                <Text style={styles.playButtonText}>{isPlaying ? '❚❚' : '▶'}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.pitchSection}>
            <Text style={styles.pitchLabel}>TEMPO</Text>
            <View style={styles.pitchTrack}>
              <View style={styles.pitchCenterTick} />
              <View
                style={[styles.pitchThumb, { top: thumbY }]}
                {...panResponder.panHandlers}
              >
                <View style={styles.pitchThumbLine} />
              </View>
            </View>
            <Text style={styles.pitchValue}>
              {pitch > 0 ? '+' : ''}
              {pitch.toFixed(1)}%
            </Text>
            <Pressable
              style={({ pressed }) => [styles.resetButton, pressed && styles.buttonPressed]}
              onPress={() => setPitch(0)}
            >
              <Text style={styles.resetButtonText}>RESET</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deckLabel: {
    color: '#e8e8e8',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  modelLabel: {
    color: '#5a5a5a',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  display: {
    backgroundColor: '#04120f',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#123a34',
    padding: 14,
    gap: 10,
  },
  trackInfo: {
    gap: 2,
  },
  trackTitle: {
    color: '#eafff9',
    fontSize: 18,
    fontWeight: '700',
  },
  trackArtist: {
    color: '#6fb8ab',
    fontSize: 13,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  timeBlock: {
    alignItems: 'center',
  },
  metricLabel: {
    color: '#3d7a70',
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 2,
  },
  bpmValue: {
    color: '#4fd8c4',
    fontSize: 26,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  timeValue: {
    color: '#4fd8c4',
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 40,
    gap: 2,
    position: 'relative',
  },
  waveformBar: {
    width: 3,
    borderRadius: 1,
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#ff5a5a',
  },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
  },
  jogSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  jogWheel: {
    width: 210,
    height: 210,
    borderRadius: 105,
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
    backgroundColor: '#4fd8c4',
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
  jogWheelCenterText: {
    color: '#4fd8c4',
    fontSize: 26,
  },
  transportRow: {
    flexDirection: 'row',
    gap: 16,
  },
  cueButton: {
    width: 66,
    height: 66,
    borderRadius: 10,
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#2e2e2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cueButtonText: {
    color: '#e8a33d',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1,
  },
  playButton: {
    width: 66,
    height: 66,
    borderRadius: 10,
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#2e2e2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonActive: {
    backgroundColor: '#164d2c',
    borderColor: '#1f8b4c',
  },
  playButtonText: {
    color: '#4fd87a',
    fontSize: 22,
  },
  buttonPressed: {
    opacity: 0.6,
  },
  pitchSection: {
    width: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pitchLabel: {
    color: '#5a5a5a',
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '600',
  },
  pitchTrack: {
    width: 40,
    height: FADER_TRACK_HEIGHT,
    backgroundColor: '#151515',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pitchCenterTick: {
    position: 'absolute',
    width: 24,
    height: 2,
    backgroundColor: '#3a3a3a',
  },
  pitchThumb: {
    position: 'absolute',
    width: 52,
    height: FADER_THUMB_HEIGHT,
    borderRadius: 4,
    backgroundColor: '#3a3a3a',
    borderWidth: 1,
    borderColor: '#4fd8c4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pitchThumbLine: {
    width: 34,
    height: 2,
    backgroundColor: '#4fd8c4',
  },
  pitchValue: {
    color: '#4fd8c4',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  resetButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  resetButtonText: {
    color: '#8a8a8a',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
