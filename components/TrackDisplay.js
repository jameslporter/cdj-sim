import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';
import { formatTime } from '../utils/format';
import Waveform, { ZoomWaveform } from './Waveform';

// The CDJ-3000X's main player screen: track header, zoomed waveform,
// overview waveform and the time / tempo / BPM strip along the bottom.
export default function TrackDisplay({
  track,
  bpm,
  pitch,
  pitchRange,
  masterTempo,
  quantize,
  playerNumber,
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
  const [bpmWhole, bpmFrac] = String(bpm).split('.');

  return (
    <View style={styles.display}>
      <View style={styles.header}>
        <View style={styles.playerBadge}>
          <Text style={styles.playerLabel}>PLAYER</Text>
          <Text style={styles.playerNumber}>{playerNumber}</Text>
        </View>
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {track.artist}
          </Text>
        </View>
        <View style={styles.keyBox}>
          <Text style={styles.metricLabel}>KEY</Text>
          <Text style={styles.keyValue}>{track.key}</Text>
        </View>
      </View>

      <ZoomWaveform progressRatio={progressRatio} loopRange={loopRange} />

      <View style={styles.overview}>
        <Waveform progressRatio={progressRatio} loopRange={loopRange} />
      </View>

      <View style={styles.strip}>
        <Pressable testID={`${idPrefix}time-toggle`} style={styles.timeBlock} onPress={onToggleTimeMode}>
          <Text style={styles.metricLabel}>{timeMode}</Text>
          <Text style={styles.timeValue}>
            {timePrefix}
            {formatTime(timeValue)}
          </Text>
        </Pressable>

        <View style={styles.divider} />

        <View style={styles.tempoBlock}>
          <View style={styles.labelRow}>
            <Text style={styles.metricLabel}>TEMPO</Text>
            <Text style={styles.rangeTag}>{pitchRange === 100 ? 'WIDE' : `±${pitchRange}`}</Text>
          </View>
          <Text style={styles.tempoValue}>
            {pitch > 0 ? '+' : pitch < 0 ? '' : ' '}
            {pitch.toFixed(2)}
            <Text style={styles.unit}>%</Text>
          </Text>
          <View style={styles.badgeRow}>
            <Text style={[styles.badge, masterTempo && styles.badgeOnRed]}>MT</Text>
            <Text style={[styles.badge, quantize && styles.badgeOnRed]}>Q</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.bpmBlock}>
          <Text style={styles.metricLabel}>BPM</Text>
          <Text style={styles.bpmValue}>
            {bpmWhole}
            <Text style={styles.bpmFrac}>.{bpmFrac ?? '00'}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  display: {
    flex: 1,
    backgroundColor: cdj.screenBg,
    gap: 6,
    paddingVertical: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  playerBadge: {
    width: 34,
    height: 34,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: cdj.screenTextDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerLabel: {
    color: cdj.screenTextDim,
    fontSize: 6,
    fontWeight: '700',
  },
  playerNumber: {
    color: cdj.screenText,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 18,
  },
  trackInfo: {
    flex: 1,
    gap: 1,
  },
  trackTitle: {
    color: cdj.screenText,
    fontSize: 15,
    fontWeight: '700',
  },
  trackArtist: {
    color: cdj.screenTextDim,
    fontSize: 11,
  },
  keyBox: {
    alignItems: 'flex-end',
  },
  keyValue: {
    color: '#7cf27c',
    fontSize: 15,
    fontWeight: '800',
  },
  overview: {
    paddingHorizontal: 8,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: cdj.screenPanel,
    borderTopWidth: 1,
    borderTopColor: cdj.screenDivider,
    paddingHorizontal: 8,
    paddingTop: 4,
    marginTop: 'auto',
  },
  divider: {
    width: 1,
    backgroundColor: cdj.screenDivider,
    marginHorizontal: 8,
  },
  timeBlock: {
    flex: 1.3,
  },
  tempoBlock: {
    flex: 1,
  },
  bpmBlock: {
    flex: 1,
    alignItems: 'flex-end',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    color: cdj.screenLabel,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  rangeTag: {
    color: cdj.screenTextDim,
    fontSize: 8,
    fontWeight: '700',
  },
  timeValue: {
    color: cdj.screenText,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  tempoValue: {
    color: cdj.screenText,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  unit: {
    fontSize: 10,
    color: cdj.screenTextDim,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 1,
  },
  badge: {
    color: '#3a4048',
    fontSize: 7,
    fontWeight: '800',
    borderWidth: 1,
    borderColor: '#2a2f36',
    paddingHorizontal: 3,
    borderRadius: 2,
  },
  badgeOnRed: {
    color: cdj.ledRed,
    borderColor: cdj.ledRed,
  },
  bpmValue: {
    color: cdj.screenText,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  bpmFrac: {
    fontSize: 14,
  },
});
