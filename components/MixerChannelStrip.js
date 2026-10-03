import { memo, useCallback } from 'react';
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

function MixerChannelStrip({
  index,
  channelNumber,
  channel,
  level,
  linked,
  deckLabel,
  inputLabel,
  onUpdateChannel,
  onCycleInput,
  onToggleCue,
  idPrefix,
}) {
  // Bound here (inside the memoized component) rather than by the parent's
  // .map(), so that MixerChannelStrip's OWN incoming props stay referentially
  // stable across renders where this channel didn't change — that's what
  // lets React.memo actually skip re-rendering this whole 6-knob subtree
  // when e.g. the other channel or the crossfader is what changed.
  const handleInputCycle = useCallback(() => onCycleInput(index), [onCycleInput, index]);
  const handleToggleCue = useCallback(() => onToggleCue(index), [onToggleCue, index]);
  const handleTrimChange = useCallback((v) => onUpdateChannel(index, { trim: v }), [onUpdateChannel, index]);
  const handleEqHiChange = useCallback((v) => onUpdateChannel(index, { eqHi: v }), [onUpdateChannel, index]);
  const handleEqHiMidChange = useCallback((v) => onUpdateChannel(index, { eqHiMid: v }), [onUpdateChannel, index]);
  const handleEqLoMidChange = useCallback((v) => onUpdateChannel(index, { eqLoMid: v }), [onUpdateChannel, index]);
  const handleEqLowChange = useCallback((v) => onUpdateChannel(index, { eqLow: v }), [onUpdateChannel, index]);
  const handleCompChange = useCallback((v) => onUpdateChannel(index, { comp: v }), [onUpdateChannel, index]);
  const handleFaderChange = useCallback((v) => onUpdateChannel(index, { fader: v }), [onUpdateChannel, index]);
  const handleAssignChange = useCallback((v) => onUpdateChannel(index, { assign: v }), [onUpdateChannel, index]);

  return (
    <View style={styles.strip}>
      <Text style={styles.channelNumber}>{channelNumber}</Text>

      <Pressable testID={`${idPrefix}input`} style={styles.inputButton} onPress={handleInputCycle}>
        <Text style={styles.inputText}>{inputLabel}</Text>
      </Pressable>

      <Text style={styles.linkedLabel}>{linked ? deckLabel : '—'}</Text>

      <Knob testID={`${idPrefix}trim`} label="TRIM" value={channel.trim} bipolar onChange={handleTrimChange} size={48} />
      <Knob testID={`${idPrefix}eq-hi`} label="HI" value={channel.eqHi} bipolar onChange={handleEqHiChange} size={44} />
      <Knob
        testID={`${idPrefix}eq-himid`}
        label="HI-MID"
        value={channel.eqHiMid}
        bipolar
        onChange={handleEqHiMidChange}
        size={44}
      />
      <Knob
        testID={`${idPrefix}eq-lomid`}
        label="LO-MID"
        value={channel.eqLoMid}
        bipolar
        onChange={handleEqLoMidChange}
        size={44}
      />
      <Knob testID={`${idPrefix}eq-low`} label="LOW" value={channel.eqLow} bipolar onChange={handleEqLowChange} size={44} />
      <Knob testID={`${idPrefix}comp`} label="COMP" value={channel.comp} onChange={handleCompChange} size={40} />

      <Pressable
        testID={`${idPrefix}cue`}
        style={[styles.cueButton, channel.cue && styles.cueButtonActive]}
        onPress={handleToggleCue}
      >
        <Text style={[styles.cueText, channel.cue && styles.cueTextActive]}>CUE</Text>
      </Pressable>

      <View style={styles.faderRow}>
        <VuMeter level={level} height={180} width={14} />
        <VerticalFader
          testID={`${idPrefix}fader`}
          value={channel.fader}
          min={0}
          max={1}
          trackHeight={180}
          trackWidth={38}
          thumbWidth={50}
          onChange={handleFaderChange}
        />
      </View>

      <ThreeWaySwitch
        testID={`${idPrefix}assign`}
        options={ASSIGN_OPTIONS}
        value={channel.assign}
        onChange={handleAssignChange}
      />
    </View>
  );
}

export default memo(MixerChannelStrip);

const styles = StyleSheet.create({
  strip: {
    width: 100,
    alignItems: 'center',
    gap: 10,
  },
  channelNumber: {
    color: colors.textPrimary,
    fontSize: 18,
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
