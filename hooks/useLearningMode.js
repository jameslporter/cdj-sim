import { useMemo, useSyncExternalStore } from 'react';
import { learnKeyFor } from '../constants/learningContent';
import { loadJSON, saveJSON } from '../utils/storage';

// Learning mode: a small shared store (no provider needed) that remembers
// whether learning mode is on and which control the user last touched.
//
// Controls opt in with useLearnTarget(testID). Their explanation comes from
// constants/learningContent.js, looked up by the control's testID, so the
// same ids that drive the tests also drive the lessons.

const STORAGE_KEY = 'cdj-sim:learning-mode:v1';

let state = { enabled: false, selectedId: null, hoverId: null };
const listeners = new Set();

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const learningMode = {
  getState: () => state,
  setEnabled(enabled) {
    setState({ enabled, selectedId: null, hoverId: null });
    saveJSON(STORAGE_KEY, enabled);
  },
  toggle() {
    learningMode.setEnabled(!state.enabled);
  },
  select(id) {
    if (state.enabled) setState({ selectedId: id });
  },
  hover(id) {
    if (state.enabled && state.hoverId !== id) setState({ hoverId: id });
  },
  unhover(id) {
    if (state.hoverId === id) setState({ hoverId: null });
  },
  clear() {
    setState({ selectedId: null, hoverId: null });
  },
  // Restore the last on/off choice (AsyncStorage: app storage on iOS/Android,
  // localStorage on web).
  async restore() {
    const saved = await loadJSON(STORAGE_KEY, false);
    if (saved && !state.enabled) setState({ enabled: true });
  },
};

export function useLearningMode(selector = (s) => s) {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

// The id currently explained: a hovered control (mouse only) wins over the
// last tapped one, so moving the mouse away brings the tapped one back.
export function shownLearnId(s) {
  return s.enabled ? s.hoverId ?? s.selectedId : null;
}

const NO_LEARN = { props: {}, style: null, withHandlers: (handlers) => handlers };

const highlightStyle = {
  outlineWidth: 2,
  outlineStyle: 'solid',
  outlineColor: '#4fc3f7',
  outlineOffset: 2,
};

// Hook for a control that learning mode can explain.
//
// Touching it (finger or mouse) selects it through the responder *capture*
// phase, which every platform runs before any button, fader or knob decides
// to take the touch. The handler always returns false, so the control still
// works exactly as normal. Ancestors run first and the innermost control
// runs last, so the most specific explanation wins.
//
// Returns:
//   props        spread onto the control's outer View / Pressable
//   style        outline added while this control is being explained
//   withHandlers merge with PanResponder handlers (they use the same props)
export function useLearnTarget(id) {
  const known = !!id && learnKeyFor(id) != null;
  const highlighted = useLearningMode((s) => known && shownLearnId(s) === id);

  return useMemo(() => {
    if (!known) return NO_LEARN;
    const onCapture = () => {
      learningMode.select(id);
      return false;
    };
    const props = {
      onStartShouldSetResponderCapture: onCapture,
      // Hover previews on devices with a mouse. Touch has no hover, so it
      // relies on taps only.
      // Skipped while a button is held, so dragging a knob or fader across
      // other controls doesn't switch the explanation mid-drag.
      onPointerEnter: (e) => {
        const ev = e?.nativeEvent;
        if (ev?.pointerType === 'mouse' && !ev.buttons) learningMode.hover(id);
      },
      onPointerLeave: () => learningMode.unhover(id),
    };
    const withHandlers = (handlers = {}) => {
      const own = handlers.onStartShouldSetResponderCapture;
      return {
        ...handlers,
        ...props,
        onStartShouldSetResponderCapture: (e, g) => {
          onCapture();
          return own ? own(e, g) : false;
        },
      };
    };
    return { props, style: highlighted ? highlightStyle : null, withHandlers };
  }, [id, known, highlighted]);
}
