import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { BEAT_JUMP_COUNTS, TEMPO_RANGES } from '../constants/theme';
import { loadJSON, saveJSON } from '../utils/storage';
import { DEMO_TRACKS } from '../constants/tracks';
import { resolveAudioSource } from '../utils/audioSource';
import { clamp } from '../utils/format';
import useJogEngine from './useJogEngine';
import useTouchPreview from './useTouchPreview';
import useTrackHotCues from './useTrackHotCues';

const EMPTY_LOOP = { active: false, start: null, end: null };
const AUTO_CUE_KEY = 'cdj-sim:auto-cue:v1';
// Peaks are loudness 0–1 relative to the loudest moment; anything under this
// counts as silence for Auto Cue (roughly the CDJ's -36 dB setting).
const AUTO_CUE_THRESHOLD = 0.04;
// |◀◀ goes to the start of the track if you're more than this far in.
const TRACK_RESTART_SECONDS = 1;

// Auto Cue: where a track should park when it loads — just before its first
// sound (from the analysed waveform), else its first beat, else 0:00.
export function autoCueTime(track) {
  const peaks = track?.peaks;
  if (peaks?.length && track.duration > 0) {
    const first = peaks.findIndex((p) => p >= AUTO_CUE_THRESHOLD);
    if (first > 0) return Math.max(0, (first / peaks.length) * track.duration - 0.02);
  }
  return track?.firstBeat || 0;
}

// BEAT SYNC: the multiple of the master's BPM (half, same or double) that
// needs the smallest tempo change, like the CDJ's automatic half/double sync.
function syncMultiple(masterBpm, trackBpm) {
  return [0.5, 1, 2].reduce((best, m) =>
    Math.abs((masterBpm * m) / trackBpm - 1) < Math.abs((masterBpm * best) / trackBpm - 1) ? m : best
  );
}

// Phase error (in beats, -0.5…0.5) between two beat positions.
function phaseError(target, current) {
  const d = (target - current) % 1;
  return d >= 0.5 ? d - 1 : d < -0.5 ? d + 1 : d;
}

// How far out of phase a synced deck may drift before it's pulled back.
const SYNC_TOLERANCE_BEATS = 0.04;

/**
 * One CDJ.
 *  - `tracks` is the list TRACK SEARCH (|◀◀ / ▶▶|) steps through.
 *  - `syncBpm`: the master deck's BPM while BEAT SYNC follows it, else null.
 *  - `getMasterBeatPos()`: the master deck's live beat position, for phase.
 */
