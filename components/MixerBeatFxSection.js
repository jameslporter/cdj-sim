import { memo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BEAT_FX_ASSIGNS } from '../hooks/useMixerState';
import useBlink from '../hooks/useBlink';
import { colors } from '../constants/theme';
import { BEAT_FX, beatFxInfo, formatBeat } from '../utils/beatFx';
import { FADER_CURVES, faderToGain } from '../utils/mixerEngine';
import { useLearnTarget } from '../hooks/useLearningMode';
import CdjButton from './CdjButton';
import HoldPressable from './HoldPressable';
import Knob from './Knob';

// The DJM-V10's BEAT FX section: the touch display (effect, BPM, BEAT value,
// time, X-PAD), BEAT ◀ ▶, AUTO/TAP and TAP, FX FREQUENCY, the BEAT FX SELECT
// switch, the channel assign, TIME, LEVEL/DEPTH and ON/OFF.

// TIME knob position (0–1) ↔ the effect's TIME range: a log scale for
// milliseconds, linear for percentages.
function knobToTime(v, [lo, hi], unit) {
  if (unit === '%') return Math.round(lo + v * (hi - lo));
  return Math.round(lo * (hi / lo) ** v);
}
function timeToKnob(t, [lo, hi], unit) {
  if (unit === '%') return (t - lo) / (hi - lo);
  return Math.log(Math.max(lo, t) / lo) / Math.log(hi / lo);
}

// The fader curve key's little graph: volume against fader travel.
function CurveIcon({ curve }) {
  return (
    <View style={styles.curveIcon}>
      {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map((x) => (
        <View key={x} style={[styles.curveBar, { height: Math.max(1, (faderToGain(x, curve) / 1.25) * 14) }]} />
      ))}
    </View>
  );
}

