import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import MixerBeatFxSection from './MixerBeatFxSection';
import MixerChannelBank from './MixerChannelBank';
import MixerFilterSection from './MixerFilterSection';
import MixerMasterSection from './MixerMasterSection';
import MixerMicSection from './MixerMicSection';
import MixerSendFxSection from './MixerSendFxSection';

const LINKED_LABELS = ['DECK A', 'DECK B'];

export default function DjmMixer({ mixer }) {
  // Stable wrappers around the (always-stable) useState setters. Without
  // these, every section below would get a brand-new onChange prop on every
  // DjmMixer render — including ones triggered by unrelated state like the
  // crossfader — which defeats React.memo on those sections entirely.
  const { setMic1, setMic2, setFilter, setSendFx, setMaster, setBeatFx } = mixer;
  const handleChangeMic1 = useCallback((patch) => setMic1((m) => ({ ...m, ...patch })), [setMic1]);
  const handleChangeMic2 = useCallback((patch) => setMic2((m) => ({ ...m, ...patch })), [setMic2]);
  const handleChangeFilter = useCallback((patch) => setFilter((f) => ({ ...f, ...patch })), [setFilter]);
  const handleChangeSendFx = useCallback((patch) => setSendFx((s) => ({ ...s, ...patch })), [setSendFx]);
  const handleChangeMaster = useCallback((patch) => setMaster((m) => ({ ...m, ...patch })), [setMaster]);
  const handleChangeBeatFx = useCallback((patch) => setBeatFx((b) => ({ ...b, ...patch })), [setBeatFx]);

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
          crossfader={mixer.crossfader}
          inputOptions={mixer.inputOptions}
          linkedLabels={LINKED_LABELS}
          onUpdateChannel={mixer.updateChannel}
          onCycleInput={mixer.cycleChannelInput}
          onToggleCue={mixer.toggleChannelCue}
          onCrossfaderChange={mixer.setCrossfader}
        />

        <View style={styles.sectionsRow}>
          <MixerMasterSection master={mixer.master} masterLevel={mixer.masterLevel} onChange={handleChangeMaster} />
          <MixerBeatFxSection beatFx={mixer.beatFx} onChange={handleChangeBeatFx} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    width: 480,
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
