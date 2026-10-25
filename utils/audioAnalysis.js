// What rekordbox would normally do before a track reaches a CDJ: read its
// tags, measure its length, detect its BPM / first beat, and draw a waveform.
// Runs on-device on every platform (web, iOS, Android).

const ANALYSIS_RATE = 22050; // decode at a low rate: plenty for beats, half the memory
const HOP = 64; // ≈ 2.9 ms per onset-envelope frame
export const PEAK_COUNT = 1400; // matches the zoomed waveform's bar count
const MIN_BPM = 70;
const MAX_BPM = 180;

// ---------------------------------------------------------------- tags --

// Hand-rolled text decoding: TextDecoder isn't available in every
// React Native JS engine.
function decodeUtf8(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const c = bytes[i];
    let cp = c;
    let n = 1;
    if (c >= 0xf0) [cp, n] = [c & 0x07, 4];
    else if (c >= 0xe0) [cp, n] = [c & 0x0f, 3];
    else if (c >= 0xc0) [cp, n] = [c & 0x1f, 2];
    for (let k = 1; k < n; k += 1) cp = (cp << 6) | ((bytes[i + k] ?? 0) & 0x3f);
    out += String.fromCodePoint(cp);
    i += n;
  }
  return out;
}

function decodeUtf16(bytes, bigEndian) {
  let i = 0;
  let be = bigEndian;
  if (bytes[0] === 0xfe && bytes[1] === 0xff) [be, i] = [true, 2];
  else if (bytes[0] === 0xff && bytes[1] === 0xfe) [be, i] = [false, 2];
  const units = [];
  for (; i + 1 < bytes.length; i += 2) units.push(be ? (bytes[i] << 8) | bytes[i + 1] : bytes[i] | (bytes[i + 1] << 8));
  return String.fromCharCode(...units);
}

function decodeText(bytes, encoding) {
  let text;
  if (encoding === 0) text = String.fromCharCode(...bytes);
  else if (encoding === 1) text = decodeUtf16(bytes, false);
  else if (encoding === 2) text = decodeUtf16(bytes, true);
  else text = decodeUtf8(bytes);
  return text.replace(/\0+$/g, '').split('\0')[0].trim();
}

/** Minimal ID3v2.3 / v2.4 reader for the few frames a CDJ shows. */
export function readId3Tags(arrayBuffer) {
  const b = new Uint8Array(arrayBuffer);
  if (b.length < 10 || b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33) return {};
  const version = b[3];
  const flags = b[5];
  const tagSize = ((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f);
  const end = Math.min(b.length, 10 + tagSize);
  let pos = 10;
  if (flags & 0x40) {
    // Extended header: skip it.
    const extSize =
      version === 4
        ? ((b[10] & 0x7f) << 21) | ((b[11] & 0x7f) << 14) | ((b[12] & 0x7f) << 7) | (b[13] & 0x7f)
        : ((b[10] << 24) | (b[11] << 16) | (b[12] << 8) | b[13]) + 4;
    pos += extSize;
  }
  const wanted = { TIT2: 'title', TPE1: 'artist', TBPM: 'bpm', TKEY: 'key' };
  const tags = {};
  while (pos + 10 <= end) {
    const id = String.fromCharCode(b[pos], b[pos + 1], b[pos + 2], b[pos + 3]);
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const size =
      version === 4
        ? ((b[pos + 4] & 0x7f) << 21) | ((b[pos + 5] & 0x7f) << 14) | ((b[pos + 6] & 0x7f) << 7) | (b[pos + 7] & 0x7f)
        : (b[pos + 4] << 24) | (b[pos + 5] << 16) | (b[pos + 6] << 8) | b[pos + 7];
    const start = pos + 10;
    if (size <= 0 || start + size > end) break;
    if (wanted[id]) {
      const value = decodeText(b.subarray(start + 1, start + size), b[start]);
      if (value) tags[wanted[id]] = value;
    }
    pos = start + size;
  }
  return tags;
}

/** "01 - Artist - Title (Extended Mix).mp3" → { artist, title } */
export function parseFileName(name) {
  const base = name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
  const parts = base.split(/\s+[-–—]\s+/).filter(Boolean);
  if (parts.length >= 2 && /^\d{1,3}$/.test(parts[0])) parts.shift();
  if (parts.length >= 2) return { artist: parts[0], title: parts.slice(1).join(' - ') };
  return { artist: '', title: base.replace(/^\d{1,3}[.\s]+/, '') || name };
}

// ----------------------------------------------------------- analysis --

function toMono(buffer) {
  const n = buffer.length;
  const mono = new Float32Array(n);
  for (let c = 0; c < buffer.numberOfChannels; c += 1) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < n; i += 1) mono[i] += data[i];
  }
  if (buffer.numberOfChannels > 1) for (let i = 0; i < n; i += 1) mono[i] /= buffer.numberOfChannels;
  return mono;
}

