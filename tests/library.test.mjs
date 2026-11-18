import test from 'node:test';
import assert from 'node:assert/strict';
import { fileIdentity, isAudioFile, matchingTracks, orderedTracks, playlistName } from '../web/library-rules.js';
import { readFileSync } from 'node:fs';

test('audio validation rejects non-audio and empty files, accepts supported extensions', () => {
  assert.equal(isAudioFile({ name: 'song.mp3', size: 512, type: '' }), true);
  assert.equal(isAudioFile({ name: 'song', size: 512, type: 'audio/flac' }), true);
  assert.equal(isAudioFile({ name: 'document.txt', size: 512, type: 'text/plain' }), false);
  assert.equal(isAudioFile({ name: 'silent.mp3', size: 0, type: 'audio/mpeg' }), false);
});

test('duplicate identity includes lastModified to avoid same-size false matches', () => {
  const original = { name: 'same.mp3', size: 100, lastModified: 120 };
  assert.equal(fileIdentity(original), fileIdentity({ ...original }));
  assert.notEqual(fileIdentity(original), fileIdentity({ ...original, lastModified: 130 }));
});

test('search and sorting preserve unusual filenames as plain text', () => {
  const tracks = [{ id: 2, name: '<img src=x onerror=alert(1)>.mp3' }, { id: 1, name: 'Morning.flac' }];
  assert.equal(matchingTracks(tracks, 'ONERROR')[0].id, 2);
  assert.equal(orderedTracks(tracks)[0].id, 2);
  const js = readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');
  assert.match(js, /title\.textContent = track\.name/);
  assert.doesNotMatch(js, /innerHTML\s*=/);
});

test('playlist names are trimmed and constrained', () => {
  assert.equal(playlistName('  Quiet hours  '), 'Quiet hours');
  assert.throws(() => playlistName(''), /1–80/);
  assert.throws(() => playlistName('x'.repeat(81)), /1–80/);
});
