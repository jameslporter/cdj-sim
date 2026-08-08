import { StyleSheet, View } from 'react-native';
import CdjButton from './CdjButton';

export default function LoopControls({ active, hasLoop, onFourBeat, onEightBeat, onReloopExit }) {
  return (
    <View style={styles.group}>
      <CdjButton
        testID="loop-4beat"
        label={active ? '1/2X' : '4 BEAT'}
        sublabel="LOOP"
        active={active}
        activeBg="#1a2f57"
        activeBorder="#3d6bc4"
        activeTextColor="#7fb0ff"
        onPress={onFourBeat}
        style={styles.button}
      />
      <CdjButton
        testID="loop-8beat"
        label={active ? '2X' : '8 BEAT'}
        sublabel="LOOP"
        active={active}
        activeBg="#1a2f57"
        activeBorder="#3d6bc4"
        activeTextColor="#7fb0ff"
        onPress={onEightBeat}
        style={styles.button}
      />
      <CdjButton
        testID="loop-reloop-exit"
        label={active ? 'EXIT' : 'RELOOP'}
        active={active}
        activeBg="#1a2f57"
        activeBorder="#3d6bc4"
        activeTextColor="#7fb0ff"
        disabled={!active && !hasLoop}
        onPress={onReloopExit}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    width: 60,
    height: 44,
  },
});
