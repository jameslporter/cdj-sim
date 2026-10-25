import { StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';
import DeckButton from './DeckButton';
import HoldPressable from './HoldPressable';
import useBlink from '../hooks/useBlink';

// DELETE (CALL/DELETE): tap it to delete the memory cue you last called, or
// hold it and press a HOT CUE pad to delete that hot cue. It uses pointer
// events so it can be held while another finger presses a pad. With a mouse
// a click latches it (blinking) until you click a pad, or DELETE again to
// delete the memory cue.
function DeleteButton({ testID, held, onPressIn, onPressOut, onClick }) {
  const blink = useBlink(held);
  const lit = held && blink;
  return (
    <HoldPressable
      testID={testID}
      onDown={(isMouse) => (isMouse ? onClick() : onPressIn())}
      onUp={(isMouse) => (isMouse ? null : onPressOut())}
      style={({ pressed }) => [
        deleteStyles.button,
        lit && deleteStyles.lit,
        pressed && deleteStyles.pressed,
      ]}
    >
      <Text style={[deleteStyles.label, lit && deleteStyles.labelLit]}>DELETE</Text>
    </HoldPressable>
  );
}

export default function MemoryCueControls({
  memoryCues,
  memoryCueIndex,
  onSave,
  onCall,
  deleteHeld,
  onDeletePressIn,
  onDeletePressOut,
  onDeleteClick,
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
      <DeleteButton
        testID={`${idPrefix}memory-delete`}
        held={deleteHeld}
        onPressIn={onDeletePressIn}
        onPressOut={onDeletePressOut}
        onClick={onDeleteClick}
      />
      <DeckButton testID={`${idPrefix}memory-save`} label="MEMORY" onPress={onSave} style={styles.button} />
    </View>
  );
}

const deleteStyles = StyleSheet.create({
  button: {
    width: 52,
    height: 24,
    backgroundColor: cdj.button,
    borderWidth: 1,
    borderColor: cdj.buttonBorder,
    borderTopColor: '#3d4044',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 2px rgba(0, 0, 0, 0.6)',
  },
  lit: {
    borderColor: cdj.ledRed,
    boxShadow: `0px 0px 8px ${cdj.ledRed}55, inset 0px 0px 6px ${cdj.ledRed}33`,
  },
  pressed: {
    transform: [{ translateY: 1 }],
    backgroundColor: '#161719',
    boxShadow: 'none',
  },
  label: {
    color: cdj.buttonLegend,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  labelLit: {
    color: cdj.ledRed,
  },
});

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
