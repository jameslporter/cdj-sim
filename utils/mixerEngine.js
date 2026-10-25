import { getAudioContext } from './audioContext';
import { beatFxInfo, createBeatFx } from './beatFx';
import { createSendFx, SEND_FX_TYPES } from './sendFx';
import { DECK_IDS, deckOnChannel, INPUT_OPTIONS, MIXER_CHANNELS } from '../constants/setup';

// The DJM-V10's signal path, built from Web Audio nodes (react-native-audio-api
// on every platform). Each deck plays into its cable (see constants/setup.js),
// which reaches a channel when that channel's input selector is on the jack
// the cable is plugged into. Six channels, each:
//
//   input → TRIM → EQ (LOW, LO-MID, HI-MID, HI) → FILTER (LPF, HPF) ─┬→ (+ SEND return) → FADER ─┬→ CROSSFADER → master bus
//                                                                   ├→ meter (pre-fader)          └→ BEAT FX (when assigned)
//                                                                   ├→ SEND → send effect
//                                                                   └→ CUE → headphones cue bus
//   master bus → ISOLATOR (LOW, MID, HI) → MASTER LEVEL → master meter
//
// BEAT FX sits after the channel fader (so echoes keep sounding when the
// fader comes down), or on the master bus before the isolator. Its sound
// comes back in before the crossfader. FX FREQUENCY splits the sound into
// LOW / MID / HI bands so the effect only hits the bands that are lit.
//
// Each channel's SEND feeds its own copy of the send effect. Its sound comes
// back into that channel before the fader, or, with MASTER MIX on, straight
// into the master bus at MASTER MIX LEVEL.
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

function gainNode(ctx, value) {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
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
  const preFader = ctx.createGain(); // the channel plus its SEND return
  const fader = ctx.createGain();
  const fxDry = ctx.createGain(); // the original sound past BEAT FX
  const fxSend = gainNode(ctx, 0); // into BEAT FX when it's assigned here
  const fxReturn = gainNode(ctx, 0); // BEAT FX sound back into this channel
  const xfade = ctx.createGain();
  const send = gainNode(ctx, 0); // the SEND knob
  const sendToChannel = gainNode(ctx, 1);
  const sendToMaster = gainNode(ctx, 0);
  const cuePost = ctx.createGain(); // CUE tap after EQ/filter
  const cuePre = ctx.createGain(); // CUE tap straight after TRIM (PRE EQ)
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;

  chain(input, trim, eqLow, eqLoMid, eqHiMid, eqHi, lpf, hpf, preFader, fader, fxDry, xfade, masterBus);
  fader.connect(fxSend);
  fxReturn.connect(xfade);
  hpf.connect(send);
  sendToChannel.connect(preFader);
  sendToMaster.connect(masterBus);
  hpf.connect(analyser);
  hpf.connect(cuePost);
  trim.connect(cuePre);
  cuePost.connect(cueBus);
  cuePre.connect(cueBus);
  cuePost.gain.value = 0;
  cuePre.gain.value = 0;

  return {
    input,
    trim,
    eqLow,
    eqLoMid,
    eqHiMid,
    eqHi,
    lpf,
    hpf,
    fader,
    fxDry,
    fxSend,
    fxReturn,
    xfade,
    send,
    sendFx: null, // built the first time this channel's SEND is turned up
    sendToChannel,
    sendToMaster,
    cuePost,
    cuePre,
    analyser,
  };
}

// FX FREQUENCY crossover points.
const LOW_MID = 250;
const MID_HI = 2500;

