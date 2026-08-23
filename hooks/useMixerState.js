import { useMemo, useState } from 'react';
import { clamp } from '../utils/format';

const INPUT_OPTIONS = ['DIGITAL', 'LINE', 'PHONO', 'MULTI I/O'];
export const BEAT_FX_NAMES = ['ECHO', 'DELAY', 'SPIRAL', 'REVERB', 'FLANGER', 'FILTER', 'TRANS', 'ROLL'];
export const BEAT_FX_ASSIGNS = ['CH1', 'CH2', 'CH3', 'CH4', 'CH5', 'CH6', 'MASTER'];
export const SEND_SOURCES = ['BUILT-IN', 'EXT1', 'EXT2'];

function makeChannel(index) {
  return {
    trim: 0.5,
    eqHi: 0.5,
    eqHiMid: 0.5,
    eqLoMid: 0.5,
    eqLow: 0.5,
    comp: 0,
    fader: index < 2 ? 0.85 : 0.7,
    assign: index === 0 ? 'A' : index === 1 ? 'B' : 'thru',
    inputIndex: 0,
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
  const [channels, setChannels] = useState(() => Array.from({ length: 6 }, (_, i) => makeChannel(i)));
  const [crossfader, setCrossfader] = useState(0);
  const [master, setMaster] = useState({ level: 0.75, booth: 0.5, isolatorOn: false, isoHi: 0.5, isoMid: 0.5, isoLow: 0.5 });
  const [mic1, setMic1] = useState({ mode: 'off', level: 0.5, eqHi: 0.5, eqLow: 0.5 });
  const [mic2, setMic2] = useState({ mode: 'off', level: 0.5, eqHi: 0.5, eqLow: 0.5 });
  const [filter, setFilter] = useState({ mode: 'off', freq: 0.5, resonance: 0.3 });
  const [sendFx, setSendFx] = useState({
    source: 'BUILT-IN',
    size: 0.5,
    time: 0.5,
    tone: 0.5,
    send: 0.5,
    masterMixLevel: 0.5,
    masterMixOn: false,
  });
  const [beatFx, setBeatFx] = useState({ assign: 'CH1', on: false, effectIndex: 0 });

  const updateChannel = (index, patch) => {
    setChannels((prev) => prev.map((ch, i) => (i === index ? { ...ch, ...patch } : ch)));
  };

  const cycleChannelInput = (index) => {
    setChannels((prev) =>
      prev.map((ch, i) => (i === index ? { ...ch, inputIndex: (ch.inputIndex + 1) % INPUT_OPTIONS.length } : ch))
    );
  };

  const toggleChannelCue = (index) => {
    setChannels((prev) => prev.map((ch, i) => (i === index ? { ...ch, cue: !ch.cue } : ch)));
  };

  const deckSignals = [deckASignal ? 0.75 : 0, deckBSignal ? 0.75 : 0, 0, 0, 0, 0];

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
    sendFx,
    beatFx,
    channelGains,
    channelLevels,
    masterLevel,
    inputOptions: INPUT_OPTIONS,
    setCrossfader,
    setMaster,
    setMic1,
    setMic2,
    setFilter,
    setSendFx,
    setBeatFx,
    updateChannel,
    cycleChannelInput,
    toggleChannelCue,
  };
}
