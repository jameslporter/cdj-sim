import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { BEAT_JUMP_COUNTS, TEMPO_RANGES } from '../constants/theme';
import { DEMO_TRACKS } from '../constants/tracks';
import { clamp } from '../utils/format';

const EMPTY_HOT_CUES = Array(8).fill(null);
const EMPTY_LOOP = { active: false, start: null, end: null };

export default function useCdjDeck() {
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
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
  const [quantize, setQuantize] = useState(true);
  const [memoryCues, setMemoryCues] = useState([]);
  const [memoryCueIndex, setMemoryCueIndex] = useState(-1);

  const track = DEMO_TRACKS[trackIndex];
  const player = useAudioPlayer(track.file);
  const status = useAudioPlayerStatus(player);

  const elapsed = status.currentTime ?? 0;
  const duration = (status.isLoaded && status.duration) || track.duration;
  const audioRate = 1 + pitch / 100;
  const rate = audioRate * (reverse ? -1 : 1);
  const displayedBpm = track.bpm * audioRate;
  const beatDuration = 60 / displayedBpm;
  const shouldPlay = isPlaying && !isJogHeld;

  const quantizeTime = (t) => (quantize ? Math.round(t / beatDuration) * beatDuration : t);

  // Transport: actually start/stop the audio.
  useEffect(() => {
    if (shouldPlay) player.play();
    else player.pause();
  }, [shouldPlay, player]);

  // Tempo fader / master tempo -> real playback rate + pitch-correction.
  useEffect(() => {
    player.shouldCorrectPitch = masterTempo;
    player.setPlaybackRate(audioRate);
  }, [audioRate, masterTempo, player]);

  // Loop-window watch: seek back to the loop start once playback reaches loop end.
  // (Real audio can't play backward, so this only handles the forward case —
  // reverse + loop together only affects the phantom/visual math, not audible playback.)
  useEffect(() => {
    if (!loop.active || loop.start == null || loop.end == null) return;
    if (elapsed >= loop.end) {
      player.seekTo(loop.start).catch(() => {});
    }
  }, [elapsed, loop, player]);

  // Detect natural end-of-track (the player stops itself; sync our isPlaying state).
  useEffect(() => {
    if (isPlaying && !status.playing && duration > 0 && elapsed >= duration - 0.15) {
      setIsPlaying(false);
    }
  }, [isPlaying, status.playing, elapsed, duration]);

  // Phantom clock for SLIP mode: a virtual, uninterrupted timeline that keeps
  // advancing regardless of seeks/loops, so slip can restore "where you'd be".
  useEffect(() => {
    if (!isPlaying) return undefined;
    const id = setInterval(() => {
      setPhantomElapsed((prev) => clamp(prev + 0.1 * rate, 0, duration));
    }, 100);
    return () => clearInterval(id);
  }, [isPlaying, rate, duration]);

  const resetDeckState = () => {
    setIsPlaying(false);
    player.seekTo(0).catch(() => {});
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
        player.seekTo(0).catch(() => {});
        setPhantomElapsed(0);
      }
      return !prev;
    });
  };

  const handleCue = () => {
    setIsPlaying(false);
    player.seekTo(cuePoint).catch(() => {});
    setPhantomElapsed(cuePoint);
  };

  const handleSeek = (deltaSeconds) => {
    const next = clamp(elapsed + deltaSeconds, 0, duration);
    player.seekTo(next).catch(() => {});
    setPhantomElapsed(next);
  };

  const handleHotCuePress = (i) => {
    const cue = hotCues[i];
    if (cue) {
      if (slip) return;
      player.seekTo(cue.time).catch(() => {});
      setPhantomElapsed(cue.time);
      setIsPlaying(true);
    } else {
      const next = [...hotCues];
      next[i] = { time: quantizeTime(elapsed) };
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
        const start = quantizeTime(elapsed);
        const end = clamp(start + size * beatDuration, start, duration);
        return { active: true, start, end };
      }
      const len = prev.end - prev.start;
      const newLen =
        size === 4 ? Math.max(beatDuration / 4, len / 2) : Math.min(duration - prev.start, len * 2);
      return { ...prev, end: prev.start + newLen };
    });
  };

  const handleLoopIn = () => {
    const start = quantizeTime(elapsed);
    player.seekTo(start).catch(() => {});
    setLoop({ active: false, start, end: null });
  };

  const handleLoopOut = () => {
    setLoop((prev) => {
      if (prev.start == null || elapsed <= prev.start) return prev;
      return { active: true, start: prev.start, end: quantizeTime(elapsed) };
    });
  };

  const handleReloopExit = () => {
    setLoop((prev) => {
      if (prev.active) {
        if (slip) {
          player.seekTo(phantomElapsed).catch(() => {});
        }
        return { ...prev, active: false };
      }
      if (prev.start != null) {
        player.seekTo(prev.start).catch(() => {});
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
    const next = clamp(elapsed + delta, 0, duration);
    player.seekTo(next).catch(() => {});
    setPhantomElapsed(next);
  };

  const handleCycleRange = () => {
    setPitchRange((r) => {
      const nextRange = TEMPO_RANGES[(TEMPO_RANGES.indexOf(r) + 1) % TEMPO_RANGES.length];
      setPitch((p) => clamp(p, -nextRange, nextRange));
      return nextRange;
    });
  };

  const handleLoadTrack = (index) => {
    setTrackIndex(index);
    setIsPlaying(false);
    setPhantomElapsed(0);
    setCuePoint(0);
    setHotCues(EMPTY_HOT_CUES);
    setLoop(EMPTY_LOOP);
    setMemoryCues([]);
    setMemoryCueIndex(-1);
  };

  const handleChangeTrack = (direction) => {
    handleLoadTrack((trackIndex + direction + DEMO_TRACKS.length) % DEMO_TRACKS.length);
  };

  // MEMORY / CUE·LOOP CALL / DELETE: a second, separate cue-point system from
  // the 8 Hot Cue pads — memory cues are auto-numbered in track order and
  // stepped through with CUE/LOOP CALL rather than pressed directly.
  const handleMemorySave = () => {
    const time = quantizeTime(elapsed);
    setMemoryCues((prev) => {
      const next = [...prev, { time }].sort((a, b) => a.time - b.time);
      setMemoryCueIndex(next.findIndex((c) => c.time === time));
      return next;
    });
  };

  const handleMemoryCall = (dir) => {
    if (memoryCues.length === 0) return;
    const nextIndex = clamp(memoryCueIndex + dir, 0, memoryCues.length - 1);
    setMemoryCueIndex(nextIndex);
    player.seekTo(memoryCues[nextIndex].time).catch(() => {});
    setPhantomElapsed(memoryCues[nextIndex].time);
  };

  const handleMemoryDelete = () => {
    if (memoryCueIndex < 0) return;
    setMemoryCues((prev) => prev.filter((_, i) => i !== memoryCueIndex));
    setMemoryCueIndex((i) => clamp(i - 1, -1, memoryCues.length - 2));
  };

  const setVolume = (v) => {
    player.volume = clamp(v, 0, 1);
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
    quantize,
    memoryCues,
    memoryCueIndex,
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
    setQuantize,
    setVolume,
    handlePlayPause,
    handleCue,
    handleSeek,
    handleHotCuePress,
    handleHotCueLongPress,
    handleLoopButton,
    handleLoopIn,
    handleLoopOut,
    handleReloopExit,
    handleCycleBeatCount,
    handleBeatJump,
    handleCycleRange,
    handleChangeTrack,
    handleLoadTrack,
    handleMemorySave,
    handleMemoryCall,
    handleMemoryDelete,
    resetDeckState,
  };
}
