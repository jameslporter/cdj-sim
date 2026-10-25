import { useEffect, useRef, useState } from 'react';
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

  // Pro DJ Link sync between the two players: one deck is the tempo MASTER;
  // a deck with BEAT SYNC on follows the master's BPM and beat phase.
  const [master, setMaster] = useState(null); // 'A' | 'B' | null
  const [syncOn, setSyncOn] = useState({ A: false, B: false });
  const [masterBpm, setMasterBpm] = useState(null);
  const decksRef = useRef({});
  const getMasterBeatPos = () => (master ? decksRef.current[master]?.getBeatPos() : null);
  const syncBpmFor = (id) => (syncOn[id] && master && master !== id ? masterBpm : null);

  const deckA = useCdjDeck({ tracks: library.allTracks, syncBpm: syncBpmFor('A'), getMasterBeatPos });
  const deckB = useCdjDeck({ tracks: library.allTracks, syncBpm: syncBpmFor('B'), getMasterBeatPos });
  decksRef.current = { A: deckA, B: deckB };

  const masterDeck = master ? decksRef.current[master] : null;
  const masterDisplayedBpm = masterDeck ? masterDeck.displayedBpm : null;
  useEffect(() => {
    setMasterBpm(masterDisplayedBpm);
  }, [masterDisplayedBpm]);

  // Once a deck picks up the master's tempo, pull it into phase too.
  const pendingAlign = useRef({ A: false, B: false });
  useEffect(() => {
    ['A', 'B'].forEach((id) => {
      const deck = decksRef.current[id];
      if (pendingAlign.current[id] && deck.synced) {
        pendingAlign.current[id] = false;
        if (deck.isPlaying) deck.alignToMaster();
      }
    });
  });

  const handleSync = (id) => {
    const other = id === 'A' ? 'B' : 'A';
    if (syncOn[id]) {
      setSyncOn((s) => ({ ...s, [id]: false }));
      return;
    }
    setSyncOn((s) => ({ ...s, [id]: true }));
    // No master yet: the other deck takes it if it's playing; otherwise this
    // deck becomes the master for the other to follow.
    if (!master) setMaster(decksRef.current[other].isPlaying ? other : id);
    pendingAlign.current[id] = true;
  };

  const handleMaster = (id) => {
    setMaster(id);
    pendingAlign.current[id === 'A' ? 'B' : 'A'] = true;
  };

  // INST DOUBLES: load the other deck's track at the same spot.
  const handleInstantDoubles = (id) => {
    const from = decksRef.current[id === 'A' ? 'B' : 'A'];
    decksRef.current[id].handleLoadTrack(from.track, { at: from.getPosition(), play: from.isPlaying });
  };

  const syncProps = (id) => ({
    isMaster: master === id,
    syncOn: syncOn[id],
    getMasterBeatPos: master && master !== id ? getMasterBeatPos : null,
    onSync: () => handleSync(id),
    onMaster: () => handleMaster(id),
    onInstantDoubles: () => handleInstantDoubles(id),
  });
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
        <CdjDeck deck={deckA} sync={syncProps('A')} library={library} label="DECK A" idPrefix="deckA-" />
        <DjmMixer mixer={mixer} />
        <CdjDeck deck={deckB} sync={syncProps('B')} library={library} label="DECK B" idPrefix="deckB-" />
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
