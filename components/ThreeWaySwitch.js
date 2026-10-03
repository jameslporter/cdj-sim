import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

function ThreeWaySwitch({ options, value, onChange, vertical = false, testID }) {
  return (
    <View style={vertical ? styles.columnGroup : styles.rowGroup}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            testID={testID ? `${testID}-${opt.value}` : undefined}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [styles.option, active && styles.optionActive, pressed && styles.pressed]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default memo(ThreeWaySwitch);

const styles = StyleSheet.create({
  rowGroup: {
    flexDirection: 'row',
    backgroundColor: '#151515',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 2,
    gap: 2,
  },
  columnGroup: {
    flexDirection: 'column',
    backgroundColor: '#151515',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 2,
    gap: 2,
  },
  option: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: {
    backgroundColor: colors.greenDim,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '700',
  },
  labelActive: {
    color: colors.green,
  },
});
