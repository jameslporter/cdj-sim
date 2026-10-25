import { compatible, parseKey } from './musicKey';

// TRACK FILTER: narrows the track lists to tracks that would mix well with
// what's playing. The reference is the sync master's track (or this deck's
// own track when there's no master).
export const FILTER_BPM_OPTIONS = [null, 2, 4, 6, 8, 10, 16];

export const EMPTY_FILTER = { on: false, bpm: 6, key: false };

/** Does `track` pass the filter, against `ref` = { bpm, key }? */
export function passesFilter(track, filter, ref) {
  if (!filter?.on || !ref) return true;
  if (filter.bpm != null && ref.bpm) {
    const ratio = track.bpm / ref.bpm;
    if (!(Math.abs(ratio - 1) * 100 <= filter.bpm)) return false;
  }
  if (filter.key) {
    const a = parseKey(track.key);
    const b = parseKey(ref.key);
    if (!a || !b || !compatible(a, b)) return false;
  }
  return true;
}

/** A short description of the filter, for the list title bar. */
export function describeFilter(filter, ref) {
  const parts = [];
  if (filter.bpm != null && ref?.bpm) parts.push(`BPM ${ref.bpm.toFixed(0)} ±${filter.bpm}%`);
  if (filter.key && ref?.key) parts.push(`KEY ${ref.key}`);
  return parts.join(' · ') || 'NO CONDITIONS';
}
