import { StyleSheet, View } from 'react-native';
import { hotCueColors } from '../constants/theme';
import HotCuePad from './HotCuePad';

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function HotCueBar({ cues, onPress, onPressIn, onPressOut, onLongPress, idPrefix = '' }) {
  return (
    <View style={styles.row}>
      {LABELS.map((label, i) => (
        <HotCuePad
          key={label}
          label={label}
          set={Boolean(cues[i])}
          color={hotCueColors[i]}
          onPress={() => onPress(i)}
          onPressIn={onPressIn ? () => onPressIn(i) : undefined}
          onPressOut={onPressOut ? () => onPressOut(i) : undefined}
          onLongPress={() => onLongPress(i)}
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
