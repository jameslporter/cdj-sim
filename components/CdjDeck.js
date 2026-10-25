import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';
import { DEMO_FOLDER, USER_FOLDER } from '../constants/tracks';
import usePlaylistBank from '../hooks/usePlaylistBank';
import { getTrackHotCues } from '../hooks/useTrackHotCues';
import { buildDefaultPlaylists } from '../utils/defaultPlaylists';
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
import PlaylistBankBar from './PlaylistBankBar';
import ScreenNavRow from './ScreenNavRow';
import ScreenSideControls from './ScreenSideControls';
import TempoControls from './TempoControls';
import TrackDisplay from './TrackDisplay';
import TrackSearchControls from './TrackSearchControls';
import TransportControls from './TransportControls';
import UsbRow from './UsbRow';
import LearnView from './LearnView';

function importLabel(library) {
  if (!library.importSupported) return 'IMPORT UNAVAILABLE';
  if (library.importing) {
    const { index, total } = library.importing;
    return `ANALYZING ${index + 1}/${total}…`;
  }
  return '＋ IMPORT TRACKS…';
}

// The simulated USB drive's folder tree, rebuilt whenever the library changes.
function buildBrowseTree(library) {
  return [
    {
      type: 'folder',
      name: DEMO_FOLDER,
      children: library.demoTracks.map((track) => ({ type: 'track', track })),
    },
    {
      type: 'folder',
      name: USER_FOLDER,
      children: [
        { type: 'action', action: 'import', label: importLabel(library), disabled: !library.importSupported },
        ...library.userTracks.map((track) => ({ type: 'track', track, deletable: true })),
      ],
    },
  ];
}

function importSummary(result) {
  if (!result) return null;
  const parts = [];
  if (result.added.length) parts.push(`${result.added.length} TRACK${result.added.length > 1 ? 'S' : ''} ADDED`);
  if (result.failed.length) parts.push(`COULDN'T READ ${result.failed.map((f) => f.name).join(', ')}`);
  return parts.join(' · ') || 'NO FILES CHOSEN';
}

const LIST_SCREENS = ['BROWSE', 'PLAYLIST'];

