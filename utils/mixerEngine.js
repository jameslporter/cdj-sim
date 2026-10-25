import { getAudioContext } from './audioContext';

// The DJM-V10's signal path, built from Web Audio nodes (react-native-audio-api
// on every platform). Each deck plays into its channel's input:
//
//   input → TRIM → EQ (LOW, LO-MID, HI-MID, HI) → FILTER (LPF, HPF) ─┬→ FADER → CROSSFADER → master bus
//                                                                   ├→ meter (pre-fader, like the V10)
//                                                                   └→ CUE → headphones cue bus
//   master bus → ISOLATOR (LOW, MID, HI) → MASTER LEVEL → master meter
//
// The device has one audio output, so it plays the HEADPHONES section: MIXING
// blends the cue bus with the master, and SPLIT puts cue in the left ear and
// master in the right (the V10's mono split). With MIXING all the way to
// MASTER you hear what the crowd would hear.

const RAMP = 0.015; // seconds: smooths knob moves so they don't click
const KILL_DB = -60;

// A V10-style EQ/isolator knob (0–1, 0.5 = flat) in dB: down to a full kill
// at the far left, up to +6 dB at the far right.
export function eqKnobToDb(v) {
  if (v >= 0.5) return ((v - 0.5) / 0.5) * 6;
  if (v <= 0.02) return KILL_DB;
  const x = (0.5 - v) / 0.5; // 0 → 1 going left
  return -26 * x ** 1.5;
}

// TRIM: -∞ at the far left, 0 dB at 12 o'clock, +9 dB at the far right.
export function trimKnobToGain(v) {
  if (v <= 0.01) return 0;
  const db = v >= 0.5 ? ((v - 0.5) / 0.5) * 9 : -40 * ((0.5 - v) / 0.5) ** 1.6;
  return 10 ** (db / 20);
}

// Channel fader travel → gain, with a log-ish taper like a real fader.
export const faderToGain = (v) => (v <= 0 ? 0 : v ** 2.2 * 1.25);

// Crossfader (-1 = A, 1 = B) → gain for a channel assigned to A, B or THRU.
// A constant-power-ish curve: both sides full in the middle.
export function crossfaderGain(assign, x) {
  if (assign === 'A') return x <= 0 ? 1 : Math.cos((x * Math.PI) / 2) ** 0.5;
  if (assign === 'B') return x >= 0 ? 1 : Math.cos((-x * Math.PI) / 2) ** 0.5;
  return 1;
}

// FILTER knob (0–1, 0.5 = off): left sweeps a low-pass down, right sweeps a
// high-pass up. Returns { lp, hp } cutoff frequencies in Hz.
export function filterKnobToCutoffs(v, { lpf = true, hpf = true } = {}) {
  const dead = 0.03;
  let lp = 22000;
  let hp = 10;
  if (lpf && v < 0.5 - dead) lp = 20000 * (40 / 20000) ** ((0.5 - dead - v) / (0.5 - dead));
  if (hpf && v > 0.5 + dead) hp = 10 * (12000 / 10) ** ((v - 0.5 - dead) / (0.5 - dead));
  return { lp, hp };
}

const dbToGain = (db) => 10 ** (db / 20);

function set(param, value, ctx) {
  try {
    param.setTargetAtTime(value, ctx.currentTime, RAMP);
  } catch {
    param.value = value;
  }
}

function biquad(ctx, type, frequency, q) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  if (q != null) f.Q.value = q;
  return f;
}

function chain(...nodes) {
  for (let i = 0; i < nodes.length - 1; i += 1) nodes[i].connect(nodes[i + 1]);
  return nodes;
}

// Peak level (0–1 linear) of what an analyser is hearing right now.
function peakOf(analyser, buffer) {
  analyser.getFloatTimeDomainData(buffer);
  let peak = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    const v = Math.abs(buffer[i]);
    if (v > peak) peak = v;
  }
  return peak;
}

function createChannel(ctx, masterBus, cueBus) {
  const input = ctx.createGain();
  const trim = ctx.createGain();
  const eqLow = biquad(ctx, 'lowshelf', 100);
  const eqLoMid = biquad(ctx, 'peaking', 400, 0.8);
  const eqHiMid = biquad(ctx, 'peaking', 2500, 0.8);
  const eqHi = biquad(ctx, 'highshelf', 7000);
  const lpf = biquad(ctx, 'lowpass', 22000, 0.7);
  const hpf = biquad(ctx, 'highpass', 10, 0.7);
  const fader = ctx.createGain();
  const xfade = ctx.createGain();
  const cuePost = ctx.createGain(); // CUE tap after EQ/filter
  const cuePre = ctx.createGain(); // CUE tap straight after TRIM (PRE EQ)
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;

  chain(input, trim, eqLow, eqLoMid, eqHiMid, eqHi, lpf, hpf, fader, xfade, masterBus);
  hpf.connect(analyser);
  hpf.connect(cuePost);
  trim.connect(cuePre);
  cuePost.connect(cueBus);
  cuePre.connect(cueBus);
  cuePost.gain.value = 0;
  cuePre.gain.value = 0;

  return { input, trim, eqLow, eqLoMid, eqHiMid, eqHi, lpf, hpf, fader, xfade, cuePost, cuePre, analyser };
}

