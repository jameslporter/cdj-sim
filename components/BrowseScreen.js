import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';
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
    gap: 1,
    paddingHorizontal: 4,
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
