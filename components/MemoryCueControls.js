import { StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';
import DeckButton from './DeckButton';

export default function MemoryCueControls({
  memoryCues,
  memoryCueIndex,
  onSave,
  onCall,
  onDelete,
  idPrefix = '',
}) {
  const label = memoryCues.length === 0 ? '--' : `${memoryCueIndex + 1}/${memoryCues.length}`;

  return (
    <View style={styles.row}>
      <View style={styles.callWrap}>
        <Text style={styles.silk}>CUE/LOOP CALL {label}</Text>
        <View style={styles.callGroup}>
          <DeckButton
            testID={`${idPrefix}memory-call-back`}
            label="◀"
            disabled={memoryCues.length === 0}
            onPress={() => onCall(-1)}
            style={styles.callButton}
          />
          <DeckButton
            testID={`${idPrefix}memory-call-forward`}
            label="▶"
            disabled={memoryCues.length === 0}
            onPress={() => onCall(1)}
            style={styles.callButton}
          />
        </View>
      </View>
      <DeckButton
        testID={`${idPrefix}memory-delete`}
        label="DELETE"
        disabled={memoryCueIndex < 0}
        onPress={onDelete}
        style={styles.button}
      />
      <DeckButton testID={`${idPrefix}memory-save`} label="MEMORY" onPress={onSave} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  callWrap: {
    alignItems: 'center',
    gap: 3,
  },
  silk: {
    color: cdj.silkDim,
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  callGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  button: {
    width: 52,
    height: 24,
  },
  callButton: {
    width: 32,
    height: 24,
  },
});
