import { StyleSheet, View } from 'react-native';
import { hotCueColors } from '../constants/theme';
import HotCuePad from './HotCuePad';

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function HotCueBar({ cues, onPress, onLongPress }) {
  return (
    <View style={styles.row}>
      {LABELS.map((label, i) => (
        <HotCuePad
          key={label}
          label={label}
          set={Boolean(cues[i])}
          color={hotCueColors[i]}
          onPress={() => onPress(i)}
          onLongPress={() => onLongPress(i)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
});
