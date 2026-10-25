import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';
import { formatTime } from '../utils/format';

const ROW_HEIGHT = 34;

function formatBpm(bpm) {
  return Number.isInteger(bpm) ? String(bpm) : bpm.toFixed(2).replace(/0$/, '');
}

export default function BrowseScreen({
  breadcrumb,
  items,
  selectedIndex,
  onSelectItem,
  onDeleteItem,
  loadedTrackId,
  status,
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

  return (
    <View style={styles.display}>
      <Text style={styles.breadcrumb} numberOfLines={1}>
        {breadcrumb.join(' ▸ ')}
      </Text>
      <ScrollView ref={scrollRef} style={styles.list} contentContainerStyle={styles.listContent}>
        {items.length === 0 ? (
          <Text style={styles.emptyText}>EMPTY</Text>
        ) : (
          items.map((item, i) => {
            const selected = i === selectedIndex;
            const track = item.type === 'track' ? item.track : null;
            const loaded = track && track.id === loadedTrackId;
            return (
              <Pressable
                key={i}
                testID={`${idPrefix}browse-row-${i}`}
                style={[styles.row, selected && styles.rowSelected]}
                onPress={() => onSelectItem(i)}
              >
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
                    <Text style={[styles.trackMeta, selected && styles.selectedText]}>{formatBpm(track.bpm)} BPM</Text>
                    <Text style={[styles.trackMeta, selected && styles.selectedText]}>
                      {formatTime(track.duration)}
                    </Text>
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
            );
          })
        )}
      </ScrollView>
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
  breadcrumb: {
    color: cdj.screenText,
    backgroundColor: cdj.screenPanel,
    borderBottomWidth: 1,
    borderBottomColor: cdj.screenDivider,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#11151a',
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
