import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import useBlink from '../hooks/useBlink';
import CdjButton from './CdjButton';
import Knob from './Knob';

// FILTER section: LPF or HPF picks the filter every channel's FILTER knob
// works (one at a time). The selected button blinks; press it again to turn
// the filter off. RESONANCE sets the peak at the cutoff for all channels.
function MixerFilterSection({ filter, onChange }) {
  const blink = useBlink(!!filter.type, 500);
  const press = (type) => onChange({ type: filter.type === type ? null : type });
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>FILTER</Text>
      <View style={styles.buttons}>
        <CdjButton
          testID="mixer-filter-lpf"
          label="LPF"
          active={filter.type === 'LPF' && blink}
          onPress={() => press('LPF')}
          style={styles.button}
        />
        <CdjButton
          testID="mixer-filter-hpf"
          label="HPF"
          active={filter.type === 'HPF' && blink}
          onPress={() => press('HPF')}
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
