import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { SEND_FX_SOURCES } from '../utils/sendFx';
import CdjButton from './CdjButton';
import Knob from './Knob';

const SHORT_LABELS = {
  'SHORT DELAY': ['SHORT', 'DELAY'],
  'LONG DELAY': ['LONG', 'DELAY'],
  'DUB ECHO': ['DUB', 'ECHO'],
  REVERB: ['REVERB', ''],
  EXT1: ['EXT1', ''],
  EXT2: ['EXT2', ''],
};

// The DJM-V10's SEND section: pick a built-in effect (or an external unit on
// EXT1/EXT2), shape it with SIZE/FEEDBACK, TIME and TONE, and send channels
// into it with each channel's SEND knob. MASTER MIX routes the effect sound
// straight to the master at MIX LEVEL.
function MixerSendFxSection({ sendFx, onChange }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>SEND</Text>
      <View style={styles.grid}>
        {SEND_FX_SOURCES.map((source) => (
          <CdjButton
            key={source}
            testID={`mixer-sendfx-type-${source.toLowerCase().replace(' ', '-')}`}
            label={SHORT_LABELS[source][0]}
            sublabel={SHORT_LABELS[source][1] || undefined}
            active={sendFx.source === source}
            activeBg="#10314d"
            activeBorder={colors.blue}
            activeTextColor={colors.blue}
            onPress={() => onChange({ source })}
            style={styles.typeButton}
          />
        ))}
      </View>
      <View style={styles.knobRow}>
        <Knob testID="mixer-sendfx-size" label="SIZE/FB" value={sendFx.size} onChange={(v) => onChange({ size: v })} />
        <Knob testID="mixer-sendfx-time" label="TIME" value={sendFx.time} onChange={(v) => onChange({ time: v })} />
        <Knob testID="mixer-sendfx-tone" label="TONE" bipolar value={sendFx.tone} onChange={(v) => onChange({ tone: v })} />
      </View>
      <View style={styles.knobRow}>
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
    </View>
  );
}

export default memo(MixerSendFxSection);

const styles = StyleSheet.create({
  section: {
    alignItems: 'center',
    gap: 8,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  grid: {
    width: 150,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center',
  },
  typeButton: {
    width: 46,
    height: 34,
    paddingHorizontal: 2,
  },
  knobRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  masterMixButton: {
    width: 56,
    height: 40,
  },
});
