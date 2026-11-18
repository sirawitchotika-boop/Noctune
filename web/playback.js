import { PlaybackQueue } from './queue.js';

// The HTMLAudioElement is the only source of playback state.
// Phase 4 will forward native commands here, not create a second player.
export class PlaybackController {
  constructor({ audio, getBlob, onState = () => {}, beforePlay = async () => {}, urls = URL, queue = new PlaybackQueue() }) {
    this.audio = audio;
    this.getBlob = getBlob;
    this.beforePlay = beforePlay;
    this.onState = onState;
    this.urls = urls;
    this.queue = queue;
    this.objectUrl = null;
    this.request = 0;
    this.loading = false;
    this.error = '';
    this.buffering = false;

    for (const name of ['play', 'pause', 'playing', 'timeupdate', 'durationchange', 'seeked', 'waiting', 'stalled', 'loadedmetadata', 'error']) {
      audio.addEventListener(name, () => {
        if (name === 'waiting' || name === 'stalled') this.buffering = true;
        if (name === 'playing' || name === 'play') { this.buffering = false; this.error = ''; }
        if (name === 'error' && this.queue.current && !this.loading) {
          this.error = 'This audio file could not be played. Choose another song or retry.';
        }
        this.emit();
      });
    }
    audio.addEventListener('ended', () => { void this.handleEnded(); });
  }

  get state() {
    const finite = value => Number.isFinite(value) && value >= 0 ? value : 0;
    return {
      track: this.queue.current,
      mode: this.queue.mode,
      playing: !this.audio.paused && !this.audio.ended,
      loading: this.loading,
      buffering: this.buffering,
      position: finite(this.audio.currentTime),
      duration: this.objectUrl ? finite(this.audio.duration) : 0,
      error: this.error
    };
  }

  emit() { this.onState(this.state); }

  async select(tracks, id) {
    this.queue.setContext(tracks, id);
    return this.loadCurrent();
  }

  async loadCurrent() {
    const track = this.queue.current;
    if (!track) return false;
    const request = ++this.request;
    this.audio.pause();
    // Do not leave a previous song attached while selecting another. A missing
    // imported blob must never let a retry play audio from the wrong track.
    this.audio.removeAttribute('src');
    this.audio.load();
    if (this.objectUrl) this.urls.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
    this.loading = true;
    this.error = '';
    this.buffering = false;
    this.emit();
    try {
      const blob = await this.getBlob(track.id);
      if (request !== this.request) return false;
      if (!blob || !blob.size) throw new Error('The imported audio copy is missing or empty.');
      const nextUrl = this.urls.createObjectURL(blob);
      this.objectUrl = nextUrl;
      this.audio.src = nextUrl;
      this.audio.load();
      this.loading = false;
      this.emit();
      return await this.resume();
    } catch (error) {
      if (request === this.request) {
        this.loading = false;
        this.error = error?.message || 'The song could not be opened.';
        this.audio.pause();
        this.emit();
      }
      return false; // Never skip automatically after a failed load or play.
    }
  }

  async resume() {
    if (!this.queue.current || this.loading || !this.objectUrl) {
      if (this.queue.current && !this.objectUrl) {
        this.error = 'The selected audio copy is unavailable. Choose another song.';
        this.emit();
      }
      return false;
    }
    try {
      await this.beforePlay();
    } catch (error) {
      this.error = error?.message || 'Android audio controls are unavailable. Please try again.';
      this.emit();
      return false;
    }
    try {
      await this.audio.play();
      this.error = '';
      this.emit();
      return true;
    } catch {
      this.error = 'Playback could not start. Try pressing Play again or choosing another song.';
      this.emit();
      return false;
    }
  }

  pause() {
    this.audio.pause();
    this.emit();
  }

  async toggle() {
    if (!this.queue.current) return false;
    return this.audio.paused ? this.resume() : (this.pause(), true);
  }

  seek(seconds) {
    const duration = this.audio.duration;
    if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(seconds)) return;
    this.audio.currentTime = Math.max(0, Math.min(duration, seconds));
    this.emit();
  }

  async next(ended = false) {
    const id = this.queue.next({ ended });
    if (id === null) { this.emit(); return false; }
    if (ended && this.queue.mode === 'repeat-one') {
      this.seek(0);
      return this.resume();
    }
    this.queue.selectId(id);
    return this.loadCurrent();
  }

  async previous() {
    if (!this.queue.current) return false;
    if (this.audio.currentTime > 3) { this.seek(0); return true; }
    const id = this.queue.previous();
    if (id === null) { this.seek(0); return false; }
    this.queue.selectId(id);
    return this.loadCurrent();
  }

  async handleEnded() {
    // Do not skip a broken or stalled song. 'ended' is the only automatic advancement.
    if (this.queue.current && !this.loading) await this.next(true);
  }

  setMode(mode) {
    this.queue.setMode(mode);
    this.emit();
  }

  syncTracks(tracks) {
    if (this.queue.syncTracks(tracks)) this.clear();
    else this.emit();
  }

  clear() {
    ++this.request;
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    if (this.objectUrl) this.urls.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
    this.queue.clear();
    this.loading = false;
    this.buffering = false;
    this.error = '';
    this.emit();
  }
}
