import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import CdjButton from './CdjButton';

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
      <CdjButton testID={`${idPrefix}memory-save`} label="MEMORY" onPress={onSave} style={styles.button} />
      <View style={styles.callGroup}>
        <CdjButton
          testID={`${idPrefix}memory-call-back`}
          label="◀"
          disabled={memoryCues.length === 0}
          onPress={() => onCall(-1)}
          style={styles.callButton}
        />
        <View style={styles.indexBox}>
          <Text style={styles.indexText}>{label}</Text>
          <Text style={styles.indexCaption}>CUE/LOOP CALL</Text>
        </View>
        <CdjButton
          testID={`${idPrefix}memory-call-forward`}
          label="▶"
          disabled={memoryCues.length === 0}
          onPress={() => onCall(1)}
          style={styles.callButton}
        />
      </View>
      <CdjButton
        testID={`${idPrefix}memory-delete`}
        label="DELETE"
        disabled={memoryCueIndex < 0}
        onPress={onDelete}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    width: 54,
    height: 32,
  },
  callGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  callButton: {
    width: 26,
    height: 32,
  },
  indexBox: {
    alignItems: 'center',
    minWidth: 60,
  },
  indexText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  indexCaption: {
    color: colors.textMuted,
    fontSize: 6,
    fontWeight: '700',
  },
});
