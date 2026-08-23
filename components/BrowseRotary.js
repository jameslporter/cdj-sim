import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

export default function BrowseRotary({ track, onPrev, onNext, onLoad, idPrefix = '' }) {
  return (
    <View style={styles.container}>
      <View style={styles.trackLabel}>
        <Text style={styles.trackText} numberOfLines={1}>
          {track.title}
        </Text>
      </View>
      <View style={styles.knobRow}>
        <Pressable
          testID={`${idPrefix}browse-prev`}
          style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
          onPress={onPrev}
        >
          <Text style={styles.arrowText}>▲</Text>
        </Pressable>
        <Pressable
          testID={`${idPrefix}browse-load`}
          style={({ pressed }) => [styles.knob, pressed && styles.pressed]}
          onPress={onLoad}
        >
          <Text style={styles.knobText}>LOAD</Text>
        </Pressable>
        <Pressable
          testID={`${idPrefix}browse-next`}
          style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
          onPress={onNext}
        >
          <Text style={styles.arrowText}>▼</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  trackLabel: {
    maxWidth: 100,
  },
  trackText: {
    color: colors.textMuted,
    fontSize: 10,
  },
  knobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrow: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.buttonBg,
    borderWidth: 1,
    borderColor: colors.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: colors.textMuted,
    fontSize: 9,
  },
  knob: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#161616',
    borderWidth: 3,
    borderColor: '#2c2c2c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobText: {
    color: colors.accent,
    fontSize: 8,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.6,
  },
});
