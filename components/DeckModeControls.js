import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import CdjButton from './CdjButton';
import Led from './Led';
import ThreeWaySwitch from './ThreeWaySwitch';

const DIRECTION_OPTIONS = [
  { value: 'FWD', label: 'FWD' },
  { value: 'REV', label: 'REV' },
  { value: 'SLIP_REV', label: 'SLIP REV' },
];

export default function DeckModeControls({
  reverse,
  slip,
  vinylMode,
  setReverse,
  setSlip,
  onToggleSlip,
  onToggleVinylMode,
  idPrefix = '',
}) {
  const direction = !reverse ? 'FWD' : slip ? 'SLIP_REV' : 'REV';

  const handleDirectionChange = (value) => {
    if (value === 'FWD') {
      setReverse(false);
    } else if (value === 'REV') {
      setReverse(true);
    } else {
      setReverse(true);
      setSlip(true);
    }
  };

  return (
    <View style={styles.wrap}>
      <ThreeWaySwitch
        testID={`${idPrefix}direction`}
        options={DIRECTION_OPTIONS}
        value={direction}
        onChange={handleDirectionChange}
      />
      <View style={styles.row}>
        <CdjButton
          testID={`${idPrefix}mode-slip`}
          label="SLIP"
          active={slip}
          activeBg="#1a2f57"
          activeBorder="#3d6bc4"
          activeTextColor="#7fb0ff"
          onPress={onToggleSlip}
          style={styles.chip}
        />
        <View style={styles.jogModeGroup}>
          <CdjButton
            testID={`${idPrefix}jog-mode`}
            label="JOG MODE"
            onPress={onToggleVinylMode}
            style={styles.chip}
          />
          <View style={styles.indicatorRow}>
            <Led on={vinylMode} color={colors.accent} size={6} />
            <Text style={styles.indicatorText}>VINYL</Text>
            <Led on={!vinylMode} color={colors.accent} size={6} />
            <Text style={styles.indicatorText}>CDJ</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    width: 60,
    height: 32,
  },
  jogModeGroup: {
    alignItems: 'center',
    gap: 3,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  indicatorText: {
    color: colors.textMuted,
    fontSize: 7,
    fontWeight: '700',
  },
});
