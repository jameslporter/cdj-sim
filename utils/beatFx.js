// The DJM-V10's 14 BEAT FX, built from Web Audio nodes (react-native-audio-api
// on every platform).
//
// Each effect is a small graph between `input` and `output`. The mixer engine
// handles the dry sound: `dryLevel(depth)` says how much of the original the
// channel keeps while the effect is on. `trails` effects keep sounding after
// OFF (their echoes or reverb tail die away naturally), like the real mixer.
//
// `update({ seconds, value, depth })` sets the effect time (from the BEAT
// buttons or the TIME knob), the BEAT value itself (used by REVERB, SHIMMER
// and PITCH, whose BEAT is a percentage), and the LEVEL/DEPTH knob.

const SMOOTH = 0.02;
export const MAX_DELAY = 14; // seconds: 16 beats at 70 BPM

// The V10's effect order, with each effect's BEAT values. Times are in beats;
// REVERB and SHIMMER are % amounts and PITCH is a % pitch change.
const DELAY_BEATS = [1 / 16, 1 / 8, 1 / 4, 1 / 2, 3 / 4, 1, 2, 4, 8, 16];
const CYCLE_BEATS = [1 / 16, 1 / 8, 1 / 4, 1 / 2, 3 / 4, 1, 2, 4, 8, 16, 32, 64];
const PERCENT = [1, 10, 25, 50, 75, 100];
const PITCH_PERCENT = [-50, -25, -10, -5, 5, 10, 25, 50, 100];

export const BEAT_FX = [
  { name: 'DELAY', beats: DELAY_BEATS, defaultBeat: 1 / 2, unit: 'beat', time: [1, 4000] },
  { name: 'ECHO', beats: DELAY_BEATS, defaultBeat: 3 / 4, unit: 'beat', time: [1, 4000] },
  { name: 'PING PONG', beats: DELAY_BEATS, defaultBeat: 1 / 2, unit: 'beat', time: [10, 4000] },
  { name: 'SPIRAL', beats: DELAY_BEATS, defaultBeat: 3 / 4, unit: 'beat', time: [10, 4000] },
  { name: 'HELIX', beats: DELAY_BEATS, defaultBeat: 1, unit: 'beat', time: [10, 4000] },
  { name: 'REVERB', beats: PERCENT, defaultBeat: 50, unit: '%', time: [1, 100] },
  { name: 'SHIMMER', beats: PERCENT, defaultBeat: 50, unit: '%', time: [1, 100] },
  { name: 'FLANGER', beats: CYCLE_BEATS, defaultBeat: 16, unit: 'beat', time: [10, 32000] },
  { name: 'PHASER', beats: CYCLE_BEATS, defaultBeat: 16, unit: 'beat', time: [10, 32000] },
  { name: 'FILTER', beats: CYCLE_BEATS, defaultBeat: 4, unit: 'beat', time: [10, 32000] },
  { name: 'TRANS', beats: DELAY_BEATS, defaultBeat: 1 / 4, unit: 'beat', time: [10, 16000] },
  { name: 'ROLL', beats: DELAY_BEATS, defaultBeat: 1 / 2, unit: 'beat', time: [10, 4000] },
  { name: 'PITCH', beats: PITCH_PERCENT, defaultBeat: 25, unit: '%', time: [-50, 100] },
  { name: 'VINYL BRAKE', beats: DELAY_BEATS, defaultBeat: 1, unit: 'beat', time: [10, 4000] },
];
export const BEAT_FX_NAMES = BEAT_FX.map((fx) => fx.name);
export const beatFxInfo = (name) => BEAT_FX.find((fx) => fx.name === name) ?? BEAT_FX[0];

/** A BEAT value as printed on the V10's display: 1/16, 3/4, 2, 50% … */
export function formatBeat(value, unit) {
  if (unit === '%') return `${value}%`;
  if (value >= 1) return String(value);
  const known = { 0.0625: '1/16', 0.125: '1/8', 0.25: '1/4', 0.5: '1/2', 0.75: '3/4' };
  return known[value] ?? value.toFixed(2);
}

// LEVEL/DEPTH as the original/effect balance: both full at 12 o'clock, only
// the original at the far left, mostly effect at the far right.
const balanceWet = (d) => Math.min(1, d * 2);
const balanceDry = (d) => Math.min(1, (1 - d) * 2);

