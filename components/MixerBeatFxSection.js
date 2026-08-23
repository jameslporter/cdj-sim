import { StyleSheet, Text, View } from 'react-native';
import { BEAT_FX_ASSIGNS, BEAT_FX_NAMES } from '../hooks/useMixerState';
import { colors } from '../constants/theme';
import CdjButton from './CdjButton';

export default function MixerBeatFxSection({ beatFx, onChange }) {
  const cycleAssign = () => {
    const next = BEAT_FX_ASSIGNS[(BEAT_FX_ASSIGNS.indexOf(beatFx.assign) + 1) % BEAT_FX_ASSIGNS.length];
    onChange({ assign: next });
  };
  const cycleEffect = () => {
    onChange({ effectIndex: (beatFx.effectIndex + 1) % BEAT_FX_NAMES.length });
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>BEAT FX</Text>
      <View style={styles.display}>
        <Text style={styles.displayEffect}>{BEAT_FX_NAMES[beatFx.effectIndex]}</Text>
        <Text style={styles.displayAssign}>{beatFx.assign}</Text>
      </View>
      <CdjButton
        testID="mixer-beatfx-effect"
        label={BEAT_FX_NAMES[beatFx.effectIndex]}
        sublabel="EFFECT"
        onPress={cycleEffect}
        style={styles.button}
      />
      <CdjButton
        testID="mixer-beatfx-assign"
        label={beatFx.assign}
        sublabel="ASSIGN"
        onPress={cycleAssign}
        style={styles.button}
      />
      <CdjButton
        testID="mixer-beatfx-onoff"
        label={beatFx.on ? 'ON' : 'OFF'}
        active={beatFx.on}
        onPress={() => onChange({ on: !beatFx.on })}
        style={styles.button}
      />
    </View>
  );
}

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
  display: {
    width: 88,
    height: 50,
    backgroundColor: colors.panelBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayEffect: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  displayAssign: {
    color: colors.textSecondary,
    fontSize: 9,
  },
  button: {
    width: 64,
    height: 40,
  },
});
