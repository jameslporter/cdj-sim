import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import CdjButton from './CdjButton';
import Knob from './Knob';

// HEADPHONES: what you hear in your headphones. Press a channel's CUE to send
// it here, then turn MIXING toward CUE to hear it before the crowd does.
// SPLIT puts cue in your left ear and the master in your right; PRE EQ cues
// the channel before its EQ.
function MixerHeadphonesSection({ headphones, onChange }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>HEADPHONES</Text>
      <View style={styles.row}>
        <CdjButton
          testID="mixer-hp-split"
          label="SPLIT"
          sublabel="MONO"
          active={headphones.split}
          onPress={() => onChange({ split: !headphones.split })}
          style={styles.button}
        />
        <CdjButton
          testID="mixer-hp-pre-eq"
          label="PRE EQ"
          active={headphones.preEq}
          onPress={() => onChange({ preEq: !headphones.preEq })}
          style={styles.button}
        />
      </View>
      <View style={styles.mixingWrap}>
        <Knob
          testID="mixer-hp-mixing"
          label="MIXING"
          value={headphones.mixing}
          onChange={(v) => onChange({ mixing: v })}
        />
        <View style={styles.ends}>
          <Text style={styles.end}>CUE</Text>
          <Text style={styles.end}>MASTER</Text>
        </View>
      </View>
      <Knob testID="mixer-hp-level" label="LEVEL" value={headphones.level} onChange={(v) => onChange({ level: v })} />
    </View>
  );
}

export default memo(MixerHeadphonesSection);

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
    gap: 6,
  },
  button: {
    width: 48,
    height: 30,
  },
  mixingWrap: {
    alignItems: 'center',
  },
  ends: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 76,
  },
  end: {
    color: colors.textMuted,
    fontSize: 7,
    fontWeight: '700',
  },
});
