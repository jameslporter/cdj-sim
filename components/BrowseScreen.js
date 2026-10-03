import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { DEMO_TRACKS } from '../constants/tracks';
import { formatTime } from '../utils/format';

export default function BrowseScreen({ breadcrumb, items, selectedIndex, onSelectItem, idPrefix = '' }) {
  return (
    <View style={styles.display}>
      <Text style={styles.breadcrumb} numberOfLines={1}>
        {breadcrumb.join(' ▸ ')}
      </Text>
      <View style={styles.list}>
        {items.length === 0 ? (
          <Text style={styles.emptyText}>EMPTY</Text>
        ) : (
          items.map((item, i) => {
            const selected = i === selectedIndex;
            const track = item.type === 'track' ? DEMO_TRACKS[item.trackIndex] : null;
            return (
              <Pressable
                key={i}
                testID={`${idPrefix}browse-row-${i}`}
                style={[styles.row, selected && styles.rowSelected]}
                onPress={() => onSelectItem(i)}
              >
                {item.type === 'folder' ? (
                  <Text style={[styles.folderText, selected && styles.selectedText]} numberOfLines={1}>
                    {'▸ '}
                    {item.name}
                  </Text>
                ) : (
                  <>
                    <View style={styles.trackInfo}>
                      <Text style={[styles.trackTitle, selected && styles.selectedText]} numberOfLines={1}>
                        {track.title}
                      </Text>
                      <Text style={[styles.trackArtist, selected && styles.selectedText]} numberOfLines={1}>
                        {track.artist}
                      </Text>
                    </View>
                    <Text style={[styles.trackMeta, selected && styles.selectedText]}>{track.bpm} BPM</Text>
                    <Text style={[styles.trackMeta, selected && styles.selectedText]}>
                      {formatTime(track.duration)}
                    </Text>
                  </>
                )}
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  display: {
    backgroundColor: colors.panelBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 14,
    gap: 8,
    minHeight: 176,
  },
  breadcrumb: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  list: {
    gap: 2,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
    padding: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 4,
    gap: 8,
  },
  rowSelected: {
    backgroundColor: colors.accentDim,
  },
  folderText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  trackInfo: {
    flex: 1,
    gap: 1,
  },
  trackTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  trackArtist: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  trackMeta: {
    color: colors.textSecondary,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  selectedText: {
    color: colors.textPrimary,
  },
});