export default function useCdjDeck({ tracks = DEMO_TRACKS, syncBpm = null, getMasterBeatPos = null } = {}) {
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
  const [beatJumpCount, setBeatJumpCount] = useState(16);
  const [autoCue, setAutoCue] = useState(true);
  const [tempoReset, setTempoReset] = useState(false);
  // DELETE held: the next HOT CUE pad pressed deletes that cue.
  const [deleteHeld, setDeleteHeld] = useState(false);
  const deleteUsedRef = useRef(false);
  const deleteLatchedRef = useRef(false);
  // CUE held while paused (Cue Point Sampler): { time, keepPlaying }.
  const cueHoldRef = useRef(null);
  // A seek (and maybe play) waiting for a newly loaded track's player.
  const [pendingStart, setPendingStart] = useState(null);
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
  // BEAT SYNC overrides the fader (it's "unlinked" until sync is off), and
  // TEMPO RESET plays at the original speed whatever the fader says.
  const synced = syncBpm != null && track.bpm > 0;
  const syncMult = synced ? syncMultiple(syncBpm, track.bpm) : 1;
  const effectivePitch = synced ? ((syncBpm * syncMult) / track.bpm - 1) * 100 : tempoReset ? 0 : pitch;
  const audioRate = 1 + effectivePitch / 100;

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

  // Live position in track seconds (the player's own clock, or the jog's).
  const getPosition = jog.getPosition;
  // Live position in beats from the first beat on the grid (beat 0 = a bar's
  // first beat).
  const getBeatPos = () => (getPosition() - (track.firstBeat || 0)) / beatDuration;

  // Where `t` would need to be for this deck's beats to line up with the
  // master's (BEAT SYNC). Returns `t` when there's nothing to sync to.
  const phaseAlignedTime = (t) => {
    if (!synced || !getMasterBeatPos) return t;
    const master = getMasterBeatPos();
    if (master == null) return t;
    const ours = (t - (track.firstBeat || 0)) / beatDuration;
    return clamp(t + phaseError(master * syncMult, ours) * beatDuration, 0, duration);
  };

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

  // Auto Cue survives a restart, like the real deck's setting.
  useEffect(() => {
    loadJSON(AUTO_CUE_KEY, true).then((v) => setAutoCue(v !== false));
  }, []);
  const toggleAutoCue = () =>
    setAutoCue((v) => {
      saveJSON(AUTO_CUE_KEY, !v);
      return !v;
    });

  // A new track gets a new player: once it has loaded, park it at the cue
  // point (and start it, for TRACK SEARCH while playing).
  useEffect(() => {
    if (!pendingStart || pendingStart.source !== audioSource || !status.isLoaded) return;
    if (pendingStart.time > 0) player.seekTo(pendingStart.time).catch(() => {});
    if (pendingStart.play) setIsPlaying(true);
    setPendingStart(null);
  }, [pendingStart, audioSource, status.isLoaded, player]);

  // Tempo fader / master tempo -> real playback rate + pitch-correction.
  useEffect(() => {
    player.shouldCorrectPitch = masterTempo;
    player.setPlaybackRate(audioRate);
  }, [audioRate, masterTempo, player]);

  // BEAT SYNC keeps the beats locked: if the deck drifts out of phase (a
  // jog nudge, a seek, audio clock wobble) it's pulled back in. A seek takes
  // the player a moment to resume, so it lands a little behind; the deck
  // learns that delay and seeks that much further ahead next time.
  const seekLeadRef = useRef(0);
  const syncRef = useRef(null);
  syncRef.current = { phaseAlignedTime, getPosition, beatDuration, player };
  useEffect(() => {
    if (!synced || !isPlaying || jog.scratching) return undefined;
    const id = setInterval(() => {
      const { phaseAlignedTime: align, getPosition: pos, beatDuration: beat, player: p } = syncRef.current;
      const now = pos();
      const error = align(now) - now;
      if (Math.abs(error) <= SYNC_TOLERANCE_BEATS * beat) return;
      // Still behind after the last correction: lead by more next time.
      seekLeadRef.current = clamp(seekLeadRef.current + error * 0.8, 0, 0.3);
      p.seekTo(now + error + seekLeadRef.current).catch(() => {});
    }, 1000);
    return () => clearInterval(id);
  }, [synced, isPlaying, jog.scratching]);

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
    // Pressing PLAY while a gate cue or CUE is held keeps the track playing
    // after the pad or CUE is released.
    if (gateRef.current) {
      gateRef.current.keepPlaying = true;
      return;
    }
    if (cueHoldRef.current) {
      cueHoldRef.current.keepPlaying = true;
      return;
    }
    // A synced deck starts in phase with the master.
    if (!isPlaying && synced) {
      const aligned = phaseAlignedTime(getPosition());
      player.seekTo(aligned).catch(() => {});
      setPhantomElapsed(aligned);
    }
    // Pausing leaves the cue point where it is, as on the real deck.
    setIsPlaying((prev) => {
      if (!prev && elapsed >= duration) {
        player.seekTo(0).catch(() => {});
        setPhantomElapsed(0);
      }
      return !prev;
    });
  };

  const seekTo = (time) => {
    player.seekTo(time).catch(() => {});
    setPhantomElapsed(time);
  };

  // Paused at (or within a frame of) the cue point?
  const atCue = !isPlaying && Math.abs(elapsed - cuePoint) < 0.05;

  // CUE, pressed:
  //  - while playing: back cue — jump to the cue point and pause.
  //  - while paused somewhere new: set the cue point here.
  //  - while paused: and keep holding to play from the cue (Cue Point
  //    Sampler); letting go returns to the cue, unless PLAY was pressed.
  const handleCuePressIn = () => {
    jog.cancel();
    cueHoldRef.current = null;
    if (isPlaying) {
      setIsPlaying(false);
      seekTo(cuePoint);
      return;
    }
    let point = cuePoint;
    if (Math.abs(elapsed - cuePoint) >= 0.05) {
      point = clamp(elapsed, 0, duration);
      setCuePoint(point);
    }
    seekTo(point);
    cueHoldRef.current = { time: point, keepPlaying: false };
    setIsPlaying(true);
  };

  const handleCuePressOut = () => {
    const hold = cueHoldRef.current;
    cueHoldRef.current = null;
    if (!hold || hold.keepPlaying) return;
    setIsPlaying(false);
    seekTo(hold.time);
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
    // Holding DELETE (CALL/DELETE on the real deck) and pressing a pad
    // deletes that hot cue.
    if (deleteHeld) {
      setHotCues((prev) => {
        const next = [...prev];
        next[i] = null;
        return next;
      });
      deleteUsedRef.current = true;
      padHandledRef.current = true;
      if (deleteLatchedRef.current) {
        deleteLatchedRef.current = false;
        setDeleteHeld(false);
      }
      return;
    }
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

  // DELETE: held, it turns the hot cue pads into delete buttons. Pressed on
  // its own, it deletes the memory cue last called.
  const handleDeletePressIn = () => {
    deleteUsedRef.current = false;
    setDeleteHeld(true);
  };
  const handleDeletePressOut = () => {
    setDeleteHeld(false);
    if (!deleteUsedRef.current) handleMemoryDelete();
  };
  // A mouse can't hold DELETE and click a pad, so a click latches DELETE
  // until the next pad click. A second click on DELETE deletes the memory cue.
  const handleDeleteClick = () => {
    if (!deleteHeld) {
      deleteUsedRef.current = false;
      deleteLatchedRef.current = true;
      setDeleteHeld(true);
      return;
    }
    deleteLatchedRef.current = false;
    setDeleteHeld(false);
    handleMemoryDelete();
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

  // LOOP IN/CUE also sets the cue point, so it's how you set a cue on the
  // fly while playing.
  const handleLoopIn = () => {
    const start = quantizeTime(elapsed);
    if (!isPlaying) seekTo(start);
    setCuePoint(start);
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

  const handleSetBeatJumpCount = (count) => {
    if (BEAT_JUMP_COUNTS.includes(count)) setBeatJumpCount(count);
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

  // Load a track object from the library onto this deck. With Auto Cue on
  // it parks just before the first sound; `at` starts somewhere else instead
  // (INST DOUBLES), and `play` starts it playing.
  const handleLoadTrack = async (nextTrack, { play = false, at = null } = {}) => {
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
    cueHoldRef.current = null;
    const cue = autoCue ? autoCueTime(nextTrack) : 0;
    const start = at ?? cue;
    setPhantomElapsed(start);
    setCuePoint(cue);
    setPendingStart({ source, time: start, play });
    setLoop(EMPTY_LOOP);
    setMemoryCues([]);
    setMemoryCueIndex(-1);
  };

  // TRACK SEARCH: |◀◀ first goes back to the start of this track, then to
  // the previous one. A track loaded while playing starts playing.
  const handleChangeTrack = (direction) => {
    if (direction < 0 && elapsed > TRACK_RESTART_SECONDS) {
      seekTo(0);
      return;
    }
    if (tracks.length === 0) return;
    const current = tracks.findIndex((t) => t.id === track.id);
    const next = current < 0 ? 0 : (current + direction + tracks.length) % tracks.length;
    handleLoadTrack(tracks[next], { play: isPlaying });
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
    effectivePitch,
    synced,
    getPosition,
    getBeatPos,
    alignToMaster: () => {
      const aligned = phaseAlignedTime(getPosition());
      player.seekTo(aligned).catch(() => {});
      setPhantomElapsed(aligned);
    },
    tempoReset,
    autoCue,
    cuePoint,
    atCue,
    deleteHeld,
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
    toggleAutoCue,
    toggleTempoReset: () => setTempoReset((r) => !r),
    setVolume,
    handlePlayPause,
    handleCuePressIn,
    handleCuePressOut,
    handleDeletePressIn,
    handleDeletePressOut,
    handleDeleteClick,
    handleSeek,
    handleNeedleSearch,
    handleHotCuePressIn,
    handleHotCuePressOut,
    handleHotCuePress,
    handleLoopButton,
    handleLoopIn,
    handleLoopOut,
    handleReloopExit,
    handleSetBeatJumpCount,
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
