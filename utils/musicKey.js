// Musical keys for KEY SHIFT and KEY SYNC. Tracks carry keys in Camelot
// notation (8A) like rekordbox can show, or in classic notation (Am, F#m, Eb).

const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const NOTE_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// Camelot number for each tonic pitch class, minor (A) and major (B).
const CAMELOT_MINOR = [5, 12, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10];
const CAMELOT_MAJOR = [8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6, 1];

/** Parse a key into { pc, minor, camelot } or null when it isn't a key. */
export function parseKey(text) {
  if (!text || typeof text !== 'string') return null;
  const s = text.trim();
  const cam = /^(\d{1,2})\s*([AB])$/i.exec(s);
  if (cam) {
    const n = Number(cam[1]);
    if (n < 1 || n > 12) return null;
    const minor = cam[2].toUpperCase() === 'A';
    const pc = (minor ? CAMELOT_MINOR : CAMELOT_MAJOR).indexOf(n);
    return { pc, minor, camelot: true };
  }
  const m = /^([A-G])\s*([#♯b♭]?)\s*(m|min|minor|maj|major)?$/i.exec(s);
  if (!m) return null;
  let pc = NOTE_PC[m[1].toUpperCase()];
  if (m[2] === '#' || m[2] === '♯') pc += 1;
  if (m[2] === 'b' || m[2] === '♭') pc -= 1;
  const minor = !!m[3] && m[3].toLowerCase().startsWith('m') && !m[3].toLowerCase().startsWith('maj');
  return { pc: (pc + 12) % 12, minor, camelot: false };
}

/** Format a parsed key, in Camelot or classic notation. */
export function formatKey(key, camelot = key?.camelot) {
  if (!key) return '—';
  if (camelot) return `${(key.minor ? CAMELOT_MINOR : CAMELOT_MAJOR)[key.pc]}${key.minor ? 'A' : 'B'}`;
  return `${NOTE_NAMES[key.pc]}${key.minor ? 'm' : ''}`;
}

/** Shift a parsed key by `semitones`. */
export function transposeKey(key, semitones) {
  if (!key) return null;
  return { ...key, pc: (((key.pc + Math.round(semitones)) % 12) + 12) % 12 };
}

/** A key text shifted by `semitones`, in the same notation. */
export function shiftKeyText(text, semitones) {
  const key = parseKey(text);
  return key ? formatKey(transposeKey(key, semitones)) : text;
}

const camelotOf = (k) => ({ n: (k.minor ? CAMELOT_MINOR : CAMELOT_MAJOR)[k.pc], minor: k.minor });

/** Do two keys mix well (same key, ±1 on the Camelot wheel, or relative)? */
export function compatible(a, b) {
  const x = camelotOf(a);
  const y = camelotOf(b);
  const step = Math.min((x.n - y.n + 12) % 12, (y.n - x.n + 12) % 12);
  if (x.minor === y.minor) return step <= 1;
  return step === 0;
}

/**
 * KEY SYNC: the smallest shift (−6…+6 semitones) that puts `text` in the
 * same key as `targetText`, or failing that a harmonically compatible one.
 * Returns null when either key is unknown.
 */
export function keySyncShift(text, targetText) {
  const key = parseKey(text);
  const target = parseKey(targetText);
  if (!key || !target) return null;
  let best = null;
  for (let s = -6; s <= 6; s += 1) {
    const k = transposeKey(key, s);
    const exact = k.pc === target.pc && k.minor === target.minor;
    if (!exact && !compatible(k, target)) continue;
    const score = Math.abs(s) * 2 + (exact ? 0 : 1);
    if (!best || score < best.score) best = { s, score };
  }
  return best ? best.s : 0;
}

/** Semitones the pitch moves when a track plays at `rate` without MASTER TEMPO. */
export const rateToSemitones = (rate) => 12 * Math.log2(rate || 1);
