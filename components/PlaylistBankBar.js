import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cdj } from '../constants/theme';
import { useLearnTarget } from '../hooks/useLearningMode';
import LearnView from './LearnView';

// The Playlist Bank strip across the top of the PLAYLIST screen. An empty
// bank's icon is grey: touch it to register the highlighted playlist. A
// registered bank's icon is white: touch it to jump straight into that
// playlist. The ✕ key turns on deregister mode; then touch a bank to clear it.
export default function PlaylistBankBar({
  slots,
  playlistsById,
  activePlaylistId,
  deregistering,
  onPressSlot,
  onToggleDeregister,
  idPrefix = '',
}) {
  const deregisterLearn = useLearnTarget(`${idPrefix}playlist-bank-deregister`);
  return (
    <LearnView learnId={`${idPrefix}playlist-bank-bar`} style={styles.bar}>
      {slots.map((playlistId, i) => {
        const playlist = playlistId ? playlistsById[playlistId] : null;
        const active = playlist && playlist.id === activePlaylistId;
        return (
          <Pressable
            key={i}
            testID={`${idPrefix}playlist-bank-${i + 1}`}
            onPress={() => onPressSlot(i)}
            style={[styles.slot, playlist && styles.slotRegistered, active && styles.slotActive]}
          >
            <View style={[styles.icon, playlist && styles.iconRegistered]}>
              <Text style={[styles.iconText, playlist && styles.iconTextRegistered]}>{i + 1}</Text>
            </View>
            <Text style={[styles.name, playlist && styles.nameRegistered]} numberOfLines={1}>
              {playlist ? playlist.name : 'EMPTY'}
            </Text>
            {deregistering && playlist ? (
              <View style={styles.cross}>
                <Text style={styles.crossText}>✕</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
      <Pressable
        {...deregisterLearn.props}
        testID={`${idPrefix}playlist-bank-deregister`}
        onPress={onToggleDeregister}
        style={[styles.deregister, deregistering && styles.deregisterOn, deregisterLearn.style]}
      >
        <Text style={[styles.deregisterText, deregistering && styles.deregisterTextOn]}>✕</Text>
      </Pressable>
    </LearnView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: cdj.screenDivider,
  },
  slot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 24,
    paddingHorizontal: 4,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#2a2f36',
    backgroundColor: '#07090c',
  },
  slotRegistered: {
    borderColor: '#5d646d',
    backgroundColor: '#11151a',
  },
  slotActive: {
    borderColor: cdj.screenText,
    backgroundColor: '#1d4f9e',
  },
  icon: {
    width: 14,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#3a4048',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRegistered: {
    backgroundColor: cdj.screenText,
  },
  iconText: {
    color: '#11151a',
    fontSize: 8,
    fontWeight: '900',
  },
  iconTextRegistered: {
    color: '#000000',
  },
  name: {
    flex: 1,
    color: '#4a5058',
    fontSize: 8,
    fontWeight: '700',
  },
  nameRegistered: {
    color: cdj.screenText,
  },
  cross: {
    position: 'absolute',
    top: -4,
    right: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: cdj.ledRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossText: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: '900',
  },
  deregister: {
    width: 24,
    height: 24,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#2a2f36',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deregisterOn: {
    borderColor: cdj.ledRed,
    backgroundColor: '#2a0d0c',
  },
  deregisterText: {
    color: cdj.screenTextDim,
    fontSize: 10,
    fontWeight: '900',
  },
  deregisterTextOn: {
    color: cdj.ledRed,
  },
});
