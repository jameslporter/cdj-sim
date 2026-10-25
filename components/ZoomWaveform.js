import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { cdj, hotCueColors } from '../constants/theme';
import { WaveColumn, waveSample } from './Waveform';

const COLUMNS = 96;
// Seconds of track shown across the zoomed waveform (the CDJ's default zoom
// shows about four bars of a house track).
export const ZOOM_WINDOW_SECONDS = 8;

// Loudness at track time `t`. Imported tracks use their analysed peaks;
// demo tracks use a synthetic envelope that pulses on the beat grid, so the
// kicks you see line up with the grid lines like a real analysed track.
function ampAt(t, { duration, peaks, seed, firstBeat, beat }) {
  if (t < 0 || t > duration) return 0;
  if (peaks?.length) return peaks[Math.min(peaks.length - 1, Math.floor((t / duration) * peaks.length))];
  return waveSample(((t - firstBeat) / beat) * 4 + seed);
}

function Columns({ firstCol, colSeconds, height, info }) {
  const cols = [];
  for (let k = 0; k <= COLUMNS; k += 1) {
    cols.push(<WaveColumn key={k} amp={ampAt((firstCol + k) * colSeconds, info)} height={height} dim={false} />);
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
  seed = 0,
  loop,
  hotCues,
  memoryCues,
  height = 76,
}) {
  const [width, setWidth] = useState(1);
  const beat = 60 / (bpm || 120);
  const start = position - ZOOM_WINDOW_SECONDS / 2;
  const xOf = (t) => (t - start) / ZOOM_WINDOW_SECONDS; // 0–1 across the view

  // Columns sit on a fixed grid of track time and the row slides by the
  // leftover fraction, so the waveform scrolls without shimmering.
  const colSeconds = ZOOM_WINDOW_SECONDS / COLUMNS;
  const firstCol = Math.floor(start / colSeconds);
  const shift = ((firstCol * colSeconds - start) / ZOOM_WINDOW_SECONDS) * width;
  const info = { duration, peaks, seed, firstBeat, beat };

  const grid = [];
  const firstIdx = Math.ceil((start - firstBeat) / beat);
  for (let b = firstIdx; firstBeat + b * beat <= start + ZOOM_WINDOW_SECONDS; b += 1) {
    const t = firstBeat + b * beat;
    if (t < 0 || t > duration) continue;
    const downbeat = ((b % 4) + 4) % 4 === 0;
    grid.push(
      <View key={b} style={[styles.gridLine, downbeat && styles.gridBar, { left: `${xOf(t) * 100}%` }]} />
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
        <Columns firstCol={firstCol} colSeconds={colSeconds} height={height} info={info} />
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
