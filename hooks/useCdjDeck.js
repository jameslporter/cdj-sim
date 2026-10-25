import { useEffect, useRef, useState } from 'react';
import { BEAT_JUMP_COUNTS, TEMPO_RANGES } from '../constants/theme';
import { loadJSON, saveJSON } from '../utils/storage';
import { DEMO_TRACKS } from '../constants/tracks';
import { resolveAudioSource } from '../utils/audioSource';
import { clamp } from '../utils/format';
import useDeckPlayer from './useDeckPlayer';
import useJogEngine from './useJogEngine';
import { getMixerEngine } from '../utils/mixerEngine';
import useTouchPreview from './useTouchPreview';
import useTrackHotCues from './useTrackHotCues';
import useTrackMemoryCues, { getTrackMemoryCues } from './useTrackMemoryCues';
import { keySyncShift, parseKey, shiftKeyText } from '../utils/musicKey';
import { useWaveformDetail } from '../utils/waveformDetail';
import { DEFAULT_SETTINGS, quantizeBeats } from '../constants/utilitySettings';

const EMPTY_LOOP = { active: false, start: null, end: null };
const AUTO_CUE_KEY = 'cdj-sim:auto-cue:v1';
// Peaks are loudness 0–1 relative to the loudest moment; anything under this
// counts as silence for Auto Cue (roughly the CDJ's -36 dB setting).
const AUTO_CUE_THRESHOLD = 0.04;
// |◀◀ goes to the start of the track if you're more than this far in.
const TRACK_RESTART_SECONDS = 1;

