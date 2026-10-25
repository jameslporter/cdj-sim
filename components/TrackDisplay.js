import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BEAT_JUMP_COUNTS } from '../constants/theme';
import { cdj } from '../constants/theme';
import { formatTime } from '../utils/format';
import TouchWaveform from './TouchWaveform';
import { waveSeed, ZoomWaveform } from './Waveform';
import { useLearnTarget } from '../hooks/useLearningMode';
import LearnView from './LearnView';

// The CDJ-3000X's main player screen: track header, zoomed waveform,
// overview waveform and the time / tempo / BPM strip along the bottom.
export default function TrackDisplay({
  track,
  bpm,
  pitch,
  tempoReset,
  autoCue,
  beatJumpCount,
  onSetBeatJumpCount,
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
  hotCues,
  gateCue,
  onToggleGateCue,
  previewRatio,
  onOverviewTouchStart,
  onOverviewTouchMove,
  onOverviewTouchEnd,
  idPrefix = '',
}) {
  const seed = waveSeed(track.id);
  const timeValue = timeMode === 'REMAIN' ? duration - elapsed : elapsed;
  const timePrefix = timeMode === 'REMAIN' ? '-' : '';
  const [bpmWhole, bpmFrac] = String(bpm).split('.');
  const gateLearn = useLearnTarget(`${idPrefix}gate-cue`);
  const timeLearn = useLearnTarget(`${idPrefix}time-toggle`);
  const jumpLearn = useLearnTarget(`${idPrefix}beatjump-count`);
  const [jumpPanelOpen, setJumpPanelOpen] = useState(false);

  return (
    <View style={styles.display}>
      <View style={styles.header}>
        <LearnView testID={`${idPrefix}display-player`} learnId={`${idPrefix}display-player`} style={styles.playerBadge}>
          <Text style={styles.playerLabel}>PLAYER</Text>
          <Text style={styles.playerNumber}>{playerNumber}</Text>
        </LearnView>
        <LearnView testID={`${idPrefix}display-track`} learnId={`${idPrefix}display-track`} style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {track.artist}
          </Text>
        </LearnView>
        <Pressable
          {...jumpLearn.props}
          testID={`${idPrefix}beatjump-count`}
          onPress={() => setJumpPanelOpen((o) => !o)}
          style={[styles.touchKey, jumpPanelOpen && styles.touchKeyOnWhite, jumpLearn.style]}
        >
          <Text style={[styles.touchKeyText, jumpPanelOpen && styles.touchKeyTextOnWhite]}>BEAT JUMP</Text>
          <Text style={styles.jumpValue}>{formatBeats(beatJumpCount)}</Text>
        </Pressable>
        <Pressable
          {...gateLearn.props}
          testID={`${idPrefix}gate-cue`}
          onPress={onToggleGateCue}
          style={[styles.touchKey, gateCue && styles.touchKeyOn, gateLearn.style]}
        >
          <Text style={[styles.touchKeyText, gateCue && styles.touchKeyTextOn]}>GATE CUE</Text>
        </Pressable>
        <LearnView testID={`${idPrefix}display-key`} learnId={`${idPrefix}display-key`} style={styles.keyBox}>
          <Text style={styles.metricLabel}>KEY</Text>
          <Text style={styles.keyValue}>{track.key}</Text>
        </LearnView>
      </View>

      {jumpPanelOpen ? (
        <View style={styles.jumpPanel} testID={`${idPrefix}beatjump-panel`}>
          {BEAT_JUMP_COUNTS.map((count) => (
            <Pressable
              key={count}
              testID={`${idPrefix}beatjump-size-${String(count).replace('.', '_')}`}
              onPress={() => {
                onSetBeatJumpCount(count);
                setJumpPanelOpen(false);
              }}
              style={[styles.jumpOption, count === beatJumpCount && styles.jumpOptionOn]}
            >
              <Text style={[styles.jumpOptionText, count === beatJumpCount && styles.jumpOptionTextOn]}>
                {formatBeats(count)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <LearnView testID={`${idPrefix}display-zoom`} learnId={`${idPrefix}display-zoom`}>
        <ZoomWaveform progressRatio={progressRatio} loopRange={loopRange} peaks={track.peaks} seed={seed} />
      </LearnView>

      {/* Touch the overview: needle search while paused, Touch Cue
          (preview that spot) while playing. */}
      <View style={styles.overview}>
        <TouchWaveform
          testID={`${idPrefix}overview-waveform`}
          seed={seed}
          peaks={track.peaks}
          height={30}
          barCount={90}
          progressRatio={progressRatio}
          loopRange={loopRange}
          hotCues={hotCues}
          duration={duration}
          previewRatio={previewRatio}
          onTouchStart={onOverviewTouchStart}
          onTouchMove={onOverviewTouchMove}
          onTouchEnd={onOverviewTouchEnd}
        />
      </View>

      <View style={styles.strip}>
        <Pressable
          {...timeLearn.props}
          testID={`${idPrefix}time-toggle`}
          style={[styles.timeBlock, timeLearn.style]}
          onPress={onToggleTimeMode}
        >
          <View style={styles.labelRow}>
            <Text style={styles.metricLabel}>{timeMode}</Text>
            {autoCue ? <Text style={styles.autoCueTag}>A.CUE</Text> : null}
          </View>
          <Text style={styles.timeValue}>
            {timePrefix}
            {formatTime(timeValue)}
          </Text>
        </Pressable>

        <View style={styles.divider} />

        <LearnView testID={`${idPrefix}display-tempo`} learnId={`${idPrefix}display-tempo`} style={styles.tempoBlock}>
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
            {tempoReset ? <Text style={[styles.badge, styles.badgeOnGreen]}>RESET</Text> : null}
          </View>
        </LearnView>

        <View style={styles.divider} />

        <LearnView testID={`${idPrefix}display-bpm`} learnId={`${idPrefix}display-bpm`} style={styles.bpmBlock}>
          <Text style={styles.metricLabel}>BPM</Text>
          <Text style={styles.bpmValue}>
            {bpmWhole}
            <Text style={styles.bpmFrac}>.{bpmFrac ?? '00'}</Text>
          </Text>
        </LearnView>
      </View>
    </View>
  );
}

// Beat counts as the CDJ shows them: 1/2, 1, 2 … 64.
function formatBeats(count) {
  return count < 1 ? `1/${Math.round(1 / count)}` : String(count);
}

const styles = StyleSheet.create({
  jumpValue: {
    color: cdj.screenText,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  touchKeyOnWhite: {
    borderColor: cdj.screenText,
    backgroundColor: '#1d2229',
  },
  touchKeyTextOnWhite: {
    color: cdj.screenText,
  },
  // Pops up over the waveform, like the touch screen's BEAT JUMP panel.
  jumpPanel: {
    position: 'absolute',
    top: 46,
    left: 8,
    right: 8,
    zIndex: 2,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    backgroundColor: cdj.screenPanel,
    borderWidth: 1,
    borderColor: cdj.screenDivider,
    borderRadius: 4,
  },
  jumpOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#3a4048',
    borderRadius: 3,
  },
  jumpOptionOn: {
    borderColor: cdj.screenText,
    backgroundColor: '#1d2229',
  },
  jumpOptionText: {
    color: cdj.screenTextDim,
    fontSize: 10,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  jumpOptionTextOn: {
    color: cdj.screenText,
  },
  autoCueTag: {
    color: cdj.screenText,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  badgeOnGreen: {
    color: cdj.ledGreen,
    borderColor: cdj.ledGreen,
  },
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
  touchKey: {
    borderWidth: 1,
    borderColor: '#3a4048',
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  touchKeyOn: {
    borderColor: cdj.ledRed,
    backgroundColor: '#2a0d0c',
  },
  touchKeyText: {
    color: cdj.screenTextDim,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  touchKeyTextOn: {
    color: cdj.ledRed,
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
