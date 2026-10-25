import { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useLearnTarget } from '../hooks/useLearningMode';
import { colors } from '../constants/theme';

function CdjButton({
  label,
  sublabel,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  active,
  activeBg = colors.greenDim,
  activeBorder = colors.greenBorder,
  activeTextColor = colors.green,
  textColor = colors.textMuted,
  disabled,
  style,
  labelStyle,
  children,
  testID,
}) {
  const learn = useLearnTarget(testID);
  return (
    <Pressable
      {...learn.props}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        active && { backgroundColor: activeBg, borderColor: activeBorder },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
        learn.style,
      ]}
    >
      {children ?? (
        <>
          <Text style={[styles.label, { color: active ? activeTextColor : textColor }, labelStyle]}>
            {label}
          </Text>
          {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

export default memo(CdjButton);

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.buttonBg,
    borderWidth: 1,
    borderColor: colors.buttonBorder,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.35,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  sublabel: {
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
});
