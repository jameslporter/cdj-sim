import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';
import { useLearnTarget } from '../hooks/useLearningMode';
import useBlink from '../hooks/useBlink';
import { SECONDS_PER_REV } from '../hooks/useJogEngine';
import { waveSeed } from './Waveform';

const SIZE = 300;
const RING = SIZE - 14;
const PLATTER = SIZE - 30;
const LCD = 118;
const CENTER = SIZE / 2;
const TOP_RADIUS = PLATTER / 2; // inside this is the touch-sensitive top plate
const DEAD_ZONE = 14; // too close to the centre to read a direction from
const VELOCITY_WINDOW_MS = 100;

// The platter isn't motorised: it only moves when you move it, and when you
// let go it keeps turning on its own weight until friction stops it. JOG
// ADJUST sets that friction (light = long free spin, heavy = stops quickly).
function frictionFor(jogAdjust) {
  return { viscous: 0.5 + jogAdjust * 3, coulomb: 0.25 + jogAdjust * 3 };
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const wrap = (a) => {
  if (a > Math.PI) return a - 2 * Math.PI;
  if (a < -Math.PI) return a + 2 * Math.PI;
  return a;
};

// CDJ-3000X jog wheel: gloss-black bezel, illumination ring, matte platter
// with a brushed-metal edge, and the round colour LCD in the centre that
// shows the playback position. Drag it with a finger or the mouse: the top
// plate is touch-sensitive (scratch in VINYL mode), the outer ring isn't
// (pitch bend).
//
// The centre display shows the track's artwork, the play position pointer,
// the cue point marker and (in SLIP) where the track would be. The ring
// around the platter lights red while this deck's mixer channel is ON AIR,
// and the display flashes in the last 30 seconds of the track.
// Placeholder "artwork" for tracks without any: a coloured label with the
// title's initial, like a record label.
const LABEL_COLORS = ['#7a2e2e', '#2e4f7a', '#2e7a55', '#6b2e7a', '#7a5a2e', '#2e6f7a'];

export default function JogWheel({
  isPlaying,
  reverse,
  vinylMode,
  jogAdjust = 0.5,
  jog,
  cuePoint = 0,
  getSlipPosition = null,
  onAir = false,
  endWarning = false,
  track = null,
  synced = false,
  isMaster = false,
  idPrefix = '',
}) {
  const platterAngle = useRef(new Animated.Value(0)).current;
  const pointerAngle = useRef(new Animated.Value(0)).current;
  const slipAngle = useRef(new Animated.Value(0)).current;
  const warnOn = useBlink(endWarning, 400);
  const [heldTop, setHeldTop] = useState(false);

  const live = useRef({});
  live.current = { jog, jogAdjust, getSlipPosition };

  const g = useRef({
    angle: 0, // platter angle, revolutions
    startX: 0,
    startY: 0,
    lastTheta: null,
    zone: null,
    samples: [], // [{ t, angle }] for the release speed
    velocity: 0, // rev/s while coasting
    coasting: false,
    lastFrame: 0,
    pointer: null,
  }).current;

  const turn = (revs, zone) => {
    if (!revs) return;
    g.angle += revs;
    platterAngle.setValue(g.angle * 360);
    live.current.jog?.move(revs, zone);
  };

  const coast = () => {
    if (!g.coasting) return;
    const t = now();
    const dt = Math.min((t - g.lastFrame) / 1000, 0.05);
    g.lastFrame = t;
    const { viscous, coulomb } = frictionFor(live.current.jogAdjust);
    const v = g.velocity;
    const slowed = v - (viscous * v + coulomb * Math.sign(v)) * dt;
    g.velocity = Math.sign(slowed) === Math.sign(v) ? slowed : 0;
    turn(((v + g.velocity) / 2) * dt, g.zone);
    if (Math.abs(g.velocity) < 0.02) {
      g.coasting = false;
      g.velocity = 0;
    } else {
      requestAnimationFrame(coast);
    }
  };

  const thetaAt = (x, y) => {
    const dx = x - CENTER;
    const dy = y - CENTER;
    return Math.hypot(dx, dy) < DEAD_ZONE ? null : Math.atan2(dy, dx);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        g.startX = locationX;
        g.startY = locationY;
        g.lastTheta = thetaAt(locationX, locationY);
        // Grabbing a spinning platter stops it.
        g.coasting = false;
        g.velocity = 0;
        g.zone = Math.hypot(locationX - CENTER, locationY - CENTER) <= TOP_RADIUS ? 'top' : 'ring';
        g.samples = [{ t: now(), angle: g.angle }];
        setHeldTop(g.zone === 'top');
        live.current.jog?.touch(g.zone);
      },
      onPanResponderMove: (_e, gesture) => {
        const theta = thetaAt(g.startX + gesture.dx, g.startY + gesture.dy);
        if (theta != null && g.lastTheta != null) turn(wrap(theta - g.lastTheta) / (2 * Math.PI), g.zone);
        g.lastTheta = theta;
        const t = now();
        g.samples.push({ t, angle: g.angle });
        while (g.samples.length > 2 && t - g.samples[0].t > VELOCITY_WINDOW_MS) g.samples.shift();
      },
      onPanResponderRelease: () => endTouch(),
      onPanResponderTerminate: () => endTouch(),
    })
  ).current;

  function endTouch() {
    const t = now();
    const first = g.samples[0];
    // A hand that stopped before letting go leaves the platter still.
    const recent = first && t - g.samples[g.samples.length - 1].t < 100;
    const span = first ? (t - first.t) / 1000 : 0;
    g.velocity = recent && span > 0.005 ? (g.angle - first.angle) / span : 0;
    setHeldTop(false);
    live.current.jog?.release();
    if (Math.abs(g.velocity) > 0.05) {
      g.coasting = true;
      g.lastFrame = t;
      requestAnimationFrame(coast);
    }
  }

  // The LCD's pointer shows the play position: one turn per 1.8 s of track,
  // like a record label, and it runs backward when you drag the track back.
  useEffect(() => {
    let id;
    const tick = () => {
      const pos = live.current.jog?.getPosition() ?? 0;
      if (pos !== g.pointer) {
        g.pointer = pos;
        pointerAngle.setValue((pos / SECONDS_PER_REV) * 360);
      }
      const slip = live.current.getSlipPosition?.();
      if (slip != null) slipAngle.setValue((slip / SECONDS_PER_REV) * 360);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(id);
      g.coasting = false;
    };
  }, [g, pointerAngle, slipAngle]);

  const platterRotate = platterAngle.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend' });
  const pointerRotate = pointerAngle.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend' });

  const slipRotate = slipAngle.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend' });
  const cueRotate = `${((cuePoint || 0) / SECONDS_PER_REV) * 360}deg`;

  const held = heldTop && vinylMode;
  // The ring blinks as the track runs out (JOG RING INDICATOR), and is red ON AIR.
  const warnFlash = endWarning && !warnOn;
  const ringColor = warnFlash ? '#2a0606' : onAir ? cdj.onAir : held ? cdj.ledOrange : cdj.jogRing;
  const labelColor = LABEL_COLORS[track ? waveSeed(String(track.id ?? track.title ?? '')) % LABEL_COLORS.length : 0];
  const initial = (track?.title ?? '').trim().charAt(0).toUpperCase();
  const learn = useLearnTarget(`${idPrefix}jog-wheel`);

  return (
    <View
      {...learn.withHandlers(pan.panHandlers)}
      testID={`${idPrefix}jog-wheel`}
      style={[styles.bezel, learn.style]}
    >
      <View
        style={[
          styles.ring,
          styles.passThrough,
          { borderColor: ringColor, boxShadow: `0px 0px 14px ${ringColor}88, inset 0px 0px 8px ${ringColor}55` },
        ]}
      />
      <View style={[styles.platter, styles.passThrough]}>
        <View style={[styles.groove, { width: PLATTER - 40, height: PLATTER - 40, borderRadius: (PLATTER - 40) / 2 }]} />
        <View style={[styles.groove, { width: PLATTER - 80, height: PLATTER - 80, borderRadius: (PLATTER - 80) / 2 }]} />
        <Animated.View style={[styles.platterSpin, { transform: [{ rotate: platterRotate }] }]}>
          <View style={styles.platterNotch} />
        </Animated.View>

        <View
          testID={`${idPrefix}jog-display`}
          style={[styles.lcdBezel, held && styles.lcdBezelHeld]}
        >
          <View style={styles.lcd}>
            {track ? (
              <View style={[styles.artwork, { backgroundColor: labelColor }]}>
                <View style={styles.artworkHole} />
                <Text style={styles.artworkInitial}>{initial}</Text>
              </View>
            ) : null}
            <View style={styles.lcdTrack} />
            <View style={[styles.lcdSpin, { transform: [{ rotate: cueRotate }] }]}>
              <View style={styles.cueDot} />
            </View>
            {getSlipPosition ? (
              <Animated.View style={[styles.lcdSpin, { transform: [{ rotate: slipRotate }] }]}>
                <View style={styles.slipPointer} />
              </Animated.View>
            ) : null}
            <Animated.View style={[styles.lcdSpin, { transform: [{ rotate: pointerRotate }] }]}>
              <View style={styles.lcdPointer} />
            </Animated.View>
            <View style={styles.lcdInfo}>
              <View style={styles.lcdIndicators}>
                <Text style={[styles.lcdInd, getSlipPosition && styles.lcdIndOn]}>SLIP</Text>
                <Text style={[styles.lcdInd, synced && styles.lcdIndSync]}>SYNC</Text>
                <Text style={[styles.lcdInd, isMaster && styles.lcdIndMaster]}>MASTER</Text>
              </View>
              <Text style={[styles.lcdMode, vinylMode && styles.lcdIndOn]}>{vinylMode ? 'VINYL' : 'CDJ'}</Text>
              <Text style={styles.lcdGlyph}>{isPlaying && !held ? '▶' : '❚❚'}</Text>
              <Text style={styles.lcdSub}>{reverse ? 'REV' : held ? 'TOUCH' : ' '}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Touches land on the bezel itself, so their position is measured from
  // the wheel's centre on every platform.
  passThrough: {
    pointerEvents: 'none',
  },
  bezel: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: cdj.jogBezel,
    borderWidth: 1,
    borderColor: '#2c2e31',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0px 2px 6px rgba(255, 255, 255, 0.06), 0px 6px 14px rgba(0, 0, 0, 0.7)',
    cursor: 'grab',
    touchAction: 'none',
    userSelect: 'none',
  },
  ring: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
  },
  platter: {
    width: PLATTER,
    height: PLATTER,
    borderRadius: PLATTER / 2,
    backgroundColor: cdj.jogPlatter,
    borderWidth: 5,
    borderColor: cdj.jogEdge,
    borderTopColor: '#5a5e63',
    borderBottomColor: '#25272a',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 3px 8px rgba(0, 0, 0, 0.8)',
  },
  groove: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: cdj.jogPlatterRing,
  },
  platterSpin: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  platterNotch: {
    width: 3,
    height: 14,
    marginTop: 6,
    borderRadius: 1,
    backgroundColor: '#3c3f44',
  },
  lcdBezel: {
    width: LCD + 12,
    height: LCD + 12,
    borderRadius: (LCD + 12) / 2,
    backgroundColor: '#0a0a0b',
    borderWidth: 1,
    borderColor: '#34373b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lcdBezelHeld: {
    borderColor: cdj.ledOrange,
  },
  lcdIndicators: {
    flexDirection: 'row',
    gap: 3,
  },
  lcdInd: {
    color: '#465059',
    fontSize: 7,
    fontWeight: '800',
  },
  lcdIndOn: {
    color: cdj.screenText,
  },
  lcdIndSync: {
    color: '#4fd8c4',
  },
  lcdIndMaster: {
    color: cdj.ledOrange,
  },
  artwork: {
    position: 'absolute',
    width: LCD - 22,
    height: LCD - 22,
    borderRadius: (LCD - 22) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.55,
  },
  artworkHole: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000',
  },
  artworkInitial: {
    position: 'absolute',
    top: 10,
    color: 'rgba(255,255,255,0.35)',
    fontSize: 22,
    fontWeight: '900',
  },
  lcdInfo: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  slipPointer: {
    width: 4,
    height: 10,
    marginTop: 4,
    borderRadius: 2,
    backgroundColor: cdj.slip,
  },
  lcd: {
    width: LCD,
    height: LCD,
    borderRadius: LCD / 2,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lcdTrack: {
    position: 'absolute',
    width: LCD - 10,
    height: LCD - 10,
    borderRadius: (LCD - 10) / 2,
    borderWidth: 3,
    borderColor: '#1b2330',
  },
  lcdSpin: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  lcdPointer: {
    width: 4,
    height: 14,
    marginTop: 3,
    borderRadius: 2,
    backgroundColor: cdj.screenText,
  },
  cueDot: {
    position: 'absolute',
    top: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: cdj.cueMarker,
  },
  lcdMode: {
    color: cdj.screenTextDim,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  lcdGlyph: {
    color: cdj.screenText,
    fontSize: 24,
    marginVertical: 2,
  },
  lcdSub: {
    color: cdj.ledOrange,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