function set(param, value, ctx, smooth = SMOOTH) {
  try {
    param.setTargetAtTime(value, ctx.currentTime, smooth);
  } catch {
    param.value = value;
  }
}

function gain(ctx, value = 1) {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

function biquad(ctx, type, frequency, q) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  if (q != null) f.Q.value = q;
  return f;
}

function lfo(ctx, type, depth) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = 1;
  const amount = gain(ctx, depth);
  osc.connect(amount);
  osc.start();
  return { osc, amount };
}

// A decaying stereo noise burst, used as a reverb's impulse response.
export function makeImpulse(ctx, seconds, { brightness = 0.5, seed = 1 } = {}) {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * seconds));
  const buffer = ctx.createBuffer(2, length, rate);
  let s = seed * 9301 + 49297;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280 - 0.5;
  };
  for (let c = 0; c < 2; c += 1) {
    const data = new Float32Array(length);
    let lp = 0;
    const smooth = 0.15 + 0.8 * brightness;
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      lp += smooth * (rand() * 2 - lp);
      // Quick pre-delay swell, then an exponential tail.
      data[i] = lp * Math.min(1, i / (rate * 0.01)) * Math.exp(-5 * t);
    }
    buffer.copyToChannel(data, c);
  }
  return buffer;
}

// A feedback delay line: input → delay → output, with the delay fed back
// through `loop` (optional filters) and `fb`.
function feedbackDelay(ctx, input, loopFilters = []) {
  const delay = ctx.createDelay(MAX_DELAY);
  const fb = gain(ctx, 0.4);
  input.connect(delay);
  let node = delay;
  for (const f of loopFilters) {
    node.connect(f);
    node = f;
  }
  node.connect(fb);
  fb.connect(delay);
  return { delay, fb, tap: node };
}

// ── The effects ────────────────────────────────────────────────────────────

function delayFx(ctx, { feedback, filters = () => [], level = 0.8 }) {
  const input = gain(ctx);
  const output = gain(ctx);
  const wet = gain(ctx, 0);
  const { delay, fb, tap } = feedbackDelay(ctx, input, filters());
  tap.connect(wet);
  wet.connect(output);
  return {
    input,
    output,
    trails: true,
    dryLevel: balanceDry,
    update({ seconds, depth }) {
      set(delay.delayTime, Math.min(MAX_DELAY, Math.max(0.001, seconds)), ctx, 0.05);
      set(fb.gain, typeof feedback === 'function' ? feedback(depth) : feedback, ctx);
      set(wet.gain, balanceWet(depth) * level, ctx);
    },
  };
}

function pingPong(ctx) {
  const input = gain(ctx);
  const output = gain(ctx);
  const wet = gain(ctx, 0);
  const left = ctx.createDelay(MAX_DELAY);
  const right = ctx.createDelay(MAX_DELAY);
  const fb = gain(ctx, 0.55);
  const panL = ctx.createStereoPanner();
  const panR = ctx.createStereoPanner();
  panL.pan.value = -1;
  panR.pan.value = 1;
  input.connect(left);
  left.connect(panL);
  left.connect(right);
  right.connect(panR);
  right.connect(fb);
  fb.connect(left);
  panL.connect(wet);
  panR.connect(wet);
  wet.connect(output);
  return {
    input,
    output,
    trails: true,
    dryLevel: balanceDry,
    update({ seconds, depth }) {
      const t = Math.min(MAX_DELAY, Math.max(0.01, seconds));
      set(left.delayTime, t, ctx, 0.05);
      set(right.delayTime, t, ctx, 0.05);
      set(wet.gain, balanceWet(depth), ctx);
    },
  };
}

