import { StyleSheet, View } from 'react-native';
import CdjButton from './CdjButton';

export default function DeckModeControls({
  reverse,
  slip,
  vinylMode,
  onToggleReverse,
  onToggleSlip,
  onToggleVinylMode,
  idPrefix = '',
}) {
  return (
    <View style={styles.row}>
      <CdjButton
        testID={`${idPrefix}mode-reverse`}
        label="REV"
        active={reverse}
        activeBg="#3a1f1f"
        activeBorder={reverse ? '#c44' : undefined}
        activeTextColor="#ff8a8a"
        onPress={onToggleReverse}
        style={styles.chip}
      />
      <CdjButton
        testID={`${idPrefix}mode-slip`}
        label="SLIP"
        active={slip}
        activeBg="#1a2f57"
        activeBorder="#3d6bc4"
        activeTextColor="#7fb0ff"
        onPress={onToggleSlip}
        style={styles.chip}
      />
      <CdjButton
        testID={`${idPrefix}mode-vinyl`}
        label={vinylMode ? 'VINYL' : 'CDJ'}
        active={vinylMode}
        onPress={onToggleVinylMode}
        style={styles.chip}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    width: 56,
    height: 32,
  },
});
