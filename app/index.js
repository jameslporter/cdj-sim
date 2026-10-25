import { useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CdjDeck from '../components/CdjDeck';
import DjmMixer from '../components/DjmMixer';
import LearningPanel from '../components/LearningPanel';
import useCdjDeck from '../hooks/useCdjDeck';
import useMixerState from '../hooks/useMixerState';
import useTrackLibrary from '../hooks/useTrackLibrary';
import { clamp } from '../utils/format';

export default function CdjSimulator() {
  const library = useTrackLibrary();
  const deckA = useCdjDeck({ tracks: library.allTracks });
  const deckB = useCdjDeck({ tracks: library.allTracks });
  const mixer = useMixerState({
    deckASignal: deckA.isPlaying || deckA.jog.scratching,
    deckBSignal: deckB.isPlaying || deckB.jog.scratching,
  });

  // The mixer's channel 1 / channel 2 gain (trim, EQ, fader, crossfader) is
  // the only thing standing between a deck and the speakers — apply it as
  // real playback volume so the mixer is actually "in the signal path",
  // not just a VU-meter display.
  useEffect(() => {
    deckA.setVolume(clamp(mixer.channelGains[0] * (0.3 + 1.1 * mixer.master.level), 0, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixer.channelGains[0], mixer.master.level]);

  useEffect(() => {
    deckB.setVolume(clamp(mixer.channelGains[1] * (0.3 + 1.1 * mixer.master.level), 0, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixer.channelGains[1], mixer.master.level]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        horizontal
        testID="session-scroll"
        style={styles.horizontalScroll}
        contentContainerStyle={styles.horizontalContainer}
      >
        <CdjDeck deck={deckA} library={library} label="DECK A" idPrefix="deckA-" />
        <DjmMixer mixer={mixer} />
        <CdjDeck deck={deckB} library={library} label="DECK B" idPrefix="deckB-" />
      </ScrollView>
      <LearningPanel />
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
