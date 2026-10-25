import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useMemo, useState } from 'react';
import { EnginePlayer } from '../utils/enginePlayer';
import { getMixerEngine } from '../utils/mixerEngine';

const EMPTY_STATUS = { isLoaded: false, duration: 0, currentTime: 0, playing: false };

// The deck's player wired into mixer channel `channel`, so the mixer's EQ,
// filter, faders and cue shape its sound.
function useEngineDeckPlayer(source, channel) {
  const [status, setStatus] = useState(EMPTY_STATUS);
  const player = useMemo(
    () => new EnginePlayer(source, getMixerEngine().channelInput(channel), setStatus),
    // A new track gets a new player, like expo-audio's useAudioPlayer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [typeof source === 'number' ? source : (source?.uri ?? source), channel]
  );
  useEffect(() => {
    setStatus(EMPTY_STATUS);
    return () => player.release();
  }, [player]);
  return { player, status, routedThroughMixer: true };
}

// Expo Go has no Web Audio, so there the deck uses expo-audio and the mixer
// can only set its volume.
function useExpoDeckPlayer(source) {
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);
  return { player, status, routedThroughMixer: false };
}

// Chosen once: the same hook runs on every render.
const useDeckPlayer = getMixerEngine() ? useEngineDeckPlayer : useExpoDeckPlayer;
export default useDeckPlayer;

export const isMixerAudioLive = () => getMixerEngine() != null;
