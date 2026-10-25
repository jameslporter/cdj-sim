import { StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';
import DeckButton from './DeckButton';

// The jump size is set on the touch screen (BEAT JUMP on the player view).
export default function BeatJumpControls({ onBack, onForward, idPrefix = '' }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.silk}>BEAT JUMP</Text>
      <View style={styles.group}>
        <DeckButton testID={`${idPrefix}beatjump-back`} label="◀" onPress={onBack} style={styles.button} />
        <DeckButton testID={`${idPrefix}beatjump-forward`} label="▶" onPress={onForward} style={styles.button} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 4,
  },
  silk: {
    color: cdj.silkDim,
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1,
  },
  group: {
    flexDirection: 'row',
    gap: 6,
  },
  button: {
    width: 44,
    height: 30,
  },
});
