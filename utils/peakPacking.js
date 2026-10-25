// Waveform levels (0..1) are packed as one character per value so track
// metadata stays small (~1.4 KB per level array).
const PEAK_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function packPeaks(peaks) {
  if (!peaks) return null;
  return Array.from(peaks, (v) => PEAK_ALPHABET[Math.round(Math.min(1, Math.max(0, v)) * 63)]).join('');
}

export function unpackPeaks(packed) {
  if (!packed) return undefined;
  return Array.from(packed, (c) => PEAK_ALPHABET.indexOf(c) / 63);
}

/** Pack/unpack the { low, mid, high } frequency band levels. */
export function packBands(bands) {
  if (!bands) return null;
  return {
    low: packPeaks(bands.low),
    mid: packPeaks(bands.mid),
    high: packPeaks(bands.high),
  };
}

export function unpackBands(packed) {
  if (!packed?.low) return undefined;
  return {
    low: unpackPeaks(packed.low),
    mid: unpackPeaks(packed.mid),
    high: unpackPeaks(packed.high),
  };
}
