import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import Knob from './Knob';
import ThreeWaySwitch from './ThreeWaySwitch';

const MODE_OPTIONS = [
  { value: 'lpf', label: 'LPF' },
  { value: 'off', label: 'OFF' },
  { value: 'hpf', label: 'HPF' },
];

function MixerFilterSection({ filter, onChange }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>FILTER</Text>
      <ThreeWaySwitch
        testID="mixer-filter-mode"
        options={MODE_OPTIONS}
        value={filter.mode}
        onChange={(v) => onChange({ mode: v })}
      />
      <Knob testID="mixer-filter-freq" label="FREQ" value={filter.freq} onChange={(v) => onChange({ freq: v })} />
      <Knob
        testID="mixer-filter-resonance"
        label="RES"
        value={filter.resonance}
        onChange={(v) => onChange({ resonance: v })}
      />
    </View>
  );
}

export default memo(MixerFilterSection);

const styles = StyleSheet.create({
  section: {
    alignItems: 'center',
    gap: 10,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
