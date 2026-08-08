import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BeatJumpControls from '../components/BeatJumpControls';
import BrowseRotary from '../components/BrowseRotary';
import DeckModeControls from '../components/DeckModeControls';
import HotCueBar from '../components/HotCueBar';
import JogWheel from '../components/JogWheel';
import LoopControls from '../components/LoopControls';
import TempoControls from '../components/TempoControls';
import TrackDisplay from '../components/TrackDisplay';
import TransportControls from '../components/TransportControls';
import { BEAT_JUMP_COUNTS, TEMPO_RANGES, colors } from '../constants/theme';
import { DEMO_TRACKS } from '../constants/tracks';
import { clamp } from '../utils/format';

const EMPTY_HOT_CUES = Array(8).fill(null);
const EMPTY_LOOP = { active: false, start: null, end: null };

export default function CdjSimulator() {
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [phantomElapsed, setPhantomElapsed] = useState(0);
  const [cuePoint, setCuePoint] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [pitchRange, setPitchRange] = useState(6);
  const [masterTempo, setMasterTempo] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [slip, setSlip] = useState(false);
  const [vinylMode, setVinylMode] = useState(true);
  const [isJogHeld, setIsJogHeld] = useState(false);
  const [timeMode, setTimeMode] = useState('ELAPSED');
  const [hotCues, setHotCues] = useState(EMPTY_HOT_CUES);
  const [loop, setLoop] = useState(EMPTY_LOOP);
  const [beatJumpCount, setBeatJumpCount] = useState(4);

  const track = DEMO_TRACKS[trackIndex];
  const duration = track.duration;
  const rate = (1 + pitch / 100) * (reverse ? -1 : 1);
  const displayedBpm = track.bpm * (1 + pitch / 100);
  const beatDuration = 60 / displayedBpm;

  useEffect(() => {
    if (!isPlaying) return undefined;
    const id = setInterval(() => {
      setElapsed((prev) => {
        if (isJogHeld) return prev;
        let next = prev + 0.1 * rate;
        if (loop.active && loop.start != null && loop.end != null) {
          const len = loop.end - loop.start;
          if (len > 0) {
            if (rate >= 0 && next >= loop.end) {
              next = loop.start + ((next - loop.end) % len);
            } else if (rate < 0 && next <= loop.start) {
              next = loop.end - ((loop.start - next) % len);
            }
          }
        }
        if (next >= duration) {
          setIsPlaying(false);
          return duration;
        }
        if (next <= 0) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [isPlaying, rate, loop, isJogHeld, duration]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const id = setInterval(() => {
      setPhantomElapsed((prev) => clamp(prev + 0.1 * rate, 0, duration));
    }, 100);
    return () => clearInterval(id);
  }, [isPlaying, rate, duration]);

  const resetDeckState = () => {
    setIsPlaying(false);
    setElapsed(0);
    setPhantomElapsed(0);
    setCuePoint(0);
    setHotCues(EMPTY_HOT_CUES);
    setLoop(EMPTY_LOOP);
  };

  const handlePlayPause = () => {
    setIsPlaying((prev) => {
      if (prev) {
        setCuePoint(elapsed);
      } else if (elapsed >= duration) {
        setElapsed(0);
        setPhantomElapsed(0);
      }
      return !prev;
    });
  };

  const handleCue = () => {
    setIsPlaying(false);
    setElapsed(cuePoint);
    setPhantomElapsed(cuePoint);
  };

  const handleSeek = (deltaSeconds) => {
    setElapsed((prev) => clamp(prev + deltaSeconds, 0, duration));
    setPhantomElapsed((prev) => clamp(prev + deltaSeconds, 0, duration));
  };

  const handleHotCuePress = (i) => {
    const cue = hotCues[i];
    if (cue) {
      if (slip) return;
      setElapsed(cue.time);
      setPhantomElapsed(cue.time);
      setIsPlaying(true);
    } else {
      const next = [...hotCues];
      next[i] = { time: elapsed };
      setHotCues(next);
    }
  };

  const handleHotCueLongPress = (i) => {
    const next = [...hotCues];
    next[i] = null;
    setHotCues(next);
  };

  const handleLoopButton = (size) => {
    setLoop((prev) => {
      if (!prev.active) {
        const start = elapsed;
        const end = clamp(start + size * beatDuration, start, duration);
        return { active: true, start, end };
      }
      const len = prev.end - prev.start;
      const newLen =
        size === 4 ? Math.max(beatDuration / 4, len / 2) : Math.min(duration - prev.start, len * 2);
      return { ...prev, end: prev.start + newLen };
    });
  };

  const handleReloopExit = () => {
    setLoop((prev) => {
      if (prev.active) {
        if (slip) {
          setElapsed(phantomElapsed);
        }
        return { ...prev, active: false };
      }
      if (prev.start != null) {
        setElapsed(prev.start);
        setPhantomElapsed(prev.start);
        return { ...prev, active: true };
      }
      return prev;
    });
  };

  const handleCycleBeatCount = () => {
    setBeatJumpCount((c) => BEAT_JUMP_COUNTS[(BEAT_JUMP_COUNTS.indexOf(c) + 1) % BEAT_JUMP_COUNTS.length]);
  };

  const handleBeatJump = (dir) => {
    const delta = dir * beatJumpCount * beatDuration;
    setElapsed((prev) => clamp(prev + delta, 0, duration));
    setPhantomElapsed((prev) => clamp(prev + delta, 0, duration));
  };

  const handleCycleRange = () => {
    setPitchRange((r) => {
      const nextRange = TEMPO_RANGES[(TEMPO_RANGES.indexOf(r) + 1) % TEMPO_RANGES.length];
      setPitch((p) => clamp(p, -nextRange, nextRange));
      return nextRange;
    });
  };

  const handleChangeTrack = (direction) => {
    setTrackIndex((i) => (i + direction + DEMO_TRACKS.length) % DEMO_TRACKS.length);
    resetDeckState();
  };

  const progressRatio = elapsed / duration;
  const loopRangeProp =
    loop.start != null && loop.end != null
      ? { startRatio: loop.start / duration, endRatio: loop.end / duration }
      : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.deckLabel}>DECK A</Text>
          <BrowseRotary
            track={track}
            onPrev={() => handleChangeTrack(-1)}
            onNext={() => handleChangeTrack(1)}
            onLoad={resetDeckState}
          />
          <Text style={styles.modelLabel}>CDJ-3000</Text>
        </View>

        <TrackDisplay
          track={track}
          bpm={displayedBpm.toFixed(2)}
          pitch={pitch}
          elapsed={elapsed}
          duration={duration}
          timeMode={timeMode}
          onToggleTimeMode={() => setTimeMode((m) => (m === 'ELAPSED' ? 'REMAIN' : 'ELAPSED'))}
          progressRatio={progressRatio}
          loopRange={loopRangeProp}
        />

        <HotCueBar cues={hotCues} onPress={handleHotCuePress} onLongPress={handleHotCueLongPress} />

        <View style={styles.secondaryRow}>
          <LoopControls
            active={loop.active}
            hasLoop={loop.start != null}
            onFourBeat={() => handleLoopButton(4)}
            onEightBeat={() => handleLoopButton(8)}
            onReloopExit={handleReloopExit}
          />
          <BeatJumpControls
            beatCount={beatJumpCount}
            onCycleCount={handleCycleBeatCount}
            onBack={() => handleBeatJump(-1)}
            onForward={() => handleBeatJump(1)}
          />
        </View>

        <View style={styles.mainRow}>
          <View style={styles.jogSection}>
            <JogWheel
              isPlaying={isPlaying}
              pitch={pitch}
              reverse={reverse}
              vinylMode={vinylMode}
              held={isJogHeld}
              onHoldChange={setIsJogHeld}
            />
            <DeckModeControls
              reverse={reverse}
              slip={slip}
              vinylMode={vinylMode}
              onToggleReverse={() => setReverse((r) => !r)}
              onToggleSlip={() => setSlip((s) => !s)}
              onToggleVinylMode={() => setVinylMode((v) => !v)}
            />
            <TransportControls
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              onCue={handleCue}
              onSeek={handleSeek}
            />
          </View>

          <TempoControls
            pitch={pitch}
            range={pitchRange}
            masterTempo={masterTempo}
            onPitchChange={setPitch}
            onCycleRange={handleCycleRange}
            onToggleMasterTempo={() => setMasterTempo((m) => !m)}
            onReset={() => setPitch(0)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  container: {
    padding: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deckLabel: {
    color: '#e8e8e8',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  modelLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 4,
  },
  jogSection: {
    alignItems: 'center',
    gap: 18,
  },
});
