import { useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { useLearnTarget } from '../hooks/useLearningMode';

// A button you hold, built on pointer events rather than the touch
// responder. The responder lets only one control be pressed at a time; this
// way you can hold it with one finger and press another button with a second
// (hold CUE and press PLAY, hold DELETE and press a HOT CUE pad).
//
// `onDown(isMouse)` and `onUp(isMouse)` fire on press and release.
// `children` can be a function of the pressed state.
export default function HoldPressable({ onDown, onUp, testID, style, children, disabled }) {
  const learn = useLearnTarget(testID);
  const [pressed, setPressed] = useState(false);
  const activeRef = useRef(null); // pointerType of the press in progress

  const handleDown = (e) => {
    if (disabled || activeRef.current) return;
    const type = e.nativeEvent.pointerType;
    activeRef.current = type || 'touch';
    e.currentTarget?.setPointerCapture?.(e.nativeEvent.pointerId);
    setPressed(true);
    onDown?.(type === 'mouse');
  };

  const handleUp = () => {
    const type = activeRef.current;
    if (!type) return;
    activeRef.current = null;
    setPressed(false);
    onUp?.(type === 'mouse');
  };

  return (
    <View
      {...learn.props}
      testID={testID}
      accessibilityRole="button"
      style={[webStyle, typeof style === 'function' ? style({ pressed }) : style, learn.style]}
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
    >
      {typeof children === 'function' ? children({ pressed }) : children}
    </View>
  );
}

const webStyle = Platform.select({ web: { cursor: 'pointer', touchAction: 'none', userSelect: 'none' }, default: {} });
