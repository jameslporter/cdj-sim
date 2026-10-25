import { StyleSheet, View } from 'react-native';
import { cdj, hotCueColors } from '../constants/theme';
import HotCuePad from './HotCuePad';

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function HotCueBar({ cues, onPress, onPressIn, onPressOut, idPrefix = '' }) {
  return (
    <View style={styles.row}>
      {LABELS.map((label, i) => (
        <HotCuePad
          key={label}
          label={label}
          set={Boolean(cues[i])}
          // Hot cue loops light orange, like the deck with HOT CUE COLOR off.
          color={cues[i]?.loopEnd != null ? cdj.ledOrange : hotCueColors[i]}
          onPress={() => onPress(i)}
          onPressIn={onPressIn ? () => onPressIn(i) : undefined}
          onPressOut={onPressOut ? () => onPressOut(i) : undefined}
          testID={`${idPrefix}hotcue-${label}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 5,
  },
});