function createEngine(ctx) {
  const masterBus = ctx.createGain();
  const cueBus = ctx.createGain();
  const isoLow = biquad(ctx, 'lowshelf', 200);
  const isoMid = biquad(ctx, 'peaking', 1000, 0.6);
  const isoHi = biquad(ctx, 'highshelf', 4000);
  const masterLevel = ctx.createGain();
  const masterAnalyser = ctx.createAnalyser();
  masterAnalyser.fftSize = 512;

  // Headphones: cue side and master side, each through a panner for SPLIT.
  const hpCue = ctx.createGain();
  const hpMaster = ctx.createGain();
  const cuePan = ctx.createStereoPanner();
  const masterPan = ctx.createStereoPanner();
  const hpLevel = ctx.createGain();

  chain(masterBus, isoLow, isoMid, isoHi, masterLevel, masterAnalyser);
  masterLevel.connect(hpMaster);
  chain(cueBus, hpCue, cuePan, hpLevel);
  chain(hpMaster, masterPan, hpLevel);
  hpLevel.connect(ctx.destination);

  const channels = [0, 1].map(() => createChannel(ctx, masterBus, cueBus));
  const scratch = new Float32Array(512);

  return {
    /** The node a deck (or its scratch voice) plays into. */
    channelInput: (i) => channels[i]?.input ?? null,

    /** Apply the mixer state (see hooks/useMixerState.js). */
    apply({ channels: chState, crossfader, master, filter, headphones }) {
      chState.forEach((ch, i) => {
        const node = channels[i];
        if (!node) return;
        set(node.trim.gain, trimKnobToGain(ch.trim), ctx);
        set(node.eqLow.gain, eqKnobToDb(ch.eqLow), ctx);
        set(node.eqLoMid.gain, eqKnobToDb(ch.eqLoMid), ctx);
        set(node.eqHiMid.gain, eqKnobToDb(ch.eqHiMid), ctx);
        set(node.eqHi.gain, eqKnobToDb(ch.eqHi), ctx);
        const { lp, hp } = filterKnobToCutoffs(ch.filter ?? 0.5, filter);
        const q = 0.7 + (filter.resonance ?? 0.3) * 8;
        set(node.lpf.frequency, lp, ctx);
        set(node.hpf.frequency, hp, ctx);
        set(node.lpf.Q, lp < 21000 ? q : 0.7, ctx);
        set(node.hpf.Q, hp > 11 ? q : 0.7, ctx);
        set(node.fader.gain, faderToGain(ch.fader), ctx);
        set(node.xfade.gain, crossfaderGain(ch.assign, crossfader), ctx);
        set(node.cuePost.gain, ch.cue && !headphones.preEq ? 1 : 0, ctx);
        set(node.cuePre.gain, ch.cue && headphones.preEq ? 1 : 0, ctx);
      });
      const isoOn = master.isolatorOn;
      set(isoLow.gain, isoOn ? eqKnobToDb(master.isoLow) : 0, ctx);
      set(isoMid.gain, isoOn ? eqKnobToDb(master.isoMid) : 0, ctx);
      set(isoHi.gain, isoOn ? eqKnobToDb(master.isoHi) : 0, ctx);
      // MASTER LEVEL: 12 o'clock-ish is unity, full is +6 dB.
      set(masterLevel.gain, master.level <= 0.01 ? 0 : dbToGain((master.level - 0.75) * 40), ctx);
      // MIXING: 0 = all cue, 1 = all master, equal-power in between.
      const mix = headphones.mixing;
      set(hpCue.gain, Math.cos((mix * Math.PI) / 2), ctx);
      set(hpMaster.gain, Math.sin((mix * Math.PI) / 2), ctx);
      set(cuePan.pan, headphones.split ? -1 : 0, ctx);
      set(masterPan.pan, headphones.split ? 1 : 0, ctx);
      set(hpLevel.gain, headphones.level <= 0.01 ? 0 : dbToGain((headphones.level - 0.75) * 40), ctx);
    },

    /** Channel meter level, 0–1 linear peak, pre-fader. */
    channelPeak: (i) => (channels[i] ? peakOf(channels[i].analyser, scratch) : 0),
    masterPeak: () => peakOf(masterAnalyser, scratch),
  };
}

let engine;
/** The shared mixer engine, or null where Web Audio isn't available (Expo Go). */
export function getMixerEngine() {
  if (engine === undefined) {
    const ctx = getAudioContext();
    try {
      engine = ctx ? createEngine(ctx) : null;
      // Handy for poking at the audio from the browser console while developing.
      if (__DEV__ && engine && typeof window !== 'undefined') window.__cdjMixer = engine;
    } catch {
      engine = null;
    }
  }
  return engine;
}
