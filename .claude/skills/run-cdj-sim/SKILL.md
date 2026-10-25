---
name: run-cdj-sim
description: Build, run, and drive the cdj-sim Expo web app. Use when asked to start cdj-sim, run its web dev server, take a screenshot of the CDJ-3000 + DJM-V10 simulator UI, or interact with controls (jog wheel, hot cues, loop, tempo fader, transport, mixer channel strips, crossfader, EQ/trim knobs).
---

cdj-sim is an Expo Router app (SDK 57). The interactive surface is the
web build — drive it by starting the Expo web dev server, then
scripting a headless Chromium page against it with the bundled
Playwright driver at `.claude/skills/run-cdj-sim/driver.mjs`. There is
no `chromium-cli` in this environment, so this driver stands in for
it (same idea: pipe newline commands to stdin).

All paths below are relative to the repo root (`/home/jim/apps/cdj-sim`).

## Prerequisites

No OS packages needed beyond what's already in this container. Playwright
is a devDependency of the project (`bunx expo install` / `bun add -d`
already ran this once — re-run only on a clean clone):

```bash
bun add -d playwright@1.62.1
```

Playwright needs its own browser binary (not npm-installed). If the
machine already has one (e.g. Claude Code cloud sessions ship
`/opt/pw-browsers/chromium`), point the driver at it with
`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node .claude/skills/run-cdj-sim/driver.mjs`.
Otherwise download it once per machine — it's cached in `~/.cache/ms-playwright/`, not in the repo:

```bash
npx playwright install chromium
```

## Setup

```bash
bun install
```

## Run (agent path)