// The BEAT FX unit: one effect at a time, inserted on a channel or the master.
// `targets` are { dry, send, ret } gain nodes for each place it can go.
function createBeatFxUnit(ctx, targets) {
  const bus = ctx.createGain(); // whatever is sent to the effect
  const fxIn = ctx.createGain();
  const fxOut = ctx.createGain();
  const ret = ctx.createGain(); // effect + untouched bands, back to the target
  fxOut.connect(ret);
  for (const t of Object.values(targets)) {
    t.send.connect(bus);
    ret.connect(t.ret);
  }

  // Full band (all three FX FREQUENCY buttons lit) or the split bands.
  const full = gainNode(ctx, 1);
  chain(bus, full, fxIn);
  const bandFilters = {
    low: [ctx.createBiquadFilter()],
    mid: [ctx.createBiquadFilter(), ctx.createBiquadFilter()],
    hi: [ctx.createBiquadFilter()],
  };
  bandFilters.low[0].type = 'lowpass';
  bandFilters.low[0].frequency.value = LOW_MID;
  bandFilters.mid[0].type = 'highpass';
  bandFilters.mid[0].frequency.value = LOW_MID;
  bandFilters.mid[1].type = 'lowpass';
  bandFilters.mid[1].frequency.value = MID_HI;
  bandFilters.hi[0].type = 'highpass';
  bandFilters.hi[0].frequency.value = MID_HI;
  const bands = {};
  for (const [name, filters] of Object.entries(bandFilters)) {
    const toFx = gainNode(ctx, 0);
    const bypass = gainNode(ctx, 0);
    chain(bus, ...filters);
    const last = filters[filters.length - 1];
    last.connect(toFx);
    last.connect(bypass);
    toFx.connect(fxIn);
    bypass.connect(ret);
    bands[name] = { toFx, bypass };
  }

  let effect = null;
  let wasOn = false;
  let lastTarget = null;

  const swapEffect = (name) => {
    const old = effect;
    effect = createBeatFx(ctx, name);
    fxIn.connect(effect.input);
    effect.output.connect(fxOut);
    if (old) {
      fxIn.disconnect(old.input);
      // Let an old echo or reverb tail ring out before dropping it.
      setTimeout(
        () => {
          old.dispose();
          old.output.disconnect();
        },
        old.trails ? 6000 : 50
      );
    }
  };

  return {
    apply(state, bpm) {
      const info = beatFxInfo(state.effect);
      if (!effect || effect.name !== info.name) {
        if (effect && wasOn) effect.stop();
        swapEffect(info.name);
        wasOn = false;
      }
      const value = state.time ?? state.beat ?? info.defaultBeat;
      let seconds;
      if (info.unit === 'beat') {
        seconds = state.time != null ? state.time / 1000 : (60 / (bpm || 128)) * value;
      } else {
        seconds = 1;
      }
      const depth = state.depth ?? 0.5;
      effect.update({ seconds, value, depth });

      const target = state.on ? state.assign : null;
      const allBands = state.bands.low && state.bands.mid && state.bands.hi;
      const dry = effect.dryLevel(depth);
      for (const [key, t] of Object.entries(targets)) {
        const here = key === target;
        set(t.send.gain, here ? 1 : 0, ctx);
        set(t.dry.gain, here ? dry : 1, ctx);
      }
      set(full.gain, target && allBands ? 1 : 0, ctx);
      for (const [name, b] of Object.entries(bands)) {
        const lit = state.bands[name];
        set(b.toFx.gain, target && !allBands && lit ? 1 : 0, ctx);
        set(b.bypass.gain, target && !allBands && !lit ? 1 - dry : 0, ctx);
      }
      // The return follows the effect: while on, and afterwards for trails.
      if (target) lastTarget = target;
      for (const [key, t] of Object.entries(targets)) {
        const live = key === lastTarget && (state.on || effect.trails);
        set(t.ret.gain, live ? 1 : 0, ctx);
      }

      if (state.on && !wasOn) effect.start();
      if (!state.on && wasOn) effect.stop();
      wasOn = !!state.on;
    },
  };
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

  // BEAT FX on MASTER goes between the master bus and the isolator.
  const masterDry = ctx.createGain();
  const masterFxSend = gainNode(ctx, 0);
  const masterFxReturn = gainNode(ctx, 0);
  chain(masterBus, masterDry, isoLow, isoMid, isoHi, masterLevel, masterAnalyser);
  masterBus.connect(masterFxSend);
  masterFxReturn.connect(isoLow);
  masterLevel.connect(hpMaster);
  chain(cueBus, hpCue, cuePan, hpLevel);
  chain(hpMaster, masterPan, hpLevel);
  hpLevel.connect(ctx.destination);

  const channels = Array.from({ length: MIXER_CHANNELS }, () => createChannel(ctx, masterBus, cueBus));
  const scratch = new Float32Array(512);

  // The decks' cables, and a selector gain from each cable into each channel.
  const deckOuts = DECK_IDS.map(() => ctx.createGain());
  const patch = channels.map((ch) =>
    deckOuts.map((out) => {
      const g = gainNode(ctx, 0);
      out.connect(g);
      g.connect(ch.input);
      return g;
    })
  );

  const ensureSendFx = (node) => {
    if (!node.sendFx) {
      node.sendFx = createSendFx(ctx);
      node.send.connect(node.sendFx.input);
      node.sendFx.output.connect(node.sendToChannel);
      node.sendFx.output.connect(node.sendToMaster);
    }
    return node.sendFx;
  };

  const beatFx = createBeatFxUnit(ctx, {
    ...Object.fromEntries(
      channels.map((ch, i) => [`CH${i + 1}`, { dry: ch.fxDry, send: ch.fxSend, ret: ch.fxReturn }])
    ),
    MASTER: { dry: masterDry, send: masterFxSend, ret: masterFxReturn },
  });

  return {
    /** The node deck `i` (0 = A, 1 = B), or its scratch voice, plays into: its cable. */
    deckInput: (i) => deckOuts[i] ?? null,

    /** Apply the mixer state (see hooks/useMixerState.js). */
    /** Apply the BEAT FX section (see hooks/useMixerState.js) at `bpm`. */
    applyBeatFx(state, bpm) {
      beatFx.apply(state, bpm);
    },

    apply({ channels: chState, crossfader, master, filter, headphones, sendFx }) {
      chState.forEach((ch, i) => {
        const node = channels[i];
        if (!node) return;
        const plugged = deckOnChannel(i, INPUT_OPTIONS[ch.inputIndex ?? 0]);
        DECK_IDS.forEach((id, d) => set(patch[i][d].gain, plugged === id ? 1 : 0, ctx));
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
        if (sendFx) {
          // EXT1/EXT2 return nothing: there's no external effects unit plugged in.
          const builtIn = SEND_FX_TYPES.includes(sendFx.source);
          const sendLevel = builtIn ? (ch.send ?? 0) ** 1.5 : 0;
          set(node.send.gain, sendLevel, ctx);
          if (sendLevel > 0 || node.sendFx) ensureSendFx(node).apply(sendFx);
          set(node.sendToChannel.gain, sendFx.masterMixOn ? 0 : 1, ctx);
          set(node.sendToMaster.gain, sendFx.masterMixOn ? sendFx.masterMixLevel * 1.4 : 0, ctx);
        }
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