function reverbFx(ctx, { shimmer = false } = {}) {
  const input = gain(ctx);
  const output = gain(ctx);
  const wet = gain(ctx, 0);
  const convolver = ctx.createConvolver();
  let last = null;
  if (shimmer) {
    // SHIMMER: a long, bright reverb with the low end taken out of the tail.
    const hp = biquad(ctx, 'highpass', 700, 0.7);
    const shelf = biquad(ctx, 'highshelf', 5000);
    shelf.gain.value = 8;
    input.connect(hp);
    hp.connect(convolver);
    convolver.connect(shelf);
    shelf.connect(wet);
  } else {
    input.connect(convolver);
    convolver.connect(wet);
  }
  wet.connect(output);
  return {
    input,
    output,
    trails: true,
    dryLevel: balanceDry,
    update({ value, depth }) {
      // BEAT is the reverb amount (1–100 %): longer, bigger tails.
      const amount = Math.max(1, Math.min(100, value)) / 100;
      const seconds = shimmer ? 2 + amount * 6 : 0.6 + amount * 4.4;
      const key = Math.round(seconds * 10);
      if (key !== last) {
        last = key;
        convolver.buffer = makeImpulse(ctx, seconds, { brightness: shimmer ? 0.9 : 0.55, seed: key });
      }
      set(wet.gain, balanceWet(depth) * 0.8, ctx);
    },
  };
}

// FLANGER / PHASER / FILTER mix the original back in themselves, so the
// channel's dry path is muted while they're on. Their BEAT is the sweep cycle.
function flanger(ctx) {
  const input = gain(ctx);
  const output = gain(ctx);
  const direct = gain(ctx, 1);
  const wet = gain(ctx, 0);
  const delay = ctx.createDelay(0.05);
  delay.delayTime.value = 0.004;
  const fb = gain(ctx, 0.6);
  const { osc, amount } = lfo(ctx, 'triangle', 0.0035);
  amount.connect(delay.delayTime);
  input.connect(direct);
  direct.connect(output);
  input.connect(delay);
  delay.connect(fb);
  fb.connect(delay);
  delay.connect(wet);
  wet.connect(output);
  return {
    input,
    output,
    trails: false,
    dryLevel: () => 0,
    update({ seconds, depth }) {
      set(osc.frequency, 1 / Math.max(0.01, seconds), ctx);
      set(wet.gain, depth * 0.9, ctx);
      set(direct.gain, 1 - depth * 0.25, ctx);
    },
    dispose: () => osc.stop(),
  };
}

function phaser(ctx) {
  const input = gain(ctx);
  const output = gain(ctx);
  const direct = gain(ctx, 1);
  const wet = gain(ctx, 0);
  const stages = [0, 1, 2, 3, 4, 5].map(() => biquad(ctx, 'allpass', 900, 0.6));
  const { osc, amount } = lfo(ctx, 'sine', 700);
  input.connect(direct);
  direct.connect(output);
  let node = input;
  for (const s of stages) {
    node.connect(s);
    amount.connect(s.frequency);
    node = s;
  }
  node.connect(wet);
  wet.connect(output);
  return {
    input,
    output,
    trails: false,
    dryLevel: () => 0,
    update({ seconds, depth }) {
      set(osc.frequency, 1 / Math.max(0.01, seconds), ctx);
      set(wet.gain, depth, ctx);
      set(direct.gain, 1 - depth * 0.3, ctx);
    },
    dispose: () => osc.stop(),
  };
}

function sweepFilter(ctx) {
  const input = gain(ctx);
  const output = gain(ctx);
  const direct = gain(ctx, 1);
  const wet = gain(ctx, 0);
  const lp = biquad(ctx, 'lowpass', 2500, 7);
  const { osc, amount } = lfo(ctx, 'sine', 2300);
  amount.connect(lp.frequency);
  input.connect(direct);
  direct.connect(output);
  input.connect(lp);
  lp.connect(wet);
  wet.connect(output);
  return {
    input,
    output,
    trails: false,
    dryLevel: () => 0,
    update({ seconds, depth }) {
      set(osc.frequency, 1 / Math.max(0.01, seconds), ctx);
      set(wet.gain, depth, ctx);
      set(direct.gain, 1 - depth, ctx);
    },
    dispose: () => osc.stop(),
  };
}

// TRANS: chops the sound on and off every BEAT. LEVEL/DEPTH sets how hard
// it cuts.
function trans(ctx) {
  const input = gain(ctx);
  const output = gain(ctx);
  const gate = gain(ctx, 1);
  const { osc, amount } = lfo(ctx, 'square', 0);
  amount.connect(gate.gain);
  input.connect(gate);
  gate.connect(output);
  return {
    input,
    output,
    trails: false,
    dryLevel: () => 0,
    update({ seconds, depth }) {
      // The cut cycle is one on + one off per BEAT.
      set(osc.frequency, 1 / Math.max(0.01, seconds), ctx, 0.005);
      set(gate.gain, 1 - depth / 2, ctx, 0.005);
      set(amount.gain, depth / 2, ctx, 0.005);
    },
    dispose: () => osc.stop(),
  };
}

