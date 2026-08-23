import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { formatTime } from '../utils/format';
import Waveform from './Waveform';

export default function TrackDisplay({
  track,
  bpm,
  pitch,
  elapsed,
  duration,
  timeMode,
  onToggleTimeMode,
  progressRatio,
  loopRange,
  idPrefix = '',
}) {
  const timeValue = timeMode === 'REMAIN' ? duration - elapsed : elapsed;
  const timePrefix = timeMode === 'REMAIN' ? '-' : '';

  return (
    <View style={styles.display}>
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {track.artist}
        </Text>
      </View>

      <View style={styles.metricsRow}>
        <View>
          <Text style={styles.metricLabel}>BPM</Text>
          <Text style={styles.bpmValue}>{bpm}</Text>
        </View>
        <View>
          <Text style={styles.metricLabel}>KEY</Text>
          <Text style={styles.keyValue}>{track.key}</Text>
        </View>
        <Pressable testID={`${idPrefix}time-toggle`} style={styles.timeBlock} onPress={onToggleTimeMode}>
          <Text style={styles.metricLabel}>{timeMode}</Text>
          <Text style={styles.timeValue}>
            {timePrefix}
            {formatTime(timeValue)}
          </Text>
        </Pressable>
        <View>
          <Text style={styles.metricLabel}>TEMPO</Text>
          <Text style={[styles.pitchValue, { color: pitch === 0 ? colors.textSecondary : colors.accent }]}>
            {pitch > 0 ? '+' : ''}
            {pitch.toFixed(1)}%
          </Text>
        </View>
      </View>

      <Waveform progressRatio={progressRatio} loopRange={loopRange} />
    </View>
  );
}

const styles = StyleSheet.create({
  display: {
    backgroundColor: colors.panelBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 14,
    gap: 10,
  },
  trackInfo: {
    gap: 2,
  },
  trackTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  trackArtist: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  timeBlock: {
    alignItems: 'center',
  },
  metricLabel: {
    color: '#3d7a70',
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 2,
  },
  bpmValue: {
    color: colors.accent,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  keyValue: {
    color: colors.accent,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  timeValue: {
    color: colors.accent,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  pitchValue: {
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
});
