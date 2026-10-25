import { StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';
import DeckButton from './DeckButton';
import TempoFader from './TempoFader';

// Right-hand tempo section: BEAT SYNC and MASTER on top, then range and
// MASTER TEMPO above the slider, TEMPO RESET below it.
export default function TempoControls({
  pitch,
  range,
  masterTempo,
  onPitchChange,
  onCycleRange,
  onToggleMasterTempo,
  tempoReset,
  onReset,
  syncOn,
  isMaster,
  onSync,
  onMaster,
  onInstantDoubles,
  idPrefix = '',
}) {
  return (
    <View style={styles.section}>
      <View style={styles.syncRow}>
        <DeckButton
          testID={`${idPrefix}beat-sync`}
          label="BEAT SYNC"
          sublabel="INST DOUBLES"
          sublabelStyle={styles.syncSublabel}
          active={syncOn}
          led="blue"
          onPress={onSync}
          onLongPress={onInstantDoubles}
          delayLongPress={700}
          style={styles.syncButton}
          labelStyle={styles.syncLabel}
        />
        <DeckButton
          testID={`${idPrefix}sync-master`}
          label="MASTER"
          active={isMaster}
          led="orange"
          onPress={onMaster}
          style={styles.syncButton}
          labelStyle={styles.syncLabel}
        />
      </View>
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
  syncRow: {
    flexDirection: 'row',
    gap: 4,
  },
  syncButton: {
    width: 44,
    height: 36,
    paddingHorizontal: 2,
  },
  syncLabel: {
    fontSize: 7,
  },
  syncSublabel: {
    fontSize: 5,
    letterSpacing: 0,
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
