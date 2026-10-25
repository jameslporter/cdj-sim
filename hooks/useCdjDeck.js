import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { BEAT_JUMP_COUNTS, TEMPO_RANGES } from '../constants/theme';
import { DEMO_TRACKS } from '../constants/tracks';
import { resolveAudioSource } from '../utils/audioSource';
import { clamp } from '../utils/format';
import useJogEngine from './useJogEngine';
import useTouchPreview from './useTouchPreview';
import useTrackHotCues from './useTrackHotCues';

const EMPTY_LOOP = { active: false, start: null, end: null };

// `tracks` is the list TRACK SEARCH (|◀◀ / ▶▶|) steps through.
export default function useCdjDeck({ tracks = DEMO_TRACKS } = {}) {
  const [track, setTrack] = useState(DEMO_TRACKS[0]);
  const [audioSource, setAudioSource] = useState(DEMO_TRACKS[0].file);
  const [loadError, setLoadError] = useState(null);
  const loadSeq = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phantomElapsed, setPhantomElapsed] = useState(0);
  const [cuePoint, setCuePoint] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [pitchRange, setPitchRange] = useState(6);
  const [masterTempo, setMasterTempo] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [slip, setSlip] = useState(false);
  const [vinylMode, setVinylMode] = useState(true);
  const [vinylSpeedAdjust, setVinylSpeedAdjust] = useState(0.3);
  const [jogAdjust, setJogAdjust] = useState(0.5);
  const [timeMode, setTimeMode] = useState('ELAPSED');
  const [loop, setLoop] = useState(EMPTY_LOOP);
  const [beatJumpCount, setBeatJumpCount] = useState(4);
  const [quantize, setQuantize] = useState(true);
  const [memoryCues, setMemoryCues] = useState([]);
  const [memoryCueIndex, setMemoryCueIndex] = useState(-1);
  const [gateCue, setGateCue] = useState(false);
  // The hot cue pad currently held for gate playback: { index, time, keepPlaying }.
  const gateRef = useRef(null);
  // Set on press-in when the pad press was already handled (gate playback
  // or Preview Hot Cue), so the click that follows doesn't act again.
  const padHandledRef = useRef(false);
  const preview = useTouchPreview();

  // Hot cues live with the track (like rekordbox stores them on the USB),
  // so they come back whenever the track is loaded, on either deck.
  const trackHotCues = useTrackHotCues();
  const hotCues = trackHotCues.get(track.id);
  const setHotCues = (update) => trackHotCues.set(track.id, update);

  const player = useAudioPlayer(audioSource);
  const status = useAudioPlayerStatus(player);

  const duration = (status.isLoaded && status.duration) || track.duration || 1;
  const audioRate = 1 + pitch / 100;

  // Loading a track creates a new player, so remember the mixer's volume and
  // re-apply it to each new one (and to the jog's scratch audio).
  const volumeRef = useRef(1);

  const jog = useJogEngine({ player, track, duration, isPlaying, audioRate, vinylMode, vinylSpeedAdjust, volumeRef });
  // While the jog is driving the audio, the position comes from the platter.
  const elapsed = jog.position ?? status.currentTime ?? 0;
  const isJogHeld = jog.scratching;
  const rate = audioRate * (reverse ? -1 : 1);
  const displayedBpm = track.bpm * audioRate;
  // Positions are in track time (the file's own seconds), so one beat is
  // 60 / the track's original BPM no matter where the tempo fader sits.
  const beatDuration = 60 / track.bpm;
  const shouldPlay = isPlaying && !jog.scratching;

  // Snap to a track's beat grid (by default the loaded track's).
  const quantizeTime = (t, forTrack = track) => {
    if (!quantize || !forTrack.bpm) return t;
    const beat = 60 / forTrack.bpm;
    const first = forTrack.firstBeat || 0;
    return Math.max(0, Math.round((t - first) / beat) * beat + first);
  };

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
    jog.cancel();
    setIsPlaying(false);
    player.seekTo(0).catch(() => {});
    setPhantomElapsed(0);
    setCuePoint(0);
    setLoop(EMPTY_LOOP);
  };

  const handlePlayPause = () => {
    // Pressing PLAY while a gate cue is held keeps the track playing after
    // the pad is released.
    if (gateRef.current) {
      gateRef.current.keepPlaying = true;
      return;
    }
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
    jog.cancel();
    setIsPlaying(false);
    player.seekTo(cuePoint).catch(() => {});
    setPhantomElapsed(cuePoint);
  };

  const handleSeek = (deltaSeconds) => {
    const next = clamp(elapsed + deltaSeconds, 0, duration);
    player.seekTo(next).catch(() => {});
    setPhantomElapsed(next);
  };

  // Needle search: touching the overview waveform while paused jumps there.
  const handleNeedleSearch = (time) => {
    const next = clamp(time, 0, duration);
    player.seekTo(next).catch(() => {});
    setPhantomElapsed(next);
  };

  // Hot cue pads fire on press-in first. Two 3000X features act here:
  //  - Preview Hot Cue: while a waveform is being touched to preview a
  //    track, the pad stores a hot cue on *that* track at the preview spot.
  //  - Gate Cue: while paused, the track plays from the cue only for as long
  //    as the pad is held.
  const handleHotCuePressIn = (i) => {
    padHandledRef.current = false;
    if (preview.active && preview.track) {
      const target = preview.track;
      const time = quantizeTime(preview.currentTime(), target);
      trackHotCues.set(target.id, (prev) => {
        const next = [...prev];
        next[i] = { time };
        return next;
      });
      padHandledRef.current = true;
      return;
    }
    const cue = hotCues[i];
    if (gateCue && cue && !isPlaying) {
      player.seekTo(cue.time).catch(() => {});
      setPhantomElapsed(cue.time);
      setIsPlaying(true);
      gateRef.current = { index: i, time: cue.time, keepPlaying: false };
      padHandledRef.current = true;
    }
  };

  const handleHotCuePressOut = (i) => {
    const gate = gateRef.current;
    if (!gate || gate.index !== i) return;
    gateRef.current = null;
    if (!gate.keepPlaying) {
      setIsPlaying(false);
      player.seekTo(gate.time).catch(() => {});
      setPhantomElapsed(gate.time);
    }
  };

  const handleHotCuePress = (i) => {
    if (padHandledRef.current) {
      padHandledRef.current = false;
      return;
    }
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
    // A long hold during gate playback or a preview isn't a delete.
    if (padHandledRef.current) return;
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

  // Load a track object from the library onto this deck.
  const handleLoadTrack = async (nextTrack) => {
    if (!nextTrack) return;
    preview.stop();
    gateRef.current = null;
    const seq = ++loadSeq.current;
    let source;
    try {
      source = await resolveAudioSource(nextTrack);
    } catch (err) {
      if (seq === loadSeq.current) setLoadError(String(err?.message || err));
      return;
    }
    if (seq !== loadSeq.current) return; // a newer load won
    jog.cancel();
    setLoadError(null);
    setTrack(nextTrack);
    setAudioSource(source);
    setIsPlaying(false);
    setPhantomElapsed(0);
    setCuePoint(0);
    setLoop(EMPTY_LOOP);
    setMemoryCues([]);
    setMemoryCueIndex(-1);
  };

  const handleChangeTrack = (direction) => {
    if (tracks.length === 0) return;
    const current = tracks.findIndex((t) => t.id === track.id);
    const next = current < 0 ? 0 : (current + direction + tracks.length) % tracks.length;
    handleLoadTrack(tracks[next]);
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

  useEffect(() => {
    player.volume = volumeRef.current;
  }, [player]);

  const setVolume = (v) => {
    volumeRef.current = clamp(v, 0, 1);
    player.volume = volumeRef.current;
  };

  const progressRatio = elapsed / duration;
  const loopRange =
    loop.start != null && loop.end != null
      ? { startRatio: loop.start / duration, endRatio: loop.end / duration }
      : null;

  return {
    track,
    loadError,
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
    vinylSpeedAdjust,
    jogAdjust,
    jog,
    timeMode,
    hotCues,
    loop,
    beatJumpCount,
    quantize,
    memoryCues,
    memoryCueIndex,
    gateCue,
    preview,
    displayedBpm,
    progressRatio,
    loopRange,
    setPitch,
    setTimeMode,
    setVinylSpeedAdjust,
    setJogAdjust,
    setReverse,
    setSlip,
    setVinylMode,
    setMasterTempo,
    setQuantize,
    setGateCue,
    setVolume,
    handlePlayPause,
    handleCue,
    handleSeek,
    handleNeedleSearch,
    handleHotCuePressIn,
    handleHotCuePressOut,
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
