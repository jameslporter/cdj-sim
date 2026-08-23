import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import Knob from './Knob';
import ThreeWaySwitch from './ThreeWaySwitch';
import VerticalFader from './VerticalFader';
import VuMeter from './VuMeter';

const ASSIGN_OPTIONS = [
  { value: 'A', label: 'A' },
  { value: 'thru', label: 'THRU' },
  { value: 'B', label: 'B' },
];

export default function MixerChannelStrip({
  channelNumber,
  channel,
  level,
  linked,
  deckLabel,
  inputLabel,
  onInputCycle,
  onTrimChange,
  onEqChange,
  onCompChange,
  onFaderChange,
  onAssignChange,
  onToggleCue,
  idPrefix,
}) {
  return (
    <View style={styles.strip}>
      <Text style={styles.channelNumber}>{channelNumber}</Text>

      <Pressable testID={`${idPrefix}input`} style={styles.inputButton} onPress={onInputCycle}>
        <Text style={styles.inputText}>{inputLabel}</Text>
      </Pressable>

      <Text style={styles.linkedLabel}>{linked ? deckLabel : '—'}</Text>

      <Knob testID={`${idPrefix}trim`} label="TRIM" value={channel.trim} bipolar onChange={onTrimChange} />
      <Knob testID={`${idPrefix}eq-hi`} label="HI" value={channel.eqHi} bipolar onChange={(v) => onEqChange('eqHi', v)} />
      <Knob
        testID={`${idPrefix}eq-himid`}
        label="HI-MID"
        value={channel.eqHiMid}
        bipolar
        onChange={(v) => onEqChange('eqHiMid', v)}
      />
      <Knob
        testID={`${idPrefix}eq-lomid`}
        label="LO-MID"
        value={channel.eqLoMid}
        bipolar
        onChange={(v) => onEqChange('eqLoMid', v)}
      />
      <Knob testID={`${idPrefix}eq-low`} label="LOW" value={channel.eqLow} bipolar onChange={(v) => onEqChange('eqLow', v)} />
      <Knob testID={`${idPrefix}comp`} label="COMP" value={channel.comp} onChange={onCompChange} />

      <Pressable
        testID={`${idPrefix}cue`}
        style={[styles.cueButton, channel.cue && styles.cueButtonActive]}
        onPress={onToggleCue}
      >
        <Text style={[styles.cueText, channel.cue && styles.cueTextActive]}>CUE</Text>
      </Pressable>

      <View style={styles.faderRow}>
        <VuMeter level={level} height={140} />
        <VerticalFader
          testID={`${idPrefix}fader`}
          value={channel.fader}
          min={0}
          max={1}
          trackHeight={140}
          trackWidth={30}
          thumbWidth={40}
          onChange={onFaderChange}
        />
      </View>

      <ThreeWaySwitch
        testID={`${idPrefix}assign`}
        options={ASSIGN_OPTIONS}
        value={channel.assign}
        onChange={onAssignChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    width: 74,
    alignItems: 'center',
    gap: 8,
  },
  channelNumber: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  inputButton: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: colors.buttonBg,
    borderWidth: 1,
    borderColor: colors.buttonBorder,
  },
  inputText: {
    color: colors.textMuted,
    fontSize: 7,
    fontWeight: '700',
  },
  linkedLabel: {
    color: colors.accent,
    fontSize: 8,
    fontWeight: '700',
    height: 10,
  },
  cueButton: {
    width: 40,
    height: 22,
    borderRadius: 4,
    backgroundColor: colors.buttonBg,
    borderWidth: 1,
    borderColor: colors.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cueButtonActive: {
    backgroundColor: '#1a2f57',
    borderColor: '#3d6bc4',
  },
  cueText: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '700',
  },
  cueTextActive: {
    color: '#7fb0ff',
  },
  faderRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
});
