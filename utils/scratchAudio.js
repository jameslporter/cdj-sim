import { resolveAudioSource } from './audioSource';

// Scratch audio: the deck's normal player (expo-audio) can't play backward or
// follow a hand on the platter, so while the jog is driving the audio we play
// the track from decoded samples with react-native-audio-api instead. It is
// the Web Audio API on web, iOS and Android alike.
//
// The track is decoded once (mono, low rate to keep memory small) and played
// in short chunks: forward chunks straight from the samples, reverse chunks
// copied backward. Speed follows the platter through playbackRate.
//
// react-native-audio-api is a native module, so it's missing in Expo Go. There
// everything here reports "unavailable" and the deck falls back to silent
// seeking.

const SAMPLE_RATE = 22050;
const CHUNK_SECONDS = 3;
const FADE = 0.006; // seconds: crossfade between chunks so a switch doesn't click
const MAX_RATE = 4;

let api;
function getApi() {
  if (api === undefined) {
    try {
      api = require('react-native-audio-api');
    } catch {
      api = null;
    }
  }
  return api;
}

let context = null;
function getContext() {
  const audio = getApi();
  if (!audio) return null;
  if (!context) {
    try {
      context = new audio.AudioContext({ sampleRate: 44100 });
    } catch {
      return null;
    }
  }
  return context;
}

export const isScratchAudioSupported = () => getApi() != null;

// Decoded mono samples per track id, kept for the last few tracks.
const cache = new Map();
const CACHE_SIZE = 4;

async function sourceToDecodable(source) {
  if (typeof source === 'number') {
    const { Asset } = require('expo-asset');
    const asset = Asset.fromModule(source);
    await asset.downloadAsync();
    return asset.localUri || asset.uri;
  }
  return source?.uri ?? source;
}

/** Decode a track for scratching. Resolves to { samples, sampleRate } or null. */
export function loadScratchSamples(track) {
  const audio = getApi();
  if (!audio || !track) return Promise.resolve(null);
  if (cache.has(track.id)) return cache.get(track.id);
  const promise = (async () => {
    const input = await sourceToDecodable(await resolveAudioSource(track));
    const buffer = await audio.decodeAudioData(input, SAMPLE_RATE);
    const length = buffer.length;
    const samples = new Float32Array(length);
    const channels = buffer.numberOfChannels;
    for (let c = 0; c < channels; c += 1) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < length; i += 1) samples[i] += data[i] / channels;
    }
    return { samples, sampleRate: buffer.sampleRate };
  })().catch(() => {
    cache.delete(track.id);
    return null;
  });
  cache.set(track.id, promise);
  while (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value);
  return promise;
}

/**
 * One deck's scratch output. Call setSpeed() every frame with the audio's
 * speed in track-seconds per second (negative = backward) and the deck's
 * position; the voice keeps its own chunk lined up with that position.
 */
export function createScratchVoice() {
  let data = null; // { samples, sampleRate }
  let current = null; // { source, gain, dir, startPos, endPos }
  let volume = 1;
  let level = 0;

  const ctx = () => getContext();

  function stopChunk(chunk, when) {
    if (!chunk) return;
    try {
      chunk.gain.gain.setTargetAtTime(0, when, FADE / 3);
      chunk.source.stop(when + FADE * 2);
    } catch {
      // already stopped
    }
  }

  function startChunk(pos, dir, rate) {
    const audioCtx = ctx();
    if (!audioCtx || !data) return;
    const { samples, sampleRate } = data;
    const total = samples.length;
    const at = Math.round(pos * sampleRate);
    const len = Math.round(CHUNK_SECONDS * sampleRate);
    let from;
    let to;
    if (dir > 0) {
      from = Math.min(Math.max(at, 0), total);
      to = Math.min(from + len, total);
    } else {
      to = Math.min(Math.max(at, 0), total);
      from = Math.max(to - len, 0);
    }
    const count = to - from;
    if (count < 2) {
      stopChunk(current, audioCtx.currentTime);
      current = null;
      return;
    }
    const chunk = new Float32Array(count);
    if (dir > 0) chunk.set(samples.subarray(from, to));
    else for (let i = 0; i < count; i += 1) chunk[i] = samples[to - 1 - i];

    const buffer = audioCtx.createBuffer(1, count, sampleRate);
    buffer.copyToChannel(chunk, 0);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = Math.max(rate, 0.0001);
    const gain = audioCtx.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    gain.gain.setTargetAtTime(level * volume, now, FADE / 3);
    source.start(now);

    stopChunk(current, now);
    current = { source, gain, dir, rate, pos, at: now, startPos: from / sampleRate, endPos: to / sampleRate };
  }

  return {
    get ready() {
      return data != null && ctx() != null;
    },
    setData(next) {
      this.stop();
      data = next;
    },
    setVolume(v) {
      volume = v;
    },
    /** Wake the audio output (call from a touch so browsers allow sound). */
    resume() {
      const audioCtx = ctx();
      if (audioCtx && audioCtx.state !== 'running') audioCtx.resume?.().catch?.(() => {});
    },
    setSpeed(speed, pos) {
      const audioCtx = ctx();
      if (!audioCtx || !data) return;
      const now = audioCtx.currentTime;
      const rate = Math.min(Math.abs(speed), MAX_RATE);
      // Near standstill a record makes almost no sound.
      level = Math.min(1, rate / 0.12);
      // Where the chunk that's playing has got to, by the speeds it was given.
      if (current) {
        current.pos += current.dir * current.rate * (now - current.at);
        current.at = now;
      }
      // A hand that's barely moving jitters back and forth; don't restart
      // the sound for that, it's near-silent anyway.
      let dir = speed >= 0 ? 1 : -1;
      if (current && rate < 0.08) dir = current.dir;
      const applied = current && dir !== (speed >= 0 ? 1 : -1) ? 0.0001 : Math.max(rate, 0.0001);
      const restart =
        !current ||
        current.dir !== dir ||
        Math.abs(current.pos - pos) > 0.04 ||
        (dir > 0 ? pos > current.endPos - 0.25 : pos < current.startPos + 0.25);
      if (restart) {
        startChunk(pos, dir, applied);
        if (!current) return;
        current.pos = pos;
        current.at = now;
      }
      current.rate = applied;
      current.source.playbackRate.setTargetAtTime(applied, now, 0.004);
      current.gain.gain.setTargetAtTime(level * volume, now, 0.01);
    },
    stop() {
      const audioCtx = ctx();
      if (audioCtx) stopChunk(current, audioCtx.currentTime);
      current = null;
    },
  };
}
