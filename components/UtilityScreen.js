import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';

const ROW = 26;

// The UTILITY settings list (hold MENU/UTILITY) and the SHORTCUT screen.
// Touch a row, or turn the rotary to it and push, to step its value.
// `rows` are { key, label, value, help, onPress }.
export default function UtilityScreen({ title, rows, selectedIndex, onSelect, idPrefix = '' }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    scrollRef.current?.scrollTo?.({ y: Math.max(0, (selectedIndex - 2) * ROW), animated: false });
  }, [selectedIndex]);
  const selected = rows[selectedIndex];

  return (
    <View style={styles.screen}>
      <View style={styles.titleBar}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <ScrollView ref={scrollRef} style={styles.list}>
        {rows.map((row, i) => (
          <Pressable
            key={row.key}
            testID={`${idPrefix}utility-${row.key}`}
            onPress={() => {
              onSelect(i);
              row.onPress();
            }}
            style={[styles.row, i === selectedIndex && styles.rowSelected]}
          >
            <Text style={[styles.label, i === selectedIndex && styles.textSelected]}>{row.label}</Text>
            <Text style={[styles.value, i === selectedIndex && styles.textSelected]}>{row.value}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {selected?.help ? (
        <Text style={styles.help} numberOfLines={2}>
          {selected.help}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: cdj.screenBg,
  },
  titleBar: {
    backgroundColor: cdj.screenPanel,
    borderBottomWidth: 1,
    borderBottomColor: cdj.screenDivider,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  title: {
    color: cdj.screenText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  list: {
    flex: 1,
  },
  row: {
    height: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#14181d',
  },
  rowSelected: {
    backgroundColor: '#1f4f9e',
  },
  label: {
    color: cdj.screenText,
    fontSize: 10,
    fontWeight: '700',
  },
  value: {
    color: '#ffb238',
    fontSize: 10,
    fontWeight: '800',
  },
  textSelected: {
    color: '#fff',
  },
  help: {
    color: cdj.screenTextDim,
    fontSize: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: cdj.screenDivider,
  },
});