// Auto Cue: where a track should park when it loads. Like the CDJ's default
// AUTO CUE LEVEL (MEMORY), that's its first memory cue if it has one, else
// just before its first sound (from the analysed waveform), else its first
// beat, else 0:00.
//
// UTILITY's AUTO CUE LEVEL can instead ask for the first sound louder than a
// level (-36 to -78 dB), ignoring memory cues.
export function autoCueTime(track, memoryCues = [], level = 'MEMORY') {
  const db = parseInt(level, 10);
  const byLevel = Number.isFinite(db);
  if (!byLevel && memoryCues.length) return memoryCues[0].time;
  // The peaks are relative loudness, calibrated so -36 dB ≈ AUTO_CUE_THRESHOLD.
  const threshold = byLevel ? AUTO_CUE_THRESHOLD * 10 ** ((db + 36) / 20) : AUTO_CUE_THRESHOLD;
  const peaks = track?.peaks;
  if (peaks?.length && track.duration > 0) {
    const first = peaks.findIndex((p) => p >= threshold);
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

// How far out of phase a synced deck may drift before it's pulled back
// (0.015 beats is about 7 ms at 128 BPM, below what you hear as a flam).
const SYNC_TOLERANCE_BEATS = 0.015;

/**
 * One CDJ.
 *  - `tracks` is the list TRACK SEARCH (|◀◀ / ▶▶|) steps through.
 *  - `syncBpm`: the master deck's BPM while BEAT SYNC follows it, else null.
 *  - `getMasterBeatPos()`: the master deck's live beat position, for phase.
 *  - `syncKey`: the sync master's current key, for KEY SYNC (else null).
 *  - `channel`: which deck cable this is (0 = A, 1 = B); see constants/setup.js.
 */
export default function useCdjDeck({
  tracks = DEMO_TRACKS,
  syncBpm = null,
  getMasterBeatPos = null,
  syncKey = null,
  channel = 0,
  settings = DEFAULT_SETTINGS,
} = {}) {
  const [track, setTrack] = useState(DEMO_TRACKS[0]);
  const [audioSource, setAudioSource] = useState(DEMO_TRACKS[0].file);
  const [loadError, setLoadError] = useState(null);
  const loadSeq = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cuePoint, setCuePoint] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [pitchRange, setPitchRange] = useState(6);
  const [masterTempo, setMasterTempoState] = useState(false);
  // KEY SHIFT (semitones) and KEY SYNC. Both play with MASTER TEMPO on, so
  // the key moves without changing the tempo.
  const [keyShift, setKeyShift] = useState(0);
  const [keySync, setKeySync] = useState(false);
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
  const [memoryCueIndex, setMemoryCueIndex] = useState(-1);
  // LOOP IN/OUT ADJUST: which loop point the jog is moving, if any.
  const [loopAdjust, setLoopAdjust] = useState(null); // 'in' | 'out' | null
  // SLIP: where the track would have been, while a slip action runs:
  // { pos, at (ms), rate }.
  const slipRef = useRef(null);
  const [slipping, setSlipping] = useState(false);
  // The hot cue pad held during slip playback.
  const slipPadRef = useRef(null);
  const [slipReverseHeld, setSlipReverseHeld] = useState(false);
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
  // Memory cues are saved with the track too.
  const trackMemoryCues = useTrackMemoryCues();
  const memoryCues = trackMemoryCues.get(track.id);
  const setMemoryCues = (update) => trackMemoryCues.set(track.id, update);

  const { player, status, routedThroughMixer } = useDeckPlayer(audioSource, channel);
  const waveDetail = useWaveformDetail(player, status.isLoaded, track.id);

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

  const jog = useJogEngine({
    player,
    track,
    duration,
    isPlaying,
    audioRate,
    vinylMode,
    vinylSpeedAdjust,
    volumeRef,
    // Scratch sound goes through the same mixer channel as the deck.
    getOutput: routedThroughMixer ? () => getMixerEngine()?.deckInput(channel) : null,
    // LOOP IN/OUT ADJUST: the jog moves the loop point instead of the track.
    onAdjust: loopAdjust ? (revs) => adjustLoopPoint(revs) : null,
  });
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
    const beat = (60 / forTrack.bpm) * quantizeBeats(settings.quantizeBeat);
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

  useEffect(() => {
    player.setKeyShift?.(keyShift);
  }, [keyShift, player]);

  // KEY SYNC follows the sync master's key: the least change that gives the
  // same key or a related one (dominant, subdominant or a relative).
  useEffect(() => {
    if (!keySync) return;
    const shift = keySyncShift(track.key, syncKey);
    if (shift != null) setKeyShift(shift);
  }, [keySync, syncKey, track.key]);

  // BEAT SYNC keeps the beats locked: if the deck drifts out of phase (a
  // jog nudge, a seek, audio clock wobble) it's pulled back in. A seek takes
  // the player a moment to resume, so it lands a little behind; the deck
  // learns that delay and seeks that much further ahead next time.
  const seekLeadRef = useRef(0);
  const syncRef = useRef(null);
  syncRef.current = { phaseAlignedTime, getPosition, beatDuration, player };
  useEffect(() => {
    if (!synced || !isPlaying || jog.scratching) return undefined;
    let justSeeked = false;
    const id = setInterval(() => {
      const { phaseAlignedTime: align, getPosition: pos, beatDuration: beat, player: p } = syncRef.current;
      const now = pos();
      const error = align(now) - now;
      if (Math.abs(error) <= SYNC_TOLERANCE_BEATS * beat) {
        justSeeked = false;
        return;
      }
      // Still off straight after a correction: the seek itself landed late
      // (or early), so lead by more (or less) next time.
      if (justSeeked) seekLeadRef.current = clamp(seekLeadRef.current + error * 0.8, -0.05, 0.3);
      p.seekTo(now + error + seekLeadRef.current).catch(() => {});
      justSeeked = true;
    }, 1000);
    return () => clearInterval(id);
  }, [synced, isPlaying, jog.scratching]);

  // Loop-window watch: seek back to the loop start once playback reaches loop end.
  // (Real audio can't play backward, so this only handles the forward case —
  // reverse + loop together only affects the phantom/visual math, not audible playback.)
  // The mixer-routed player loops by itself, without a gap.
  useEffect(() => {
    player.setLoop?.(loop.active && loop.start != null && loop.end != null ? loop : null);
  }, [loop, player]);

  useEffect(() => {
    if (player.setLoop || !loop.active || loop.start == null || loop.end == null) return;
    if (elapsed >= loop.end) {
      player.seekTo(loop.start).catch(() => {});
    }
  }, [elapsed, loop, player]);

  // Detect natural end-of-track (the player stops itself; sync our isPlaying
  // state). With PLAY MODE set to CONTINUE the next track loads and plays.
  const continueRef = useRef(null);
  useEffect(() => {
    if (isPlaying && !status.playing && duration > 0 && elapsed >= duration - 0.15 && !reverse) {
      setIsPlaying(false);
      continueRef.current?.();
    }
  }, [isPlaying, status.playing, elapsed, duration, reverse]);

  const resetDeckState = () => {
    jog.cancel();
    setIsPlaying(false);
    player.seekTo(0).catch(() => {});
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
    }
    // Pausing leaves the cue point where it is, as on the real deck.
    setIsPlaying((prev) => {
      if (!prev && elapsed >= duration) {
        player.seekTo(0).catch(() => {});
      }
      return !prev;
    });
  };

  const seekTo = (time) => {
    player.seekTo(time).catch(() => {});
  };

  // SLIP: start remembering where the track would be (only while playing).
  const startSlip = (force = false) => {
    if ((!slip && !force) || !isPlaying || slipRef.current) return;
    slipRef.current = { pos: getPosition(), at: Date.now(), rate: audioRate };
    setSlipping(true);
  };
  const slipPosition = () => {
    const sl = slipRef.current;
    return sl ? clamp(sl.pos + ((Date.now() - sl.at) / 1000) * sl.rate, 0, duration) : null;
  };
  // …and jump back there when the slip action ends.
  const endSlip = () => {
    const t = slipPosition();
    slipRef.current = null;
    setSlipping(false);
    if (t != null) seekTo(t);
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
  };

  // Needle search: touching the overview waveform while paused jumps there.
  const handleNeedleSearch = (time) => {
    const next = clamp(time, 0, duration);
    player.seekTo(next).catch(() => {});
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
      setIsPlaying(true);
      gateRef.current = { index: i, time: cue.time, keepPlaying: false };
      padHandledRef.current = true;
      return;
    }
    // SLIP: a hot cue plays only while the pad is held; letting go returns
    // the track to where it would have been.
    if (slip && cue && isPlaying) {
      startSlip();
      slipPadRef.current = i;
      triggerHotCue(cue);
      padHandledRef.current = true;
    }
  };

  // Jump to a hot cue (and start its loop, for a hot cue loop) and play.
  const triggerHotCue = (cue) => {
    seekTo(cue.time);
    if (cue.loopEnd != null) setLoop({ active: true, start: cue.time, end: cue.loopEnd });
    setIsPlaying(true);
  };

  const handleHotCuePressOut = (i) => {
    if (slipPadRef.current === i) {
      slipPadRef.current = null;
      setLoop((prev) => (prev.active ? { ...prev, active: false } : prev));
      endSlip();
      return;
    }
    const gate = gateRef.current;
    if (!gate || gate.index !== i) return;
    gateRef.current = null;
    if (!gate.keepPlaying) {
      setIsPlaying(false);
      player.seekTo(gate.time).catch(() => {});
    }
  };

  const handleHotCuePress = (i) => {
    if (padHandledRef.current) {
      padHandledRef.current = false;
      return;
    }
    const cue = hotCues[i];
    if (cue) {
      triggerHotCue(cue);
    } else {
      // An empty pad stores a cue here, or the loop that's playing (a hot
      // cue loop).
      const next = [...hotCues];
      next[i] = loop.active ? { time: loop.start, loopEnd: loop.end } : { time: quantizeTime(elapsed) };
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
    if (!loop.active) startSlip();
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
  // fly while playing. While a loop plays it toggles IN ADJUST instead: the
  // jog then moves the loop's start.
  const handleLoopIn = () => {
    if (loop.active) {
      setLoopAdjust((a) => (a === 'in' ? null : 'in'));
      return;
    }
    setLoopAdjust(null);
    const start = quantizeTime(elapsed);
    if (!isPlaying) seekTo(start);
    setCuePoint(start);
    setLoop({ active: false, start, end: null });
  };

  // LOOP OUT closes the loop and starts it; while a loop plays it toggles
  // OUT ADJUST (the jog moves the loop's end).
  const handleLoopOut = () => {
    if (loop.active) {
      setLoopAdjust((a) => (a === 'out' ? null : 'out'));
      return;
    }
    if (loop.start == null || elapsed <= loop.start) return;
    startSlip();
    setLoop({ active: true, start: loop.start, end: quantizeTime(elapsed) });
  };

  // Turning the jog in IN/OUT ADJUST: half a beat per turn, so it's fine.
  const adjustLoopPoint = (revs) => {
    const delta = revs * beatDuration * 0.5;
    setLoop((prev) => {
      if (!prev.active) return prev;
      if (loopAdjust === 'in') return { ...prev, start: clamp(prev.start + delta, 0, prev.end - 0.05) };
      return { ...prev, end: clamp(prev.end + delta, prev.start + 0.05, duration) };
    });
  };

  const handleReloopExit = () => {
    setLoopAdjust(null);
    if (loop.active) {
      setLoop((prev) => ({ ...prev, active: false }));
      // SLIP: carry on from where the track would have been.
      endSlip();
      return;
    }
    if (loop.start != null && loop.end != null) {
      seekTo(loop.start);
      startSlip();
      setLoop((prev) => ({ ...prev, active: true }));
    }
  };

  const handleSetBeatJumpCount = (count) => {
    if (BEAT_JUMP_COUNTS.includes(count)) setBeatJumpCount(count);
  };

  // DIRECTION: the mixer-routed player can really play backward. With SLIP
  // on, going back to forward picks up where the track would have been.
  useEffect(() => {
    player.setReverse?.(reverse);
  }, [reverse, player]);

  const handleSetReverse = (on) => {
    if (on === reverse) return;
    if (on) startSlip();
    setReverse(on);
    if (!on) endSlip();
  };

  // SLIP REV is spring-loaded: reverse while held, then carry on from where
  // the track would have been (whether SLIP is on or not).
  const handleSlipReverse = (held) => {
    setSlipReverseHeld(held);
    if (held) {
      startSlip(true);
      setReverse(true);
    } else {
      setReverse(false);
      endSlip();
    }
  };

  // SLIP + VINYL scratch: holding the platter is a slip action too.
  const scratchSlipRef = useRef(false);
  useEffect(() => {
    if (jog.scratching && slip && isPlaying) {
      scratchSlipRef.current = true;
      startSlip();
    } else if (!jog.scratching && scratchSlipRef.current) {
      scratchSlipRef.current = false;
      endSlip();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jog.scratching]);

  // Loop sizes change through 1/2X and 2X; a stopped loop ends adjust mode.
  useEffect(() => {
    if (!loop.active) setLoopAdjust(null);
  }, [loop.active]);

  const handleBeatJump = (dir) => {
    const delta = dir * beatJumpCount * beatDuration;
    const next = clamp(elapsed + delta, 0, duration);
    player.seekTo(next).catch(() => {});
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
  // MASTER TEMPO off also puts the track back in its original key.
  const setMasterTempo = (next) => {
    setMasterTempoState((prev) => {
      const on = typeof next === 'function' ? next(prev) : next;
      if (!on) {
        setKeyShift(0);
        setKeySync(false);
      }
      return on;
    });
  };

  const toggleKeySync = () => {
    if (keySync) {
      setKeySync(false);
      setKeyShift(0);
      return;
    }
    // Only analysed tracks (with a key) can be key-synced.
    if (keySyncShift(track.key, syncKey) == null) return;
    setKeySync(true);
    setMasterTempoState(true);
  };

  const shiftKey = (delta) => {
    if (!parseKey(track.key)) return;
    setKeySync(false);
    setMasterTempoState(true);
    setKeyShift((k) => Math.max(-12, Math.min(12, k + delta)));
  };

  const resetKey = () => {
    setKeySync(false);
    setKeyShift(0);
  };

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
    setKeyShift(0);
    setKeySync(false);
    setAudioSource(source);
    setIsPlaying(false);
    cueHoldRef.current = null;
    const cue = autoCue ? autoCueTime(nextTrack, getTrackMemoryCues(nextTrack.id), settings.autoCueLevel) : 0;
    const start = at ?? cue;
    setCuePoint(cue);
    setPendingStart({ source, time: start, play });
    setLoop(EMPTY_LOOP);
    setMemoryCueIndex(-1);
    slipRef.current = null;
    setSlipping(false);
    setLoopAdjust(null);
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

  continueRef.current =
    settings.playMode === 'CONTINUE' && tracks.length > 1
      ? () => {
          const current = tracks.findIndex((t) => t.id === track.id);
          if (current >= 0 && current < tracks.length - 1) handleLoadTrack(tracks[current + 1], { play: true });
        }
      : null;

  // MEMORY / CUE·LOOP CALL / DELETE: a second, separate cue-point system from
  // the 8 Hot Cue pads — memory cues are auto-numbered in track order and
  // stepped through with CUE/LOOP CALL rather than pressed directly.
  // MEMORY saves a memory cue here (with the track, so it comes back next
  // time). Like the CDJ, it also becomes the cue point.
  const handleMemorySave = () => {
    const time = quantizeTime(elapsed);
    if (memoryCues.some((c) => Math.abs(c.time - time) < 0.01)) return;
    const next = [...memoryCues, { time }].sort((a, b) => a.time - b.time);
    setMemoryCues(next);
    setMemoryCueIndex(next.findIndex((c) => c.time === time));
    setCuePoint(time);
  };

  // CUE/LOOP CALL ◀ ▶: the previous or next memory cue from where the track
  // is, which becomes the cue point. Playing stops there, as on the deck.
  const handleMemoryCall = (dir) => {
    if (memoryCues.length === 0) return;
    const here = elapsed;
    let index;
    if (dir > 0) index = memoryCues.findIndex((c) => c.time > here + 0.05);
    else index = memoryCues.map((c) => c.time < here - 0.05).lastIndexOf(true);
    if (index < 0) return;
    const time = memoryCues[index].time;
    setMemoryCueIndex(index);
    jog.cancel();
    setIsPlaying(false);
    setCuePoint(time);
    seekTo(time);
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
    routedThroughMixer,
    waveDetail,
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
    },
    tempoReset,
    autoCue,
    cuePoint,
    atCue,
    deleteHeld,
    pitchRange,
    masterTempo,
    keyShift,
    keySync,
    displayKey: shiftKeyText(track.key, keyShift),
    toggleKeySync,
    shiftKey,
    resetKey,
    reverse,
    slip,
    slipping,
    slipPosition,
    slipReverseHeld,
    loopAdjust,
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
    setReverse: handleSetReverse,
    toggleSlip: () => {
      // Turning SLIP off mid-action leaves the track where it is.
      if (slip) {
        slipRef.current = null;
        setSlipping(false);
      }
      setSlip(!slip);
    },
    handleSlipReverse,
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
