import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import MixerBeatFxSection from './MixerBeatFxSection';
import MixerChannelBank from './MixerChannelBank';
import MixerFilterSection from './MixerFilterSection';
import MixerMasterSection from './MixerMasterSection';
import MixerMicSection from './MixerMicSection';
import MixerSendFxSection from './MixerSendFxSection';

export default function DjmMixer({ mixer }) {
  const linkedLabels = ['DECK A', 'DECK B', null, null, null, null];

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
            onChangeMic1={(patch) => mixer.setMic1((m) => ({ ...m, ...patch }))}
            onChangeMic2={(patch) => mixer.setMic2((m) => ({ ...m, ...patch }))}
          />
          <MixerFilterSection filter={mixer.filter} onChange={(patch) => mixer.setFilter((f) => ({ ...f, ...patch }))} />
          <MixerSendFxSection
            sendFx={mixer.sendFx}
            onChange={(patch) => mixer.setSendFx((s) => ({ ...s, ...patch }))}
          />
        </View>

        <MixerChannelBank
          channels={mixer.channels}
          channelLevels={mixer.channelLevels}
          crossfader={mixer.crossfader}
          inputOptions={mixer.inputOptions}
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
            onChange={(patch) => mixer.setMaster((m) => ({ ...m, ...patch }))}
          />
          <MixerBeatFxSection beatFx={mixer.beatFx} onChange={(patch) => mixer.setBeatFx((b) => ({ ...b, ...patch }))} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    width: 620,
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
