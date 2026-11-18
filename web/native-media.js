// Direct Capacitor WebView bridge: vanilla ES modules, no bundler or second player.
// In a desktop browser the plugin is absent; Phase 2–3 behavior still works.
export class NativeMediaBridge {
  constructor({
    plugin = globalThis.Capacitor?.Plugins?.NoctuneMedia,
    clock = () => Date.now(),
    onCommand = () => {}
  } = {}) {
    this.plugin = plugin;
    this.clock = clock;
    this.onCommand = onCommand;
    this.enabled = false;
    this.listener = null;
    this.last = null;
    this.sequence = 0;
  }

  async connect() {
    if (!this.plugin) return false;
    this.listener = await this.plugin.addListener('command', event => {
      const command = event?.action;
      if (!['play', 'pause', 'next', 'previous', 'seek'].includes(command)) return;
      const ms = Number(event?.positionMs);
      this.onCommand(command, Number.isFinite(ms) ? Math.max(0, ms) : 0);
    });
    return true;
  }

  async prepare() {
    if (!this.plugin) return;
    // Android 15+ requires foreground visibility or a media service for focus.
    await this.plugin.prepare();
    this.enabled = true;
    this.last = null;
  }

  sync(state) {
    if (!this.plugin || !this.enabled) return;
    const time = this.clock();
    const seconds = Number.isFinite(state.position) ? Math.max(0, state.position) : 0;
    const positionMs = Math.round(seconds * 1000);
    const durationMs = Number.isFinite(state.duration)
      ? Math.round(Math.max(0, state.duration) * 1000) : 0;
    const snapshot = {
      hasTrack: Boolean(state.track),
      title: state.track?.name || '',
      trackId: state.track?.id ?? null,
      playing: Boolean(state.playing),
      buffering: Boolean(state.buffering || state.loading),
      positionMs,
      durationMs
    };
    const prev = this.last;
    const keyChanged = !prev ||
      prev.hasTrack !== snapshot.hasTrack ||
      prev.trackId !== snapshot.trackId ||
      prev.title !== snapshot.title ||
      prev.playing !== snapshot.playing ||
      prev.buffering !== snapshot.buffering ||
      prev.durationMs !== snapshot.durationMs;
    const predicted = prev
      ? prev.positionMs + (prev.playing && !prev.buffering ? time - prev.time : 0)
      : positionMs;
    // Explicit seek, timeline stalls and completed seconds need correction without
    // flooding the Android bridge on every audio "timeupdate" event.
    if (!keyChanged && prev && time - prev.time < 30000 &&
        Math.abs(positionMs - predicted) < 2000) return;

    // Epoch milliseconds times 1000 safely fit in JS integers through year 2255.
    // Native ignores out-of-order asynchronous bridge results.
    const sequence = time * 1000 + (++this.sequence % 1000);
    this.last = { ...snapshot, time };
    void this.plugin.publish({ ...snapshot, sequence }).catch(() => {
      // Keep the actual HTMLAudioElement playing; no fabricated Android state.
    });
    if (!snapshot.hasTrack) {
      this.enabled = false;
      this.last = null;
    }
  }

  async sleepDeadline(epochMs) {
    if (!this.plugin) return;
    await this.plugin.setSleepDeadline({ deadlineMs: epochMs });
  }

  async disconnect() {
    await this.listener?.remove?.();
    this.listener = null;
  }
}
