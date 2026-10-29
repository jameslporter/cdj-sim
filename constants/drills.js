import { INPUT_OPTIONS } from './setup';

// Guided drills: step-by-step exercises for the core gig skills. Each step
// says what to do, which control(s) to look at (`targets`, highlighted on
// the hardware), and how the sim knows it's done (`check`).
//
// `check(s)` gets { A, B, mixer, engine, memo }: the two deck APIs, the mixer
// state, the audio engine (or null in Expo Go) and a scratch object that
// lives for the step (for "hold it for 4 seconds" style checks).
// A step with no `check` has a NEXT button instead. A drill's optional
// `setup(s)` puts the booth in a starting state when the drill begins.

// Channels the decks are cabled to (constants/setup.js): deck A → CH3, deck B → CH4.
const CH_A = 2;
const CH_B = 3;

// Phase difference between the decks, in beats (-0.5 … 0.5).
function phaseDiff(A, B) {
  const d = (B.getBeatPos() - A.getBeatPos()) % 1;
  return d > 0.5 ? d - 1 : d < -0.5 ? d + 1 : d;
}

// Distance from `t` to the nearest beat line of the deck's grid, in beats.
function offGrid(deck, t) {
  const beat = 60 / (deck.track.bpm || 120);
  const pos = (t - (deck.track.firstBeat || 0)) / beat;
  return Math.abs(pos - Math.round(pos));
}

// True once `cond` has held for `ms` (uses the step's memo).
function heldFor(memo, cond, ms) {
  const now = Date.now();
  if (!cond) {
    memo.since = null;
    return false;
  }
  memo.since = memo.since ?? now;
  return now - memo.since >= ms;
}

const dbOf = (v) => 20 * Math.log10(v || 1e-9);
const LINE = INPUT_OPTIONS.indexOf('LINE');

