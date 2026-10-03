import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

const SEEK_STEP_SECONDS = 1;
const SEEK_INTERVAL_MS = 100;

function SearchButton({ direction, onSeek, label, testID }) {
  const intervalRef = useRef(null);

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
      testID={testID}
      style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}
      onPressIn={start}
      onPressOut={stop}
    >
      <Text style={styles.searchButtonText}>{label}</Text>
      <Text style={styles.searchCaption}>SEARCH</Text>
    </Pressable>
  );
}

export default function TransportControls({ isPlaying, onPlayPause, onCue, onSeek, idPrefix = '' }) {
  return (
    <View style={styles.row}>
      <SearchButton direction={-1} label="◀◀" onSeek={onSeek} testID={`${idPrefix}search-back`} />
      <Pressable
        testID={`${idPrefix}cue-button`}
        style={({ pressed }) => [styles.cueButton, pressed && styles.pressed]}
        onPress={onCue}
      >
        <Text style={styles.cueButtonText}>CUE</Text>
      </Pressable>
      <Pressable
        testID={`${idPrefix}play-button`}
        style={({ pressed }) => [
          styles.playButton,
          isPlaying && styles.playButtonActive,
          pressed && styles.pressed,
        ]}
        onPress={onPlayPause}
      >
        <Text style={styles.playButtonText}>{isPlaying ? '❚❚' : '▶'}</Text>
      </Pressable>
      <SearchButton direction={1} label="▶▶" onSeek={onSeek} testID={`${idPrefix}search-forward`} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  searchButton: {
    width: 44,
    height: 66,
    borderRadius: 10,
    backgroundColor: colors.buttonBg,
    borderWidth: 1,
    borderColor: colors.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  searchCaption: {
    color: colors.textMuted,
    fontSize: 6,
    fontWeight: '700',
    marginTop: 2,
  },
  cueButton: {
    width: 66,
    height: 66,
    borderRadius: 10,
    backgroundColor: colors.buttonBg,
    borderWidth: 1,
    borderColor: colors.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cueButtonText: {
    color: colors.amber,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1,
  },
  playButton: {
    width: 66,
    height: 66,
    borderRadius: 10,
    backgroundColor: colors.buttonBg,
    borderWidth: 1,
    borderColor: colors.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonActive: {
    backgroundColor: colors.greenDim,
    borderColor: colors.greenBorder,
  },
  playButtonText: {
    color: colors.green,
    fontSize: 22,
  },
  pressed: {
    opacity: 0.6,
  },
});
