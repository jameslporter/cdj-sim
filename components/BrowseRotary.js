import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';

// The rotary selector: turn (▲/▼) to move through the list, push to load.
export default function BrowseRotary({ onPrev, onNext, onLoad, idPrefix = '' }) {
  return (
    <View style={styles.container}>
      <Pressable
        testID={`${idPrefix}browse-prev`}
        style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
        onPress={onPrev}
      >
        <Text style={styles.arrowText}>▲</Text>
      </Pressable>
      <Pressable
        testID={`${idPrefix}browse-load`}
        style={({ pressed }) => [styles.knob, pressed && styles.knobPressed]}
        onPress={onLoad}
      >
        <View style={styles.knobCap}>
          <View style={styles.knobGrip} />
          <Text style={styles.knobText}>PUSH</Text>
        </View>
      </Pressable>
      <Pressable
        testID={`${idPrefix}browse-next`}
        style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
        onPress={onNext}
      >
        <Text style={styles.arrowText}>▼</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 3,
  },
  arrow: {
    width: 30,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: cdj.silkDim,
    fontSize: 8,
  },
  knob: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0c0c0d',
    borderWidth: 1,
    borderColor: '#3a3d41',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 3px 4px rgba(0, 0, 0, 0.7)',
  },
  knobPressed: {
    transform: [{ scale: 0.96 }],
    boxShadow: 'none',
  },
  knobCap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1e1f22',
    borderWidth: 1,
    borderColor: '#2e3134',
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobGrip: {
    position: 'absolute',
    top: 3,
    width: 2,
    height: 7,
    borderRadius: 1,
    backgroundColor: cdj.silk,
  },
  knobText: {
    color: cdj.silkDim,
    fontSize: 7,
    fontWeight: '700',
    marginTop: 6,
  },
  pressed: {
    opacity: 0.5,
  },
});
