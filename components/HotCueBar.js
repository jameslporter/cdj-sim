import { StyleSheet, View } from 'react-native';
import { cdj, hotCueColors } from '../constants/theme';
import HotCuePad from './HotCuePad';

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function HotCueBar({ cues, onPress, onPressIn, onPressOut, colorful = true, idPrefix = '' }) {
  return (
    <View style={styles.row}>
      {LABELS.map((label, i) => (
        <HotCuePad
          key={label}
          label={label}
          set={Boolean(cues[i])}
          // Hot cue loops light orange. With UTILITY's HOT CUE COLOR off,
          // hot cues all light green.
          color={cues[i]?.loopEnd != null ? cdj.ledOrange : colorful ? hotCueColors[i] : cdj.ledGreen}
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
