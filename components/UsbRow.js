import { StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';
import DeckButton from './DeckButton';
import Led from './Led';

// Top-panel media ports. The CDJ-3000X drops the CDJ-3000's SD slot and puts
// a USB-C port in its place, next to the classic USB-A port.
export default function UsbRow({ idPrefix = '' }) {
  const slots = [
    { id: 'usb1', label: 'USB', port: 'A', connected: true },
    { id: 'usb2', label: 'USB-C', port: 'C', connected: false },
  ];

  return (
    <View style={styles.row}>
      {slots.map(({ id, label, port, connected }) => (
        <View key={id} style={styles.slot}>
          <View style={[styles.port, port === 'C' && styles.portC]}>
            <View style={[styles.portTongue, port === 'C' && styles.portTongueC]} />
          </View>
          <View style={styles.meta}>
            <View style={styles.metaRow}>
              <Led on={connected} color={cdj.ledWhite} size={5} />
              <Text style={styles.label}>{label}</Text>
            </View>
            <DeckButton
              testID={`${idPrefix}${id}-stop`}
              label="STOP"
              disabled={!connected}
              style={styles.stopButton}
              labelStyle={styles.stopLabel}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  port: {
    width: 30,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#3b3e42',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  portC: {
    width: 22,
    height: 9,
    borderRadius: 5,
  },
  portTongue: {
    height: 4,
    backgroundColor: '#2a2c30',
    borderRadius: 1,
  },
  portTongueC: {
    height: 2,
    marginHorizontal: 2,
  },
  meta: {
    gap: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    color: cdj.silk,
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  stopButton: {
    width: 36,
    height: 16,
    paddingVertical: 0,
  },
  stopLabel: {
    fontSize: 7,
  },
});
