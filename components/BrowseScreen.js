import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';
import { formatTime } from '../utils/format';
import TouchWaveform from './TouchWaveform';
import { waveSeed } from './Waveform';
import LearnView from './LearnView';
import { useLearnTarget } from '../hooks/useLearningMode';

const ROW_HEIGHT = 34;

function formatBpm(bpm) {
  return Number.isInteger(bpm) ? String(bpm) : bpm.toFixed(2).replace(/0$/, '');
}

// Track list shared by the BROWSE and PLAYLIST screens. With the PREVIEW
// column on, each track shows a waveform you can touch to audition it
// (Touch Preview); hold it and press a HOT CUE pad to store a cue there
// (Preview Hot Cue).
export default function BrowseScreen({
  breadcrumb,
  items,
  selectedIndex,
  onSelectItem,
  onDeleteItem,
  loadedTrackId,
  status,
  header,
  showPreview,
  onTogglePreview,
  preview,
  getHotCues,
  onPreviewStart,
  onPreviewMove,
  onPreviewEnd,
  idPrefix = '',
}) {
  // Deleting takes two taps on ✕ (the second one confirms).
  const [confirmDelete, setConfirmDelete] = useState(null);
  useEffect(() => setConfirmDelete(null), [items, selectedIndex]);

  // Keep the highlighted row in view as the rotary moves through a long list.
  const scrollRef = useRef(null);
  useEffect(() => {
    scrollRef.current?.scrollTo?.({ y: Math.max(0, (selectedIndex - 3) * ROW_HEIGHT), animated: false });
  }, [selectedIndex]);

  const previewToggleLearn = useLearnTarget(`${idPrefix}preview-toggle`);

  return (
    <View style={styles.display}>
      <View style={styles.titleBar}>
        <Text style={styles.breadcrumb} numberOfLines={1}>
          {breadcrumb.join(' ▸ ')}
        </Text>
        {onTogglePreview ? (
          <Pressable
            {...previewToggleLearn.props}
            testID={`${idPrefix}preview-toggle`}
            onPress={onTogglePreview}
            style={[styles.touchKey, showPreview && styles.touchKeyOn, previewToggleLearn.style]}
          >
            <Text style={[styles.touchKeyText, showPreview && styles.touchKeyTextOn]}>PREVIEW</Text>
          </Pressable>
        ) : null}
      </View>
      {header}
      <LearnView learnId={`${idPrefix}browse-list`} style={styles.listWrap}>
      <ScrollView ref={scrollRef} style={styles.list} contentContainerStyle={styles.listContent}>
        {items.length === 0 ? (
          <Text style={styles.emptyText}>EMPTY</Text>
        ) : (
          items.map((item, i) => {
            const selected = i === selectedIndex;
            const track = item.type === 'track' ? item.track : null;
            const loaded = track && track.id === loadedTrackId;
            const previewing = track && preview?.active && preview.track?.id === track.id;
            return (
              <View key={i} style={[styles.row, selected && styles.rowSelected]}>
                <Pressable testID={`${idPrefix}browse-row-${i}`} style={styles.rowMain} onPress={() => onSelectItem(i)}>
                  {item.type === 'action' ? (
                    <Text
                      style={[styles.actionText, item.disabled && styles.disabledText, selected && styles.selectedText]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                  ) : item.type === 'folder' ? (
                    <Text style={[styles.folderText, selected && styles.selectedText]} numberOfLines={1}>
                      {'▸ '}
                      {item.name}
                    </Text>
                  ) : (
                    <>
                      <View style={styles.trackInfo}>
                        <Text
                          style={[styles.trackTitle, loaded && styles.loadedText, selected && styles.selectedText]}
                          numberOfLines={1}
                        >
                          {track.title}
                        </Text>
                        <Text style={[styles.trackArtist, selected && styles.selectedText]} numberOfLines={1}>
                          {track.artist}
                        </Text>
                      </View>
                      <Text style={[styles.trackMeta, selected && styles.selectedText]}>
                        {formatBpm(track.bpm)} BPM
                      </Text>
                      {showPreview ? null : (
                        <Text style={[styles.trackMeta, selected && styles.selectedText]}>
                          {formatTime(track.duration)}
                        </Text>
                      )}
                      {item.deletable && selected && onDeleteItem ? (
                        <Pressable
                          testID={`${idPrefix}browse-delete-${i}`}
                          style={[styles.deleteButton, confirmDelete === i && styles.deleteConfirm]}
                          onPress={() => {
                            if (confirmDelete === i) onDeleteItem(i);
                            else setConfirmDelete(i);
                          }}
                        >
                          <Text style={styles.deleteText}>{confirmDelete === i ? 'DELETE?' : '✕'}</Text>
                        </Pressable>
                      ) : null}
                    </>
                  )}
                </Pressable>
                {showPreview && track ? (
                  <TouchWaveform
                    testID={`${idPrefix}preview-wave-${i}`}
                    style={[styles.previewWave, previewing && styles.previewWaveActive]}
                    seed={waveSeed(track.id)}
                    peaks={track.peaks}
                    height={18}
                    barCount={44}
                    showPlayhead={false}
                    hotCues={getHotCues?.(track.id)}
                    duration={track.duration}
                    previewRatio={previewing ? preview.time / track.duration : null}
                    onTouchStart={(ratio, isMouse) => onPreviewStart?.(track, ratio, isMouse)}
                    onTouchMove={(ratio) => onPreviewMove?.(track, ratio)}
                    onTouchEnd={() => onPreviewEnd?.()}
                  />
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
      </LearnView>
      {status ? (
        <Text testID={`${idPrefix}browse-status`} style={styles.status} numberOfLines={2}>
          {status}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  display: {
    flex: 1,
    backgroundColor: cdj.screenBg,
    gap: 4,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cdj.screenPanel,
    borderBottomWidth: 1,
    borderBottomColor: cdj.screenDivider,
    paddingRight: 4,
  },
  touchKey: {
    borderWidth: 1,
    borderColor: '#3a4048',
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  touchKeyOn: {
    borderColor: cdj.screenText,
    backgroundColor: '#2a2f36',
  },
  touchKeyText: {
    color: cdj.screenTextDim,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  touchKeyTextOn: {
    color: cdj.screenText,
  },
  previewWave: {
    width: 120,
    height: 24,
    paddingHorizontal: 2,
    borderRadius: 2,
    backgroundColor: '#05070a',
    borderWidth: 1,
    borderColor: '#1a1f26',
  },
  previewWaveActive: {
    borderColor: cdj.ledOrange,
  },
  breadcrumb: {
    flex: 1,
    color: cdj.screenText,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  listWrap: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 1,
    paddingHorizontal: 4,
  },
  actionText: {
    color: cdj.waveMid,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  disabledText: {
    color: cdj.screenTextDim,
  },
  loadedText: {
    color: cdj.waveMid,
  },
  deleteButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  deleteConfirm: {
    backgroundColor: '#b3261e',
    borderColor: '#b3261e',
  },
  deleteText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  status: {
    color: cdj.screenText,
    backgroundColor: cdj.screenPanel,
    borderTopWidth: 1,
    borderTopColor: cdj.screenDivider,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  emptyText: {
    color: cdj.screenTextDim,
    fontSize: 12,
    padding: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#11151a',
    gap: 6,
    paddingRight: 4,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 8,
    gap: 8,
  },
  rowSelected: {
    backgroundColor: '#1d4f9e',
  },
  folderText: {
    color: cdj.screenText,
    fontSize: 13,
    fontWeight: '700',
  },
  trackInfo: {
    flex: 1,
    gap: 1,
  },
  trackTitle: {
    color: cdj.screenText,
    fontSize: 12,
    fontWeight: '700',
  },
  trackArtist: {
    color: cdj.screenTextDim,
    fontSize: 10,
  },
  trackMeta: {
    color: cdj.screenTextDim,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  selectedText: {
    color: '#ffffff',
  },
});
