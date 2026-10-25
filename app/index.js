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
import { crossfaderGain, getMixerEngine } from '../utils/mixerEngine';
import { beatFxInfo } from '../utils/beatFx';

// Bring a BPM into the V10's 70–180 BPM measuring range.
function foldBpm(bpm) {
  if (!bpm || !Number.isFinite(bpm)) return null;
  let b = bpm;
  while (b < 70) b *= 2;
  while (b > 180) b /= 2;
  return Math.round(b * 10) / 10;
}

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
  // KEY SYNC matches the sync master's key (as it's playing, after its own
  // KEY SHIFT). Kept in state so each deck can see the other's key.
  const [deckKeys, setDeckKeys] = useState({ A: null, B: null });
  const syncKeyFor = (id) => (master && master !== id ? deckKeys[master] : null);

  // Deck A is plugged into mixer channel 1, deck B into channel 2.
  const deckA = useCdjDeck({ tracks: library.allTracks, syncBpm: syncBpmFor('A'), getMasterBeatPos, syncKey: syncKeyFor('A'), channel: 0 });
  const deckB = useCdjDeck({ tracks: library.allTracks, syncBpm: syncBpmFor('B'), getMasterBeatPos, syncKey: syncKeyFor('B'), channel: 1 });
  decksRef.current = { A: deckA, B: deckB };
  if (__DEV__) globalThis.__cdjDecks = decksRef.current; // for poking at from the console

  useEffect(() => {
    if (deckKeys.A !== deckA.displayKey || deckKeys.B !== deckB.displayKey) {
      setDeckKeys({ A: deckA.displayKey, B: deckB.displayKey });
    }
  }, [deckA.displayKey, deckB.displayKey, deckKeys]);

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
    masterKey: syncKeyFor(id),
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

  // The mixer is in the signal path. Where Web Audio is available (web and
  // dev builds) each deck plays through the mixer engine, which applies TRIM,
  // EQ, FILTER, faders, crossfader, ISOLATOR and the headphone cue for real.
  // In Expo Go only the overall channel volume can be applied.
  const engine = getMixerEngine();
  const { channels, crossfader, filter, headphones, sendFx, beatFx } = mixer;
  const mixerMaster = mixer.master;
  useEffect(() => {
    if (engine) engine.apply({ channels, crossfader, master: mixerMaster, filter, headphones, sendFx });
  }, [engine, channels, crossfader, mixerMaster, filter, headphones, sendFx]);

  // ON AIR: the mixer tells each player over PRO DJ LINK whether its channel
  // is live (fader up and not cut by the crossfader).
  const onAir = channels.map((ch) => ch.fader > 0.02 && crossfaderGain(ch.assign, crossfader) > 0.01);

  // BEAT FX tempo. In AUTO the V10 measures the BPM of the sound it's
  // assigned to (70–180 BPM); here that's the deck on that channel, or the
  // master deck for MASTER. TAP uses the tapped tempo.
  const autoBpmSource =
    beatFx.assign === 'CH1' ? deckA : beatFx.assign === 'CH2' ? deckB : (masterDeck ?? (deckB.isPlaying && !deckA.isPlaying ? deckB : deckA));
  const beatFxBpm = beatFx.bpmMode === 'TAP' && beatFx.tapBpm ? beatFx.tapBpm : foldBpm(autoBpmSource.displayedBpm);
  useEffect(() => {
    if (!engine) return;
    const beat = beatFx.beats[beatFx.effect] ?? beatFxInfo(beatFx.effect).defaultBeat;
    engine.applyBeatFx({ ...beatFx, beat }, beatFxBpm);
  }, [engine, beatFx, beatFxBpm]);

  useEffect(() => {
    deckA.setVolume(engine ? 1 : clamp(mixer.channelGains[0] * (0.3 + 1.1 * mixer.master.level), 0, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, mixer.channelGains[0], mixer.master.level]);

  useEffect(() => {
    deckB.setVolume(engine ? 1 : clamp(mixer.channelGains[1] * (0.3 + 1.1 * mixer.master.level), 0, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, mixer.channelGains[1], mixer.master.level]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        horizontal
        testID="session-scroll"
        style={styles.horizontalScroll}
        contentContainerStyle={styles.horizontalContainer}
      >
        <CdjDeck deck={deckA} sync={syncProps('A')} library={library} label="DECK A" idPrefix="deckA-" onAir={onAir[0]} />
        <DjmMixer mixer={mixer} beatFxBpm={beatFxBpm} />
        <CdjDeck deck={deckB} sync={syncProps('B')} library={library} label="DECK B" idPrefix="deckB-" onAir={onAir[1]} />
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
