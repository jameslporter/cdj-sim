import { createPerTrackStore } from '../utils/perTrackStore';

// Memory cues saved with the track: a list of { time }, in track order.
export const EMPTY_MEMORY_CUES = Object.freeze([]);
const store = createPerTrackStore('cdj-sim:memory-cues:v1', EMPTY_MEMORY_CUES);

export const getTrackMemoryCues = store.get;
export default store.useStore;
