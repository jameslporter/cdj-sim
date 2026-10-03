import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import Knob from './Knob';
import ThreeWaySwitch from './ThreeWaySwitch';

const MODE_OPTIONS = [
  { value: 'off', label: 'OFF' },
  { value: 'on', label: 'ON' },
  { value: 'talk', label: 'TALK' },
];

function MicChannel({ label, mic, onChange, idPrefix }) {
  return (
    <View style={styles.mic}>
      <Text style={styles.micLabel}>{label}</Text>
      <ThreeWaySwitch
        testID={`${idPrefix}mode`}
        vertical
        options={MODE_OPTIONS}
        value={mic.mode}
        onChange={(v) => onChange({ mode: v })}
      />
      <Knob testID={`${idPrefix}level`} label="LEVEL" value={mic.level} onChange={(v) => onChange({ level: v })} />
      <Knob testID={`${idPrefix}eq-hi`} label="HI" value={mic.eqHi} bipolar onChange={(v) => onChange({ eqHi: v })} />
      <Knob testID={`${idPrefix}eq-low`} label="LOW" value={mic.eqLow} bipolar onChange={(v) => onChange({ eqLow: v })} />
    </View>
  );
}

function MixerMicSection({ mic1, mic2, onChangeMic1, onChangeMic2 }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>MIC</Text>
      <View style={styles.row}>
        <MicChannel label="1" mic={mic1} onChange={onChangeMic1} idPrefix="mixer-mic1-" />
        <MicChannel label="2" mic={mic2} onChange={onChangeMic2} idPrefix="mixer-mic2-" />
      </View>
    </View>
  );
}

export default memo(MixerMicSection);

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
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  mic: {
    alignItems: 'center',
    gap: 8,
  },
  micLabel: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
});
