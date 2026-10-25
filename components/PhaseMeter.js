import { StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';

const BEATS_PER_BAR = 4;
const wrap = (n, m) => ((n % m) + m) % m;

/**
 * The CDJ's phase meter: four segments for the four beats of a bar. This
 * deck's current beat is lit white; the master deck's beat is outlined in
 * orange. When both are on the same segment and the small needle sits in the
 * middle, the two tracks are in phase.
 *
 * `beatPos` / `masterBeatPos` are live positions in beats (null = no master).
 */
export default function PhaseMeter({ beatPos, masterBeatPos, isMaster }) {
  const ours = Math.floor(wrap(beatPos, BEATS_PER_BAR));
  const theirs = masterBeatPos == null ? null : Math.floor(wrap(masterBeatPos, BEATS_PER_BAR));
  // Fine offset within a beat, -0.5…0.5 (positive = this deck is ahead).
  let offset = null;
  if (masterBeatPos != null) {
    const d = wrap(beatPos - masterBeatPos, 1);
    offset = d >= 0.5 ? d - 1 : d;
  }

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{isMaster ? 'MASTER' : 'PHASE'}</Text>
      <View style={styles.segments}>
        {Array.from({ length: BEATS_PER_BAR }, (_, i) => (
          <View
            key={i}
            style={[styles.segment, theirs === i && styles.segmentMaster, ours === i && styles.segmentOn]}
          />
        ))}
      </View>
      <View style={styles.fine}>
        <View style={styles.fineCenter} />
        {offset != null ? (
          <View
            style={[
              styles.needle,
              Math.abs(offset) < 0.04 && styles.needleLocked,
              { left: `${50 + offset * 100}%` },
            ]}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  label: {
    color: cdj.screenLabel,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.6,
    width: 34,
  },
  segments: {
    flexDirection: 'row',
    gap: 2,
    flex: 2,
  },
  segment: {
    flex: 1,
    height: 7,
    borderRadius: 1,
    backgroundColor: '#1d2229',
    borderWidth: 1,
    borderColor: '#1d2229',
  },
  segmentMaster: {
    borderColor: cdj.ledOrange,
  },
  segmentOn: {
    backgroundColor: cdj.screenText,
  },
  fine: {
    flex: 1,
    height: 7,
    backgroundColor: '#1d2229',
    borderRadius: 1,
    position: 'relative',
  },
  fineCenter: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: cdj.screenTextDim,
  },
  needle: {
    position: 'absolute',
    top: -1,
    bottom: -1,
    width: 3,
    marginLeft: -1,
    backgroundColor: cdj.ledOrange,
  },
  needleLocked: {
    backgroundColor: cdj.ledGreen,
  },
});
