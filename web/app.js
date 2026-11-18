import { MusicLibrary } from './library.js';
import { matchingTracks } from './library-rules.js';
import { PlaybackController } from './playback.js';
import { SleepTimer, validMinutes } from './timer.js';
import { NativeMediaBridge } from './native-media.js';

const library = new MusicLibrary();
const $ = id => document.getElementById(id);
let view = 'songs';
let selectedPlaylistId = null;
let tracks = [];
let playlists = [];
let busy = false;
let ready = false;

const audio = document.createElement('audio');
audio.preload = 'metadata';
const nativeMedia = new NativeMediaBridge({
  onCommand: (action, positionMs) => {
    if (action === 'pause') playback.pause();
    else if (action === 'play') void playback.resume();
    else if (action === 'next') void playback.next();
    else if (action === 'previous') void playback.previous();
    else if (action === 'seek') playback.seek(positionMs / 1000);
  }
});
const playback = new PlaybackController({
  audio,
  getBlob: id => library.audioBlob(id),
  beforePlay: () => nativeMedia.prepare(),
  onState: state => {
    updatePlayer(state);
    nativeMedia.sync(state);
  }
});
// The timer reports its initial state during construction; initialize UI afterward.
let timerInitialized = false;
const sleepTimer = new SleepTimer({
  onExpire: () => {
    playback.pause();
    void nativeMedia.sleepDeadline(0).catch(() => {});
    tell('Sleep timer finished. Playback paused.');
  },
  onChange: seconds => { if (timerInitialized) updateTimer(seconds); }
});
timerInitialized = true;

function clockText(seconds) {
  const time = Math.floor(Number.isFinite(seconds) && seconds > 0 ? seconds : 0);
  return Math.floor(time / 60) + ':' + String(time % 60).padStart(2, '0');
}

function updatePlayer(state) {
  $('mini-title').textContent = state.track?.name || 'Nothing playing';
  $('mini-subtitle').textContent = state.error || (state.loading ? 'Loading audio…' : state.buffering ? 'Buffering…' : state.playing ? 'Playing locally' : state.track ? 'Paused' : 'Select a song to play');
  $('player-heading').textContent = state.track?.name || 'Nothing playing';
  $('player-status').textContent = state.error || (state.loading ? 'Loading audio…' : state.buffering ? 'Buffering…' : state.playing ? 'Playing locally' : 'Paused');
  $('open-player').disabled = !state.track;
  $('open-player').setAttribute('aria-label',
    state.track ? 'Open now playing: ' + state.track.name : 'Open now playing');
  const enabled = Boolean(state.track) && !state.loading;
  for (const id of ['mini-toggle', 'toggle', 'previous', 'next']) $(id).disabled = !enabled;
  $('mini-toggle').textContent = state.playing ? 'Ⅱ' : '▶';
  $('toggle').textContent = state.playing ? 'Ⅱ' : '▶';
  $('mini-toggle').setAttribute('aria-label', state.playing ? 'Pause' : 'Play');
  $('toggle').setAttribute('aria-label', state.playing ? 'Pause' : 'Play');
  $('position-text').textContent = clockText(state.position);
  $('duration-text').textContent = clockText(state.duration);
  $('seek').disabled = !enabled || state.duration <= 0;
  if (!$('seek').matches(':active')) {
    $('seek').max = String(Math.floor(state.duration));
    $('seek').value = String(Math.min(Math.floor(state.position), Math.floor(state.duration)));
  }
  const mode = { 'order': 'Order', 'shuffle': 'Shuffle', 'repeat-one': 'Repeat one' };
  $('play-mode').textContent = 'Mode: ' + mode[state.mode];
  $('play-mode').setAttribute('aria-label',
    'Playback mode: ' + mode[state.mode] + '. Activate to change mode.');
}

function updateTimer(seconds) {
  $('timer-status').textContent = sleepTimer?.active ? 'Stops in ' + clockText(seconds) : 'Off';
  $('timer-stop').disabled = !sleepTimer?.active;
}

