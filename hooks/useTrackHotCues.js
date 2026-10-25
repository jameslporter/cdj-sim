import { createPerTrackStore } from '../utils/perTrackStore';

// Hot cues A–H, saved with the track. Each is null or { time } for a cue
// point, or { time, loopEnd } for a hot cue loop.
export const EMPTY_HOT_CUES = Object.freeze(Array(8).fill(null));
const store = createPerTrackStore('cdj-sim:hot-cues:v1', EMPTY_HOT_CUES);

export const getTrackHotCues = store.get;
export const setTrackHotCues = store.set;
export default store.useStore;
