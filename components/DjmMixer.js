import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import MixerBeatFxSection from './MixerBeatFxSection';
import MixerChannelBank from './MixerChannelBank';
import MixerFilterSection from './MixerFilterSection';
import MixerHeadphonesSection from './MixerHeadphonesSection';
import { getMixerEngine } from '../utils/mixerEngine';
import { INPUT_OPTIONS, MIXER_CHANNELS } from '../constants/setup';
import MixerMasterSection from './MixerMasterSection';
import MixerMicSection from './MixerMicSection';
import MixerSendFxSection from './MixerSendFxSection';


// Real meter readings where the mixer engine is running (stable functions,
// so the memoized sections don't re-render).
const engine = getMixerEngine();
const CHANNEL_PEAKS = engine ? Array.from({ length: MIXER_CHANNELS }, (_, i) => () => engine.channelPeak(i)) : null;
const MASTER_PEAK = engine ? () => engine.masterPeak() : null;

export default function DjmMixer({ mixer, beatFxBpm }) {
  // What each channel is playing: the deck whose cable its input selector is on.
  const linkedLabels = mixer.channelDecks.map((id) => (id ? `DECK ${id}` : null));
  // Stable wrappers around the (always-stable) useState setters. Without
  // these, every section below would get a brand-new onChange prop on every
  // DjmMixer render — including ones triggered by unrelated state like the
  // crossfader — which defeats React.memo on those sections entirely.
  const { setMic1, setMic2, setFilter, setSendFx, setMaster, setBeatFx, setHeadphones } = mixer;
  const handleChangeMic1 = useCallback((patch) => setMic1((m) => ({ ...m, ...patch })), [setMic1]);
  const handleChangeMic2 = useCallback((patch) => setMic2((m) => ({ ...m, ...patch })), [setMic2]);
  const handleChangeFilter = useCallback((patch) => setFilter((f) => ({ ...f, ...patch })), [setFilter]);
  const handleChangeSendFx = useCallback((patch) => setSendFx((s) => ({ ...s, ...patch })), [setSendFx]);
  const handleChangeMaster = useCallback((patch) => setMaster((m) => ({ ...m, ...patch })), [setMaster]);
  const handleChangeBeatFx = useCallback((patch) => setBeatFx((b) => ({ ...b, ...patch })), [setBeatFx]);
  const handleChangeHeadphones = useCallback((patch) => setHeadphones((h) => ({ ...h, ...patch })), [setHeadphones]);

  return (
    <View style={styles.column}>
      <ScrollView testID="mixer-scroll" style={styles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.modelLabel}>DJM-V10</Text>
        </View>

        <View style={styles.sectionsRow}>
          <MixerMicSection
            mic1={mixer.mic1}
            mic2={mixer.mic2}
            onChangeMic1={handleChangeMic1}
            onChangeMic2={handleChangeMic2}
          />
          <MixerFilterSection filter={mixer.filter} onChange={handleChangeFilter} />
          <MixerSendFxSection sendFx={mixer.sendFx} onChange={handleChangeSendFx} />
        </View>

        <MixerChannelBank
          channels={mixer.channels}
          channelLevels={mixer.channelLevels}
          channelPeaks={CHANNEL_PEAKS}
          crossfader={mixer.crossfader}
          inputOptions={INPUT_OPTIONS}
          linkedLabels={linkedLabels}
          onUpdateChannel={mixer.updateChannel}
          onCycleInput={mixer.cycleChannelInput}
          onToggleCue={mixer.toggleChannelCue}
          onCrossfaderChange={mixer.setCrossfader}
        />

        <View style={styles.sectionsRow}>
          <MixerMasterSection
            master={mixer.master}
            masterLevel={mixer.masterLevel}
            getMasterPeak={MASTER_PEAK}
            onChange={handleChangeMaster}
          />
          <MixerHeadphonesSection headphones={mixer.headphones} onChange={handleChangeHeadphones} />
        </View>

        <MixerBeatFxSection beatFx={mixer.beatFx} bpm={beatFxBpm} onChange={handleChangeBeatFx} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    width: 640,
    flexShrink: 0,
  },
  scroll: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 20,
    alignItems: 'center',
  },
  headerRow: {
    width: '100%',
    alignItems: 'center',
  },
  modelLabel: {
    color: '#e8e8e8',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 3,
  },
  sectionsRow: {
    flexDirection: 'row',
    gap: 28,
    justifyContent: 'center',
  },
});
