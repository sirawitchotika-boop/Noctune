import test from 'node:test';
import assert from 'node:assert/strict';
import { PlaybackController } from '../web/playback.js';

const tracks = [1, 2, 3].map(id => ({ id, name: 'Song ' + id }));
class FakeAudio extends EventTarget {
  paused = true;
  ended = false;
  currentTime = 0;
  duration = 120;
  src = '';
  rejectPlay = false;
  playCalls = 0;
  load() { this.currentTime = 0; this.ended = false; this.dispatchEvent(new Event('durationchange')); }
  async play() {
    this.playCalls++;
    if (this.rejectPlay) throw new Error('Not allowed');
    this.paused = false;
    this.ended = false;
    this.dispatchEvent(new Event('play'));
    this.dispatchEvent(new Event('playing'));
  }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  removeAttribute(name) { if (name === 'src') this.src = ''; }
  finish() {
    this.currentTime = this.duration;
    this.paused = true;
    this.ended = true;
    this.dispatchEvent(new Event('ended'));
  }
}
function makeController(getBlob = async id => ({ size: 10, id })) {
  const audio = new FakeAudio();
  const revoked = [];
  let serial = 0;
  const urls = { createObjectURL: () => 'blob:mock-' + ++serial, revokeObjectURL: url => revoked.push(url) };
  const controller = new PlaybackController({ audio, getBlob, urls });
  return { audio, controller, revoked };
}

test('play/pause/seek/next/previous use the audio element as authority', async () => {
  const { audio, controller, revoked } = makeController();
  assert.equal(await controller.select(tracks, 2), true);
  assert.equal(controller.state.playing, true);
  assert.equal(controller.state.track.id, 2);
  controller.seek(999);
  assert.equal(controller.state.position, 120);
  await controller.previous(); // seeks to start if beyond 3 seconds
  assert.equal(controller.state.position, 0);
  assert.equal(controller.state.track.id, 2);
  controller.pause();
  assert.equal(controller.state.playing, false);
  assert.equal(await controller.toggle(), true);
  assert.equal(controller.state.playing, true);
  assert.equal(await controller.next(), true);
  assert.equal(controller.state.track.id, 3);
  assert.deepEqual(revoked, ['blob:mock-1']);
  controller.clear();
  assert.equal(controller.state.track, null);
  assert.equal(audio.src, '');
  assert.deepEqual(revoked, ['blob:mock-1', 'blob:mock-2']);
});

test('ended automatically advances, but failed playback never skips ahead', async () => {
  const { audio, controller } = makeController();
  await controller.select(tracks, 1);
  audio.finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(controller.state.track.id, 2);
  controller.setMode('repeat-one');
  audio.finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(controller.state.track.id, 2);
  assert.equal(controller.state.position, 0);
  assert.equal(controller.state.playing, true);
  audio.rejectPlay = true;
  assert.equal(await controller.next(), false);
  assert.equal(controller.state.track.id, 3);
  assert.match(controller.state.error, /could not start/i);
});

test('missing audio blob reports error, never auto-skips or removes library entries', async () => {
  const { controller } = makeController(async id => id === 1 ? null : { size: 4 });
  assert.equal(await controller.select(tracks, 1), false);
  assert.equal(controller.state.track.id, 1);
  assert.match(controller.state.error, /missing|empty/i);
  assert.equal(controller.state.playing, false);
});

test('last selection wins when two async audio fetches race', async () => {
  let finishFirst;
  const first = new Promise(resolve => { finishFirst = resolve; });
  const { controller, audio } = makeController(id => id === 1 ? first : Promise.resolve({ size: 3 }));
  const p1 = controller.select(tracks, 1);
  const p2 = controller.select(tracks, 3);
  assert.equal(await p2, true);
  finishFirst({ size: 9 });
  assert.equal(await p1, false);
  assert.equal(controller.state.track.id, 3);
  assert.equal(audio.src, 'blob:mock-1');
});

test('selected song deleted from the library stops playback without selecting another', async () => {
  const { controller } = makeController();
  await controller.select(tracks, 2);
  controller.syncTracks([tracks[0], tracks[2]]);
  assert.equal(controller.state.track, null);
  assert.equal(controller.state.playing, false);
});

test('failed selection clears previous audio source so retry cannot play the wrong song', async () => {
  const { controller, audio, revoked } = makeController(async id => id === 2 ? null : { size: 8 });
  assert.equal(await controller.select(tracks, 1), true);
  const previousPlayCalls = audio.playCalls;
  assert.equal(await controller.select(tracks, 2), false);
  assert.equal(audio.src, '');
  assert.deepEqual(revoked, ['blob:mock-1']);
  assert.equal(await controller.toggle(), false);
  assert.equal(audio.playCalls, previousPlayCalls);
  assert.equal(controller.state.track.id, 2);
  assert.equal(controller.state.duration, 0);
  assert.match(controller.state.error, /unavailable/i);
});

test('a native audio-focus failure is reported without starting the audio element', async () => {
  const audio = new FakeAudio();
  const controller = new PlaybackController({
    audio,
    getBlob: async () => ({ size: 4 }),
    beforePlay: async () => { throw new Error('Audio focus is unavailable. Please try again.'); },
    urls: { createObjectURL: () => 'blob:mock', revokeObjectURL() {} }
  });
  assert.equal(await controller.select(tracks, 1), false);
  assert.equal(audio.playCalls, 0);
  assert.equal(controller.state.playing, false);
  assert.match(controller.state.error, /Audio focus is unavailable/);
});
