import { createPerTrackStore } from '../utils/perTrackStore';

// Beat grid edits from GRID ADJUST, saved with the track like rekordbox
// writes them to the USB: { bpm, firstBeat } overriding the analysed grid,
// or null for the original.
const store = createPerTrackStore('cdj-sim:beat-grids:v1', null);

export const getTrackGrid = store.get;
export default store.useStore;
