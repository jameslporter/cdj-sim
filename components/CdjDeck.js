import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';
import { USB_LIBRARY } from '../constants/tracks';
import BeatJumpControls from './BeatJumpControls';
import BrowseRotary from './BrowseRotary';
import BrowseScreen from './BrowseScreen';
import DeckModeControls from './DeckModeControls';
import DeckButton from './DeckButton';
import HotCueBar from './HotCueBar';
import JogWheel from './JogWheel';
import Knob from './Knob';
import Led from './Led';
import LoopControls from './LoopControls';
import MemoryCueControls from './MemoryCueControls';
import ScreenNavRow from './ScreenNavRow';
import ScreenSideControls from './ScreenSideControls';
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

  const playerNumber = idPrefix.startsWith('deckB') ? 2 : 1;
  const toggleTimeMode = () => deck.setTimeMode((m) => (m === 'ELAPSED' ? 'REMAIN' : 'ELAPSED'));

  return (
    <View style={styles.column}>
      <ScrollView testID={`${idPrefix}scroll`} style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.body}>
          <View style={styles.topPanel}>
            <View style={styles.headerRow}>
              <View style={styles.modelBlock}>
                <Text style={styles.modelLabel}>CDJ-3000X</Text>
                <Text style={styles.deckLabel}>{label}</Text>
              </View>
              <UsbRow idPrefix={idPrefix} />
              <Text style={styles.brand}>AlphaTheta</Text>
            </View>

            <View style={styles.screenRow}>
              <ScreenNavRow
                activeScreen={activeScreen}
                onSelect={setActiveScreen}
                onMenu={() => setActiveScreen(null)}
                idPrefix={idPrefix}
              />

              <View style={styles.screenBezel}>
                <View style={styles.screenGlass}>
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
                          <Led on color={cdj.ledWhite} size={8} />
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
                      pitchRange={deck.pitchRange}
                      masterTempo={deck.masterTempo}
                      quantize={deck.quantize}
                      playerNumber={playerNumber}
                      elapsed={deck.elapsed}
                      duration={deck.duration}
                      timeMode={deck.timeMode}
                      onToggleTimeMode={toggleTimeMode}
                      progressRatio={deck.progressRatio}
                      loopRange={deck.loopRange}
                      idPrefix={idPrefix}
                    />
                  )}
                </View>
              </View>

              <ScreenSideControls onBack={handleBack} idPrefix={idPrefix}>
                <BrowseRotary
                  onPrev={() => handleRotaryMove(-1)}
                  onNext={() => handleRotaryMove(1)}
                  onLoad={handleRotaryPress}
                  idPrefix={idPrefix}
                />
              </ScreenSideControls>
            </View>

            <View style={styles.padHeaderRow}>
              <View style={styles.inlineGroup}>
                <DeckButton
                  testID={`${idPrefix}time-mode`}
                  label="TIME MODE"
                  sublabel="AUTO CUE"
                  onPress={toggleTimeMode}
                  style={styles.utilButton}
                />
                <DeckButton
                  testID={`${idPrefix}quantize`}
                  label="QUANTIZE"
                  active={deck.quantize}
                  led="red"
                  onPress={() => deck.setQuantize((q) => !q)}
                  style={styles.utilButton}
                />
              </View>
              <MemoryCueControls
                memoryCues={deck.memoryCues}
                memoryCueIndex={deck.memoryCueIndex}
                onSave={deck.handleMemorySave}
                onCall={deck.handleMemoryCall}
                onDelete={deck.handleMemoryDelete}
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

            <View style={styles.loopRow}>
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
              <BeatJumpControls
                beatCount={deck.beatJumpCount}
                onCycleCount={deck.handleCycleBeatCount}
                onBack={() => deck.handleBeatJump(-1)}
                onForward={() => deck.handleBeatJump(1)}
                idPrefix={idPrefix}
              />
            </View>

            <View style={styles.mainRow}>
              <View style={styles.leftColumn}>
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
                <Knob
                  testID={`${idPrefix}vinyl-speed-adjust`}
                  label="VINYL SPEED ADJ"
                  value={vinylSpeedAdjust}
                  onChange={setVinylSpeedAdjust}
                  color={cdj.ledWhite}
                  size={34}
                />
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

              <View style={styles.jogColumn}>
                <JogWheel
                  isPlaying={deck.isPlaying}
                  pitch={deck.pitch}
                  reverse={deck.reverse}
                  vinylMode={deck.vinylMode}
                  held={deck.isJogHeld}
                  onHoldChange={deck.setIsJogHeld}
                  idPrefix={idPrefix}
                />
                <View style={styles.nfc}>
                  <Text style={styles.nfcText}>NFC</Text>
                </View>
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
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    width: 580,
    flexShrink: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 10,
  },
  // Side frame of the unit.
  body: {
    backgroundColor: cdj.bodyEdge,
    borderRadius: 18,
    padding: 6,
    borderWidth: 1,
    borderColor: '#202124',
    boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.8)',
  },
  // Matte black anodised top panel.
  topPanel: {
    backgroundColor: cdj.chassis,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: cdj.chassisBorder,
    borderTopColor: '#34373b',
    padding: 16,
    gap: 12,
    boxShadow: 'inset 0px 1px 0px rgba(255, 255, 255, 0.05)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modelBlock: {
    gap: 1,
  },
  modelLabel: {
    color: cdj.silk,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  deckLabel: {
    color: cdj.silkDim,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2,
  },
  brand: {
    color: cdj.silkDim,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  screenRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  screenBezel: {
    flex: 1,
    height: 244,
    backgroundColor: cdj.screenBezel,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: cdj.screenBezelBorder,
    padding: 5,
    boxShadow: 'inset 0px 0px 6px rgba(255, 255, 255, 0.04)',
  },
  screenGlass: {
    flex: 1,
    backgroundColor: cdj.screenBg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  padHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  inlineGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  utilButton: {
    width: 74,
    height: 28,
  },
  sectionLabel: {
    color: cdj.silkDim,
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  loopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  leftColumn: {
    width: 96,
    alignItems: 'center',
    gap: 12,
  },
  jogColumn: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 20,
  },
  nfc: {
    width: 34,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2c2e32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nfcText: {
    color: cdj.silkDim,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1,
  },
  placeholderScreen: {
    flex: 1,
    backgroundColor: cdj.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    color: cdj.screenText,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
