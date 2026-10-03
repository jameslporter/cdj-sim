import { StyleSheet, View } from 'react-native';
import CdjButton from './CdjButton';

const SCREENS = ['SOURCE', 'BROWSE', 'TAG LIST', 'PLAYLIST', 'SEARCH'];

export default function ScreenNavRow({ activeScreen, onSelect, onMenu, onBack, idPrefix = '' }) {
  return (
    <View style={styles.row}>
      {SCREENS.map((screen) => (
        <CdjButton
          key={screen}
          testID={`${idPrefix}screen-${screen.toLowerCase().replace(' ', '-')}`}
          label={screen}
          active={activeScreen === screen}
          onPress={() => onSelect(screen)}
          style={styles.button}
          labelStyle={styles.label}
        />
      ))}
      <CdjButton
        testID={`${idPrefix}screen-menu`}
        label="MENU"
        onPress={onMenu}
        style={styles.button}
        labelStyle={styles.label}
      />
      <CdjButton
        testID={`${idPrefix}screen-back`}
        label="BACK"
        onPress={onBack}
        style={styles.button}
        labelStyle={styles.label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  button: {
    flex: 1,
    height: 26,
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 7,
  },
});