// Low-passed energy flux: rises sharply on kicks and bass hits.
function onsetEnvelope(mono, sampleRate) {
  const frames = Math.floor(mono.length / HOP);
  const env = new Float32Array(frames);
  const alpha = 1 - Math.exp((-2 * Math.PI * 180) / sampleRate); // ~180 Hz one-pole low-pass
  let lp = 0;
  let prev = 0;
  for (let f = 0; f < frames; f += 1) {
    let energy = 0;
    let full = 0;
    for (let i = f * HOP, e = i + HOP; i < e; i += 1) {
      lp += alpha * (mono[i] - lp);
      energy += lp * lp;
      full += mono[i] * mono[i];
    }
    const level = Math.log1p(1000 * energy) + 0.3 * Math.log1p(100 * full);
    env[f] = Math.max(0, level - prev);
    prev = level;
  }
  // Remove the local mean so sustained loud sections don't dominate.
  const win = 32;
  const out = new Float32Array(frames);
  let sum = 0;
  for (let f = 0; f < frames; f += 1) {
    sum += env[f];
    if (f >= win) sum -= env[f - win];
    out[f] = Math.max(0, env[f] - sum / Math.min(f + 1, win));
  }
  return out;
}

// Fold the onset envelope onto one beat period: at the right tempo every
// kick lands in the same phase bin, so the histogram gets a sharp peak.
// Returns that peak's sharpness and its phase (the first beat, in seconds).
function foldScore(env, fps, bpm, hist) {
  const bins = hist.length;
  const period = (60 * fps) / bpm;
  hist.fill(0);
  for (let f = 0; f < env.length; f += 1) {
    const v = env[f];
    if (v > 0) hist[Math.floor(((f % period) / period) * bins) % bins] += v;
  }
  let peak = 0;
  let peakBin = 0;
  let total = 0;
  for (let i = 0; i < bins; i += 1) {
    total += hist[i];
    if (hist[i] > peak) {
      peak = hist[i];
      peakBin = i;
    }
  }
  return { score: total > 0 ? peak / (total / bins) : 0, phase: (((peakBin + 0.5) / bins) * period) / fps };
}

// Scan the DJ tempo range, then fine-tune around the winner. A gentle prior
// toward 85–175 BPM avoids half/double-tempo picks.
function findBeatGrid(env, fps) {
  const hist = new Float32Array(48);
  const prior = (bpm) => (bpm < 85 || bpm > 175 ? 0.85 : 1);
  let best = { score: -Infinity, bpm: 120, phase: 0 };
  const consider = (bpm) => {
    const r = foldScore(env, fps, bpm, hist);
    const score = r.score * prior(bpm);
    if (score > best.score) best = { score, bpm, phase: r.phase };
  };
  for (let bpm = MIN_BPM; bpm <= MAX_BPM; bpm += 0.25) consider(bpm);
  const coarse = best.bpm;
  for (let bpm = coarse - 0.3; bpm <= coarse + 0.3; bpm += 0.01) consider(bpm);
  // Most dance music sits on whole numbers: snap when we're within a hair.
  const whole = Math.round(best.bpm);
  const tenth = Math.round(best.bpm * 10) / 10;
  let bpm = Math.round(best.bpm * 100) / 100;
  if (Math.abs(best.bpm - whole) < 0.08) bpm = whole;
  else if (Math.abs(best.bpm - tenth) < 0.02) bpm = tenth;
  return { bpm, firstBeat: foldScore(env, fps, bpm, hist).phase };
}

export function detectBeatGrid(mono, sampleRate) {
  const env = onsetEnvelope(mono, sampleRate);
  const fps = sampleRate / HOP;
  if (env.length < fps * 4) return { bpm: 120, firstBeat: 0 };
  return findBeatGrid(env, fps);
}

