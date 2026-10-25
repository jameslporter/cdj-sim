import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';

// A CDJ-3000X hot cue pad: dark rubber when empty, glowing in the cue's
// colour once a cue is stored.
export default function HotCuePad({ label, set, color, onPress, onPressIn, onPressOut, onLongPress, testID }) {
  return (
    <Pressable
      testID={testID}
      style={({ pressed }) => [
        styles.pad,
        set && {
          backgroundColor: `${color}33`,
          borderColor: color,
          boxShadow: `0px 0px 10px ${color}66, inset 0px 0px 10px ${color}55`,
        },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onLongPress={onLongPress}
    >
      <View style={[styles.lightBar, set && { backgroundColor: color }]} />
      <Text style={[styles.label, set && { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pad: {
    flex: 1,
    height: 34,
    borderRadius: 4,
    backgroundColor: cdj.button,
    borderWidth: 1,
    borderColor: cdj.buttonBorder,
    borderTopColor: '#3d4044',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 2px rgba(0, 0, 0, 0.6)',
  },
  lightBar: {
    position: 'absolute',
    top: 3,
    left: 6,
    right: 6,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#2a2c30',
  },
  pressed: {
    transform: [{ translateY: 1 }],
    boxShadow: 'none',
  },
  label: {
    color: cdj.buttonLegend,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
});
