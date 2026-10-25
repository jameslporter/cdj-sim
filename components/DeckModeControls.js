import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';
import DeckButton from './DeckButton';
import Led from './Led';
import { useLearnTarget } from '../hooks/useLearningMode';
import useBlink from '../hooks/useBlink';
import HoldPressable from './HoldPressable';

const DIRECTION_OPTIONS = [
  { value: 'FWD', label: 'FWD' },
  { value: 'REV', label: 'REV' },
  { value: 'SLIP_REV', label: 'SLIP REV' },
];

// DIRECTION lever: FWD and REV latch; SLIP REV is spring-loaded, so it
// reverses only while held (pointer events, so it can be held while the other
// hand works) and the lever springs back when you let go.
function DirectionLever({ value, onChange, onSlipReverse, testID }) {
  const learn = useLearnTarget(testID);
  return (
    <View {...learn.props} style={[styles.leverWrap, learn.style]}>
      <Text style={styles.silk}>DIRECTION</Text>
      <View style={styles.leverBody}>
        <View style={styles.leverSlot} />
        {DIRECTION_OPTIONS.map((opt) => {
          const active = opt.value === value;
          const content = (
            <>
              <View style={[styles.leverKnob, active && styles.leverKnobActive]} />
              <Text style={[styles.leverLabel, active && styles.leverLabelActive]}>{opt.label}</Text>
            </>
          );
          if (opt.value === 'SLIP_REV') {
            return (
              <HoldPressable
                key={opt.value}
                testID={`${testID}-${opt.value}`}
                onDown={() => onSlipReverse(true)}
                onUp={() => onSlipReverse(false)}
                style={styles.leverStop}
              >
                {content}
              </HoldPressable>
            );
          }
          return (
            <Pressable
              key={opt.value}
              testID={`${testID}-${opt.value}`}
              onPress={() => onChange(opt.value)}
              style={styles.leverStop}
            >
              {content}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function DeckModeControls({
  reverse,
  slip,
  slipping,
  slipReverseHeld,
  vinylMode,
  setReverse,
  onToggleSlip,
  onSlipReverse,
  onToggleVinylMode,
  idPrefix = '',
}) {
  const direction = slipReverseHeld ? 'SLIP_REV' : reverse ? 'REV' : 'FWD';
  // SLIP's light flashes while a slip action is running (the deck's
  // SLIP FLASHING setting).
  const flash = useBlink(slipping, 250);

  return (
    <View style={styles.wrap}>
      <View style={styles.jogModeGroup}>
        <DeckButton testID={`${idPrefix}jog-mode`} label="JOG MODE" onPress={onToggleVinylMode} style={styles.chip} />
        <View style={styles.indicatorRow}>
          <Led on={vinylMode} color={cdj.ledBlue} size={5} />
          <Text style={styles.indicatorText}>VINYL</Text>
          <Led on={!vinylMode} color={cdj.ledWhite} size={5} />
          <Text style={styles.indicatorText}>CDJ</Text>
        </View>
      </View>
      <DeckButton
        testID={`${idPrefix}mode-slip`}
        label="SLIP"
        active={slip && flash}
        led="blue"
        onPress={onToggleSlip}
        style={styles.chip}
      />
      <DirectionLever
        testID={`${idPrefix}direction`}
        value={direction}
        onChange={(v) => setReverse(v === 'REV')}
        onSlipReverse={onSlipReverse}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 10,
  },
  chip: {
    width: 72,
    height: 28,
  },
  jogModeGroup: {
    alignItems: 'center',
    gap: 4,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  indicatorText: {
    color: cdj.silkDim,
    fontSize: 7,
    fontWeight: '700',
  },
  silk: {
    color: cdj.silkDim,
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 3,
  },
  leverWrap: {
    alignItems: 'center',
  },
  leverBody: {
    width: 72,
    paddingVertical: 2,
    position: 'relative',
  },
  leverSlot: {
    position: 'absolute',
    left: 9,
    top: 8,
    bottom: 8,
    width: 6,
    borderRadius: 3,
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#2c2e32',
  },
  leverStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 18,
  },
  leverKnob: {
    width: 10,
    height: 10,
    marginLeft: 7,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  leverKnobActive: {
    width: 18,
    height: 14,
    marginLeft: 3,
    borderRadius: 4,
    backgroundColor: '#c3c6ca',
    borderWidth: 1,
    borderColor: '#e8eaec',
    boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.8)',
  },
  leverLabel: {
    color: cdj.silkDim,
    fontSize: 7,
    fontWeight: '700',
  },
  leverLabelActive: {
    color: cdj.silk,
  },
});
