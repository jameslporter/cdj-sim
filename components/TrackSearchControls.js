import { StyleSheet, View } from 'react-native';
import CdjButton from './CdjButton';

export default function TrackSearchControls({ onBack, onForward, idPrefix = '' }) {
  return (
    <View style={styles.row}>
      <CdjButton
        testID={`${idPrefix}track-search-back`}
        label="◀◀"
        sublabel="TRACK SEARCH"
        onPress={onBack}
        style={styles.button}
      />
      <CdjButton
        testID={`${idPrefix}track-search-forward`}
        label="▶▶"
        sublabel="TRACK SEARCH"
        onPress={onForward}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    width: 74,
    height: 36,
  },
});
