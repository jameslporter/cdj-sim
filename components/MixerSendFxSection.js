import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import CdjButton from './CdjButton';
import Knob from './Knob';
import ThreeWaySwitch from './ThreeWaySwitch';

const SOURCE_OPTIONS = [
  { value: 'BUILT-IN', label: 'INT' },
  { value: 'EXT1', label: 'EXT1' },
  { value: 'EXT2', label: 'EXT2' },
];

function MixerSendFxSection({ sendFx, onChange }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>SEND / FX</Text>
      <ThreeWaySwitch
        testID="mixer-sendfx-source"
        options={SOURCE_OPTIONS}
        value={sendFx.source}
        onChange={(v) => onChange({ source: v })}
      />
      <View style={styles.knobRow}>
        <Knob testID="mixer-sendfx-size" label="SIZE" value={sendFx.size} onChange={(v) => onChange({ size: v })} />
        <Knob testID="mixer-sendfx-time" label="TIME" value={sendFx.time} onChange={(v) => onChange({ time: v })} />
      </View>
      <View style={styles.knobRow}>
        <Knob testID="mixer-sendfx-tone" label="TONE" value={sendFx.tone} onChange={(v) => onChange({ tone: v })} />
        <Knob testID="mixer-sendfx-send" label="SEND" value={sendFx.send} onChange={(v) => onChange({ send: v })} />
      </View>
      <Knob
        testID="mixer-sendfx-masterlevel"
        label="MIX LVL"
        value={sendFx.masterMixLevel}
        onChange={(v) => onChange({ masterMixLevel: v })}
      />
      <CdjButton
        testID="mixer-sendfx-mastermix"
        label="MASTER"
        sublabel="MIX"
        active={sendFx.masterMixOn}
        onPress={() => onChange({ masterMixOn: !sendFx.masterMixOn })}
        style={styles.masterMixButton}
      />
    </View>
  );
}

export default memo(MixerSendFxSection);

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
  knobRow: {
    flexDirection: 'row',
    gap: 10,
  },
  masterMixButton: {
    width: 56,
    height: 40,
  },
});
