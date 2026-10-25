import { StyleSheet, View } from 'react-native';
import DeckButton from './DeckButton';

// The column to the right of the CDJ-3000X display: BACK and TAG TRACK above
// the rotary selector, TRACK FILTER and SHORTCUT below it.
export default function ScreenSideControls({
  onBack,
  onTagTrack,
  tagListOpen,
  trackFilterOn,
  onTrackFilter,
  onTrackFilterEdit,
  onShortcut,
  children,
  idPrefix = '',
}) {
  return (
    <View style={styles.column}>
      <DeckButton testID={`${idPrefix}screen-back`} label="BACK" onPress={onBack} style={styles.button} />
      <DeckButton
        testID={`${idPrefix}tag-track`}
        label={tagListOpen ? 'REMOVE' : 'TAG TRACK'}
        sublabel={tagListOpen ? 'TAG TRACK' : 'REMOVE'}
        onPress={onTagTrack}
        style={styles.button}
        labelStyle={styles.label}
      />
      {children}
      <DeckButton
        testID={`${idPrefix}track-filter`}
        label="TRACK FILTER"
        sublabel="EDIT"
        active={trackFilterOn}
        onPress={onTrackFilter}
        onLongPress={onTrackFilterEdit}
        delayLongPress={600}
        style={styles.button}
        labelStyle={styles.label}
      />
      <DeckButton
        testID={`${idPrefix}shortcut`}
        label="SHORTCUT"
        onPress={onShortcut}
        style={styles.button}
        labelStyle={styles.label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  button: {
    width: 58,
    height: 28,
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 7,
  },
});
