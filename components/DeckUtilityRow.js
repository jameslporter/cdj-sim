import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import CdjButton from './CdjButton';

export default function DeckUtilityRow({ quantize, onToggleQuantize, idPrefix = '' }) {
  const [tagged, setTagged] = useState(false);

  return (
    <View style={styles.row}>
      <CdjButton
        testID={`${idPrefix}tag-track`}
        label={tagged ? 'REMOVE' : 'TAG TRACK'}
        active={tagged}
        onPress={() => setTagged((t) => !t)}
        style={styles.button}
      />
      <CdjButton testID={`${idPrefix}track-filter`} label="TRACK FILTER" sublabel="EDIT" style={styles.button} />
      <CdjButton testID={`${idPrefix}shortcut`} label="SHORTCUT" style={styles.button} />
      <CdjButton
        testID={`${idPrefix}quantize`}
        label="QUANTIZE"
        active={quantize}
        onPress={onToggleQuantize}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  button: {
    width: 66,
    height: 34,
  },
});