export default function CdjDeck({ deck, sync, library, label, idPrefix }) {
  const { preview } = deck;
  const bank = usePlaylistBank(`cdj-sim:playlist-bank:${idPrefix}`);
  const [activeScreen, setActiveScreen] = useState(null); // null = PLAY/waveform view
  // Where each list screen is: the names of the folders entered, and the cursor row.
  const [nav, setNav] = useState({ BROWSE: { path: [], sel: 0 }, PLAYLIST: { path: [], sel: 0 } });
  const [browseStatus, setBrowseStatus] = useState(null);
  const [showPreview, setShowPreview] = useState(true);
  const overviewTouchRef = useRef(null); // { mode: 'preview' | 'needle', isMouse }

  const { demoTracks, userTracks, allTracks, importing, importSupported } = library;
  const tree = useMemo(
    () => buildBrowseTree({ demoTracks, userTracks, importing, importSupported }),
    [demoTracks, userTracks, importing, importSupported]
  );
  // PLAYLIST screen: playlists built from the whole library (demo + imported).
  const playlists = useMemo(() => buildDefaultPlaylists(allTracks), [allTracks]);
  const playlistTree = useMemo(
    () =>
      playlists.map((p) => ({
        type: 'folder',
        name: p.name,
        playlistId: p.id,
        children: p.tracks.map((track) => ({ type: 'track', track })),
      })),
    [playlists]
  );
  const playlistsById = useMemo(() => Object.fromEntries(playlists.map((p) => [p.id, p])), [playlists]);

  const isListScreen = LIST_SCREENS.includes(activeScreen);
  const listScreen = isListScreen ? activeScreen : 'BROWSE';
  const roots = { BROWSE: tree, PLAYLIST: playlistTree };
  const { path: listPath, sel: listSel } = nav[listScreen];
  const folderAt = (items, name) => items.find((i) => i.type === 'folder' && i.name === name);
  const listItems = listPath.reduce((items, name) => folderAt(items, name)?.children ?? [], roots[listScreen]);
  const breadcrumb = [listScreen === 'BROWSE' ? 'USB1' : 'PLAYLIST', ...listPath];
  const openPlaylistId = nav.PLAYLIST.path.length ? folderAt(playlistTree, nav.PLAYLIST.path[0])?.playlistId : null;

  const setNavFor = (screen, update) => setNav((n) => ({ ...n, [screen]: update(n[screen]) }));
  const setListSel = (update) =>
    setNavFor(listScreen, (n) => ({ ...n, sel: typeof update === 'function' ? update(n.sel) : update }));

  // Leaving a screen ends any preview that was running on it.
  useEffect(() => {
    preview.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScreen]);

  const handleImport = async () => {
    setBrowseStatus(null);
    const result = await library.pickAndImport();
    setBrowseStatus(importSummary(result));
    if (result.added.length) {
      // Highlight the first new track (row 0 is the import action).
      setNavFor('BROWSE', (n) => ({ ...n, sel: library.userTracks.length + 1 }));
    }
  };

  const activateBrowseItem = (index) => {
    const item = listItems[index];
    if (!item) return;
    if (item.type === 'folder') {
      setNavFor(listScreen, (n) => ({ path: [...n.path, item.name], sel: 0 }));
      setBrowseStatus(null);
    } else if (item.type === 'action') {
      if (!item.disabled && !library.importing) handleImport();
    } else {
      deck.handleLoadTrack(item.track);
      setActiveScreen(null);
    }
  };

  const handleDeleteTrack = async (index) => {
    const item = listItems[index];
    if (!item?.deletable) return;
    await library.removeTrack(item.track.id);
    setListSel((i) => Math.max(0, Math.min(i, listItems.length - 2)));
    setBrowseStatus(`DELETED ${item.track.title}`);
  };

  const handleBrowseSelect = (index) => {
    setListSel(index);
    activateBrowseItem(index);
  };

  const handleRotaryMove = (dir) => {
    if (!isListScreen) setActiveScreen('BROWSE');
    setListSel((i) => Math.min(Math.max(0, listItems.length - 1), Math.max(0, i + dir)));
  };

  const handleRotaryPress = () => {
    if (!isListScreen) {
      setActiveScreen('BROWSE');
      return;
    }
    activateBrowseItem(listSel);
  };

  const handleBack = () => {
    if (isListScreen && listPath.length > 0) {
      const parentPath = listPath.slice(0, -1);
      const parent = parentPath.reduce((items, name) => folderAt(items, name)?.children ?? [], roots[listScreen]);
      const leftIndex = parent.findIndex((i) => i.type === 'folder' && i.name === listPath[listPath.length - 1]);
      setNavFor(listScreen, () => ({ path: parentPath, sel: Math.max(0, leftIndex) }));
    } else {
      setActiveScreen(null);
    }
  };

  // Playlist Bank: grey bank → register the highlighted (or open) playlist;
  // white bank → open its playlist; deregister mode → clear the bank.
  const handleBankSlot = (slot) => {
    const playlistId = bank.slots[slot];
    const registered = playlistId ? playlistsById[playlistId] : null;
    if (bank.deregistering) {
      if (playlistId) bank.deregister(slot);
      else bank.toggleDeregister();
      return;
    }
    if (registered) {
      setNavFor('PLAYLIST', () => ({ path: [registered.name], sel: 0 }));
      return;
    }
    const { path, sel } = nav.PLAYLIST;
    const target = path.length ? folderAt(playlistTree, path[0]) : playlistTree[sel];
    if (target?.playlistId) bank.register(slot, target.playlistId);
  };

  // Touch Preview in the track lists.
  const startListPreview = (track, ratio, isMouse) =>
    preview.start(track, ratio * track.duration, { latched: isMouse });
  const moveListPreview = (track, ratio) => preview.move(ratio * track.duration);
  const endListPreview = () => {
    if (!preview.latched) preview.stop();
  };

  // Overview waveform on the playback screen: needle search while paused,
  // Touch Cue (preview that point, main output untouched) while playing.
  const startOverviewTouch = (ratio, isMouse) => {
    const time = ratio * deck.duration;
    if (deck.isPlaying) {
      overviewTouchRef.current = { mode: 'preview', isMouse };
      preview.start(deck.track, time, { latched: isMouse });
    } else {
      overviewTouchRef.current = { mode: 'needle', isMouse };
      deck.handleNeedleSearch(time);
    }
  };
  const moveOverviewTouch = (ratio) => {
    const touch = overviewTouchRef.current;
    if (!touch) return;
    if (touch.mode === 'preview') preview.move(ratio * deck.duration);
    else deck.handleNeedleSearch(ratio * deck.duration);
  };
  const endOverviewTouch = () => {
    const touch = overviewTouchRef.current;
    overviewTouchRef.current = null;
    if (touch?.mode === 'preview' && !touch.isMouse) preview.stop();
  };

  const listScreenProps = {
    breadcrumb,
    items: listItems,
    selectedIndex: listSel,
    onSelectItem: handleBrowseSelect,
    onDeleteItem: handleDeleteTrack,
    loadedTrackId: deck.track.id,
    status: browseStatus || deck.loadError,
    showPreview,
    onTogglePreview: () => setShowPreview((v) => !v),
    preview,
    getHotCues: getTrackHotCues,
    onPreviewStart: startListPreview,
    onPreviewMove: moveListPreview,
    onPreviewEnd: endListPreview,
    idPrefix,
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
                    <BrowseScreen {...listScreenProps} />
                  ) : activeScreen === 'PLAYLIST' ? (
                    <BrowseScreen
                      {...listScreenProps}
                      header={
                        <PlaylistBankBar
                          slots={bank.slots}
                          playlistsById={playlistsById}
                          activePlaylistId={openPlaylistId}
                          deregistering={bank.deregistering}
                          onPressSlot={handleBankSlot}
                          onToggleDeregister={bank.toggleDeregister}
                          idPrefix={idPrefix}
                        />
                      }
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
                      pitch={deck.effectivePitch}
                      synced={deck.synced}
                      syncOn={sync.syncOn}
                      isMaster={sync.isMaster}
                      isPlaying={deck.isPlaying}
                      getPosition={deck.getPosition}
                      getMasterBeatPos={sync.getMasterBeatPos}
                      memoryCues={deck.memoryCues}
                      slipRatio={deck.slipping ? (deck.slipPosition() ?? 0) / deck.duration : null}
                      tempoReset={deck.tempoReset}
                      autoCue={deck.autoCue}
                      beatJumpCount={deck.beatJumpCount}
                      onSetBeatJumpCount={deck.handleSetBeatJumpCount}
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
                      hotCues={deck.hotCues}
                      gateCue={deck.gateCue}
                      onToggleGateCue={() => deck.setGateCue((g) => !g)}
                      previewRatio={
                        preview.active && preview.track?.id === deck.track.id ? preview.time / deck.duration : null
                      }
                      onOverviewTouchStart={startOverviewTouch}
                      onOverviewTouchMove={moveOverviewTouch}
                      onOverviewTouchEnd={endOverviewTouch}
                      idPrefix={idPrefix}
                    />
                  )}
                  {preview.active ? (
                    <View style={styles.previewBadgeWrap} pointerEvents="box-none">
                      <View style={styles.previewBadge} testID={`${idPrefix}preview-badge`}>
                        <Text style={styles.previewBadgeText} numberOfLines={1}>
                          ◉ PREVIEW · HOT CUE sets a cue
                        </Text>
                        <LearnView learnId={`${idPrefix}preview-stop`}>
                          <Pressable testID={`${idPrefix}preview-stop`} onPress={preview.stop} style={styles.previewStop}>
                            <Text style={styles.previewStopText}>■</Text>
                          </Pressable>
                        </LearnView>
                      </View>
                    </View>
                  ) : null}
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
                  onLongPress={deck.toggleAutoCue}
                  delayLongPress={700}
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
                deleteHeld={deck.deleteHeld}
                onDeletePressIn={deck.handleDeletePressIn}
                onDeletePressOut={deck.handleDeletePressOut}
                onDeleteClick={deck.handleDeleteClick}
                idPrefix={idPrefix}
              />
            </View>

            <View>
              <Text style={styles.sectionLabel}>HOT CUE</Text>
              <HotCueBar
                cues={deck.hotCues}
                onPress={deck.handleHotCuePress}
                onPressIn={deck.handleHotCuePressIn}
                onPressOut={deck.handleHotCuePressOut}
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
                adjust={deck.loopAdjust}
                idPrefix={idPrefix}
              />
              <BeatJumpControls
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
                  onToggleSlip={deck.toggleSlip}
                  slipping={deck.slipping}
                  slipReverseHeld={deck.slipReverseHeld}
                  onSlipReverse={deck.handleSlipReverse}
                  onToggleVinylMode={() => deck.setVinylMode((v) => !v)}
                  idPrefix={idPrefix}
                />
                <Knob
                  testID={`${idPrefix}vinyl-speed-adjust`}
                  label="VINYL SPEED ADJ"
                  value={deck.vinylSpeedAdjust}
                  onChange={deck.setVinylSpeedAdjust}
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
                  atCue={deck.atCue}
                  onCuePressIn={deck.handleCuePressIn}
                  onCuePressOut={deck.handleCuePressOut}
                  onSeek={deck.handleSeek}
                  idPrefix={idPrefix}
                />
              </View>

              <View style={styles.jogColumn}>
                <JogWheel
                  isPlaying={deck.isPlaying}
                  reverse={deck.reverse}
                  vinylMode={deck.vinylMode}
                  jogAdjust={deck.jogAdjust}
                  jog={deck.jog}
                  idPrefix={idPrefix}
                />
                <View style={styles.underJog}>
                  <View style={styles.nfc}>
                    <Text style={styles.nfcText}>NFC</Text>
                  </View>
                  <Knob
                    testID={`${idPrefix}jog-adjust`}
                    label="JOG ADJUST"
                    value={deck.jogAdjust}
                    onChange={deck.setJogAdjust}
                    color={cdj.ledWhite}
                    size={30}
                  />
                </View>
              </View>

              <TempoControls
                pitch={deck.pitch}
                range={deck.pitchRange}
                masterTempo={deck.masterTempo}
                onPitchChange={deck.setPitch}
                onCycleRange={deck.handleCycleRange}
                onToggleMasterTempo={() => deck.setMasterTempo((m) => !m)}
                tempoReset={deck.tempoReset}
                onReset={deck.toggleTempoReset}
                syncOn={sync.syncOn}
                isMaster={sync.isMaster}
                onSync={sync.onSync}
                onMaster={sync.onMaster}
                onInstantDoubles={sync.onInstantDoubles}
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
  underJog: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
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
  previewBadgeWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 4,
    alignItems: 'center',
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 8,
    paddingRight: 3,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(40, 20, 0, 0.92)',
    borderWidth: 1,
    borderColor: cdj.ledOrange,
  },
  previewBadgeText: {
    color: cdj.ledOrange,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  previewStop: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: cdj.ledOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewStopText: {
    color: '#000000',
    fontSize: 8,
    fontWeight: '900',
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
