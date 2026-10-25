// The PLAYLIST screen's playlists, built from whatever tracks are in the
// library (demo or imported), grouped the way a DJ might sort a rekordbox
// collection. Playlist Bank registers these by id, so a bank keeps working
// as tracks are added or removed.
const BPM_GROUPS = [
  { id: 'auto-warm-up', name: 'Warm Up (< 130 BPM)', test: (bpm) => bpm < 130 },
  { id: 'auto-peak-time', name: 'Peak Time (130–145 BPM)', test: (bpm) => bpm >= 130 && bpm < 145 },
  { id: 'auto-high-energy', name: 'High Energy (145+ BPM)', test: (bpm) => bpm >= 145 },
];

export function buildDefaultPlaylists(tracks) {
  const playlists = [{ id: 'auto-all', name: 'All Tracks', tracks }];
  const userTracks = tracks.filter((t) => t.source === 'user');
  if (userTracks.length > 0) playlists.push({ id: 'auto-my-tracks', name: 'My Tracks', tracks: userTracks });
  BPM_GROUPS.forEach((group) => {
    const matching = tracks.filter((t) => group.test(t.bpm ?? 0));
    if (matching.length > 0) playlists.push({ id: group.id, name: group.name, tracks: matching });
  });
  return playlists;
}
