import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback, useRef, useState } from 'react';
import { resolveAudioSource } from '../utils/audioSource';
import { clamp } from '../utils/format';

const PREVIEW_VOLUME = 0.85;

// Touch Preview / Touch Cue: a second, independent player per deck that
// auditions a track from wherever the waveform is touched, without touching
// the deck's main output. On the hardware this goes to the mixer's
// headphone cue (LINK CUE); the sim has a single output, so it just plays.
//
// While a preview is active, the deck's HOT CUE pads store a cue at the
// preview position instead (Preview Hot Cue) — see useCdjDeck.
export default function useTouchPreview() {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [preview, setPreview] = useState(null); // { track, latched }
  const loadedIdRef = useRef(null);
  const seqRef = useRef(0);

  const start = useCallback(
    async (track, time, { latched = false } = {}) => {
      const seq = ++seqRef.current;
      setPreview({ track, latched, startTime: time });
      if (loadedIdRef.current !== track.id) {
        let source;
        try {
          source = await resolveAudioSource(track);
        } catch {
          if (seq === seqRef.current) setPreview(null);
          return;
        }
        // The touch may have ended (or moved to another track) meanwhile.
        if (seq !== seqRef.current) return;
        player.replace(source);
        loadedIdRef.current = track.id;
      }
      player.volume = PREVIEW_VOLUME;
      player.seekTo(clamp(time, 0, track.duration)).catch(() => {});
      player.play();
    },
    [player]
  );

  const move = useCallback(
    (time) => {
      player.seekTo(Math.max(0, time)).catch(() => {});
    },
    [player]
  );

  const stop = useCallback(() => {
    seqRef.current += 1;
    player.pause();
    setPreview(null);
  }, [player]);

  // Read straight from the player so a hot cue lands exactly where the
  // audio is, not where the last status tick said it was.
  const currentTime = () => {
    const t = player.currentTime;
    return Number.isFinite(t) ? t : (preview?.startTime ?? 0);
  };

  const time = preview && status.currentTime != null ? status.currentTime : (preview?.startTime ?? 0);

  return {
    active: Boolean(preview),
    track: preview?.track ?? null,
    latched: preview?.latched ?? false,
    time,
    currentTime,
    start,
    move,
    stop,
  };
}
