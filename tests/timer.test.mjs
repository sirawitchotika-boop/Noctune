import test from 'node:test';
import assert from 'node:assert/strict';
import { SleepTimer, validMinutes } from '../web/timer.js';

function fixture(saved = new Map()) {
  let now = 1000000;
  let nextId = 0;
  const tasks = new Map();
  const storage = {
    getItem: key => saved.get(key) ?? null,
    setItem: (key, val) => saved.set(key, val),
    removeItem: key => saved.delete(key)
  };
  const scheduler = {
    setTimeout(fn, delay) { const id = ++nextId; tasks.set(id, { fn, at: now + delay }); return id; },
    clearTimeout(id) { tasks.delete(id); }
  };
  function advance(ms) {
    now += ms;
    for (const [id, task] of [...tasks]) {
      if (task.at <= now) { tasks.delete(id); task.fn(); }
    }
  }
  return { storage, scheduler, clock: () => now, advance, saved };
}

test('uses deadline rather than counting timeouts; expiry fires once after suspension', () => {
  const f = fixture();
  let expired = 0;
  const timer = new SleepTimer({ ...f, onExpire: () => expired++ });
  timer.start(2);
  assert.equal(timer.remainingSeconds, 120);
  f.advance(75000);
  assert.equal(timer.remainingSeconds, 45);
  f.advance(60000); // simulate delayed OS/WebView callback
  assert.equal(expired, 1);
  timer.tick();
  assert.equal(expired, 1);
  assert.equal(timer.active, false);
  assert.equal(f.saved.has('noctune.sleep.deadline.v1'), false);
});

test('restored deadline is not restarted and can be cancelled', () => {
  const f = fixture();
  const timer = new SleepTimer(f);
  timer.start(1);
  timer.dispose();
  f.advance(20000);
  const resumed = new SleepTimer(f);
  assert.equal(resumed.remainingSeconds, 40);
  resumed.stop();
  f.advance(90000);
  assert.equal(resumed.active, false);
  assert.equal(f.saved.has('noctune.sleep.deadline.v1'), false);
});

test('presets validate numbers and survive initialization', () => {
  const f = fixture();
  const t = new SleepTimer(f);
  assert.equal(validMinutes(30.5), false);
  assert.throws(() => t.start(0), /1–720/);
  t.addPreset(23);
  t.addPreset(23);
  t.removePreset(15);
  t.dispose();
  const resumed = new SleepTimer(f);
  assert.deepEqual(resumed.presets, [23, 30, 45]);
  resumed.dispose();
});
