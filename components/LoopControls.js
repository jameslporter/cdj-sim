import { StyleSheet, View } from 'react-native';
import DeckButton from './DeckButton';

export default function LoopControls({
  active,
  hasLoop,
  hasLoopStart,
  onLoopIn,
  onLoopOut,
  onFourBeat,
  onEightBeat,
  onReloopExit,
  idPrefix = '',
}) {
  return (
    <View style={styles.group}>
      <View style={styles.row}>
        <DeckButton
          testID={`${idPrefix}loop-in`}
          label={hasLoopStart ? 'IN ADJUST' : 'IN/CUE'}
          sublabel="LOOP"
          active={active}
          led="orange"
          onPress={onLoopIn}
          style={styles.button}
        />
        <DeckButton
          testID={`${idPrefix}loop-out`}
          label={active ? 'OUT ADJUST' : 'OUT'}
          sublabel="LOOP"
          active={active}
          led="orange"
          disabled={!hasLoopStart}
          onPress={onLoopOut}
          style={styles.button}
        />
        <DeckButton
          testID={`${idPrefix}loop-reloop-exit`}
          label={active ? 'EXIT' : 'RELOOP'}
          sublabel="RELOOP/EXIT"
          active={active}
          led="orange"
          disabled={!active && !hasLoop}
          onPress={onReloopExit}
          style={styles.button}
        />
      </View>
      <View style={styles.row}>
        <DeckButton
          testID={`${idPrefix}loop-4beat`}
          label={active ? '1/2X' : '4 BEAT'}
          sublabel="4 BEAT/1/2X"
          active={active}
          led="orange"
          onPress={onFourBeat}
          style={styles.button}
        />
        <DeckButton
          testID={`${idPrefix}loop-8beat`}
          label={active ? '2X' : '8 BEAT'}
          sublabel="8 BEAT/2X"
          active={active}
          led="orange"
          onPress={onEightBeat}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  button: {
    width: 62,
    height: 34,
  },
});
