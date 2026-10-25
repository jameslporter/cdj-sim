import { createContext, useContext, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { cdj } from '../constants/theme';

// Deterministic pseudo-audio envelope so the same track always draws the
// same shape.
export function waveSample(i) {
  const beat = Math.abs(Math.sin(i * 0.785)) ** 3;
  const phrase = 0.55 + 0.45 * Math.abs(Math.sin(i * 0.031));
  const texture = 0.25 * Math.abs(Math.cos(i * 0.37 + 1.3));
  return Math.min(1, (0.35 + 0.65 * beat) * phrase + texture * 0.4);
}

// WAVEFORM COLOR (UTILITY): 'BLUE', 'RGB' or '3BAND'. Each deck provides
// its own setting to the waveforms on its screen.
export const WaveformColorContext = createContext('BLUE');

const BAND3 = { low: '#2a64ff', mid: '#ff9d1c', high: '#f4f8ff' };
const BAND3_DIM = { low: '#3a3f47', mid: '#565b63', high: '#80858c' };

// Without analysed bands (Expo Go, or tracks imported before band analysis),
// fall back to a plausible split of the loudness.
const fallbackBands = (amp) => ({
  low: amp,
  mid: amp * 0.75,
  high: amp * 0.45,
});

const hex = (v) =>
  Math.round(Math.min(1, Math.max(0, v)) * 255)
    .toString(16)
    .padStart(2, '0');

// rekordbox-style RGB: bass red, mids green, highs blue, scaled up so the
// strongest of the three is at full brightness.
export function rgbColor({ low, mid, high }) {
  const r = low;
  const g = mid * 0.9;
  const b = high * 1.1;
  const top = Math.max(r, g, b, 0.001);
  return `#${hex(r / top)}${hex(g / top)}${hex(b / top)}`;
}

// One waveform column, mirrored around the centre line like rekordbox's.
export function WaveColumn({ amp, bands, height, dim, mode = 'BLUE' }) {
  const h = amp * height;
  if (mode === '3BAND') {
    const b = bands ?? fallbackBands(amp);
    const colors = dim ? BAND3_DIM : BAND3;
    // Bass behind, highs in front; each band's own level sets its height.
    const layers = [
      ['low', b.low * height],
      ['mid', b.mid * 0.75 * height],
      ['high', b.high * 0.4 * height],
    ];
    return (
      <View style={styles.column}>
        {layers.map(([name, lh]) =>
          lh > 0.5 ? (
            <View key={name} style={[styles.layer, { height: lh, top: (height - lh) / 2, backgroundColor: colors[name] }]} />
          ) : null
        )}
      </View>
    );
  }
  if (h <= 0) return <View style={styles.column} />;
  if (mode === 'RGB') {
    const color = dim ? cdj.wavePlayed : rgbColor(bands ?? fallbackBands(amp));
    return (
      <View style={styles.column}>
        <View style={[styles.band, { height: h, backgroundColor: color }]} />
      </View>
    );
  }
  return (
    <View style={styles.column}>
      <View style={[styles.band, { height: h, backgroundColor: dim ? cdj.wavePlayed : cdj.waveLow }]}>
        <View style={[styles.band, { height: h * 0.62, backgroundColor: dim ? '#565b63' : cdj.waveMid }]}>
          <View style={[styles.band, { height: h * 0.28, backgroundColor: dim ? '#80858c' : cdj.waveHigh }]} />
        </View>
      </View>
    </View>
  );
}

// Loudest value of `arr` between fractions `a` and `b` of its length.
function maxIn(arr, a, b) {
  const from = Math.floor(a * arr.length);
  const to = Math.max(from + 1, Math.floor(b * arr.length));
  let m = 0;
  for (let k = from; k < to && k < arr.length; k += 1) m = Math.max(m, arr[k]);
  return m;
}

// Overview waveform of the whole track (bottom strip of the CDJ screen).
// Played part is greyed out, like the CDJ-3000X.
// Tracks carry real loudness `peaks` (and frequency `bands`) from analysis;
// the synthetic envelope above is only a fallback.
export default function Waveform({
  progressRatio,
  loopRange,
  peaks,
  bands,
  height = 30,
  barCount = 90,
  seed = 0,
  showPlayhead = true,
}) {
  const mode = useContext(WaveformColorContext);
  const columns = useMemo(() => {
    const result = [];
    for (let i = 0; i < barCount; i += 1) {
      const a = i / barCount;
      const b = (i + 1) / barCount;
      result.push({
        amp: peaks?.length ? maxIn(peaks, a, b) : waveSample(i * 4.4 + seed),
        bands: bands?.low?.length
          ? { low: maxIn(bands.low, a, b), mid: maxIn(bands.mid, a, b), high: maxIn(bands.high, a, b) }
          : null,
      });
    }
    return result;
  }, [barCount, peaks, bands, seed]);

  const clamped = Math.min(1, Math.max(0, progressRatio));

  return (
    <View style={[styles.waveform, { height }]}>
      {columns.map((col, i) => (
        <WaveColumn
          key={i}
          amp={col.amp}
          bands={col.bands}
          height={height}
          mode={mode}
          dim={i / columns.length < clamped}
        />
      ))}
      {loopRange ? (
        <View
          style={[
            styles.loopRegion,
            {
              left: `${loopRange.startRatio * 100}%`,
              width: `${Math.max(0, (loopRange.endRatio - loopRange.startRatio) * 100)}%`,
            },
          ]}
        />
      ) : null}
      {showPlayhead ? <View style={[styles.playhead, { left: `${clamped * 100}%` }]} /> : null}
    </View>
  );
}

// A stable per-track offset into the synthetic waveform, so tracks without
// analysed peaks still draw different shapes.
export function waveSeed(id = '') {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 9973;
  return h;
}

const styles = StyleSheet.create({
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    gap: 1,
  },
  column: {
    flex: 1,
    minWidth: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  band: {
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  loopRegion: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: cdj.loopFill,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: cdj.loopEdge,
  },
  playhead: {
    position: 'absolute',
    top: -2,
    bottom: -2,
    width: 2,
    marginLeft: -1,
    backgroundColor: cdj.screenText,
  },
});
