import { getAudioApi, getAudioContext, resumeAudioContext, sourceToDecodable } from './audioContext';

// A deck's player built on the Web Audio graph, so its sound can go through
// the mixer channel (EQ, filter, fader, cue). It has the same shape as the
// expo-audio player the deck used before (play, pause, seekTo, currentTime,
// setPlaybackRate, shouldCorrectPitch) plus setLoop for sample-accurate loops.
//
// The track is decoded into memory once. MASTER TEMPO uses
// react-native-audio-api's pitch-corrected source.

const FADE = 0.005;
const decoded = new Map(); // source key → Promise<AudioBuffer>
const CACHE_SIZE = 4;

function keyOf(source) {
  return typeof source === 'number' ? `asset:${source}` : String(source?.uri ?? source);
}

function decode(source) {
  const key = keyOf(source);
  if (!decoded.has(key)) {
    const promise = (async () => {
      const audio = getAudioApi();
      const ctx = getAudioContext();
      return audio.decodeAudioData(await sourceToDecodable(source), ctx.sampleRate);
    })();
    promise.catch(() => decoded.delete(key));
    decoded.set(key, promise);
    while (decoded.size > CACHE_SIZE) decoded.delete(decoded.keys().next().value);
  }
  return decoded.get(key);
}

export class EnginePlayer {
  constructor(source, output, onStatus) {
    this.ctx = getAudioContext();
    this.output = output;
    this.onStatus = onStatus;
    this.buffer = null;
    this.duration = 0;
    this.isLoaded = false;
    this.playing = false;
    this.rate = 1;
    this.correctPitch = false;
    this.loopRange = null;
    this.voice = null; // { source, gain }
    this.pos = 0; // position when the clock below was last set
    this.posAt = 0; // context time it was set
    this.released = false;
    this.volume = 1; // kept for API compatibility; the mixer sets the level
    if (source != null) {
      decode(source)
        .then((buffer) => {
          if (this.released) return;
          this.buffer = buffer;
          this.duration = buffer.duration;
          this.isLoaded = true;
          if (this.playing) this.startVoice();
          this.emit();
        })
        .catch(() => this.emit());
    }
  }

  emit() {
    this.onStatus?.({
      isLoaded: this.isLoaded,
      duration: this.duration,
      currentTime: this.currentTime,
      playing: this.playing,
    });
  }

  // Raw position on the track, following the rate changes and the loop.
  get currentTime() {
    if (!this.playing || !this.voice) return this.pos;
    let t = this.pos + (this.ctx.currentTime - this.posAt) * this.rate;
    const loop = this.loopRange;
    if (loop && this.pos < loop.end && t >= loop.end) {
      t = loop.start + ((t - loop.start) % (loop.end - loop.start));
    }
    return Math.min(t, this.duration || t);
  }

  get shouldCorrectPitch() {
    return this.correctPitch;
  }

  set shouldCorrectPitch(on) {
    if (on === this.correctPitch) return;
    this.correctPitch = on;
    if (this.playing) this.restart();
  }

  // Freeze the clock at "now" before changing how it runs.
  mark() {
    this.pos = this.currentTime;
    this.posAt = this.ctx.currentTime;
  }

  startVoice() {
    if (!this.buffer || this.voice) return;
    const ctx = this.ctx;
    const source = this.correctPitch ? ctx.createBufferSource({ pitchCorrection: true }) : ctx.createBufferSource();
    source.buffer = this.buffer;
    source.playbackRate.value = this.rate;
    if (this.loopRange) {
      source.loop = true;
      source.loopStart = this.loopRange.start;
      source.loopEnd = this.loopRange.end;
    }
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(this.output);
    const now = ctx.currentTime;
    gain.gain.setTargetAtTime(1, now, FADE / 3);
    source.start(now, Math.min(this.pos, Math.max(0, this.duration - 0.01)));
    this.posAt = now;
    this.voice = { source, gain };
  }

  stopVoice() {
    const voice = this.voice;
    if (!voice) return;
    this.voice = null;
    const now = this.ctx.currentTime;
    try {
      voice.gain.gain.setTargetAtTime(0, now, FADE / 3);
      voice.source.stop(now + FADE * 3);
    } catch {
      // already stopped
    }
  }

  restart() {
    this.mark();
    this.stopVoice();
    this.startVoice();
  }

  play() {
    resumeAudioContext();
    if (this.playing) return;
    if (this.duration && this.pos >= this.duration - 0.01) this.pos = 0;
    this.playing = true;
    this.posAt = this.ctx.currentTime;
    this.startVoice();
    this.startTicking();
    this.emit();
  }

  pause() {
    if (!this.playing) return;
    this.mark();
    this.playing = false;
    this.stopVoice();
    this.stopTicking();
    this.emit();
  }

  async seekTo(seconds) {
    this.pos = Math.max(0, Math.min(seconds, this.duration || seconds));
    this.posAt = this.ctx.currentTime;
    if (this.playing) {
      this.stopVoice();
      this.startVoice();
    }
    this.emit();
  }

  setPlaybackRate(rate) {
    if (rate === this.rate) return;
    this.mark();
    this.rate = rate;
    if (this.voice) {
      try {
        this.voice.source.playbackRate.setValueAtTime(rate, this.ctx.currentTime);
      } catch {
        this.voice.source.playbackRate.value = rate;
      }
    }
  }

  /** Loop between `start` and `end` (seconds) without a gap, or null to stop looping. */
  setLoop(range) {
    const same =
      (!range && !this.loopRange) ||
      (range && this.loopRange && range.start === this.loopRange.start && range.end === this.loopRange.end);
    if (same) return;
    this.mark();
    this.loopRange = range && range.end > range.start ? { start: range.start, end: range.end } : null;
    if (this.voice) {
      const src = this.voice.source;
      if (this.loopRange) {
        src.loopStart = this.loopRange.start;
        src.loopEnd = this.loopRange.end;
        src.loop = true;
      } else {
        src.loop = false;
      }
    }
  }

  // Status updates while playing, and end-of-track detection.
  startTicking() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      if (this.playing && this.duration && !this.loopRange && this.currentTime >= this.duration - 0.005) {
        this.pos = this.duration;
        this.playing = false;
        this.stopVoice();
        this.stopTicking();
      }
      this.emit();
    }, 100);
  }

  stopTicking() {
    clearInterval(this.timer);
    this.timer = null;
  }

  release() {
    this.released = true;
    this.playing = false;
    this.stopVoice();
    this.stopTicking();
  }
}
