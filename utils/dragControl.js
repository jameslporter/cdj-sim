import { Platform } from 'react-native';

// Style for any view the user drags (faders, knobs). On mobile web the
// browser decides to scroll the page before JavaScript sees the touch, so
// the only way to keep the finger on the control is the CSS touch-action
// hint. Native apps don't need it: there, PanResponder blocks the
// ScrollView (see dragResponderConfig).
export const dragSurfaceStyle = Platform.select({
  web: { touchAction: 'none', userSelect: 'none', cursor: 'grab' },
  default: {},
});

// Shared PanResponder options so a drag that has started keeps the gesture:
// a parent ScrollView can't take it over, on any platform.
export const dragResponderConfig = {
  onStartShouldSetPanResponder: () => true,
  onMoveShouldSetPanResponder: () => true,
  onPanResponderTerminationRequest: () => false,
  onShouldBlockNativeResponder: () => true,
};