function renderPresets() {
  const select = $('timer-presets');
  const selected = select.value;
  select.replaceChildren();
  for (const minutes of sleepTimer.presets) {
    const option = document.createElement('option');
    option.value = String(minutes);
    option.textContent = minutes + ' min';
    select.append(option);
  }
  if (sleepTimer.presets.includes(Number(selected))) select.value = selected;
  $('timer-remove').disabled = !sleepTimer.presets.length;
}

function openPlayer() {
  if (playback.state.track && !$('player-sheet').open) $('player-sheet').showModal();
}
function songsForContext(context) {
  if (context === 'favorites') return tracks.filter(t => t.favorite);
  if (context === 'playlists') {
    const playlist = playlists.find(p => p.id === selectedPlaylistId);
    const byId = new Map(tracks.map(t => [t.id, t]));
    return (playlist?.trackIds || []).map(id => byId.get(id)).filter(Boolean);
  }
  return tracks;
}


function tell(message, isError = false) {
  const notice = $('notice');
  notice.textContent = message;
  notice.classList.toggle('is-error', isError);
  notice.setAttribute('role', isError ? 'alert' : 'status');
  notice.hidden = !message;
}

function labelCount(number, item) {
  return String(number) + ' ' + item + (number === 1 ? '' : 's');
}

function button(text, className, title, act) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className;
  el.textContent = text;
  el.setAttribute('aria-label', title);
  el.addEventListener('click', act);
  return el;
}

function empty(into, message) {
  into.replaceChildren();
  const p = document.createElement('p');
  p.className = 'empty-copy';
  p.textContent = message;
  into.append(p);
}

function songRow(track, context) {
  const row = document.createElement('div');
  row.className = 'song-row';

  const info = document.createElement('div');
  info.className = 'song-info';
  const title = document.createElement('strong');
  // Filenames are always inserted as text, never interpolated into innerHTML.
  title.textContent = track.name;
  title.title = track.name; // Keep the full filename available if the row wraps.
  const detail = document.createElement('span');
  detail.textContent = (track.size / (1024 * 1024)).toFixed(1) + ' MB · Local copy';
  info.append(title, detail);
  row.append(info);

  const actions = document.createElement('div');
  actions.className = 'song-actions';

  actions.append(button('Play', 'subtle-button play-track', 'Play ' + track.name, async () => {
    if (!ready || busy) return;
    const success = await playback.select(songsForContext(context), track.id);
    openPlayer();
    if (!success) tell(playback.state.error || 'Unable to play this song.', true);
  }));

  actions.append(button(track.favorite ? '★' : '☆', 'favorite-button', (track.favorite ? 'Remove from' : 'Add to') + ' Favorites: ' + track.name, async () => {
    await perform(() => library.setFavorite(track.id, !track.favorite), track.favorite ? 'Removed from Favorites.' : 'Added to Favorites.');
  }));

  if (context === 'playlists') {
    actions.append(button('Remove', 'subtle-button', 'Remove ' + track.name + ' from playlist', async () => {
      await perform(() => library.removeFromPlaylist(selectedPlaylistId, track.id), 'Removed from playlist. Audio remains in your library.');
    }));
  } else {
    if (playlists.length) {
      const select = document.createElement('select');
      select.className = 'playlist-select';
      select.setAttribute('aria-label', 'Add ' + track.name + ' to a playlist');
      const placeholder = document.createElement('option');
      placeholder.textContent = 'Add to playlist…';
      placeholder.value = '';
      select.append(placeholder);
      for (const playlist of playlists) {
        const option = document.createElement('option');
        option.value = String(playlist.id);
        option.textContent = playlist.name;
        select.append(option);
      }
      select.addEventListener('change', async () => {
        const id = Number(select.value);
        select.value = '';
        if (Number.isSafeInteger(id) && id > 0) await perform(() => library.addToPlaylist(id, track.id), 'Added to playlist.');
      });
      actions.append(select);
    }
    if (context === 'songs') {
      actions.append(button('Delete', 'danger-button', 'Delete imported copy of ' + track.name, async () => {
        if (!confirm('Permanently delete the imported copy of "' + track.name + '" from Noctune?\n\nThis also removes its playlist memberships. The original file on your device is not deleted.')) return;
        await perform(() => library.deleteTrackPermanently(track.id), 'Imported copy deleted from Noctune.');
      }));
    }
  }

  row.append(actions);
  return row;
}