// Loudness (RMS) per slice, normalised to the loudest slice — reads more like
// rekordbox's waveform than raw peaks, which are flat on mastered tracks.
export function computePeaks(mono, count = PEAK_COUNT) {
  const levels = new Array(count).fill(0);
  const per = mono.length / count;
  let max = 0;
  for (let p = 0; p < count; p += 1) {
    const start = Math.floor(p * per);
    const end = Math.max(start + 1, Math.floor((p + 1) * per));
    let sum = 0;
    for (let i = start; i < end; i += 1) sum += mono[i] * mono[i];
    levels[p] = Math.sqrt(sum / (end - start));
    if (levels[p] > max) max = levels[p];
  }
  return levels.map((v) => (max > 0 ? Math.round((v / max) * 100) / 100 : 0));
}

// Loudness of the low (bass, < ~200 Hz), mid and high (> ~2.5 kHz) parts of
// each slice, for the RGB and 3 BAND waveform colours. Each band is
// normalised to its own loudest slice, like rekordbox's coloured waveforms.
export function computeBands(mono, sampleRate, count = PEAK_COUNT) {
  const aLow = 1 - Math.exp((-2 * Math.PI * 200) / sampleRate);
  const aHigh = 1 - Math.exp((-2 * Math.PI * 2500) / sampleRate);
  const out = { low: new Array(count).fill(0), mid: new Array(count).fill(0), high: new Array(count).fill(0) };
  const max = { low: 0, mid: 0, high: 0 };
  const per = mono.length / count;
  let lp1 = 0;
  let lp2 = 0;
  for (let p = 0; p < count; p += 1) {
    const start = Math.floor(p * per);
    const end = Math.max(start + 1, Math.floor((p + 1) * per));
    let sl = 0;
    let sm = 0;
    let sh = 0;
    for (let i = start; i < end; i += 1) {
      const x = mono[i] || 0;
      lp1 += aLow * (x - lp1);
      lp2 += aHigh * (x - lp2);
      const mid = lp2 - lp1;
      const high = x - lp2;
      sl += lp1 * lp1;
      sm += mid * mid;
      sh += high * high;
    }
    const n = end - start;
    out.low[p] = Math.sqrt(sl / n);
    out.mid[p] = Math.sqrt(sm / n);
    out.high[p] = Math.sqrt(sh / n);
    for (const b of ['low', 'mid', 'high']) if (out[b][p] > max[b]) max[b] = out[b][p];
  }
  for (const b of ['low', 'mid', 'high']) {
    out[b] = out[b].map((v) => (max[b] > 0 ? Math.round((v / max[b]) * 100) / 100 : 0));
  }
  return out;
}

const yieldToUi = () => new Promise((resolve) => setTimeout(resolve, 0));

// react-native-audio-api gives the same decodeAudioData on web, iOS and
// Android. It's a native module, so it's missing in Expo Go: there we fall
// back to tags only (no BPM detection or real waveform).
let decoder;
function getDecoder() {
  if (decoder === undefined) {
    try {
      decoder = require('react-native-audio-api').decodeAudioData;
    } catch {
      decoder = null;
    }
  }
  return decoder;
}

async function decode(arrayBuffer) {
  const decodeAudioData = getDecoder();
  if (!decodeAudioData) return null;
  return decodeAudioData(arrayBuffer, ANALYSIS_RATE);
}

/**
 * Everything the deck needs to know about a user's file.
 * `bytes` is the file's ArrayBuffer, `name` its file name.
 */
export async function analyzeAudio({ name, bytes }) {
  const tags = readId3Tags(bytes);
  const fromName = parseFileName(name);
  const buffer = await decode(bytes.slice(0)); // decoding may detach its input
  await yieldToUi();
  const mono = buffer ? toMono(buffer) : null;
  const grid = mono ? detectBeatGrid(mono, buffer.sampleRate) : { bpm: 120, firstBeat: 0 };
  await yieldToUi();
  const taggedBpm = parseFloat(tags.bpm);
  const bpm = taggedBpm >= MIN_BPM / 2 && taggedBpm <= MAX_BPM * 1.5 ? taggedBpm : grid.bpm;
  return {
    title: tags.title || fromName.title,
    artist: tags.artist || fromName.artist || 'Unknown Artist',
    key: tags.key || '—',
    bpm,
    firstBeat: bpm === grid.bpm ? grid.firstBeat : 0,
    duration: buffer ? buffer.duration : 0, // 0 = unknown until the deck loads it
    peaks: mono ? computePeaks(mono) : null,
    bands: mono ? computeBands(mono, buffer.sampleRate) : null,
    analyzed: Boolean(buffer),
  };
}
