---
name: run-cdj-sim
description: Build, run, and drive the cdj-sim Expo web app. Use when asked to start cdj-sim, run its web dev server, take a screenshot of the CDJ-3000 simulator UI, or interact with controls (jog wheel, hot cues, loop, tempo fader, transport).
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

Playwright needs its own browser binary (not npm-installed). Download it
once per machine — it's cached in `~/.cache/ms-playwright/`, not in the repo:

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
click text=▶|nth=1
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

Every interactive control in `components/` has a `testID` (e.g.
`play-button`, `jog-wheel`, `tempo-fader-thumb`, `hotcue-A`,
`loop-4beat`, `loop-8beat`, `loop-reloop-exit`, `beatjump-back`,
`beatjump-forward`, `beatjump-count`, `mode-reverse`, `mode-slip`,
`mode-vinyl`, `tempo-range`, `tempo-master`, `tempo-reset`,
`search-back`, `search-forward`, `cue-button`, `browse-prev`,
`browse-next`, `browse-load`, `time-toggle`). react-native-web maps
`testID` straight to `data-testid` in the DOM, so target these with
`sel=[data-testid="..."]` instead of matching label text — it's
unambiguous and survives label text changes (e.g. the loop buttons
relabel from `4 BEAT` to `1/2X` once a loop is active).

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

- **Emoji-glyph text collisions.** The transport play button's label
  is `▶`, but the beat-jump-forward button is *also* `▶`, and the
  search-forward button is `▶▶` (which text-contains `▶` too — the
  driver's `click text=` uses exact match, so this only matters when
  you use `getByText` yourself). `page.getByText('▶', { exact: true })`
  alone resolves to 2 elements in this app; use `|nth=1` for the
  transport play button, or — better — target `sel=[data-testid="play-button"]`.
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