// ROLL: records one BEAT of sound when it's turned on and repeats it.
function roll(ctx) {
  const input = gain(ctx);
  const output = gain(ctx);
  const capture = gain(ctx, 0);
  const live = gain(ctx, 0);
  const delay = ctx.createDelay(MAX_DELAY);
  const fb = gain(ctx, 0);
  const wet = gain(ctx, 0);
  input.connect(capture);
  capture.connect(delay);
  delay.connect(fb);
  fb.connect(delay);
  delay.connect(wet);
  input.connect(live);
  live.connect(wet);
  wet.connect(output);
  let seconds = 0.5;
  let depth = 0.5;
  return {
    input,
    output,
    trails: false,
    dryLevel: balanceDry,
    update(p) {
      seconds = Math.min(MAX_DELAY, Math.max(0.01, p.seconds));
      depth = p.depth;
      set(wet.gain, balanceWet(depth), ctx);
    },
    start() {
      const now = ctx.currentTime;
      delay.delayTime.cancelScheduledValues(now);
      delay.delayTime.setValueAtTime(seconds, now);
      // The first slice plays live while it's being recorded, then repeats.
      capture.gain.cancelScheduledValues(now);
      capture.gain.setValueAtTime(1, now);
      capture.gain.setValueAtTime(0, now + seconds);
      live.gain.cancelScheduledValues(now);
      live.gain.setValueAtTime(1, now);
      live.gain.setValueAtTime(0, now + seconds);
      fb.gain.cancelScheduledValues(now);
      fb.gain.setValueAtTime(1, now);
    },
    stop() {
      const now = ctx.currentTime;
      capture.gain.cancelScheduledValues(now);
      capture.gain.setValueAtTime(0, now);
      live.gain.cancelScheduledValues(now);
      live.gain.setValueAtTime(0, now);
      fb.gain.cancelScheduledValues(now);
      fb.gain.setValueAtTime(0, now);
    },
  };
}

// A sawtooth shifted by half a cycle, and a cosine, as periodic waves: two
// delay taps swept by offset sawtooths, each faded out around its jump, give a
// smooth pitch shift.
function pitchWaves(ctx) {
  const N = 48;
  const real = new Float32Array(N);
  const sawA = new Float32Array(N);
  const sawB = new Float32Array(N);
  const cos = new Float32Array(N);
  for (let n = 1; n < N; n += 1) {
    sawA[n] = (2 * (-1) ** (n + 1)) / (n * Math.PI); // the standard Web Audio sawtooth
    sawB[n] = -2 / (n * Math.PI); // the same, half a cycle later
  }
  const cosReal = new Float32Array(N);
  cosReal[1] = 1;
  const opts = { disableNormalization: true };
  return {
    sawA: ctx.createPeriodicWave(real, sawA, opts),
    sawB: ctx.createPeriodicWave(real, sawB, opts),
    cos: ctx.createPeriodicWave(cosReal, cos, opts),
  };
}

// PITCH: shifts the pitch by up to BEAT % (−50 to +100), scaled by
// LEVEL/DEPTH.
function pitch(ctx) {
  const WINDOW = 0.06;
  const input = gain(ctx);
  const output = gain(ctx);
  const waves = pitchWaves(ctx);
  const oscs = [];
  const newOsc = (wave) => {
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(wave);
    osc.frequency.value = 1;
    oscs.push(osc);
    return osc;
  };
  const tap = (sawWave, windowSign) => {
    const delay = ctx.createDelay(1);
    delay.delayTime.value = WINDOW / 2;
    const saw = newOsc(sawWave);
    const sweep = gain(ctx, 0);
    saw.connect(sweep);
    sweep.connect(delay.delayTime);
    // Window: 0.5 ± 0.5·cos, silent where this tap's sawtooth jumps.
    const win = gain(ctx, 0.5);
    const cos = newOsc(waves.cos);
    const cosAmt = gain(ctx, 0.5 * windowSign);
    cos.connect(cosAmt);
    cosAmt.connect(win.gain);
    input.connect(delay);
    delay.connect(win);
    win.connect(output);
    return { sweep };
  };
  const a = tap(waves.sawA, 1);
  const b = tap(waves.sawB, -1);
  const start = ctx.currentTime + 0.01;
  oscs.forEach((o) => o.start(start));
  return {
    input,
    output,
    trails: false,
    dryLevel: () => 0,
    update({ value, depth }) {
      const ratio = Math.max(0.5, 1 + (value / 100) * depth);
      const freq = Math.max(0.01, Math.abs(ratio - 1) / WINDOW);
      // A rising sawtooth makes the delay grow (pitch down), so flip it for up.
      const sweep = ratio > 1 ? -WINDOW / 2 : WINDOW / 2;
      const amt = Math.abs(ratio - 1) < 0.001 ? 0 : sweep;
      oscs.forEach((o) => set(o.frequency, freq, ctx, 0.05));
      set(a.sweep.gain, amt, ctx, 0.05);
      set(b.sweep.gain, amt, ctx, 0.05);
    },
    dispose: () => oscs.forEach((o) => o.stop()),
  };
}

