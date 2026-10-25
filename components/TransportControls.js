import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';
import { useLearnTarget } from '../hooks/useLearningMode';
import useBlink from '../hooks/useBlink';
import HoldPressable from './HoldPressable';

const SEEK_STEP_SECONDS = 1;
const SEEK_INTERVAL_MS = 100;

function SearchButton({ direction, onSeek, label, testID }) {
  const intervalRef = useRef(null);
  const learn = useLearnTarget(testID);

  const start = () => {
    onSeek(direction * SEEK_STEP_SECONDS);
    intervalRef.current = setInterval(() => onSeek(direction * SEEK_STEP_SECONDS), SEEK_INTERVAL_MS);
  };
  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return (
    <Pressable
      {...learn.props}
      testID={testID}
      style={({ pressed }) => [styles.searchButton, pressed && styles.pressed, learn.style]}
      onPressIn={start}
      onPressOut={stop}
    >
      <Text style={styles.searchButtonText}>{label}</Text>
    </Pressable>
  );
}

// Big round PLAY button with an LED ring, as on the CDJ-3000X.
function RoundButton({ testID, onPress, ringColor, lit, children }) {
  const learn = useLearnTarget(testID);
  return (
    <Pressable
      {...learn.props}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.roundOuter, pressed && styles.roundPressed, learn.style]}
    >
      <Ring ringColor={ringColor} lit={lit}>
        {children}
      </Ring>
    </Pressable>
  );
}

function Ring({ ringColor, lit, children }) {
  return (
    <View
      style={[
        styles.ring,
        { borderColor: lit ? ringColor : `${ringColor}55` },
        lit && { boxShadow: `0px 0px 12px ${ringColor}aa, inset 0px 0px 8px ${ringColor}66` },
      ]}
    >
      <View style={styles.cap}>{children}</View>
    </View>
  );
}

// CUE is held (Cue Point Sampler), so it uses pointer events: you can keep
// holding it and press PLAY with another finger.
function CueButton({ testID, onPressIn, onPressOut, lit }) {
  return (
    <HoldPressable
      testID={testID}
      onDown={onPressIn}
      onUp={onPressOut}
      style={({ pressed }) => [styles.roundOuter, pressed && styles.roundPressed]}
    >
      <Ring ringColor={cdj.ledOrange} lit={lit}>
        <Text style={styles.cueText}>CUE</Text>
      </Ring>
    </HoldPressable>
  );
}

// LEDs as on the CDJ: PLAY blinks while paused and is solid while playing.
// CUE is solid when paused on the cue point, blinks when paused anywhere
// else (press it to set a new cue there) and is off while playing.
export default function TransportControls({
  isPlaying,
  atCue,
  onPlayPause,
  onCuePressIn,
  onCuePressOut,
  onSeek,
  idPrefix = '',
}) {
  const blink = useBlink(!isPlaying);
  const playLit = isPlaying || blink;
  const cueLit = !isPlaying && (atCue || blink);
  return (
    <View style={styles.column}>
      <View style={styles.searchWrap}>
        <Text style={styles.silk}>SEARCH</Text>
        <View style={styles.searchRow}>
          <SearchButton direction={-1} label="◀◀" onSeek={onSeek} testID={`${idPrefix}search-back`} />
          <SearchButton direction={1} label="▶▶" onSeek={onSeek} testID={`${idPrefix}search-forward`} />
        </View>
      </View>
      <CueButton testID={`${idPrefix}cue-button`} onPressIn={onCuePressIn} onPressOut={onCuePressOut} lit={cueLit} />
      <RoundButton testID={`${idPrefix}play-button`} onPress={onPlayPause} ringColor={cdj.ledGreen} lit={playLit}>
        <Text style={styles.playText}>{isPlaying ? '❚❚' : '▶'}</Text>
        <Text style={styles.playCaption}>PLAY/PAUSE</Text>
      </RoundButton>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    alignItems: 'center',
    gap: 10,
  },
  searchWrap: {
    alignItems: 'center',
    gap: 3,
  },
  silk: {
    color: cdj.silkDim,
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 6,
  },
  searchButton: {
    width: 40,
    height: 24,
    borderRadius: 4,
    backgroundColor: cdj.button,
    borderWidth: 1,
    borderColor: cdj.buttonBorder,
    borderTopColor: '#3d4044',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 2px rgba(0, 0, 0, 0.6)',
  },
  searchButtonText: {
    color: cdj.buttonLegend,
    fontSize: 10,
  },
  roundOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#0b0b0c',
    borderWidth: 1,
    borderColor: '#2e3034',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.7)',
  },
  roundPressed: {
    transform: [{ scale: 0.97 }],
  },
  ring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#1d1e21',
    borderWidth: 1,
    borderColor: '#36393d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cueText: {
    color: cdj.silk,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 1,
  },
  playText: {
    color: cdj.silk,
    fontSize: 16,
  },
  playCaption: {
    color: cdj.silkDim,
    fontSize: 5,
    fontWeight: '700',
    marginTop: 1,
  },
  pressed: {
    transform: [{ translateY: 1 }],
    boxShadow: 'none',
  },
});
