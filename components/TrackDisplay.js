import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BEAT_JUMP_COUNTS } from '../constants/theme';
import { cdj } from '../constants/theme';
import { formatTime } from '../utils/format';
import TouchWaveform from './TouchWaveform';
import { waveSeed } from './Waveform';
import ZoomWaveform from './ZoomWaveform';
import PhaseMeter from './PhaseMeter';
import useLivePosition from '../hooks/useLivePosition';
import useBlink from '../hooks/useBlink';
import { compatible, parseKey } from '../utils/musicKey';
import { useLearnTarget } from '../hooks/useLearningMode';
import LearnView from './LearnView';

// The CDJ-3000X's main player screen: track header, zoomed waveform,
// overview waveform and the time / tempo / BPM strip along the bottom.
export default function TrackDisplay({
  track,
  bpm,
  pitch,
  synced,
  syncOn,
  isMaster,
  isPlaying,
  getPosition,
  getMasterBeatPos,
  memoryCues,
  slipRatio,
  tempoReset,
  autoCue,
  beatJumpCount,
  onSetBeatJumpCount,
  pitchRange,
  masterTempo,
  quantize,
  playerNumber,
  onAir = false,
  endWarning = false,
  displayKey,
  keyShift = 0,
  keySync = false,
  masterKey = null,
  onToggleKeySync,
  onShiftKey,
  onResetKey,
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
  const [keyPanelOpen, setKeyPanelOpen] = useState(false);
  const keyLearn = useLearnTarget(`${idPrefix}display-key`);
  const shownKey = displayKey ?? track.key;
  // Green when it mixes well with the sync master's key.
  const keyA = parseKey(shownKey);
  const keyB = parseKey(masterKey);
  const keyMatches = keyA && keyB ? compatible(keyA, keyB) : false;

  // Live position for the scrolling waveform, phase meter and countdown.
  const position = useLivePosition(getPosition, isPlaying || masterRunning(getMasterBeatPos), elapsed);
  const beat = 60 / (track.bpm || 120);
  const firstBeat = track.firstBeat || 0;
  const beatPos = (position - firstBeat) / beat;
  const masterBeatPos = getMasterBeatPos ? getMasterBeatPos() : null;
  const endWarn = useBlink(endWarning, 400) && endWarning;
  const countdown = beatCountdown(position, memoryCues, beat);
  const loopTimes = loopRange ? { start: loopRange.startRatio * duration, end: loopRange.endRatio * duration } : null;

  return (
    <View style={styles.display}>
      <View style={styles.header}>
        <LearnView
          testID={`${idPrefix}display-player`}
          learnId={`${idPrefix}display-player`}
          style={[styles.playerBadge, onAir && styles.playerBadgeOnAir]}
        >
          <Text style={[styles.playerLabel, onAir && styles.playerTextOnAir]}>{onAir ? 'ON AIR' : 'PLAYER'}</Text>
          <Text style={[styles.playerNumber, onAir && styles.playerTextOnAir]}>{playerNumber}</Text>
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
        <Pressable
          {...keyLearn.props}
          testID={`${idPrefix}display-key`}
          onPress={() => setKeyPanelOpen((o) => !o)}
          style={[styles.keyBox, keyPanelOpen && styles.keyBoxOpen, keyLearn.style]}
        >
          <Text style={styles.metricLabel}>
            KEY{keyShift ? ` ${keyShift > 0 ? '+' : ''}${keyShift}` : ''}
          </Text>
          <Text style={[styles.keyValue, !keyMatches && styles.keyValuePlain]}>{shownKey}</Text>
        </Pressable>
      </View>

      {keyPanelOpen ? (
        <View style={[styles.jumpPanel, styles.keyPanel]} testID={`${idPrefix}key-panel`}>
          <Pressable
            testID={`${idPrefix}key-sync`}
            onPress={onToggleKeySync}
            style={[styles.jumpOption, keySync && styles.jumpOptionOn]}
          >
            <Text style={[styles.jumpOptionText, keySync && styles.jumpOptionTextOn]}>KEY SYNC</Text>
          </Pressable>
          <Pressable testID={`${idPrefix}key-down`} onPress={() => onShiftKey(-1)} style={styles.jumpOption}>
            <Text style={styles.jumpOptionText}>−</Text>
          </Pressable>
          <View style={styles.keyShiftValue}>
            <Text style={styles.jumpOptionText}>
              {keyShift > 0 ? '+' : ''}
              {keyShift}
            </Text>
          </View>
          <Pressable testID={`${idPrefix}key-up`} onPress={() => onShiftKey(1)} style={styles.jumpOption}>
            <Text style={styles.jumpOptionText}>+</Text>
          </Pressable>
          <Pressable testID={`${idPrefix}key-reset`} onPress={onResetKey} style={styles.jumpOption}>
            <Text style={styles.jumpOptionText}>RESET</Text>
          </Pressable>
        </View>
      ) : null}

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
        <ZoomWaveform
          position={position}
          duration={duration}
          bpm={track.bpm}
          firstBeat={firstBeat}
          peaks={track.peaks}
          seed={seed}
          loop={loopTimes}
          hotCues={hotCues}
          memoryCues={memoryCues}
        />
      </LearnView>

      <View style={styles.phaseRow}>
        <LearnView testID={`${idPrefix}phase-meter`} learnId={`${idPrefix}phase-meter`} style={styles.phaseWrap}>
          <PhaseMeter beatPos={beatPos} masterBeatPos={isMaster ? null : masterBeatPos} isMaster={isMaster} />
        </LearnView>
        <LearnView testID={`${idPrefix}beat-countdown`} learnId={`${idPrefix}beat-countdown`} style={styles.countdown}>
          <Text style={styles.countdownValue}>{countdown}</Text>
          <Text style={styles.countdownUnit}>BARS</Text>
        </LearnView>
      </View>

      {/* Touch the overview: needle search while paused, Touch Cue
          (preview that spot) while playing. */}
      <View style={[styles.overview, endWarn && styles.overviewWarn]}>
        <TouchWaveform
          testID={`${idPrefix}overview-waveform`}
          seed={seed}
          peaks={track.peaks}
          height={30}
          barCount={90}
          progressRatio={progressRatio}
          loopRange={loopRange}
          hotCues={hotCues}
          memoryCues={memoryCues}
          slipRatio={slipRatio}
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
          <Text style={[styles.tempoValue, synced && styles.tempoUnlinked]}>
            {pitch > 0 ? '+' : pitch < 0 ? '' : ' '}
            {pitch.toFixed(2)}
            <Text style={styles.unit}>%</Text>
          </Text>
          <View style={styles.badgeRow}>
            <Text style={[styles.badge, masterTempo && styles.badgeOnRed]}>MT</Text>
            <Text style={[styles.badge, quantize && styles.badgeOnRed]}>Q</Text>
            {syncOn ? <Text style={[styles.badge, styles.badgeOnBlue]}>SYNC</Text> : null}
            {tempoReset ? <Text style={[styles.badge, styles.badgeOnGreen]}>RESET</Text> : null}
          </View>
        </LearnView>

        <View style={styles.divider} />

        <LearnView
          testID={`${idPrefix}display-bpm`}
          learnId={`${idPrefix}display-bpm`}
          style={[styles.bpmBlock, isMaster && styles.bpmMaster]}
        >
          <Text style={[styles.metricLabel, isMaster && styles.masterLabel]}>{isMaster ? 'MASTER BPM' : 'BPM'}</Text>
          <Text style={styles.bpmValue}>
            {bpmWhole}
            <Text style={styles.bpmFrac}>.{bpmFrac ?? '00'}</Text>
          </Text>
        </LearnView>
      </View>
    </View>
  );
}

// Is the master deck's position moving? (Then this deck's phase meter must
// keep redrawing even while this deck is paused.)
function masterRunning(getMasterBeatPos) {
  return Boolean(getMasterBeatPos);
}

// Bars and beats to the next memory cue, as the CDJ shows it ("16.4" = 16
// bars and 4 beats). "--.-" when there's no memory cue ahead.
function beatCountdown(position, memoryCues, beat) {
  const next = (memoryCues || []).find((c) => c.time > position + 0.01);
  if (!next) return '--.-';
  const beats = Math.ceil((next.time - position) / beat - 0.001);
  return `${Math.floor(beats / 4)}.${beats % 4}`;
}

// Beat counts as the CDJ shows them: 1/2, 1, 2 … 64.
function formatBeats(count) {
  return count < 1 ? `1/${Math.round(1 / count)}` : String(count);
}

const styles = StyleSheet.create({
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  phaseWrap: {
    flex: 1,
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  countdownValue: {
    color: cdj.screenText,
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  countdownUnit: {
    color: cdj.screenLabel,
    fontSize: 7,
    fontWeight: '800',
  },
  bpmMaster: {
    borderWidth: 1,
    borderColor: cdj.ledOrange,
    borderRadius: 3,
    paddingHorizontal: 4,
  },
  masterLabel: {
    color: cdj.ledOrange,
  },
  tempoUnlinked: {
    color: cdj.screenTextDim,
  },
  badgeOnBlue: {
    color: cdj.ledBlue,
    borderColor: cdj.ledBlue,
  },
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
  playerBadgeOnAir: {
    backgroundColor: cdj.onAir,
    borderColor: cdj.onAir,
  },
  playerTextOnAir: {
    color: '#fff',
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
    paddingHorizontal: 4,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  keyBoxOpen: {
    borderColor: '#cfd6de',
  },
  keyPanel: {
    left: undefined,
    width: 300,
  },
  keyShiftValue: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyValuePlain: {
    color: cdj.screenText,
  },
  keyValue: {
    color: '#7cf27c',
    fontSize: 15,
    fontWeight: '800',
  },
  overviewWarn: {
    backgroundColor: 'rgba(255, 42, 42, 0.35)',
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
