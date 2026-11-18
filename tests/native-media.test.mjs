import test from 'node:test';
import assert from 'node:assert/strict';
import { NativeMediaBridge } from '../web/native-media.js';

function fixture() {
  let time = 10000;
  let callback;
  const published = [];
  const alarms = [];
  let prepareCalls = 0;
  const plugin = {
    addListener: async (_, fn) => { callback = fn; return { remove: async () => { callback = null; } }; },
    prepare: async () => { prepareCalls++; },
    publish: async data => { published.push(data); },
    setSleepDeadline: async ({ deadlineMs }) => alarms.push(deadlineMs)
  };
  const commands = [];
  const bridge = new NativeMediaBridge({
    plugin, clock: () => time, onCommand: (...args) => commands.push(args)
  });
  return {
    bridge, published, alarms, commands,
    setTime: value => { time = value; },
    send: payload => callback(payload),
    get prepareCalls() { return prepareCalls; }
  };
}

const state = (position, playing = true) => ({
  track: { id: 3, name: 'A & B.mp3' }, playing, buffering: false,
  loading: false, position, duration: 100
});

test('no native notification before user playback; updates mirror HTML audio state', async () => {
  const f = fixture();
  f.bridge.sync(state(0));
  assert.equal(f.published.length, 0);
  await f.bridge.connect();
  await f.bridge.prepare();
  assert.equal(f.prepareCalls, 1);
  f.bridge.sync(state(7));
  assert.equal(f.published.length, 1);
  assert.equal(f.published[0].title, 'A & B.mp3');
  assert.equal(f.published[0].positionMs, 7000);
  assert.equal(f.published[0].playing, true);
  f.setTime(11000);
  f.bridge.sync(state(8));
  assert.equal(f.published.length, 1, 'never publish every timeupdate');
  f.setTime(12000);
  f.bridge.sync(state(5)); // seek backwards / drift correction
  assert.equal(f.published.length, 2);
  f.setTime(12001);
  f.bridge.sync(state(5, false));
  assert.equal(f.published.length, 3);
  assert.equal(f.published[2].playing, false);
  assert.ok(f.published[2].sequence > f.published[1].sequence);
  await f.bridge.disconnect();
});

test('native commands share a single playback path and reject unknown actions', async () => {
  const f = fixture();
  await f.bridge.connect();
  f.send({ action: 'pause', positionMs: 0 });
  f.send({ action: 'seek', positionMs: 25500 });
  f.send({ action: 'next' });
  f.send({ action: 'invalid' });
  assert.deepEqual(f.commands, [
    ['pause', 0], ['seek', 25500], ['next', 0]
  ]);
  await f.bridge.disconnect();
});

test('native deadline follows existing wall-clock timer and can be cancelled', async () => {
  const f = fixture();
  await f.bridge.sleepDeadline(168000);
  await f.bridge.sleepDeadline(0);
  assert.deepEqual(f.alarms, [168000, 0]);
});

test('missing plugin is a no-op for web-only runs', async () => {
  const bridge = new NativeMediaBridge({ plugin: null });
  assert.equal(await bridge.connect(), false);
  await bridge.prepare();
  bridge.sync(state(5));
  await bridge.sleepDeadline(123456);
});
