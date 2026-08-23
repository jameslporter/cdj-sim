import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import CdjButton from './CdjButton';
import TempoFader from './TempoFader';

export default function TempoControls({
  pitch,
  range,
  masterTempo,
  onPitchChange,
  onCycleRange,
  onToggleMasterTempo,
  onReset,
  idPrefix = '',
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>TEMPO</Text>
      <TempoFader pitch={pitch} range={range} onChange={onPitchChange} testID={`${idPrefix}tempo-fader-thumb`} />
      <Text style={styles.pitchValue}>
        {pitch > 0 ? '+' : ''}
        {pitch.toFixed(1)}%
      </Text>
      <CdjButton
        testID={`${idPrefix}tempo-range`}
        label={range === 100 ? 'WIDE' : `±${range}`}
        sublabel="RANGE"
        onPress={onCycleRange}
        style={styles.smallButton}
      />
      <CdjButton
        testID={`${idPrefix}tempo-master`}
        label="MT"
        sublabel="MASTER"
        active={masterTempo}
        onPress={onToggleMasterTempo}
        style={styles.smallButton}
      />
      <CdjButton
        testID={`${idPrefix}tempo-reset`}
        label="RESET"
        onPress={onReset}
        style={styles.resetButton}
        textColor={colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '600',
  },
  pitchValue: {
    color: colors.accent,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  smallButton: {
    width: 64,
    height: 40,
  },
  resetButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
