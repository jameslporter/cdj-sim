// How the booth is cabled: each CDJ's digital output goes into one DJM-V10
// channel's DIGITAL input. With two players on a six-channel mixer they sit
// on the centre channels, so the channel's input selector has to be on
// DIGITAL to hear the deck — part of finding "your" channel at a venue.
export const MIXER_CHANNELS = 6;

// The V10's per-channel input selector positions. BUILT-IN, EXT1, EXT2 and
// BUILT-IN·EXT (all three) bring the SEND effect sound back in on the channel.
export const INPUT_OPTIONS = [
  'DIGITAL',
  'LINE',
  'PHONO',
  'USB A',
  'USB B',
  'MULTI I/O',
  'BUILT-IN',
  'EXT1',
  'EXT2',
  'BUILT-IN·EXT',
];

/** Whether a channel on this input hears the BUILT-IN send effect's return. */
export const inputReturnsBuiltIn = (inputName) => inputName === 'BUILT-IN' || inputName === 'BUILT-IN·EXT';

// deck id → where its cable is plugged in (0-based channel index).
export const DECK_JACKS = {
  A: { channel: 2, input: 'DIGITAL' },
  B: { channel: 3, input: 'DIGITAL' },
};
export const DECK_IDS = ['A', 'B'];

/** Which deck (if any) a channel is playing, from its input selector. */
export function deckOnChannel(channelIndex, inputName) {
  return DECK_IDS.find((id) => DECK_JACKS[id].channel === channelIndex && DECK_JACKS[id].input === inputName) ?? null;
}

// Channels start on the input the decks are plugged into, and LINE elsewhere.
export const defaultInputIndex = (channelIndex) =>
  INPUT_OPTIONS.indexOf(Object.values(DECK_JACKS).some((j) => j.channel === channelIndex) ? 'DIGITAL' : 'LINE');