export const DRILLS = [
  {
    id: 'venue',
    title: 'Arrive at the venue',
    skill: 'Booth setup',
    intro: 'The last DJ left the booth their way. Before your set, find your channel, check it\'s getting signal, and check your headphones. (This drill switches channel 3 to LINE, closes its fader and turns the headphones down, like you might find it.)',
    setup: ({ mixer, A }) => {
      if (A.isPlaying) A.handlePlayPause();
      mixer.updateChannel(CH_A, { inputIndex: LINE, fader: 0, cue: false });
      mixer.setHeadphones((h) => ({ ...h, level: 0.1, mixing: 1 }));
    },
    steps: [
      {
        text: 'Play deck A. Silence! Find its channel: deck A is cabled to channel 3\'s DIGITAL input. Turn channel 3\'s input selector to DIGITAL; the strip then shows DECK A.',
        targets: ['deckA-play-button', 'mixer-ch3-input'],
        check: ({ A, mixer }) => A.isPlaying && mixer.channelDecks[CH_A] === 'A',
      },
      {
        text: 'Bring channel 3\'s fader up and check its meter is moving.',
        targets: ['mixer-ch3-fader', 'mixer-ch3-meter'],
        check: ({ mixer, engine }) =>
          mixer.channels[CH_A].fader > 0.6 && (!engine || dbOf(engine.channelPeak(CH_A)) > -40),
      },
      {
        text: 'Check your headphones: press channel 3\'s CUE, turn MIXING toward CUE, and bring the headphones LEVEL up.',
        targets: ['mixer-ch3-cue', 'mixer-hp-mixing', 'mixer-hp-level'],
        check: ({ mixer }) =>
          mixer.channels[CH_A].cue && mixer.headphones.mixing < 0.3 && mixer.headphones.level > 0.5,
      },
      {
        text: 'All good. Turn MIXING back to MASTER and you\'re ready to play.',
        targets: ['mixer-hp-mixing'],
        check: ({ mixer }) => mixer.headphones.mixing > 0.7,
      },
    ],
  },
  {
    id: 'cue',
    title: 'Cue the first beat',
    skill: 'Cueing',
    intro: 'The first thing every DJ learns on a CDJ: park the track exactly on a beat with the jog wheel, set the cue point there, and start it in time.',
    steps: [
      {
        text: 'Press PLAY/PAUSE on deck A and listen for the kick drum.',
        targets: ['deckA-play-button'],
        check: ({ A }) => A.isPlaying,
      },
      {
        text: 'Press PLAY/PAUSE again to pause somewhere in the track.',
        targets: ['deckA-play-button'],
        check: ({ A }) => !A.isPlaying && A.elapsed > 1,
      },
      {
        text: 'Turn the jog wheel until the playhead sits right on a white beat line in the zoomed waveform. Paused, the jog moves the track a tiny bit at a time.',
        targets: ['deckA-jog-wheel', 'deckA-display-zoom'],
        check: ({ A }) => !A.isPlaying && offGrid(A, A.getPosition()) < 0.03,
      },
      {
        text: 'Press CUE to set the cue point there. The CUE button lights up.',
        targets: ['deckA-cue-button'],
        check: ({ A }) => offGrid(A, A.cuePoint) < 0.03 && A.cuePoint > 0.5,
      },
      {
        text: 'Hold CUE: the track plays from the cue for as long as you hold it, and jumps back when you let go. Try it a few times, then press PLAY to start the track on the beat.',
        targets: ['deckA-cue-button', 'deckA-play-button'],
        check: ({ A }) => A.isPlaying,
      },
    ],
  },
  {
    id: 'gain',
    title: 'Set your levels',
    skill: 'Gain staging',
    intro: 'Venues judge DJs on staying out of the red. TRIM sets each channel\'s input level so its meter peaks around 0 dB; the fader then sets how loud it is in the mix.',
    steps: [
      {
        text: 'Play deck A. It\'s on mixer channel 3.',
        targets: ['deckA-play-button'],
        check: ({ A }) => A.isPlaying,
      },
      {
        text: 'Watch channel 3\'s meter and turn its TRIM until the loudest parts reach the orange segments (about -6 to 0 dB) but never the red.',
        targets: ['mixer-ch3-trim', 'mixer-ch3-meter'],
        check: ({ A, engine, memo }) => {
          if (!engine) return true;
          const peak = dbOf(engine.channelPeak(CH_A));
          memo.max = Math.max((memo.max ?? -99) - 0.1, peak); // a slowly falling peak hold
          return A.isPlaying && heldFor(memo, memo.max > -6 && memo.max < 1, 3000);
        },
      },
      {
        text: 'Now set MASTER LEVEL so the master meter peaks in the same range. That\'s your headroom: if a track is louder, turn its TRIM down, not the master up.',
        targets: ['mixer-master-level', 'mixer-master-meter'],
        check: ({ engine, memo }) => {
          if (!engine) return true;
          const peak = dbOf(engine.masterPeak());
          memo.max = Math.max((memo.max ?? -99) - 0.1, peak); // a slowly falling peak hold
          return heldFor(memo, memo.max > -8 && memo.max < 1, 3000);
        },
      },
    ],
  },
  {
    id: 'headphones',
    title: 'Listen in your headphones',
    skill: 'Headphone cueing',
    intro: 'Before the crowd hears the next track, you hear it. CUE on a channel sends it to your headphones even with its fader down.',
    steps: [
      {
        text: 'Pull channel 4\'s fader all the way down so the crowd can\'t hear deck B.',
        targets: ['mixer-ch4-fader'],
        check: ({ mixer }) => mixer.channels[CH_B].fader < 0.05,
      },
      {
        text: 'Press channel 4\'s CUE button.',
        targets: ['mixer-ch4-cue'],
        check: ({ mixer }) => mixer.channels[CH_B].cue,
      },
      {
        text: 'Turn HEADPHONES MIXING toward CUE. (Here the speakers play your headphones, so you\'ll hear the cue instead of the master.)',
        targets: ['mixer-hp-mixing'],
        check: ({ mixer }) => mixer.headphones.mixing < 0.3,
      },
      {
        text: 'Play deck B. You hear it, the "crowd" doesn\'t. Turn MIXING back to MASTER to hear the room again.',
        targets: ['deckB-play-button', 'mixer-hp-mixing'],
        check: ({ B, mixer }) => B.isPlaying && mixer.headphones.mixing > 0.7,
      },
    ],
  },
  {
    id: 'beatmatch',
    title: 'Beatmatch by ear',
    skill: 'Beatmatching',
    intro: 'Match two tracks without SYNC: first the tempo with the TEMPO fader, then the phase with the jog wheel. Deck A plays EDM Detection Mode (128 BPM); load Blippy Trance (138 BPM) on deck B.',
    steps: [
      {
        text: 'Make sure BEAT SYNC is off on both decks, then play deck A.',
        targets: ['deckA-play-button', 'deckA-beat-sync', 'deckB-beat-sync'],
        check: ({ A, B }) => A.isPlaying && !A.synced && !B.synced,
      },
      {
        text: 'Load a different track on deck B (TRACK SEARCH ▶▶| does it quickly) and play it.',
        targets: ['deckB-track-search-forward', 'deckB-play-button'],
        check: ({ A, B }) => B.isPlaying && B.track.id !== A.track.id,
      },
      {
        text: 'Move deck B\'s TEMPO fader until its BPM matches deck A\'s to within 0.1. Use a wider tempo range (TEMPO ±6/10/16/WIDE) if you can\'t get there.',
        targets: ['deckB-tempo-fader-thumb', 'deckB-tempo-range'],
        check: ({ A, B }) => Math.abs(A.displayedBpm - B.displayedBpm) < 0.1,
      },
      {
        text: 'Now line up the kicks: nudge deck B\'s jog wheel ring (the outer edge) to speed it up or slow it down until the beats land together. The phase meter shows how far apart they are. Hold it in phase for 4 seconds.',
        targets: ['deckB-jog-wheel', 'deckB-phase-meter'],
        check: ({ A, B, memo }) =>
          heldFor(memo, A.isPlaying && B.isPlaying && Math.abs(phaseDiff(A, B)) < 0.05 && Math.abs(A.displayedBpm - B.displayedBpm) < 0.1, 4000),
      },
    ],
  },
  {
    id: 'bassswap',
    title: 'Bass swap',
    skill: 'EQ mixing',
    intro: 'Two basslines at once sound muddy, so DJs swap them: the incoming track comes in without its bass, then the basses trade places on a phrase. Use BEAT SYNC to keep the decks matched if you like.',
    steps: [
      {
        text: 'Play both decks in time (BEAT SYNC on deck B is fine). Deck A is the one the crowd hears.',
        targets: ['deckA-play-button', 'deckB-play-button', 'deckB-beat-sync'],
        check: ({ A, B }) => A.isPlaying && B.isPlaying,
      },
      {
        text: 'On channel 4 (deck B), turn the LOW knob all the way down, then bring its fader up.',
        targets: ['mixer-ch4-eq-low', 'mixer-ch4-fader'],
        check: ({ mixer }) => mixer.channels[CH_B].eqLow < 0.08 && mixer.channels[CH_B].fader > 0.6,
      },
      {
        text: 'On the first beat of a phrase, swap the basses: channel 3\'s LOW all the way down and channel 4\'s LOW back to 12 o\'clock.',
        targets: ['mixer-ch3-eq-low', 'mixer-ch4-eq-low'],
        check: ({ mixer }) => mixer.channels[CH_A].eqLow < 0.08 && mixer.channels[CH_B].eqLow > 0.42,
      },
      {
        text: 'Finish the mix: pull channel 3\'s fader down. Deck B now has the room.',
        targets: ['mixer-ch3-fader'],
        check: ({ mixer }) => mixer.channels[CH_A].fader < 0.05,
      },
    ],
  },
  {
    id: 'echoout',
    title: 'Echo out',
    skill: 'Beat FX',
    intro: 'The classic rescue move when a mix goes wrong, or a clean way to end a track: throw it into an echo and pull the fader down while the echoes fade.',
    steps: [
      {
        text: 'Play deck A with channel 3\'s fader up.',
        targets: ['deckA-play-button', 'mixer-ch3-fader'],
        check: ({ A, mixer }) => A.isPlaying && mixer.channels[CH_A].fader > 0.5,
      },
      {
        text: 'In BEAT FX, pick ECHO with BEAT FX SELECT, and light channel 3\'s BEAT FX ASSIGN button (and only that one).',
        targets: ['mixer-beatfx-effect', 'mixer-ch3-beatfx-assign'],
        check: ({ mixer }) =>
          mixer.beatFx.effect === 'ECHO' &&
          mixer.beatFx.assigns.length === 1 &&
          mixer.beatFx.assigns[0] === 'CH3',
      },
      {
        text: 'Set the BEAT to 3/4 or 1 with BEAT ◀ ▶ (or the X-PAD).',
        targets: ['mixer-beatfx-beat-up', 'mixer-beatfx-xpad'],
        check: ({ mixer }) => [0.75, 1].includes(mixer.beatFx.beats.ECHO ?? 0.75) && mixer.beatFx.time == null,
      },
      {
        text: 'On the last beat of a phrase, press ON/OFF, then pull channel 3\'s fader down. The echoes keep going after the fader closes.',
        targets: ['mixer-beatfx-onoff', 'mixer-ch3-fader'],
        check: ({ mixer }) => mixer.beatFx.on && mixer.channels[CH_A].fader < 0.05,
      },
      {
        text: 'Turn the effect off. The last echoes fade out by themselves.',
        targets: ['mixer-beatfx-onoff'],
        check: ({ mixer }) => !mixer.beatFx.on,
      },
    ],
  },
];
