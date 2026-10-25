import { useCallback, useMemo, useState } from 'react';
import { clamp } from '../utils/format';

import { DECK_IDS, deckOnChannel, defaultInputIndex, INPUT_OPTIONS, MIXER_CHANNELS } from '../constants/setup';
export { BEAT_FX_NAMES } from '../utils/beatFx';
export const BEAT_FX_ASSIGNS = [...Array.from({ length: MIXER_CHANNELS }, (_, i) => `CH${i + 1}`), 'MASTER'];

function makeChannel(index) {
  return {
    trim: 0.5,
    eqHi: 0.5,
    eqHiMid: 0.5,
    eqLoMid: 0.5,
    eqLow: 0.5,
    comp: 0,
    send: 0,
    filter: 0.5,
    fader: 0.85,
    // Crossfader assign: left half of the mixer to A, right half to B.
    assign: index < MIXER_CHANNELS / 2 ? 'A' : 'B',
    inputIndex: defaultInputIndex(index),
    cue: false,
  };
}

function channelGain(channel, crossfader) {
  const eqAvg = (channel.eqHi + channel.eqHiMid + channel.eqLoMid + channel.eqLow) / 4;
  const eqGain = clamp(0.3 + 1.4 * eqAvg, 0, 1.6);
  const trimGain = 0.3 + 1.4 * channel.trim;
  let crossGain = 1;
  if (channel.assign === 'A') crossGain = clamp(1 - Math.max(0, crossfader), 0, 1);
  else if (channel.assign === 'B') crossGain = clamp(1 - Math.max(0, -crossfader), 0, 1);
  return trimGain * eqGain * channel.fader * crossGain;
}

export default function useMixerState({ deckASignal, deckBSignal }) {
  const [channels, setChannels] = useState(() => Array.from({ length: MIXER_CHANNELS }, (_, i) => makeChannel(i)));
  const [crossfader, setCrossfader] = useState(0);
  const [master, setMaster] = useState({ level: 0.75, booth: 0.5, isolatorOn: false, isoHi: 0.5, isoMid: 0.5, isoLow: 0.5 });
  const [mic1, setMic1] = useState({ mode: 'off', level: 0.5, eqHi: 0.5, eqLow: 0.5 });
  const [mic2, setMic2] = useState({ mode: 'off', level: 0.5, eqHi: 0.5, eqLow: 0.5 });
  // FILTER section: which side of each channel's FILTER knob is active
  // (LPF to the left, HPF to the right) and the shared RESONANCE.
  const [filter, setFilter] = useState({ lpf: true, hpf: true, resonance: 0.3 });
  // HEADPHONES section. The device's one output plays the headphones, so
  // MIXING starts at MASTER: you hear the mix until you turn it toward CUE.
  const [headphones, setHeadphones] = useState({ mixing: 1, level: 0.75, split: false, preEq: false });
  // SEND FX: the built-in effect (or EXT1/EXT2), its knobs, and MASTER MIX.
  // How much each channel sends is that channel's SEND knob.
  const [sendFx, setSendFx] = useState({
    source: 'SHORT DELAY',
    size: 0.5,
    time: 0.5,
    tone: 0.5,
    masterMixLevel: 0.5,
    masterMixOn: false,
  });
  // BEAT FX. `beats` remembers the BEAT value picked for each effect; `time`
  // is a TIME knob override in ms (or %), cleared by the BEAT buttons.
  const [beatFx, setBeatFx] = useState({
    assign: 'CH3',
    on: false,
    effect: 'ECHO',
    beats: {},
    time: null,
    depth: 0.5,
    bands: { low: true, mid: true, hi: true },
    bpmMode: 'AUTO',
    tapBpm: null,
  });

  // useCallback with an empty dep array (all use the functional setState
  // form, so they never need to close over current state) keeps these
  // referentially stable across renders — required for React.memo on the
  // mixer's section components to actually skip re-rendering when unrelated
  // state (e.g. the crossfader) changes.
  const updateChannel = useCallback((index, patch) => {
    setChannels((prev) => prev.map((ch, i) => (i === index ? { ...ch, ...patch } : ch)));
  }, []);

  // The input selector is a rotary switch: step it either way.
  const cycleChannelInput = useCallback((index, dir = 1) => {
    setChannels((prev) =>
      prev.map((ch, i) =>
        i === index ? { ...ch, inputIndex: (ch.inputIndex + dir + INPUT_OPTIONS.length) % INPUT_OPTIONS.length } : ch
      )
    );
  }, []);

  const toggleChannelCue = useCallback((index) => {
    setChannels((prev) => prev.map((ch, i) => (i === index ? { ...ch, cue: !ch.cue } : ch)));
  }, []);

  // Which deck each channel is playing (from its input selector).
  const channelDecks = useMemo(
    () => channels.map((ch, i) => deckOnChannel(i, INPUT_OPTIONS[ch.inputIndex])),
    [channels]
  );
  const signalOf = { A: deckASignal ? 0.75 : 0, B: deckBSignal ? 0.75 : 0 };
  const deckSignals = channelDecks.map((id) => (id ? signalOf[id] : 0));

  // Pure per-channel gain (trim/EQ/fader/crossfader only) — independent of
  // whether the linked deck is actually playing. This is what should drive
  // real playback volume; channelLevels (below) is the same thing but scaled
  // by the deck's play signal, for the VU meters.
  const channelGains = useMemo(
    () => channels.map((ch) => clamp(channelGain(ch, crossfader), 0, 1)),
    [channels, crossfader]
  );

  const channelLevels = useMemo(
    () => channels.map((ch, i) => clamp(deckSignals[i] * channelGain(ch, crossfader), 0, 1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [channels, crossfader, deckASignal, deckBSignal]
  );

  // Expo Go fallback: each deck's volume is the gain of the channel(s) it's on.
  const deckGains = useMemo(
    () =>
      Object.fromEntries(
        DECK_IDS.map((id) => [id, channelDecks.reduce((g, d, i) => (d === id ? Math.max(g, channelGains[i]) : g), 0)])
      ),
    [channelDecks, channelGains]
  );

  const masterLevel = useMemo(() => {
    const sum = channelLevels.reduce((a, b) => a + b, 0);
    return clamp(sum * (0.5 + 0.9 * master.level), 0, 1);
  }, [channelLevels, master.level]);

  return {
    channels,
    crossfader,
    master,
    mic1,
    mic2,
    filter,
    headphones,
    sendFx,
    beatFx,
    channelGains,
    channelLevels,
    channelDecks,
    deckGains,
    masterLevel,
    setCrossfader,
    setMaster,
    setMic1,
    setMic2,
    setFilter,
    setHeadphones,
    setSendFx,
    setBeatFx,
    updateChannel,
    cycleChannelInput,
    toggleChannelCue,
  };
}
