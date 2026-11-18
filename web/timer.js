// Deadline-based sleep timer; stored deadline survives WebView reloads.
// A suspended WebView can delay callbacks: native background reliability is Phase 4.
const DEADLINE_KEY = 'noctune.sleep.deadline.v1';
const PRESET_KEY = 'noctune.sleep.presets.v1';
const DEFAULT_PRESETS = [15, 30, 45];

export function validMinutes(value) {
  return Number.isSafeInteger(value) && value >= 1 && value <= 720;
}

export class SleepTimer {
  constructor({ storage = globalThis.localStorage, clock = () => Date.now(),
    scheduler = globalThis, onExpire = () => {}, onChange = () => {} } = {}) {
    this.storage = storage;
    this.clock = clock;
    this.scheduler = scheduler;
    this.onExpire = onExpire;
    this.onChange = onChange;
    this.timerId = null;
    this.deadline = 0;
    this.presets = [...DEFAULT_PRESETS];

    try {
      const saved = JSON.parse(storage.getItem(PRESET_KEY));
      if (Array.isArray(saved)) {
        this.presets = [...new Set(saved.filter(validMinutes))].sort((a, b) => a - b).slice(0, 12);
      }
      const savedDeadline = Number(storage.getItem(DEADLINE_KEY));
      if (Number.isFinite(savedDeadline) && savedDeadline > 0) this.deadline = savedDeadline;
    } catch { /* Storage can be disabled; defaults still work. */ }
    this.tick();
  }

  save(key, value) {
    try {
      if (value === null) this.storage.removeItem(key);
      else this.storage.setItem(key, String(value));
    } catch { /* A timer still works for the current session. */ }
  }

  get remainingSeconds() {
    return this.deadline ? Math.max(0, Math.ceil((this.deadline - this.clock()) / 1000)) : 0;
  }

  get active() { return this.deadline !== 0 && this.remainingSeconds > 0; }

  start(minutes) {
    if (!validMinutes(minutes)) throw new Error('Choose 1–720 whole minutes.');
    this.cancelScheduled();
    this.deadline = this.clock() + minutes * 60000;
    this.save(DEADLINE_KEY, this.deadline);
    this.tick();
  }

  stop() {
    this.cancelScheduled();
    this.deadline = 0;
    this.save(DEADLINE_KEY, null);
    this.onChange(this.remainingSeconds);
  }

  addPreset(minutes) {
    if (!validMinutes(minutes)) throw new Error('Preset must be 1–720 whole minutes.');
    this.presets = [...new Set([...this.presets, minutes])].sort((a, b) => a - b).slice(0, 12);
    this.save(PRESET_KEY, JSON.stringify(this.presets));
    this.onChange(this.remainingSeconds);
  }

  removePreset(minutes) {
    this.presets = this.presets.filter(value => value !== minutes);
    this.save(PRESET_KEY, JSON.stringify(this.presets));
    this.onChange(this.remainingSeconds);
  }

  cancelScheduled() {
    if (this.timerId !== null) this.scheduler.clearTimeout(this.timerId);
    this.timerId = null;
  }

  tick() {
    this.cancelScheduled();
    if (!this.deadline) { this.onChange(0); return; }
    if (this.clock() >= this.deadline) {
      this.deadline = 0;
      this.save(DEADLINE_KEY, null); // clear first: never fire twice, even after reload
      this.onChange(0);
      this.onExpire();
      return;
    }
    this.onChange(this.remainingSeconds);
    this.timerId = this.scheduler.setTimeout(() => this.tick(), Math.min(1000, this.deadline - this.clock()));
  }

  dispose() { this.cancelScheduled(); }
}