// VINYL BRAKE: slows the sound to a stop over BEAT, like hitting STOP on a
// turntable. LEVEL/DEPTH blends the braking sound with the original.
function vinylBrake(ctx) {
  const input = gain(ctx);
  const output = gain(ctx);
  const delay = ctx.createDelay(MAX_DELAY);
  delay.delayTime.value = 0;
  const level = gain(ctx, 1);
  const wet = gain(ctx, 0);
  input.connect(delay);
  delay.connect(level);
  level.connect(wet);
  wet.connect(output);
  let seconds = 1;
  return {
    input,
    output,
    trails: false,
    dryLevel: (d) => Math.max(0, 1 - d * 2),
    update(p) {
      seconds = Math.min(MAX_DELAY * 1.9, Math.max(0.05, p.seconds));
      set(wet.gain, balanceWet(p.depth), ctx);
    },
    start() {
      const now = ctx.currentTime;
      // A delay of d(t) = t²/(2T) makes the speed fall from 1 to 0 over T.
      const steps = 64;
      const curve = new Float32Array(steps);
      for (let i = 0; i < steps; i += 1) {
        const t = (i / (steps - 1)) * seconds;
        curve[i] = Math.min(MAX_DELAY - 0.01, (t * t) / (2 * seconds));
      }
      delay.delayTime.cancelScheduledValues(now);
      delay.delayTime.setValueCurveAtTime(curve, now, seconds);
      level.gain.cancelScheduledValues(now);
      level.gain.setValueAtTime(1, now);
      // Silent once stopped (the delay would otherwise play on at full speed).
      level.gain.setTargetAtTime(0, now + seconds * 0.8, seconds * 0.06);
    },
    stop() {
      const now = ctx.currentTime;
      delay.delayTime.cancelScheduledValues(now);
      delay.delayTime.setValueAtTime(0, now);
      level.gain.cancelScheduledValues(now);
      level.gain.setValueAtTime(1, now);
    },
  };
}

const BUILDERS = {
  DELAY: (ctx) => delayFx(ctx, { feedback: 0.3 }),
  ECHO: (ctx) => delayFx(ctx, { feedback: 0.6, filters: () => [biquad(ctx, 'lowpass', 3500, 0.7)] }),
  'PING PONG': pingPong,
  SPIRAL: (ctx) =>
    delayFx(ctx, {
      feedback: (d) => 0.45 + d * 0.45,
      filters: () => [biquad(ctx, 'bandpass', 1800, 0.6)],
    }),
  HELIX: (ctx) => delayFx(ctx, { feedback: (d) => 0.6 + d * 0.38, level: 0.6 }),
  REVERB: (ctx) => reverbFx(ctx),
  SHIMMER: (ctx) => reverbFx(ctx, { shimmer: true }),
  FLANGER: flanger,
  PHASER: phaser,
  FILTER: sweepFilter,
  TRANS: trans,
  ROLL: roll,
  PITCH: pitch,
  'VINYL BRAKE': vinylBrake,
};

/** Build one BEAT FX effect by name. */
export function createBeatFx(ctx, name) {
  const fx = (BUILDERS[name] ?? BUILDERS.DELAY)(ctx);
  return { start() {}, stop() {}, dispose() {}, ...fx, name };
}
