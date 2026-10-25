import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import CdjButton from './CdjButton';
import Knob from './Knob';

// FILTER section: LPF and HPF choose which way each channel's FILTER knob
// works (turn left for the low-pass, right for the high-pass). RESONANCE
// adds the peak at the cutoff for all channels.
function MixerFilterSection({ filter, onChange }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>FILTER</Text>
      <View style={styles.buttons}>
        <CdjButton
          testID="mixer-filter-lpf"
          label="LPF"
          active={filter.lpf}
          onPress={() => onChange({ lpf: !filter.lpf })}
          style={styles.button}
        />
        <CdjButton
          testID="mixer-filter-hpf"
          label="HPF"
          active={filter.hpf}
          onPress={() => onChange({ hpf: !filter.hpf })}
          style={styles.button}
        />
      </View>
      <Knob
        testID="mixer-filter-resonance"
        label="RESONANCE"
        value={filter.resonance}
        onChange={(v) => onChange({ resonance: v })}
      />
    </View>
  );
}

export default memo(MixerFilterSection);

const styles = StyleSheet.create({
  buttons: {
    flexDirection: 'row',
    gap: 6,
  },
  button: {
    width: 40,
    height: 26,
  },
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
