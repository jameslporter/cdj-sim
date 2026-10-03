import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import CdjButton from './CdjButton';
import Led from './Led';

export default function UsbRow({ idPrefix = '' }) {
  const slots = [
    { label: 'USB1', connected: true },
    { label: 'USB2', connected: false },
  ];

  return (
    <View style={styles.row}>
      {slots.map(({ label, connected }) => (
        <View key={label} style={styles.slot}>
          <Led on={connected} color={colors.accent} size={6} />
          <Text style={styles.label}>{label}</Text>
          <CdjButton
            testID={`${idPrefix}${label.toLowerCase()}-stop`}
            label="STOP"
            disabled={!connected}
            style={styles.stopButton}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  stopButton: {
    width: 40,
    height: 22,
  },
});
