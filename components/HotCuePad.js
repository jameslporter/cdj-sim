import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../constants/theme';

export default function HotCuePad({ label, set, color, onPress, onLongPress, testID }) {
  return (
    <Pressable
      testID={testID}
      style={({ pressed }) => [
        styles.pad,
        set && { backgroundColor: color, borderColor: color },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Text style={[styles.label, set && styles.labelSet]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pad: {
    flex: 1,
    aspectRatio: 1.3,
    borderRadius: 6,
    backgroundColor: colors.buttonBg,
    borderWidth: 1,
    borderColor: colors.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  labelSet: {
    color: '#0a0a0a',
  },
});
