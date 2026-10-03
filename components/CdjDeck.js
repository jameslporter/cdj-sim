import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { USB_LIBRARY } from '../constants/tracks';
import BeatJumpControls from './BeatJumpControls';
import BrowseRotary from './BrowseRotary';
import BrowseScreen from './BrowseScreen';
import DeckModeControls from './DeckModeControls';
import DeckUtilityRow from './DeckUtilityRow';
import HotCueBar from './HotCueBar';
import JogWheel from './JogWheel';
import Knob from './Knob';
import Led from './Led';
import LoopControls from './LoopControls';
import MemoryCueControls from './MemoryCueControls';
import ScreenNavRow from './ScreenNavRow';
import TempoControls from './TempoControls';
import TrackDisplay from './TrackDisplay';
import TrackSearchControls from './TrackSearchControls';
import TransportControls from './TransportControls';
import UsbRow from './UsbRow';

export default function CdjDeck({ deck, label, idPrefix }) {
  const [activeScreen, setActiveScreen] = useState(null); // null = PLAY/waveform view
  const [vinylSpeedAdjust, setVinylSpeedAdjust] = useState(0.5);
  const [browsePath, setBrowsePath] = useState([]); // stack of folder nodes entered
  const [browseSelection, setBrowseSelection] = useState(0);

  const browseItems = browsePath.length === 0 ? USB_LIBRARY : browsePath[browsePath.length - 1].children;
  const breadcrumb = ['USB1', ...browsePath.map((f) => f.name)];

  const activateBrowseItem = (index) => {
    const item = browseItems[index];
    if (!item) return;
    if (item.type === 'folder') {
      setBrowsePath((p) => [...p, item]);
      setBrowseSelection(0);
    } else {
      deck.handleLoadTrack(item.trackIndex);
      setActiveScreen(null);
    }
  };

  const handleBrowseSelect = (index) => {
    setBrowseSelection(index);
    activateBrowseItem(index);
  };

  const handleRotaryMove = (dir) => {
    setActiveScreen('BROWSE');
    setBrowseSelection((i) => Math.min(browseItems.length - 1, Math.max(0, i + dir)));
  };

  const handleRotaryPress = () => {
    if (activeScreen !== 'BROWSE') {
      setActiveScreen('BROWSE');
      return;
    }
    activateBrowseItem(browseSelection);
  };

  const handleBack = () => {
    if (activeScreen === 'BROWSE' && browsePath.length > 0) {
      setBrowsePath((p) => p.slice(0, -1));
      setBrowseSelection(0);
    } else {
      setActiveScreen(null);
    }
  };

  const rotaryLabel = activeScreen === 'BROWSE' ? browseItems[browseSelection]?.name ?? '--' : deck.track.title;

  return (
    <View style={styles.column}>
      <ScrollView testID={`${idPrefix}scroll`} style={styles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.deckLabel}>{label}</Text>
          <UsbRow idPrefix={idPrefix} />
          <Text style={styles.modelLabel}>CDJ-3000</Text>
        </View>

        <ScreenNavRow
          activeScreen={activeScreen}
          onSelect={setActiveScreen}
          onMenu={() => setActiveScreen(null)}
          onBack={handleBack}
          idPrefix={idPrefix}
        />

        {activeScreen === 'BROWSE' ? (
          <BrowseScreen
            breadcrumb={breadcrumb}
            items={browseItems}
            selectedIndex={browseSelection}
            onSelectItem={handleBrowseSelect}
            idPrefix={idPrefix}
          />
        ) : activeScreen ? (
          <View style={styles.placeholderScreen}>
            {activeScreen === 'SOURCE' ? (
              <View style={styles.sourceRow}>
                <Led on color={colors.accent} size={8} />
                <Text style={styles.placeholderText}>USB1 — CONNECTED</Text>
              </View>
            ) : (
              <Text style={styles.placeholderText}>{activeScreen}</Text>
            )}
          </View>
        ) : (
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
        )}

        <View style={styles.utilityAndRotaryRow}>
          <DeckUtilityRow quantize={deck.quantize} onToggleQuantize={() => deck.setQuantize((q) => !q)} idPrefix={idPrefix} />
          <BrowseRotary
            label={rotaryLabel}
            onPrev={() => handleRotaryMove(-1)}
            onNext={() => handleRotaryMove(1)}
            onLoad={handleRotaryPress}
            idPrefix={idPrefix}
          />
        </View>

        <View>
          <Text style={styles.sectionLabel}>HOT CUE</Text>
          <HotCueBar
            cues={deck.hotCues}
            onPress={deck.handleHotCuePress}
            onLongPress={deck.handleHotCueLongPress}
            idPrefix={idPrefix}
          />
        </View>

        <View>
          <Text style={styles.sectionLabel}>LOOP</Text>
          <LoopControls
            active={deck.loop.active}
            hasLoop={deck.loop.start != null}
            hasLoopStart={deck.loop.start != null}
            onLoopIn={deck.handleLoopIn}
            onLoopOut={deck.handleLoopOut}
            onFourBeat={() => deck.handleLoopButton(4)}
            onEightBeat={() => deck.handleLoopButton(8)}
            onReloopExit={deck.handleReloopExit}
            idPrefix={idPrefix}
          />
        </View>

        <View style={styles.secondaryRow}>
          <BeatJumpControls
            beatCount={deck.beatJumpCount}
            onCycleCount={deck.handleCycleBeatCount}
            onBack={() => deck.handleBeatJump(-1)}
            onForward={() => deck.handleBeatJump(1)}
            idPrefix={idPrefix}
          />
          <MemoryCueControls
            memoryCues={deck.memoryCues}
            memoryCueIndex={deck.memoryCueIndex}
            onSave={deck.handleMemorySave}
            onCall={deck.handleMemoryCall}
            onDelete={deck.handleMemoryDelete}
            idPrefix={idPrefix}
          />
        </View>

        <View style={styles.mainRow}>
          <View style={styles.jogSection}>
            <DeckModeControls
              reverse={deck.reverse}
              slip={deck.slip}
              vinylMode={deck.vinylMode}
              setReverse={deck.setReverse}
              setSlip={deck.setSlip}
              onToggleSlip={() => deck.setSlip((s) => !s)}
              onToggleVinylMode={() => deck.setVinylMode((v) => !v)}
              idPrefix={idPrefix}
            />
            <View style={styles.jogRow}>
              <Knob
                testID={`${idPrefix}vinyl-speed-adjust`}
                label="VINYL SPEED ADJUST"
                value={vinylSpeedAdjust}
                onChange={setVinylSpeedAdjust}
                size={32}
              />
              <JogWheel
                isPlaying={deck.isPlaying}
                pitch={deck.pitch}
                reverse={deck.reverse}
                vinylMode={deck.vinylMode}
                held={deck.isJogHeld}
                onHoldChange={deck.setIsJogHeld}
                idPrefix={idPrefix}
              />
            </View>
            <TrackSearchControls
              onBack={() => deck.handleChangeTrack(-1)}
              onForward={() => deck.handleChangeTrack(1)}
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
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  utilityAndRotaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 4,
  },
  jogSection: {
    alignItems: 'center',
    gap: 14,
  },
  jogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  placeholderScreen: {
    backgroundColor: colors.panelBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 14,
    minHeight: 176,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
