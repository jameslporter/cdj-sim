import { useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { cdj, hotCueColors } from '../constants/theme';
import { clamp } from '../utils/format';
import Waveform from './Waveform';

// A waveform you can touch: used for Touch Preview in the track lists and
// for Touch Cue / needle search on the playback screen.
//
// It uses pointer events rather than the touch responder so that holding
// it with one finger doesn't stop another finger pressing a HOT CUE pad
// (Preview Hot Cue needs both at once). `onTouchStart` gets the touched
// position (0–1) and whether it came from a mouse.
export default function TouchWaveform({
  seed,
  peaks,
  height = 18,
  progressRatio = 0,
  showPlayhead = true,
  loopRange,
  hotCues,
  duration,
  previewRatio,
  barCount,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  testID,
  style,
}) {
  const widthRef = useRef(1);
  const draggingRef = useRef(false);

  // offsetX is relative to this view (its children don't take pointer
  // events), on native and web alike.
  const ratioOf = (e) => clamp((e.nativeEvent.offsetX ?? 0) / widthRef.current, 0, 1);

  const handleDown = (e) => {
    draggingRef.current = true;
    // Keep receiving moves if the finger slides off (where supported).
    e.currentTarget?.setPointerCapture?.(e.nativeEvent.pointerId);
    onTouchStart?.(ratioOf(e), e.nativeEvent.pointerType === 'mouse');
  };

  const handleMove = (e) => {
    if (draggingRef.current) onTouchMove?.(ratioOf(e));
  };

  const handleUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    onTouchEnd?.();
  };

  return (
    <View
      testID={testID}
      style={[styles.touchArea, style]}
      onLayout={(e) => {
        widthRef.current = e.nativeEvent.layout.width || 1;
      }}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
    >
      <View pointerEvents="none">
        <Waveform
          progressRatio={progressRatio}
          loopRange={loopRange}
          height={height}
          seed={seed}
          peaks={peaks}
          showPlayhead={showPlayhead}
          barCount={barCount}
        />
      </View>
      {hotCues && duration
        ? hotCues.map((cue, i) =>
            cue ? (
              <View
                key={i}
                pointerEvents="none"
                style={[
                  styles.cueMarker,
                  { left: `${(cue.time / duration) * 100}%`, backgroundColor: hotCueColors[i] },
                ]}
              />
            ) : null
          )
        : null}
      {previewRatio != null ? (
        <View pointerEvents="none" style={[styles.previewHead, { left: `${clamp(previewRatio, 0, 1) * 100}%` }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    position: 'relative',
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer', touchAction: 'none', userSelect: 'none' }, default: {} }),
  },
  cueMarker: {
    position: 'absolute',
    top: 0,
    width: 3,
    height: 4,
    marginLeft: -1,
    borderRadius: 1,
  },
  previewHead: {
    position: 'absolute',
    top: -2,
    bottom: -2,
    width: 2,
    marginLeft: -1,
    backgroundColor: cdj.ledOrange,
    boxShadow: `0px 0px 4px ${cdj.ledOrange}`,
  },
});