1. Start the Expo web dev server in the background and wait for it to
   actually serve (don't `sleep` — poll):

```bash
(bunx expo start --web --port 8081 > /tmp/expo-web.log 2>&1 &)
timeout 60 bash -c 'until curl -sf http://localhost:8081 >/dev/null; do sleep 1; done'
```

2. Drive it by piping commands to the driver:

```bash
node .claude/skills/run-cdj-sim/driver.mjs <<'EOF'
nav http://localhost:8081
wait-for text=DECK A
screenshot initial
click sel=[data-testid="deckA-play-button"]
wait 1200
screenshot playing
console-errors
quit
EOF
```

Screenshots land in `.claude/skills/run-cdj-sim/screenshots/<name>.png`
(gitignored — they're proof-of-run artifacts, not committed).

3. Stop the server when done:

```bash
lsof -ti:8081 -sTCP:LISTEN | xargs -r kill
```

### Driver commands

| command | what it does |
|---|---|
| `viewport <width> <height>` | resize the page — must be the first command, before `nav`. Default is `420x1100` (phone-ish); use something like `700x1900` to see the mixer's 6 channels + master/beat-fx without scrolling as much |
| `nav <url>` | navigate |
| `wait-for text=<text>[\|nth=N]` | wait for an element with exact text |
| `wait <ms>` | pause |
| `click text=<text>[\|nth=N]` | click by exact text match (see Gotchas re: duplicate glyphs) |
| `click sel=<css>` | click by CSS selector — prefer `[data-testid="..."]` (see below) |
| `press-hold text=<text>[\|nth=N] <ms>` | full down→wait→up cycle in one shot; screenshot *after* this shows the released state |
| `down sel=<css>` / `up` | separate pointerdown/pointerup — use this pair (with a `screenshot` between) to capture a mid-hold state, e.g. the jog wheel's vinyl-mode brake |
| `drag sel=<css> dx=<px> dy=<px>` | drag from an element's center by a pixel offset — used for the tempo fader |
| `fill sel=<css> <value>` | fill a text input |
| `screenshot [name]` | full-page screenshot |
| `screenshot-el sel=<css> [name]` | screenshot one element |
| `eval <js>` | run JS in page context, prints the result |
| `console-errors` | prints all `console.error`/`pageerror` messages seen so far |
| `quit` | close the browser and exit |

### Layout: two decks + one mixer, side by side

The root route (`app/index.js`) renders `DECK A | DJM-V10 mixer | DECK B`
inside one `horizontal` `ScrollView` (`testID="session-scroll"`, ~1640px
of total content). At the default `420`-wide viewport you only see part of one
column at a time — scroll it with `eval`, e.g.:

```
eval document.querySelector('[data-testid="session-scroll"]').scrollBy({left: 580})
```

(`580` lands on the mixer, `1060` lands on Deck B — content widths are
Deck 580px + Mixer 480px + Deck 580px. `viewport 1700 1100` shows the
whole setup at once.) Each column also has its own
internal vertical `ScrollView` (deck: `testID="deckA-scroll"` /
`"deckB-scroll"`; mixer: `testID="mixer-scroll"`) since a single column
is taller than most viewports — scroll those the same way, or just use
a tall `viewport` (e.g. `700x1900`) to see more at once.

### testIDs

Every interactive control has a `testID`. react-native-web maps
`testID` straight to `data-testid` in the DOM, so target these with
`sel=[data-testid="..."]` instead of matching label text — it's
unambiguous and survives label text changes (e.g. the loop buttons
relabel from `4 BEAT` to `1/2X` once a loop is active).

**Deck controls** (there are two decks — every one of these testIDs is
prefixed `deckA-` or `deckB-`, e.g. `deckA-play-button`,
`deckB-hotcue-A`): `play-button`, `cue-button`, `search-back`,
`search-forward`, `jog-wheel`, `tempo-fader-thumb`, `tempo-range`,
`tempo-master`, `tempo-reset`, `hotcue-A`..`hotcue-H`, `loop-4beat`,
`loop-8beat`, `loop-reloop-exit`, `beatjump-back`, `beatjump-forward`,
`beatjump-count`, `mode-slip`, `jog-mode`, `direction-FWD` /
`direction-REV` / `direction-SLIP_REV`, `quantize`, `time-mode`,
`browse-prev`, `browse-next`, `browse-load`, `time-toggle`, `screen-back`,
`scroll` (the deck's own vertical ScrollView).

3000X touch-screen features (same `deckA-`/`deckB-` prefix):
`gate-cue` (GATE CUE touch key on the playback screen), `overview-waveform`
(touch: needle search when paused, Touch Cue preview when playing),
`screen-playlist`, `playlist-bank-1`..`playlist-bank-4`,
`playlist-bank-deregister`, `preview-toggle`, `preview-wave-<row>` (Touch
Preview column in BROWSE/PLAYLIST lists), `preview-badge`, `preview-stop`.
Hot cues are stored per track (`cdj-sim:hot-cues:v1`) and Playlist Banks
per deck (`cdj-sim:playlist-bank:deckA-`) via AsyncStorage, which is
localStorage on web, so the same keys show up there.

Preview Hot Cue needs two touches at once (hold a preview waveform, press a
hot cue pad). A mouse can't do that, so a mouse click on a preview waveform
*latches* the preview until `preview-stop` is clicked; click a pad while it
plays. To test the real two-finger path, use a `hasTouch` context and CDP
`Input.dispatchTouchEvent` (on `touchEnd`, list the point being lifted).

**Importing your own tracks** (web only, stored in the browser's
IndexedDB — see `utils/trackStore.js`): BROWSE → `browse-row-1` ("My
Tracks") → `browse-row-0` ("＋ IMPORT TRACKS…") opens a file picker.
Drive it with Playwright's `page.waitForEvent('filechooser')` +
`chooser.setFiles([...])` (the driver has no command for this — write a
small script). The result shows in `browse-status`; a selected imported
track row has a `browse-delete-<row>` button (tap twice to delete).
Each Playwright context starts with an empty IndexedDB.

The deck is styled after the black CDJ-3000X (palette: `cdj` in
`constants/theme.js`, buttons: `components/DeckButton.js`). Like the
hardware, the tempo fader reads − at the top and + at the bottom, so
dragging `tempo-fader-thumb` *down* speeds the track up.

**Learning mode**: `learn-toggle` (the floating "? LEARN" button) turns it
on; `learn-panel` is the explanation panel along the bottom, `learn-title`
its heading, `learn-exit` turns it off. While it's on, touching or clicking
any control shows its explanation and the control still works, so check
`learn-title` after a `click`. The screen readouts have testIDs for this:
`display-player`, `display-track`, `display-key`, `display-zoom`,
`display-tempo`, `display-bpm` (deck-prefixed). Explanations live in
`constants/learningContent.js`, keyed off each control's testID.

**Mixer controls** (no per-instance prefix — there's only one mixer;
channel ones are prefixed `mixer-ch1-` through `mixer-ch6-`): per
channel — `trim`, `eq-hi`, `eq-himid`, `eq-lomid`, `eq-low`, `comp`,
`fader`, `cue`, `assign` (a 3-way switch: `mixer-ch1-assign-A`,
`-assign-thru`, `-assign-B`), `input`. Plus `mixer-crossfader`,
`mixer-master-level`, `mixer-master-booth`, `mixer-master-isolator-on`,
`mixer-master-iso-hi/-mid/-low`, `mixer-mic1-`/`mixer-mic2-` +
`mode`/`level`/`eq-hi`/`eq-low`, `mixer-filter-mode`/`-freq`/
`-resonance`, `mixer-sendfx-*`, `mixer-beatfx-effect`/`-assign`/
`-onoff`, `mixer-scroll`.

Only channels 1 and 2 are wired to a deck's play state (see below);
channels 3–6 exist for visual completeness (real DJM-V10 has 6) but
their VU meters stay dark since nothing is plugged into them.

### Deck → mixer signal linkage (no real audio, but genuinely wired)

There's no audio engine, but the mixer's VU meters are driven by real
control state, not decoration: `hooks/useMixerState.js` computes each
channel's level from `deck.isPlaying && !deck.isJogHeld` (channel 1 ←
deck A, channel 2 ← deck B) combined with that channel's trim/EQ/fader
and the crossfader position (channels default to crossfader-assign `A`
/ `B` respectively). Master level is the sum of channel levels. This
is a good target for a driver script: play a deck, confirm
`mixer-ch1-fader`'s neighboring `VuMeter` lights up, drag
`mixer-crossfader` toward B, confirm it goes dark again. Verified this
exact sequence with screenshots while building the feature — it works.

## Run (human path)

```bash
bun run web   # → opens http://localhost:8081 in your default browser via the Expo CLI. Ctrl-C to stop.
```

## Test

No test suite exists yet — `bunx expo export --platform web` is the
fastest correctness check (bundles the whole app, fails loudly on
syntax/import errors):

```bash
bunx expo export --platform web && rm -rf dist
```

---

## Gotchas

- **Real audio plays now — but a headless browser can't "hear" it.**
  Decks use `expo-audio` (`hooks/useCdjDeck.js`) to actually play the
  bundled tracks in `assets/audio/`; the mixer's trim/EQ/fader/crossfader
  math sets real `player.volume`, not just a VU-meter display. There's
  no `<audio>` DOM element to poke — expo-audio's web backend doesn't
  render one (confirmed via `eval document.querySelectorAll('audio')`,
  which returns `[]` even mid-playback). Verify real playback instead
  by reading the elapsed-time text after pressing play and waiting —
  `eval document.querySelector('[data-testid="deckA-time-toggle"]').innerText`
  before and after a `wait 2000` should show the seconds actually
  advancing (proof the file decoded and is playing, not just that the UI
  animated). The same readout freezes during a jog-wheel `down` hold and
  resumes on `up` — good regression check for the vinyl-brake pause path.
- **Emoji-glyph text collisions, worse with two decks.** Each deck's
  transport play button label is `▶`, and each deck's beat-jump-forward
  button is *also* `▶` — that's 4 elements with the exact text `▶` on
  screen at once (2 decks × 2 controls), plus `▶▶` search-forward
  buttons which contain `▶` as a substring. Don't use `click text=▶`
  with an `nth` index and expect it to stay correct — DOM order is an
  implementation detail. Always use `sel=[data-testid="deckA-play-button"]`
  (or `deckB-`) instead.
- **`press-hold` can't show a mid-gesture state.** It does
  down→wait→up as one atomic command, so a `screenshot` right after it
  always shows the *released* UI. To see the jog wheel's vinyl-brake
  hold state (amber ring, frozen position), use `down` / `screenshot`
  / `up` as three separate commands instead.
- **The waveform is `flex`-based, not fixed-width.** It's built from
  60 `flex: 1` bars filling the panel's actual rendered width. Earlier
  it used fixed 3px-wide bars × 90, which overflowed the panel at
  narrow viewports — caught this by actually looking at a screenshot,
  not from the bundler (bundling succeeds either way).
- **Playwright warns "your OS is not officially supported"** on this
  Gentoo host and silently downloads the Ubuntu 24.04 fallback build
  instead. That build works fine headless with `--no-sandbox` — not a
  blocker, just noise in the `playwright install` output.
- **No `chromium-cli` in this environment.** `driver.mjs` exists
  specifically because that tool isn't available here; if a future
  environment has `chromium-cli`, prefer it and treat this file as a
  fallback.

## Troubleshooting

- **`Cannot find module 'playwright'` when running `driver.mjs`
  directly with `node`**: `npx`/`bunx` resolve the CLI but not the
  importable package. Fix: `bun add -d playwright@1.62.1` at the repo
  root (already done — see Prerequisites) so `import { chromium } from
  'playwright'` resolves from `node_modules`.
- **`CommandError: ... don't have the required dependencies ... web
  support`**: `react-native-web` wasn't installed. Fix:
  `bunx expo install react-native-web`.
- **`Incompatible React versions` error in the browser console on
  first web load**: `react-dom` resolved to a different version than
  the pinned `react`. Fix: `bunx expo install react-dom` — it pins the
  exact matching version instead of whatever `react-native-web` pulled
  in transitively.