function MixerBeatFxSection({ beatFx, bpm, onChange, faderCurve = 2, onChangeMaster }) {
  const curveLearn = useLearnTarget('mixer-fader-curve');
  const cycleCurve = () =>
    onChangeMaster?.({ faderCurve: FADER_CURVES[(FADER_CURVES.indexOf(faderCurve) + 1) % FADER_CURVES.length] });
  const info = beatFxInfo(beatFx.effect);
  const beat = beatFx.beats[info.name] ?? info.defaultBeat;
  const tempo = bpm || 128;
  // What TIME shows: the knob's own value, or the BEAT value in ms.
  const time = beatFx.time ?? (info.unit === 'beat' ? Math.round((60000 / tempo) * beat) : beat);
  const blink = useBlink(beatFx.on, 500);
  const xpadWasOn = useRef(false);
  const taps = useRef([]);

  const setBeat = (value) => onChange({ beats: { ...beatFx.beats, [info.name]: value }, time: null });
  const stepBeat = (dir) => {
    const i = info.beats.indexOf(beat);
    const next = info.beats[Math.max(0, Math.min(info.beats.length - 1, (i < 0 ? 0 : i) + dir))];
    setBeat(next);
  };
  const stepEffect = (dir) => {
    const i = BEAT_FX.findIndex((fx) => fx.name === info.name);
    onChange({ effect: BEAT_FX[(i + dir + BEAT_FX.length) % BEAT_FX.length].name, time: null });
  };
  const cycleAssign = () => {
    const next = BEAT_FX_ASSIGNS[(BEAT_FX_ASSIGNS.indexOf(beatFx.assign) + 1) % BEAT_FX_ASSIGNS.length];
    onChange({ assign: next });
  };
  const toggleBand = (band) => onChange({ bands: { ...beatFx.bands, [band]: !beatFx.bands[band] } });

  // TAP: the average of the last few taps sets the BPM.
  const handleTap = () => {
    const now = Date.now();
    const list = taps.current.filter((t) => now - t < 2000);
    list.push(now);
    taps.current = list.slice(-5);
    if (taps.current.length >= 2) {
      const span = taps.current[taps.current.length - 1] - taps.current[0];
      const tapBpm = Math.round((60000 / (span / (taps.current.length - 1))) * 10) / 10;
      if (tapBpm >= 40 && tapBpm <= 300) onChange({ bpmMode: 'TAP', tapBpm });
    }
  };

  // X-PAD: touching a BEAT value picks it and turns the effect on; letting
  // go turns it off again (unless it was already on).
  const xpadDown = (value) => {
    xpadWasOn.current = beatFx.on;
    onChange({ beats: { ...beatFx.beats, [info.name]: value }, time: null, on: true });
  };
  const xpadUp = () => {
    if (!xpadWasOn.current) onChange({ on: false });
  };

  const bpmText = beatFx.bpmMode === 'TAP' ? (beatFx.tapBpm ?? '---') : bpm ? bpm.toFixed(1) : '---';
  const timeText = info.unit === '%' ? `${time}%` : `${time}ms`;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>BEAT FX</Text>

      <View style={styles.display} testID="mixer-beatfx-display">
        <View style={styles.displayTop}>
          <Text style={styles.displayEffect}>{info.name}</Text>
          <View style={styles.displayRight}>
            <Pressable
              {...curveLearn.props}
              testID="mixer-fader-curve"
              accessibilityLabel={`Channel fader curve ${faderCurve}`}
              onPress={cycleCurve}
              style={[styles.curveKey, curveLearn.style]}
            >
              <CurveIcon curve={faderCurve} />
            </Pressable>
            <Text style={styles.displayAssign}>{beatFx.assign}</Text>
          </View>
        </View>
        <View style={styles.displayTop}>
          <Text style={styles.displayBpm}>
            <Text style={styles.displayDim}>{beatFx.bpmMode} </Text>
            {bpmText}
          </Text>
          <Text style={styles.displayBeat}>
            {beatFx.time == null ? formatBeat(beat, info.unit) : '--'}
            <Text style={styles.displayDim}> {timeText}</Text>
          </Text>
        </View>
        <View style={styles.xpad} testID="mixer-beatfx-xpad">
          {info.beats.slice(-8).map((value) => {
            const lit = beatFx.time == null && value === beat;
            return (
              <HoldPressable
                key={value}
                testID={`mixer-beatfx-xpad-${String(value).replace('.', '_')}`}
                onDown={() => xpadDown(value)}
                onUp={xpadUp}
                style={({ pressed }) => [styles.xpadKey, (lit || pressed) && styles.xpadKeyLit]}
              >
                <Text style={[styles.xpadText, lit && styles.xpadTextLit]}>{formatBeat(value, info.unit)}</Text>
              </HoldPressable>
            );
          })}
        </View>
      </View>

      <View style={styles.row}>
        <CdjButton testID="mixer-beatfx-beat-down" label="◀" sublabel="BEAT" onPress={() => stepBeat(-1)} style={styles.small} />
        <CdjButton testID="mixer-beatfx-beat-up" label="▶" sublabel="BEAT" onPress={() => stepBeat(1)} style={styles.small} />
        <CdjButton
          testID="mixer-beatfx-autotap"
          label={beatFx.bpmMode}
          sublabel="AUTO/TAP"
          active={beatFx.bpmMode === 'AUTO'}
          onPress={() => onChange({ bpmMode: beatFx.bpmMode === 'AUTO' ? 'TAP' : 'AUTO' })}
          style={styles.small}
        />
        <CdjButton testID="mixer-beatfx-tap" label="TAP" onPress={handleTap} style={styles.small} />
      </View>

      <View style={styles.row}>
        <Text style={styles.groupLabel}>FX FREQ</Text>
        {[
          ['hi', 'HI'],
          ['mid', 'MID'],
          ['low', 'LOW'],
        ].map(([band, label]) => (
          <CdjButton
            key={band}
            testID={`mixer-beatfx-freq-${band}`}
            label={label}
            active={beatFx.bands[band]}
            onPress={() => toggleBand(band)}
            style={styles.freq}
          />
        ))}
      </View>

      <View style={styles.row}>
        <CdjButton testID="mixer-beatfx-effect-prev" label="◀" onPress={() => stepEffect(-1)} style={styles.tiny} />
        <CdjButton
          testID="mixer-beatfx-effect"
          label={info.name}
          sublabel="BEAT FX SELECT"
          onPress={() => stepEffect(1)}
          style={styles.select}
        />
        <CdjButton testID="mixer-beatfx-effect-next" label="▶" onPress={() => stepEffect(1)} style={styles.tiny} />
        <CdjButton testID="mixer-beatfx-assign" label={beatFx.assign} sublabel="ASSIGN" onPress={cycleAssign} style={styles.small} />
      </View>

      <View style={styles.row}>
        <Knob
          testID="mixer-beatfx-time"
          label="TIME"
          value={Math.max(0, Math.min(1, timeToKnob(time, info.time, info.unit)))}
          onChange={(v) => onChange({ time: knobToTime(v, info.time, info.unit) })}
          size={40}
        />
        <Knob
          testID="mixer-beatfx-depth"
          label="LEVEL/DEPTH"
          value={beatFx.depth}
          onChange={(v) => onChange({ depth: v })}
          size={48}
        />
        <CdjButton
          testID="mixer-beatfx-onoff"
          label="ON/OFF"
          active={beatFx.on && blink}
          activeBg="#4d1616"
          activeBorder={colors.red}
          activeTextColor={colors.red}
          onPress={() => onChange({ on: !beatFx.on })}
          style={styles.onoff}
        />
      </View>
    </View>
  );
}

export default memo(MixerBeatFxSection);

const styles = StyleSheet.create({
  section: {
    alignItems: 'center',
    gap: 8,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  display: {
    width: 300,
    backgroundColor: colors.panelBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 6,
    gap: 4,
  },
  displayRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  curveKey: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#4a5560',
  },
  curveIcon: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
    height: 14,
  },
  curveBar: {
    width: 2,
    backgroundColor: '#9fd8ff',
  },
  displayTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  displayEffect: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  displayAssign: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  displayBpm: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  displayBeat: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  displayDim: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '400',
  },
  xpad: {
    flexDirection: 'row',
    gap: 2,
  },
  xpadKey: {
    flex: 1,
    height: 26,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpadKeyLit: {
    backgroundColor: colors.accentDim,
    borderColor: colors.accent,
  },
  xpadText: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
  },
  xpadTextLit: {
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  small: {
    width: 54,
    height: 36,
  },
  tiny: {
    width: 28,
    height: 36,
  },
  select: {
    width: 104,
    height: 36,
  },
  freq: {
    width: 46,
    height: 28,
  },
  onoff: {
    width: 64,
    height: 44,
  },
});
