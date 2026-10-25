import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';
import { FILTER_BPM_OPTIONS } from '../utils/trackFilter';

// TRACK FILTER edit screen (hold TRACK FILTER/EDIT): which conditions the
// track lists are filtered by. The BPM and KEY conditions compare against
// the sync master's track, or this deck's own track if there's no master.
export default function TrackFilterScreen({ filter, onChange, reference, idPrefix = '' }) {
  const chip = (testID, label, on, onPress) => (
    <Pressable key={testID} testID={`${idPrefix}${testID}`} onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.screen}>
      <View style={styles.titleBar}>
        <Text style={styles.title}>TRACK FILTER</Text>
        {chip('filter-onoff', filter.on ? 'ON' : 'OFF', filter.on, () => onChange({ on: !filter.on }))}
      </View>
      <Text style={styles.reference}>
        COMPARED WITH: {reference ? `${reference.title} · ${reference.bpm.toFixed(1)} BPM · ${reference.key}` : '—'}
      </Text>
      <View style={styles.row}>
        <Text style={styles.label}>BPM</Text>
        <View style={styles.options}>
          {FILTER_BPM_OPTIONS.map((v) =>
            chip(`filter-bpm-${v ?? 'off'}`, v == null ? 'OFF' : `±${v}%`, filter.bpm === v, () => onChange({ bpm: v }))
          )}
        </View>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>KEY</Text>
        <View style={styles.options}>
          {chip('filter-key-off', 'OFF', !filter.key, () => onChange({ key: false }))}
          {chip('filter-key-match', 'MATCHING KEYS', filter.key, () => onChange({ key: true }))}
        </View>
      </View>
      <Text style={styles.hint}>Press TRACK FILTER to switch the filter on and off. Hold it to come back here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: cdj.screenBg,
    gap: 8,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: cdj.screenPanel,
    borderBottomWidth: 1,
    borderBottomColor: cdj.screenDivider,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  title: {
    color: cdj.screenText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  reference: {
    color: cdj.screenTextDim,
    fontSize: 9,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  label: {
    width: 30,
    color: cdj.screenText,
    fontSize: 10,
    fontWeight: '800',
  },
  options: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#3a4048',
    borderRadius: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  chipOn: {
    borderColor: '#ffb238',
    backgroundColor: '#3a2a10',
  },
  chipText: {
    color: cdj.screenTextDim,
    fontSize: 9,
    fontWeight: '800',
  },
  chipTextOn: {
    color: '#ffb238',
  },
  hint: {
    color: cdj.screenTextDim,
    fontSize: 8,
    paddingHorizontal: 8,
    marginTop: 'auto',
    paddingBottom: 6,
  },
});
