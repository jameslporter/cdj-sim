import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import BeatJumpControls from './BeatJumpControls';
import BrowseRotary from './BrowseRotary';
import DeckModeControls from './DeckModeControls';
import HotCueBar from './HotCueBar';
import JogWheel from './JogWheel';
import LoopControls from './LoopControls';
import TempoControls from './TempoControls';
import TrackDisplay from './TrackDisplay';
import TransportControls from './TransportControls';

export default function CdjDeck({ deck, label, idPrefix }) {
  return (
    <View style={styles.column}>
      <ScrollView testID={`${idPrefix}scroll`} style={styles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.deckLabel}>{label}</Text>
          <BrowseRotary
            track={deck.track}
            onPrev={() => deck.handleChangeTrack(-1)}
            onNext={() => deck.handleChangeTrack(1)}
            onLoad={deck.resetDeckState}
            idPrefix={idPrefix}
          />
          <Text style={styles.modelLabel}>CDJ-3000</Text>
        </View>

        <TrackDisplay
          track={deck.track}
          bpm={deck.displayedBpm.toFixed(2)}
          pitch={deck.pitch}
          elapsed={deck.elapsed}
          duration={deck.duration}
          timeMode={deck.timeMode}
          onToggleTimeMode={() => deck.setTimeMode((m) => (m === 'ELAPSED' ? 'REMAIN' : 'ELAPSED'))}
          progressRatio={deck.progressRatio}
          loopRange={deck.loopRange}
          idPrefix={idPrefix}
        />

        <HotCueBar
          cues={deck.hotCues}
          onPress={deck.handleHotCuePress}
          onLongPress={deck.handleHotCueLongPress}
          idPrefix={idPrefix}
        />

        <View style={styles.secondaryRow}>
          <LoopControls
            active={deck.loop.active}
            hasLoop={deck.loop.start != null}
            onFourBeat={() => deck.handleLoopButton(4)}
            onEightBeat={() => deck.handleLoopButton(8)}
            onReloopExit={deck.handleReloopExit}
            idPrefix={idPrefix}
          />
          <BeatJumpControls
            beatCount={deck.beatJumpCount}
            onCycleCount={deck.handleCycleBeatCount}
            onBack={() => deck.handleBeatJump(-1)}
            onForward={() => deck.handleBeatJump(1)}
            idPrefix={idPrefix}
          />
        </View>

        <View style={styles.mainRow}>
          <View style={styles.jogSection}>
            <JogWheel
              isPlaying={deck.isPlaying}
              pitch={deck.pitch}
              reverse={deck.reverse}
              vinylMode={deck.vinylMode}
              held={deck.isJogHeld}
              onHoldChange={deck.setIsJogHeld}
              idPrefix={idPrefix}
            />
            <DeckModeControls
              reverse={deck.reverse}
              slip={deck.slip}
              vinylMode={deck.vinylMode}
              onToggleReverse={() => deck.setReverse((r) => !r)}
              onToggleSlip={() => deck.setSlip((s) => !s)}
              onToggleVinylMode={() => deck.setVinylMode((v) => !v)}
              idPrefix={idPrefix}
            />
            <TransportControls
              isPlaying={deck.isPlaying}
              onPlayPause={deck.handlePlayPause}
              onCue={deck.handleCue}
              onSeek={deck.handleSeek}
              idPrefix={idPrefix}
            />
          </View>

          <TempoControls
            pitch={deck.pitch}
            range={deck.pitchRange}
            masterTempo={deck.masterTempo}
            onPitchChange={deck.setPitch}
            onCycleRange={deck.handleCycleRange}
            onToggleMasterTempo={() => deck.setMasterTempo((m) => !m)}
            onReset={() => deck.setPitch(0)}
            idPrefix={idPrefix}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    width: 420,
    flexShrink: 0,
  },
  scroll: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deckLabel: {
    color: '#e8e8e8',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  modelLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 4,
  },
  jogSection: {
    alignItems: 'center',
    gap: 18,
  },
});
