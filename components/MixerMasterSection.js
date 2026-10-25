import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import CdjButton from './CdjButton';
import Knob from './Knob';
import VuMeter from './VuMeter';
import LearnView from './LearnView';

function MixerMasterSection({ master, masterLevel, onChange }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>MASTER</Text>
      <LearnView learnId="mixer-master-meter" style={styles.meterRow}>
        <VuMeter level={masterLevel} height={140} width={12} />
        <VuMeter level={masterLevel} height={140} width={12} />
      </LearnView>
      <Knob testID="mixer-master-level" label="LEVEL" value={master.level} onChange={(v) => onChange({ level: v })} />
      <Knob testID="mixer-master-booth" label="BOOTH" value={master.booth} onChange={(v) => onChange({ booth: v })} />

      <CdjButton
        testID="mixer-master-isolator-on"
        label="ISOLATOR"
        active={master.isolatorOn}
        onPress={() => onChange({ isolatorOn: !master.isolatorOn })}
        style={styles.isolatorButton}
      />
      <Knob
        testID="mixer-master-iso-hi"
        label="HI"
        value={master.isoHi}
        bipolar
        onChange={(v) => onChange({ isoHi: v })}
      />
      <Knob
        testID="mixer-master-iso-mid"
        label="MID"
        value={master.isoMid}
        bipolar
        onChange={(v) => onChange({ isoMid: v })}
      />
      <Knob
        testID="mixer-master-iso-low"
        label="LOW"
        value={master.isoLow}
        bipolar
        onChange={(v) => onChange({ isoLow: v })}
      />
    </View>
  );
}

export default memo(MixerMasterSection);

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
  meterRow: {
    flexDirection: 'row',
    gap: 4,
  },
  isolatorButton: {
    width: 70,
    height: 32,
  },
});