function rows(into, list, context, message) {
  if (!list.length) { empty(into, message); return; }
  into.replaceChildren(...list.map(track => songRow(track, context)));
}

function render() {
  const query = $('search').value;
  const songs = matchingTracks(tracks, query);
  const favorites = matchingTracks(tracks.filter(t => t.favorite), query);
  $('song-count').textContent = labelCount(tracks.length, 'song');
  $('favorite-count').textContent = labelCount(tracks.filter(t => t.favorite).length, 'song');
  $('playlist-count').textContent = labelCount(playlists.length, 'playlist');
  rows($('songs'), songs, 'songs', tracks.length ? 'No songs match your search.' : 'No music imported yet. Select Add music to begin.');
  rows($('favorites'), favorites, 'favorites', tracks.some(t => t.favorite) ? 'No favorites match your search.' : 'Mark a song as a Favorite from your library.');

  const choices = $('playlist-choices');
  choices.replaceChildren();
  for (const playlist of playlists) {
    const item = button(playlist.name, 'playlist-choice', 'Show playlist ' + playlist.name, () => {
      selectedPlaylistId = playlist.id;
      render();
    });
    item.setAttribute('aria-pressed', String(playlist.id === selectedPlaylistId));
    choices.append(item);
  }
  const chosen = playlists.find(p => p.id === selectedPlaylistId);
  $('playlist-detail').hidden = !chosen;
  if (chosen) {
    $('selected-playlist-title').textContent = chosen.name;
    const byId = new Map(tracks.map(t => [t.id, t]));
    const memberTracks = chosen.trackIds.map(id => byId.get(id)).filter(Boolean);
    rows($('playlist-tracks'), matchingTracks(memberTracks, query), 'playlists', memberTracks.length ? 'No songs match your search.' : 'Choose Add to playlist beside a song in Library.');
    $('clear-playlist').disabled = memberTracks.length === 0;
  } else if (!playlists.length) {
    empty(choices, 'Create a playlist, then add tracks from your library.');
  }
}

async function refresh() {
  [tracks, playlists] = await Promise.all([library.tracks(), library.playlists()]);
  if (selectedPlaylistId === null || !playlists.some(p => p.id === selectedPlaylistId)) {
    selectedPlaylistId = playlists[0]?.id ?? null;
  }
  playback.syncTracks(tracks);
  render();
}

async function perform(action, success) {
  if (!ready || busy) return;
  busy = true;
  $('add-music').disabled = true;
  try {
    await action();
    await refresh();
    if (success) tell(success);
  } catch (error) {
    try { await refresh(); } catch { /* Leave the last good list visible. */ }
    tell(error?.message || 'The change could not be saved. Please retry.', true);
  } finally {
    busy = false;
    $('add-music').disabled = false;
  }
}

function selectView(next) {
  view = next;
  $('search').value = '';
  for (const name of ['songs', 'favorites', 'playlists']) {
    const active = next === name;
    $('tab-' + name).setAttribute('aria-selected', String(active));
    $('panel-' + name).hidden = !active;
  }
  tell('');
  render();
}

for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => selectView(tab.dataset.view));
}
$('search').addEventListener('input', render);

$('open-player').addEventListener('click', openPlayer);
$('close-player').addEventListener('click', () => $('player-sheet').close());
for (const id of ['toggle', 'mini-toggle']) {
  $(id).addEventListener('click', async () => {
    if (!await playback.toggle() && playback.state.error) tell(playback.state.error, true);
  });
}
$('next').addEventListener('click', () => { void playback.next(); });
$('previous').addEventListener('click', () => { void playback.previous(); });
$('seek').addEventListener('change', () => playback.seek(Number($('seek').value)));
$('play-mode').addEventListener('click', () => {
  const next = { 'order': 'shuffle', 'shuffle': 'repeat-one', 'repeat-one': 'order' };
  playback.setMode(next[playback.state.mode]);
});

