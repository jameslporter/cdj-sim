import { useContext, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { cdj, hotCueColors } from '../constants/theme';
import { WaveColumn, WaveformColorContext, waveSample } from './Waveform';

const COLUMNS = 96;
// Seconds of track shown across the zoomed waveform by default (about four
// bars of a house track). The rotary selector zooms in and out.
export const ZOOM_WINDOW_SECONDS = 8;

// Loudness and band levels at track time `t`. Once the deck has measured the
// loaded track's fine `detail` it's used; until then, imported tracks use
// their stored levels and demo tracks a synthetic envelope that pulses on
// the beat grid.
function columnAt(t, span, { duration, peaks, bands, detail, seed, firstBeat, beat }) {
  if (t < 0 || t > duration) return { amp: 0, bands: null };
  if (detail) {
    // Loudest of the detail slices this column covers.
    const n = detail.peaks.length;
    const from = Math.min(n - 1, Math.floor(t * detail.rate));
    const to = Math.min(n, Math.max(from + 1, Math.floor((t + span) * detail.rate)));
    const c = { amp: 0, bands: { low: 0, mid: 0, high: 0 } };
    for (let i = from; i < to; i += 1) {
      c.amp = Math.max(c.amp, detail.peaks[i]);
      c.bands.low = Math.max(c.bands.low, detail.low[i]);
      c.bands.mid = Math.max(c.bands.mid, detail.mid[i]);
      c.bands.high = Math.max(c.bands.high, detail.high[i]);
    }
    return c;
  }
  if (peaks?.length) {
    const i = Math.min(peaks.length - 1, Math.floor((t / duration) * peaks.length));
    return {
      amp: peaks[i],
      bands: bands?.low?.length ? { low: bands.low[i], mid: bands.mid[i], high: bands.high[i] } : null,
    };
  }
  return { amp: waveSample(((t - firstBeat) / beat) * 4 + seed), bands: null };
}

function Columns({ firstCol, colSeconds, height, info, mode }) {
  const cols = [];
  for (let k = 0; k <= COLUMNS; k += 1) {
    const c = columnAt((firstCol + k) * colSeconds, colSeconds, info);
    cols.push(<WaveColumn key={k} amp={c.amp} bands={c.bands} height={height} mode={mode} dim={false} />);
  }
  return cols;
}

/**
 * The scrolling waveform in the middle of the CDJ screen. The track moves
 * past a fixed playhead at a fixed time scale, with a line on every beat of
 * the track's beat grid and a red line on the first beat of each bar.
 * Positions and cue times are in track seconds.
 */
export default function ZoomWaveform({
  position,
  duration,
  bpm,
  firstBeat = 0,
  peaks,
  bands,
  detail,
  seed = 0,
  loop,
  hotCues,
  memoryCues,
  height = 76,
  windowSeconds = ZOOM_WINDOW_SECONDS,
  gridAdjust = false,
}) {
  const [width, setWidth] = useState(1);
  const mode = useContext(WaveformColorContext);
  const beat = 60 / (bpm || 120);
  const start = position - windowSeconds / 2;
  const xOf = (t) => (t - start) / windowSeconds; // 0–1 across the view

  // Columns sit on a fixed grid of track time and the row slides by the
  // leftover fraction, so the waveform scrolls without shimmering.
  const colSeconds = windowSeconds / COLUMNS;
  const firstCol = Math.floor(start / colSeconds);
  const shift = ((firstCol * colSeconds - start) / windowSeconds) * width;
  const info = { duration, peaks, bands, detail, seed, firstBeat, beat };

  const grid = [];
  const firstIdx = Math.ceil((start - firstBeat) / beat);
  for (let b = firstIdx; firstBeat + b * beat <= start + windowSeconds; b += 1) {
    const t = firstBeat + b * beat;
    if (t < 0 || t > duration) continue;
    const downbeat = ((b % 4) + 4) % 4 === 0;
    grid.push(
      <View
        key={b}
        style={[styles.gridLine, downbeat && styles.gridBar, gridAdjust && !downbeat && styles.gridAdjust, { left: `${xOf(t) * 100}%` }]}
      />
    );
  }

  const markers = [];
  (hotCues || []).forEach((cue, i) => {
    if (!cue) return;
    const x = xOf(cue.time);
    if (x < 0 || x > 1) return;
    markers.push(
      <View key={`h${i}`} style={[styles.cueLine, { left: `${x * 100}%`, backgroundColor: hotCueColors[i] }]} />
    );
  });
  (memoryCues || []).forEach((cue, i) => {
    const x = xOf(cue.time);
    if (x < 0 || x > 1) return;
    markers.push(<View key={`m${i}`} style={[styles.memoryMark, { left: `${x * 100}%` }]} />);
  });

  let loopStyle = null;
  if (loop && loop.start != null && loop.end != null) {
    const left = Math.max(0, xOf(loop.start));
    const right = Math.min(1, xOf(loop.end));
    if (right > left) loopStyle = { left: `${left * 100}%`, width: `${(right - left) * 100}%` };
  }

  return (
    <View style={[styles.zoom, { height }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width || 1)}>
      <View
        style={[styles.bars, { width: (width * (COLUMNS + 1)) / COLUMNS, transform: [{ translateX: shift }] }]}
      >
        <Columns firstCol={firstCol} colSeconds={colSeconds} height={height} info={info} mode={mode} />
      </View>
      {grid}
      {loopStyle ? <View style={[styles.loopRegion, loopStyle]} /> : null}
      {markers}
      <View style={styles.playhead} />
    </View>
  );
}

const styles = StyleSheet.create({
  zoom: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#020306',
  },
  bars: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    gap: 1,
  },
  gridLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  gridBar: {
    width: 2,
    backgroundColor: '#ff3b30',
  },
  gridAdjust: {
    // Grid Adjust highlights the grid so you can see it against the kicks.
    opacity: 1,
    backgroundColor: '#ffd23f',
  },
  cueLine: {
    position: 'absolute',
    top: 0,
    width: 3,
    height: 10,
    marginLeft: -1,
    zIndex: 1,
  },
  memoryMark: {
    position: 'absolute',
    bottom: 0,
    width: 0,
    height: 0,
    marginLeft: -5,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ff3b30',
    zIndex: 1,
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
    top: 0,
    bottom: 0,
    left: '50%',
    width: 2,
    marginLeft: -1,
    backgroundColor: cdj.playhead,
    zIndex: 2,
  },
});
