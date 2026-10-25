import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import HorizontalFader from './HorizontalFader';
import MixerChannelStrip from './MixerChannelStrip';

export default function MixerChannelBank({
  channels,
  channelLevels,
  channelPeaks,
  crossfader,
  inputOptions,
  linkedLabels,
  onUpdateChannel,
  onCycleInput,
  onToggleCue,
  onCrossfaderChange,
}) {
  return (
    <View style={styles.bank}>
      <View style={styles.row}>
        {channels.map((channel, i) => (
          <MixerChannelStrip
            key={i}
            index={i}
            channelNumber={i + 1}
            channel={channel}
            level={channelLevels[i]}
            getPeak={channelPeaks?.[i]}
            linked={Boolean(linkedLabels[i])}
            deckLabel={linkedLabels[i]}
            inputLabel={inputOptions[channel.inputIndex]}
            onUpdateChannel={onUpdateChannel}
            onCycleInput={onCycleInput}
            onToggleCue={onToggleCue}
            idPrefix={`mixer-ch${i + 1}-`}
          />
        ))}
      </View>
      <View style={styles.crossfaderRow}>
        <Text style={styles.crossfaderLabel}>A</Text>
        <HorizontalFader
          testID="mixer-crossfader"
          value={crossfader}
          min={-1}
          max={1}
          trackWidth={340}
          centerTick
          onChange={onCrossfaderChange}
        />
        <Text style={styles.crossfaderLabel}>B</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bank: {
    alignItems: 'center',
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 40,
  },
  crossfaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crossfaderLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
});
