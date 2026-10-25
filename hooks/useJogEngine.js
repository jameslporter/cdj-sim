import { useEffect, useRef, useState } from 'react';
import { clamp } from '../utils/format';
import { createScratchVoice, loadScratchSamples } from '../utils/scratchAudio';

// One turn of the jog moves the track 1.8 s, the same as a record at 33⅓ rpm.
export const SECONDS_PER_REV = 1.8;

// How far the outer ring (or the top in CDJ mode) bends the tempo: turning at
// one revolution per second plays 35% faster.
const BEND_PER_REV_PER_SEC = 0.35;
const DISPLAY_INTERVAL_MS = 33;

// VINYL SPEED ADJ: how long playback takes to get from a standstill up to
// speed after you let go of the platter (or press PLAY while it's held). It
// works like a turntable motor's pull: a hard backspin takes longer to
// recover than a gentle hold.
export const releaseTimeFor = (adjust) => 0.08 + adjust * adjust * 1.6;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const raf = (fn) => requestAnimationFrame(fn);

/**
 * The jog wheel's effect on the audio, matching the CDJ-3000:
 *  - VINYL mode, top touched while playing: the track follows your hand
 *    (stop, scratch, drag back). Let go and it comes back up to speed over
 *    the VINYL SPEED ADJ time, so a backward fling swoops back naturally.
 *  - Outer ring, or the top in CDJ mode, while playing: pitch bend (nudge).
 *  - Paused: turning the jog searches through the track, audibly.
 * While the jog drives the audio, a scratch voice plays it (it can go
 * backward); the normal player takes over again at the same spot afterwards.
 */
