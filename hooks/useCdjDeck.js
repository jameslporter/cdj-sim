import { useEffect, useState } from 'react';
import { BEAT_JUMP_COUNTS, TEMPO_RANGES } from '../constants/theme';
import { DEMO_TRACKS } from '../constants/tracks';
import { clamp } from '../utils/format';

const EMPTY_HOT_CUES = Array(8).fill(null);
const EMPTY_LOOP = { active: false, start: null, end: null };

export default function useCdjDeck() {
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
  const loopRange =
    loop.start != null && loop.end != null
      ? { startRatio: loop.start / duration, endRatio: loop.end / duration }
      : null;

  return {
    track,
    duration,
    isPlaying,
    elapsed,
    pitch,
    pitchRange,
    masterTempo,
    reverse,
    slip,
    vinylMode,
    isJogHeld,
    timeMode,
    hotCues,
    loop,
    beatJumpCount,
    displayedBpm,
    progressRatio,
    loopRange,
    setPitch,
    setTimeMode,
    setIsJogHeld,
    setReverse,
    setSlip,
    setVinylMode,
    setMasterTempo,
    handlePlayPause,
    handleCue,
    handleSeek,
    handleHotCuePress,
    handleHotCueLongPress,
    handleLoopButton,
    handleReloopExit,
    handleCycleBeatCount,
    handleBeatJump,
    handleCycleRange,
    handleChangeTrack,
    resetDeckState,
  };
}
