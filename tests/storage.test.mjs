import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import { MusicLibrary } from '../web/library.js';

let sequence = 0;
function makeLibrary() {
  return new MusicLibrary({ indexedDB, name: 'NoctuneDisposableTest-' + (++sequence) });
}
function audio(name, content, lastModified = 100) {
  return new File([content], name, { type: 'audio/mpeg', lastModified });
}

test('imports skip exact duplicates, reject unsupported and keep distinct modified files', async () => {
  const lib = makeLibrary();
  const first = audio('same.mp3', 'aaa', 123);
  const sameSizeDifferentTime = audio('same.mp3', 'bbb', 124);
  const result = await lib.importAudio([first, first, sameSizeDifferentTime, audio('no.txt', 'ok'), audio('zero.mp3', '')]);
  assert.deepEqual(result, { added: 2, duplicates: 1, rejected: 2 });
  const tracks = await lib.tracks();
  assert.equal(tracks.length, 2);
  assert.ok(tracks.every(t => t.favorite === false));
  await lib.close();
});

test('reopen keeps metadata, blob, Favorites and playlists; removing membership leaves song alone', async () => {
  const lib = makeLibrary();
  const { added } = await lib.importAudio([audio('<script>unsafe</script>.mp3', 'sample')]);
  assert.equal(added, 1);
  const [track] = await lib.tracks();
  await lib.setFavorite(track.id, true);
  const playlistId = await lib.createPlaylist('  Night drives  ');
  await lib.addToPlaylist(playlistId, track.id);
  await lib.addToPlaylist(playlistId, track.id);
  await lib.close();

  const reopened = new MusicLibrary({ indexedDB, name: lib.name });
  assert.equal((await reopened.tracks())[0].favorite, true);
  assert.equal((await reopened.playlists())[0].name, 'Night drives');
  assert.deepEqual((await reopened.playlists())[0].trackIds, [track.id]);
  await reopened.removeFromPlaylist(playlistId, track.id);
  assert.deepEqual((await reopened.playlists())[0].trackIds, []);
  assert.equal((await reopened.tracks()).length, 1);
  assert.equal((await reopened.tracks())[0].favorite, true);

  const db = await reopened.open();
  const storedBlob = await new Promise((resolve, reject) => {
    const req = db.transaction('audio').objectStore('audio').get(track.id);
    req.onsuccess = () => resolve(req.result.blob);
    req.onerror = () => reject(req.error);
  });
  assert.equal(storedBlob.size, 'sample'.length);
  await reopened.clearPlaylist(playlistId);
  await reopened.deletePlaylist(playlistId);
  assert.equal((await reopened.tracks()).length, 1);
  await reopened.close();
});

test('permanent imported-copy delete removes only selected blob and cleans membership', async () => {
  const lib = makeLibrary();
  await lib.importAudio([audio('one.mp3', '111'), audio('two.mp3', '222')]);
  const tracks = await lib.tracks();
  const deleted = tracks.find(t => t.name === 'one.mp3');
  const kept = tracks.find(t => t.name === 'two.mp3');
  const pid = await lib.createPlaylist('Test');
  await lib.addToPlaylist(pid, deleted.id);
  await lib.addToPlaylist(pid, kept.id);
  await lib.setFavorite(kept.id, true);
  await lib.deleteTrackPermanently(deleted.id);
  assert.deepEqual((await lib.tracks()).map(t => t.id), [kept.id]);
  assert.deepEqual((await lib.playlists())[0].trackIds, [kept.id]);
  assert.equal((await lib.tracks())[0].favorite, true);
  const db = await lib.open();
  const items = await new Promise((resolve, reject) => {
    const req = db.transaction('audio').objectStore('audio').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  assert.deepEqual(items.map(item => item.id), [kept.id]);
  await lib.close();
});

test('favorites may be toggled explicitly, and unavailable entries cause no new data', async () => {
  const lib = makeLibrary();
  await assert.rejects(() => lib.setFavorite(999, true), /no longer exists/);
  await assert.rejects(() => lib.addToPlaylist(999, 999), /no longer exists/);
  await lib.importAudio([audio('hello.mp3', 'bytes')]);
  const [track] = await lib.tracks();
  await lib.setFavorite(track.id, true);
  await lib.setFavorite(track.id, false);
  assert.equal((await lib.tracks())[0].favorite, false);
  await lib.close();
});
