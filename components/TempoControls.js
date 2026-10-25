import { StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';
import DeckButton from './DeckButton';
import TempoFader from './TempoFader';

// Right-hand tempo section: range and MASTER TEMPO above the slider,
// TEMPO RESET below it.
export default function TempoControls({
  pitch,
  range,
  masterTempo,
  onPitchChange,
  onCycleRange,
  onToggleMasterTempo,
  tempoReset,
  onReset,
  idPrefix = '',
}) {
  return (
    <View style={styles.section}>
      <DeckButton
        testID={`${idPrefix}tempo-range`}
        label={range === 100 ? 'WIDE' : `±${range}`}
        sublabel="TEMPO"
        onPress={onCycleRange}
        style={styles.smallButton}
      />
      <DeckButton
        testID={`${idPrefix}tempo-master`}
        label="MASTER"
        sublabel="TEMPO"
        active={masterTempo}
        led="red"
        onPress={onToggleMasterTempo}
        style={styles.smallButton}
      />
      <TempoFader pitch={pitch} range={range} onChange={onPitchChange} testID={`${idPrefix}tempo-fader-thumb`} />
      <DeckButton
        testID={`${idPrefix}tempo-reset`}
        label="TEMPO"
        sublabel="RESET"
        active={tempoReset}
        led="green"
        onPress={onReset}
        style={styles.smallButton}
      />
      <Text style={styles.silk}>TEMPO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: 92,
    alignItems: 'center',
    gap: 8,
  },
  smallButton: {
    width: 64,
    height: 30,
  },
  silk: {
    color: cdj.silkDim,
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
