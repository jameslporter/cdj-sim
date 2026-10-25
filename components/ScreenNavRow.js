import { StyleSheet, View } from 'react-native';
import DeckButton from './DeckButton';

const SCREENS = ['SOURCE', 'BROWSE', 'TAG LIST', 'PLAYLIST', 'SEARCH'];

// The column of screen buttons down the left side of the CDJ-3000X display.
export default function ScreenNavRow({ activeScreen, onSelect, onMenu, onUtility, idPrefix = '' }) {
  return (
    <View style={styles.column}>
      {SCREENS.map((screen) => (
        <DeckButton
          key={screen}
          testID={`${idPrefix}screen-${screen.toLowerCase().replace(' ', '-')}`}
          label={screen}
          active={activeScreen === screen}
          onPress={() => onSelect(screen)}
          style={styles.button}
          labelStyle={styles.label}
        />
      ))}
      <DeckButton
        testID={`${idPrefix}screen-menu`}
        label="MENU"
        sublabel="UTILITY"
        active={activeScreen === 'UTILITY'}
        onPress={onMenu}
        onLongPress={onUtility}
        delayLongPress={600}
        style={styles.button}
        labelStyle={styles.label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    gap: 6,
    justifyContent: 'space-between',
  },
  button: {
    width: 58,
    height: 30,
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 8,
  },
});
