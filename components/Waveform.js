import { useMemo } from 'react';
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

// Three-band (blue / light blue / white) column, mirrored around the centre
// line like rekordbox's waveforms.
function WaveColumn({ amp, height, dim }) {
  const h = amp * height;
  if (h <= 0) return <View style={styles.column} />;
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

// Overview waveform of the whole track (bottom strip of the CDJ screen).
// Played part is greyed out, like the CDJ-3000X.
// Imported tracks carry real loudness `peaks` from analysis; demo tracks use
// the synthetic envelope above.
export default function Waveform({ progressRatio, loopRange, peaks, height = 30, barCount = 90 }) {
  const amps = useMemo(() => {
    const result = [];
    for (let i = 0; i < barCount; i += 1) {
      if (peaks?.length) {
        const from = Math.floor((i / barCount) * peaks.length);
        const to = Math.max(from + 1, Math.floor(((i + 1) / barCount) * peaks.length));
        let m = 0;
        for (let k = from; k < to; k += 1) m = Math.max(m, peaks[k]);
        result.push(m);
      } else {
        result.push(waveSample(i * 4.4));
      }
    }
    return result;
  }, [barCount, peaks]);

  const clamped = Math.min(1, Math.max(0, progressRatio));

  return (
    <View style={[styles.waveform, { height }]}>
      {amps.map((amp, i) => (
        <WaveColumn key={i} amp={amp} height={height} dim={i / amps.length < clamped} />
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
      <View style={[styles.playhead, { left: `${clamped * 100}%` }]} />
    </View>
  );
}

// Zoomed, scrolling waveform (main area of the CDJ screen). The track moves
// past a fixed playhead in the centre.
export function ZoomWaveform({ progressRatio, loopRange, peaks, height = 86, visibleBars = 72, totalBars = 1400 }) {
  const pos = Math.min(1, Math.max(0, progressRatio)) * totalBars;
  const first = Math.floor(pos) - visibleBars / 2;

  const columns = [];
  for (let k = 0; k < visibleBars; k += 1) {
    const i = first + k;
    const sample = peaks?.length ? peaks[Math.floor((i / totalBars) * peaks.length)] : waveSample(i);
    const amp = i < 0 || i >= totalBars ? 0 : sample;
    columns.push(<WaveColumn key={k} amp={amp} height={height} dim={false} />);
  }

  let loopStyle = null;
  if (loopRange) {
    const a = (loopRange.startRatio * totalBars - first) / visibleBars;
    const b = (loopRange.endRatio * totalBars - first) / visibleBars;
    const left = Math.max(0, a);
    const right = Math.min(1, b);
    if (right > left) loopStyle = { left: `${left * 100}%`, width: `${(right - left) * 100}%` };
  }

  // Beat grid: one tick every 4 bars (≈ one beat at this zoom).
  const ticks = [];
  for (let k = 0; k < visibleBars; k += 1) {
    if ((first + k) % 4 === 0) {
      ticks.push(
        <View
          key={k}
          style={[styles.gridTick, (first + k) % 16 === 0 && styles.gridTickBar, { left: `${(k / visibleBars) * 100}%` }]}
        />
      );
    }
  }

  return (
    <View style={[styles.zoom, { height }]}>
      {ticks}
      <View style={styles.zoomBars}>{columns}</View>
      {loopStyle ? <View style={[styles.loopRegion, loopStyle]} /> : null}
      <View style={styles.zoomPlayhead} />
    </View>
  );
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
  zoom: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#020306',
  },
  zoomBars: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    gap: 1,
  },
  gridTick: {
    position: 'absolute',
    top: 0,
    width: 1,
    height: 6,
    backgroundColor: '#5b6470',
  },
  gridTickBar: {
    height: 10,
    backgroundColor: '#ff3b30',
  },
  zoomPlayhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 2,
    marginLeft: -1,
    backgroundColor: cdj.playhead,
  },
});
