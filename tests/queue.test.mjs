import test from 'node:test';
import assert from 'node:assert/strict';
import { PlaybackQueue } from '../web/queue.js';

const tracks = [1, 2, 3].map(id => ({ id, name: 'Track ' + id }));

test('ordered queue respects starting selection and boundaries', () => {
  const q = new PlaybackQueue(() => 0);
  q.setContext(tracks, 2);
  assert.equal(q.current.id, 2);
  assert.equal(q.next(), 3);
  assert.equal(q.previous(), 1);
  q.selectId(3);
  assert.equal(q.next({ ended: true }), null);
  assert.equal(q.previous(), 2);
  assert.equal(q.current.id, 3);
});

test('shuffle changes order but keeps selected song anchored; repeat-one only on ended', () => {
  const q = new PlaybackQueue(() => 0);
  q.setContext(tracks, 2);
  q.setMode('shuffle');
  assert.equal(q.current.id, 2);
  assert.deepEqual(q.order, [2, 3, 1]);
  assert.equal(q.next(), 3);
  q.setMode('repeat-one');
  assert.equal(q.current.id, 2);
  assert.equal(q.next({ ended: true }), 2);
  assert.equal(q.next(), 3);
  q.setMode('order');
  assert.equal(q.current.id, 2);
  assert.deepEqual(q.order, [1, 2, 3]);
});

test('changing source views cannot rewrite active queue; delete prunes safely', () => {
  const q = new PlaybackQueue(() => 0.5);
  q.setContext(tracks, 1);
  assert.equal(q.next(), 2);
  assert.equal(q.syncTracks([tracks[0], tracks[2]]), false);
  assert.deepEqual(q.order, [1, 3]);
  assert.equal(q.next(), 3);
  assert.equal(q.syncTracks([tracks[2]]), true);
  assert.equal(q.current, null);
});

test('invalid selection cannot silently pick a different song', () => {
  const q = new PlaybackQueue();
  assert.throws(() => q.setContext(tracks, 999), /no longer/);
  assert.equal(q.current, null);
});
