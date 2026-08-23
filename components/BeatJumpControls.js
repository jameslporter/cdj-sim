import { StyleSheet, View } from 'react-native';
import CdjButton from './CdjButton';

export default function BeatJumpControls({ beatCount, onCycleCount, onBack, onForward, idPrefix = '' }) {
  return (
    <View style={styles.group}>
      <CdjButton
        testID={`${idPrefix}beatjump-back`}
        label="◀"
        sublabel="JUMP"
        onPress={onBack}
        style={styles.button}
      />
      <CdjButton
        testID={`${idPrefix}beatjump-count`}
        label={String(beatCount)}
        sublabel="BEATS"
        onPress={onCycleCount}
        style={styles.button}
      />
      <CdjButton
        testID={`${idPrefix}beatjump-forward`}
        label="▶"
        sublabel="JUMP"
        onPress={onForward}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    width: 50,
    height: 44,
  },
});
