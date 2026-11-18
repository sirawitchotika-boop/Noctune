// Small pure rules shared by the browser and Node tests.
const AUDIO_EXTENSIONS = /\.(mp3|m4a|aac|flac|wav|ogg|oga|opus|webm)$/i;

export function isAudioFile(file) {
  if (!file || typeof file.name !== 'string' || !Number.isFinite(file.size) || file.size <= 0) return false;
  const type = String(file.type || '').toLowerCase();
  return type.startsWith('audio/') || AUDIO_EXTENSIONS.test(file.name);
}

// Include lastModified to avoid silently treating distinct same-name/same-size files as one.
// This is a metadata identity, NOT a cryptographic content hash.
export function fileIdentity(file) {
  const modified = Number.isFinite(file.lastModified) ? file.lastModified : 0;
  return JSON.stringify([file.name.normalize('NFC'), file.size, modified]);
}

export function playlistName(value) {
  const name = String(value || '').trim();
  if (!name || name.length > 80) throw new Error('Playlist name must be 1–80 characters.');
  return name;
}

export function matchingTracks(tracks, query) {
  const q = String(query || '').trim().toLocaleLowerCase();
  return !q ? tracks : tracks.filter(track => track.name.toLocaleLowerCase().includes(q));
}

export function orderedTracks(tracks) {
  return [...tracks].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.id - b.id);
}
