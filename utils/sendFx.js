import { makeImpulse } from './beatFx';

// The DJM-V10's built-in SEND effects: one shared unit. Every channel's SEND
// knob feeds it; the effect sound comes back as the input of any channel set
// to BUILT-IN and, with MASTER MIX on, straight to the master.
//
//   SIZE/FEEDBACK  delay feedback, or the reverb's room size
//   TIME           delay time, or the reverb time
//   TONE           filters the effect sound: left darker (LPF), right thinner (HPF)

export const SEND_FX_TYPES = ['SHORT DELAY', 'LONG DELAY', 'DUB ECHO', 'REVERB'];
export const SEND_FX_SOURCES = [...SEND_FX_TYPES, 'EXT1', 'EXT2'];

function set(param, value, ctx, smooth = 0.03) {
  try {
    param.setTargetAtTime(value, ctx.currentTime, smooth);
  } catch {
    param.value = value;
  }
}

/** Delay time in seconds for a TIME knob position (0–1). */
export function sendDelaySeconds(type, time) {
  if (type === 'SHORT DELAY') return 0.02 + time * 0.38; // 20–400 ms
  if (type === 'LONG DELAY') return 0.2 + time * 1.3; // 200–1500 ms
  return 0.1 + time * 1.4; // DUB ECHO: 100–1500 ms
}

/** TONE knob → { lp, hp } cutoffs; the middle is flat. */
export function sendToneCutoffs(tone) {
  const lp = tone < 0.48 ? 400 * (20000 / 400) ** (tone / 0.48) : 20000;
  const hp = tone > 0.52 ? 20 * (4000 / 20) ** ((tone - 0.52) / 0.48) : 20;
  return { lp, hp };
}

export function createSendFx(ctx) {
  const input = ctx.createGain();
  const output = ctx.createGain();

  // Delays: input → delay ⇄ feedback (with a darkening filter for DUB ECHO).
  const delay = ctx.createDelay(2);
  const fb = ctx.createGain();
  const dubLp = ctx.createBiquadFilter();
  dubLp.type = 'lowpass';
  dubLp.frequency.value = 20000;
  const dubHp = ctx.createBiquadFilter();
  dubHp.type = 'highpass';
  dubHp.frequency.value = 20;
  const delayOut = ctx.createGain();
  input.connect(delay);
  delay.connect(dubLp);
  dubLp.connect(dubHp);
  dubHp.connect(fb);
  fb.connect(delay);
  dubHp.connect(delayOut);

  const reverb = ctx.createConvolver();
  const reverbOut = ctx.createGain();
  input.connect(reverb);
  reverb.connect(reverbOut);

  // TONE, on whichever effect is sounding.
  const toneLp = ctx.createBiquadFilter();
  toneLp.type = 'lowpass';
  const toneHp = ctx.createBiquadFilter();
  toneHp.type = 'highpass';
  delayOut.connect(toneLp);
  reverbOut.connect(toneLp);
  toneLp.connect(toneHp);
  toneHp.connect(output);

  let irKey = null;

  return {
    input,
    output,
    apply({ source, size, time, tone }) {
      const builtIn = SEND_FX_TYPES.includes(source);
      const isReverb = source === 'REVERB';
      const isDelay = builtIn && !isReverb;
      set(delayOut.gain, isDelay ? 1 : 0, ctx);
      set(reverbOut.gain, isReverb ? 0.8 : 0, ctx);
      if (isDelay) {
        set(delay.delayTime, sendDelaySeconds(source, time), ctx, 0.08);
        const dub = source === 'DUB ECHO';
        set(fb.gain, Math.min(0.92, size * (dub ? 0.95 : 0.85)), ctx);
        set(dubLp.frequency, dub ? 2600 : 20000, ctx);
        set(dubHp.frequency, dub ? 250 : 20, ctx);
      } else {
        set(fb.gain, 0, ctx);
      }
      if (isReverb) {
        // SIZE sets the room (how dense and bright), TIME the decay length.
        const seconds = 0.5 + time * 5.5;
        const key = `${Math.round(seconds * 10)}:${Math.round(size * 10)}`;
        if (key !== irKey) {
          irKey = key;
          reverb.buffer = makeImpulse(ctx, seconds, { brightness: 0.3 + size * 0.6, seed: seconds * 10 + size * 7 });
        }
      }
      const { lp, hp } = sendToneCutoffs(tone);
      set(toneLp.frequency, lp, ctx);
      set(toneHp.frequency, hp, ctx);
    },
  };
}
