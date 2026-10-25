import { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useLearnTarget } from '../hooks/useLearningMode';
import { cdj } from '../constants/theme';

const LED_COLORS = {
  white: cdj.ledWhite,
  red: cdj.ledRed,
  orange: cdj.ledOrange,
  green: cdj.ledGreen,
  blue: cdj.ledBlue,
};

// A CDJ-3000X rubber button. The legend is printed on the cap and glows in
// the button's LED colour when `active` (lit) — the same way the hardware
// shows which modes are on.
function DeckButton({
  label,
  sublabel,
  onPress,
  onLongPress,
  delayLongPress,
  onPressIn,
  onPressOut,
  active,
  led = 'white',
  disabled,
  style,
  labelStyle,
  sublabelStyle,
  children,
  testID,
}) {
  const learn = useLearnTarget(testID);
  const ledColor = LED_COLORS[led] ?? led;

  return (
    <Pressable
      {...learn.props}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        active && {
          borderColor: ledColor,
          boxShadow: `0px 0px 8px ${ledColor}55, inset 0px 0px 6px ${ledColor}33`,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
        learn.style,
      ]}
    >
      {children ?? (
        <>
          <Text style={[styles.label, active && { color: ledColor }, labelStyle]}>{label}</Text>
          {sublabel ? <Text style={[styles.sublabel, active && { color: `${ledColor}aa` }, sublabelStyle]}>{sublabel}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

export default memo(DeckButton);

const styles = StyleSheet.create({
  button: {
    backgroundColor: cdj.button,
    borderWidth: 1,
    borderColor: cdj.buttonBorder,
    borderTopColor: '#3d4044',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    boxShadow: '0px 2px 2px rgba(0, 0, 0, 0.6)',
  },
  pressed: {
    transform: [{ translateY: 1 }],
    backgroundColor: '#161719',
    boxShadow: 'none',
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    color: cdj.buttonLegend,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  sublabel: {
    color: cdj.silkDim,
    fontSize: 7,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 1,
    textAlign: 'center',
  },
});
