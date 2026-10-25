import { useEffect, useState } from 'react';

// The zoomed waveform needs much finer detail than the stored overview
// levels (which have ~1400 values per track), so each deck measures it from
// the decoded audio once the track is loaded: loudness plus low / mid / high
// band levels, DETAIL_RATE times a second. It runs in small chunks so the UI
// keeps moving, and is kept for the last few tracks.
export const DETAIL_RATE = 60;
const STRIDE = 2; // read every other sample: plenty for a picture
const CHUNK_SECONDS = 6;
const CACHE_SIZE = 4;
const cache = new Map(); // key → Promise<detail>

const yieldToUi = () => new Promise((resolve) => setTimeout(resolve, 0));

const normalise = (arr) => {
  let max = 0;
  for (let i = 0; i < arr.length; i += 1) if (arr[i] > max) max = arr[i];
  if (max > 0) for (let i = 0; i < arr.length; i += 1) arr[i] /= max;
  return arr;
};

/** Measure { rate, peaks, low, mid, high } (all 0–1) from an AudioBuffer. */
export async function measureDetail(buffer, isCancelled = () => false) {
  const rate = buffer.sampleRate / STRIDE;
  const left = buffer.getChannelData(0);
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
  const per = Math.max(1, Math.round(buffer.sampleRate / DETAIL_RATE));
  const count = Math.ceil(buffer.length / per);
  const peaks = new Float32Array(count);
  const low = new Float32Array(count);
  const mid = new Float32Array(count);
  const high = new Float32Array(count);
  const aLow = 1 - Math.exp((-2 * Math.PI * 200) / rate);
  const aHigh = 1 - Math.exp((-2 * Math.PI * 2500) / rate);
  let lp1 = 0;
  let lp2 = 0;
  const slicesPerChunk = CHUNK_SECONDS * DETAIL_RATE;
  for (let first = 0; first < count; first += slicesPerChunk) {
    const last = Math.min(count, first + slicesPerChunk);
    for (let p = first; p < last; p += 1) {
      const start = p * per;
      const end = Math.min(buffer.length, start + per);
      let sa = 0;
      let sl = 0;
      let sm = 0;
      let sh = 0;
      let n = 0;
      for (let i = start; i < end; i += STRIDE) {
        const x = (left[i] + right[i]) * 0.5;
        lp1 += aLow * (x - lp1);
        lp2 += aHigh * (x - lp2);
        const m = lp2 - lp1;
        const h = x - lp2;
        sa += x * x;
        sl += lp1 * lp1;
        sm += m * m;
        sh += h * h;
        n += 1;
      }
      if (n) {
        peaks[p] = Math.sqrt(sa / n);
        low[p] = Math.sqrt(sl / n);
        mid[p] = Math.sqrt(sm / n);
        high[p] = Math.sqrt(sh / n);
      }
    }
    await yieldToUi();
    if (isCancelled()) return null;
  }
  return {
    rate: buffer.sampleRate / per,
    peaks: normalise(peaks),
    low: normalise(low),
    mid: normalise(mid),
    high: normalise(high),
  };
}

/**
 * The fine waveform detail of the deck's loaded track, or null until it's
 * ready (or when the player has no decoded audio, as in Expo Go).
 */
export function useWaveformDetail(player, isLoaded, key) {
  const [detail, setDetail] = useState(null);
  useEffect(() => {
    setDetail(null);
    const buffer = player?.buffer;
    if (!isLoaded || !buffer || typeof buffer.getChannelData !== 'function') return undefined;
    let cancelled = false;
    let promise = cache.get(key);
    if (!promise) {
      promise = measureDetail(buffer).catch(() => null);
      cache.set(key, promise);
      while (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value);
    }
    promise.then((d) => {
      if (!cancelled) setDetail(d);
    });
    return () => {
      cancelled = true;
    };
  }, [player, isLoaded, key]);
  return detail;
}