export default function useJogEngine({
  player,
  track,
  duration,
  isPlaying,
  audioRate,
  vinylMode,
  vinylSpeedAdjust,
  volumeRef,
  getOutput = null,
}) {
  const [scratching, setScratching] = useState(false);
  const [displayPos, setDisplayPos] = useState(0);
  const voiceRef = useRef(null);
  const outputRef = useRef(getOutput);
  outputRef.current = getOutput;
  if (!voiceRef.current) voiceRef.current = createScratchVoice(() => outputRef.current?.() ?? null);
  const voice = voiceRef.current;

  const props = useRef({});
  props.current = { player, duration, isPlaying, audioRate, vinylMode, vinylSpeedAdjust };

  const s = useRef({
    mode: 'idle', // 'idle' | 'scratch'
    touch: null, // 'top' | 'ring' | null
    pending: 0, // revolutions moved since the last frame
    lastMoveAt: 0,
    pos: 0, // where the audio is (track seconds)
    target: 0, // where the platter says it should be
    speed: 0, // audio speed, track seconds per second
    bend: 0, // rev/s, smoothed
    bendApplied: null,
    handoffPos: null,
    handoffAt: 0,
    loopRunning: false,
    lastFrame: 0,
    lastDisplay: 0,
  }).current;

  // Decode the loaded track ahead of time so the first scratch has sound.
  useEffect(() => {
    let cancelled = false;
    voice.setData(null);
    loadScratchSamples(track).then((data) => {
      if (!cancelled) voice.setData(data);
    });
    return () => {
      cancelled = true;
    };
  }, [track, voice]);

  useEffect(() => () => voice.stop(), [voice]);

  const playerTime = () => {
    const t = props.current.player.currentTime;
    return Number.isFinite(t) ? t : 0;
  };

  const getPosition = () => {
    if (s.mode === 'scratch') return s.pos;
    // Right after handing back, the player may still report the old spot.
    if (s.handoffPos != null && now() - s.handoffAt < 400) return s.handoffPos;
    s.handoffPos = null;
    return playerTime();
  };

  const enterScratch = () => {
    if (s.mode === 'scratch') return;
    const { isPlaying: playing, audioRate: rate } = props.current;
    s.pos = getPosition();
    s.mode = 'scratch';
    // A held record stops almost instantly, not in zero time.
    s.target = s.pos + (playing ? rate * 0.03 : 0);
    s.speed = playing ? rate : 0;
    voice.setVolume(volumeRef.current);
    setScratching(true);
    setDisplayPos(s.pos);
  };

  const handBack = () => {
    const { player: p } = props.current;
    voice.stop();
    s.mode = 'idle';
    s.speed = 0;
    s.handoffPos = s.pos;
    s.handoffAt = now();
    p.seekTo(s.pos).catch(() => {});
    setDisplayPos(s.pos);
    setScratching(false);
  };

  const applyBend = (value) => {
    const { player: p, audioRate: rate } = props.current;
    if (value == null && s.bendApplied == null) return;
    const bent = value == null ? rate : rate * clamp(1 + value * BEND_PER_REV_PER_SEC, 0.1, 2);
    if (s.bendApplied != null && Math.abs(bent - s.bendApplied) < 0.003) return;
    s.bendApplied = value == null ? null : bent;
    p.setPlaybackRate(bent);
  };

  const frame = () => {
    const t = now();
    const dt = clamp((t - s.lastFrame) / 1000, 0.001, 0.05);
    s.lastFrame = t;
    const { isPlaying: playing, audioRate: rate, vinylSpeedAdjust: adjust, duration: dur } = props.current;
    const moved = s.pending;
    s.pending = 0;

    if (s.mode === 'scratch') {
      const held = s.touch === 'top' && props.current.vinylMode;
      const handDriven = held || !playing;
      if (handDriven) {
        // Follow the platter through a short smoothing lag: the audio glides
        // to where your hand put the platter and never overshoots it, so a
        // jittery touch doesn't flip the sound back and forth.
        s.target = clamp(s.target + moved * SECONDS_PER_REV, 0, dur);
        const next = s.pos + (s.target - s.pos) * (1 - Math.exp(-dt / 0.03));
        s.speed = (next - s.pos) / dt;
      } else {
        // Let go while playing: come back up to speed from wherever the hand
        // left it (backward included), like a record released from a spinback.
        const step = (rate / releaseTimeFor(adjust)) * dt;
        s.speed = s.speed < rate ? Math.min(rate, s.speed + step) : Math.max(rate, s.speed - step);
      }
      s.pos = clamp(s.pos + s.speed * dt, 0, dur);
      voice.setVolume(volumeRef.current);
      voice.setSpeed(s.speed, s.pos);

      const settledPaused =
        !playing && !s.touch && t - s.lastMoveAt > 150 && Math.abs(s.speed) < 0.02 && Math.abs(s.target - s.pos) < 0.005;
      const upToSpeed = !handDriven && Math.abs(s.speed - rate) < 0.001;
      if (settledPaused || upToSpeed) handBack();
      else if (t - s.lastDisplay > DISPLAY_INTERVAL_MS) {
        s.lastDisplay = t;
        setDisplayPos(s.pos);
      }
    } else {
      // Pitch bend: smoothed turning speed, easing off once the jog stops.
      const inst = moved / dt;
      s.bend += (inst - s.bend) * (1 - Math.exp(-dt / 0.08));
      if (Math.abs(s.bend) < 0.005 && t - s.lastMoveAt > 100) {
        s.bend = 0;
        applyBend(null);
      } else {
        applyBend(s.bend);
      }
    }

    const busy = s.mode === 'scratch' || s.bend !== 0 || s.touch != null;
    if (busy) raf(frame);
    else s.loopRunning = false;
  };

  const wake = () => {
    if (s.loopRunning) return;
    s.loopRunning = true;
    s.lastFrame = now();
    raf(frame);
  };

  // A drag that changes what it should do (e.g. PLAY pressed mid-search)
  // is picked up by the frame loop; these just record what the hand does.
  const touch = (zone) => {
    s.touch = zone;
    voice.resume();
    // VINYL: touching the top holds the record, playing or not.
    if (zone === 'top' && props.current.vinylMode) enterScratch();
    wake();
  };

  const release = () => {
    s.touch = null;
    wake();
  };

  const move = (revs, zone) => {
    s.pending += revs;
    s.lastMoveAt = now();
    const { isPlaying: playing, vinylMode: vinyl } = props.current;
    // Paused: any turn searches. Playing: only a held top in VINYL scratches;
    // a platter still coasting after a vinyl scratch is ignored, the rest bends.
    if (!playing || (vinyl && zone === 'top' && s.touch === 'top')) enterScratch();
    else if (s.mode === 'idle' && vinyl && zone === 'top') s.pending -= revs;
    wake();
  };

  // A cue, load or reset takes the audio back from the jog without seeking.
  const cancel = () => {
    if (s.mode === 'scratch') {
      voice.stop();
      s.mode = 'idle';
      setScratching(false);
    }
    s.pending = 0;
    s.bend = 0;
    s.handoffPos = null;
  };

  // Picks up PLAY / pause changes while a scratch is held.
  useEffect(() => {
    if (s.mode === 'scratch') wake();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  return {
    scratching,
    // Right after handing back, the player may still report the old spot.
    position: scratching
      ? displayPos
      : s.handoffPos != null && now() - s.handoffAt < 400
        ? s.handoffPos
        : null,
    getPosition,
    touch,
    release,
    move,
    cancel,
  };
}
