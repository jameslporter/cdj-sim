import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';

const ROWS = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

// The SEARCH screen's on-screen keyboard. Typing narrows the track list to
// titles and artists that contain the text.
export default function SearchKeyboard({ query, onChange, idPrefix = '' }) {
  const type = (ch) => onChange((query + ch).slice(0, 40));
  return (
    <View style={styles.keyboard} testID={`${idPrefix}search-keyboard`}>
      {ROWS.map((row) => (
        <View key={row} style={styles.row}>
          {row.split('').map((ch) => (
            <Pressable key={ch} testID={`${idPrefix}search-key-${ch}`} onPress={() => type(ch)} style={styles.key}>
              <Text style={styles.keyText}>{ch}</Text>
            </Pressable>
          ))}
        </View>
      ))}
      <View style={styles.row}>
        <Pressable testID={`${idPrefix}search-key-clear`} onPress={() => onChange('')} style={[styles.key, styles.wide]}>
          <Text style={styles.keyText}>CLEAR</Text>
        </Pressable>
        <Pressable testID={`${idPrefix}search-key-space`} onPress={() => type(' ')} style={[styles.key, styles.space]}>
          <Text style={styles.keyText}>SPACE</Text>
        </Pressable>
        <Pressable
          testID={`${idPrefix}search-key-delete`}
          onPress={() => onChange(query.slice(0, -1))}
          style={[styles.key, styles.wide]}
        >
          <Text style={styles.keyText}>⌫</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    gap: 2,
    padding: 3,
    borderTopWidth: 1,
    borderTopColor: '#2a3038',
    backgroundColor: '#0b0d10',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
  },
  key: {
    width: 28,
    height: 19,
    borderRadius: 3,
    backgroundColor: '#1d2229',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wide: {
    width: 60,
  },
  space: {
    width: 150,
  },
  keyText: {
    color: cdj.screenText,
    fontSize: 9,
    fontWeight: '700',
  },
});