$('timer-presets').addEventListener('change', () => {
  if ($('timer-presets').value) $('timer-minutes').value = $('timer-presets').value;
});
$('timer-start').addEventListener('click', () => {
  try {
    const value = Number($('timer-minutes').value);
    if (!validMinutes(value)) throw new Error('Choose 1–720 whole minutes.');
    sleepTimer.start(value);
    void nativeMedia.sleepDeadline(sleepTimer.deadline).catch(() => {
      tell('Android sleep alarm is unavailable; the in-app timer remains active.', true);
    });
    tell('Sleep timer started.');
  } catch (error) { tell(error.message, true); }
});
$('timer-stop').addEventListener('click', () => {
  sleepTimer.stop();
  void nativeMedia.sleepDeadline(0).catch(() => {});
  tell('Sleep timer stopped.');
});
$('timer-save').addEventListener('click', () => {
  try {
    sleepTimer.addPreset(Number($('timer-minutes').value));
    renderPresets();
    $('timer-presets').value = $('timer-minutes').value;
    tell('Sleep preset saved.');
  } catch (error) { tell(error.message, true); }
});
$('timer-remove').addEventListener('click', () => {
  const value = Number($('timer-presets').value);
  if (!validMinutes(value)) return;
  sleepTimer.removePreset(value);
  renderPresets();
  tell('Sleep preset removed.');
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) sleepTimer.tick(); // reconcile elapsed wall time after suspension
});
renderPresets();
updatePlayer(playback.state);
updateTimer(sleepTimer.remainingSeconds);
// Native commands are optional in a desktop browser. The Android bridge
// reports the actual media state; it is never a second playback authority.
void nativeMedia.connect().then(() => {
  if (sleepTimer.active) return nativeMedia.sleepDeadline(sleepTimer.deadline);
}).catch(() => { tell('Android media controls could not be connected.', true); });

$('add-music').addEventListener('click', () => {
  if (view !== 'songs') { tell('Switch to Songs before importing music.', true); return; }
  if (!busy && ready) $('audio-files').click();
});
$('audio-files').addEventListener('change', async event => {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  if (!files.length) return;
  // Guard BEFORE storage, including when the view changed while the picker was open.
  if (view !== 'songs') { tell('Import cancelled. Add music from Songs, not Favorites.', true); return; }
  await perform(async () => {
    const result = await library.importAudio(files);
    await refresh();
    tell(labelCount(result.added, 'song') + ' added, ' + result.duplicates + ' duplicates skipped, ' + result.rejected + ' unsupported files skipped.');
  });
});

$('create-playlist').addEventListener('click', async () => {
  const name = prompt('New playlist name (1–80 characters):');
  if (name === null) return;
  await perform(() => library.createPlaylist(name), 'Playlist created.');
});
$('rename-playlist').addEventListener('click', async () => {
  const chosen = playlists.find(p => p.id === selectedPlaylistId);
  if (!chosen) return;
  const name = prompt('Rename playlist:', chosen.name);
  if (name === null) return;
  await perform(() => library.renamePlaylist(chosen.id, name), 'Playlist renamed.');
});
$('clear-playlist').addEventListener('click', async () => {
  const chosen = playlists.find(p => p.id === selectedPlaylistId);
  if (!chosen || !confirm('Remove all songs from "' + chosen.name + '"? No imported audio will be deleted.')) return;
  await perform(() => library.clearPlaylist(chosen.id), 'Playlist cleared. Music remains in Library.');
});
$('delete-playlist').addEventListener('click', async () => {
  const chosen = playlists.find(p => p.id === selectedPlaylistId);
  if (!chosen || !confirm('Delete playlist "' + chosen.name + '"? Imported music and Favorites will remain.')) return;
  await perform(() => library.deletePlaylist(chosen.id), 'Playlist deleted. Music remains in Library.');
});

async function start() {
  try {
    await library.open();
    ready = true;
    await refresh();
  } catch (error) {
    ready = false;
    $('add-music').disabled = true;
    $('create-playlist').disabled = true;
    tell('Could not open local music storage. Nothing has been deleted. ' + (error?.message || ''), true);
  }
}
start();
