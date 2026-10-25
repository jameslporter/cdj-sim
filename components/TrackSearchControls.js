import { StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';
import DeckButton from './DeckButton';

export default function TrackSearchControls({ onBack, onForward, idPrefix = '' }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.silk}>TRACK SEARCH</Text>
      <View style={styles.row}>
        <DeckButton testID={`${idPrefix}track-search-back`} label="|◀◀" onPress={onBack} style={styles.button} />
        <DeckButton testID={`${idPrefix}track-search-forward`} label="▶▶|" onPress={onForward} style={styles.button} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 3,
  },
  silk: {
    color: cdj.silkDim,
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  button: {
    width: 40,
    height: 24,
  },
});
