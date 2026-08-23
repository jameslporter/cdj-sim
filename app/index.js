import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CdjDeck from '../components/CdjDeck';
import DjmMixer from '../components/DjmMixer';
import useCdjDeck from '../hooks/useCdjDeck';
import useMixerState from '../hooks/useMixerState';

export default function CdjSimulator() {
  const deckA = useCdjDeck();
  const deckB = useCdjDeck();
  const mixer = useMixerState({
    deckASignal: deckA.isPlaying && !deckA.isJogHeld,
    deckBSignal: deckB.isPlaying && !deckB.isJogHeld,
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        horizontal
        testID="session-scroll"
        style={styles.horizontalScroll}
        contentContainerStyle={styles.horizontalContainer}
      >
        <CdjDeck deck={deckA} label="DECK A" idPrefix="deckA-" />
        <DjmMixer mixer={mixer} />
        <CdjDeck deck={deckB} label="DECK B" idPrefix="deckB-" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  horizontalScroll: {
    flex: 1,
  },
  horizontalContainer: {
    flexDirection: 'row',
  },
});
