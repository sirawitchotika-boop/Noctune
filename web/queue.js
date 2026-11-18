// A small, explicit queue. Switching library views does not change a playing queue.
const MODES = ['order', 'shuffle', 'repeat-one'];

export class PlaybackQueue {
  constructor(random = Math.random) {
    this.random = random;
    this.mode = 'order';
    this.order = [];
    this.tracks = new Map();
    this.index = -1;
  }

  get current() {
    return this.index < 0 ? null : (this.tracks.get(this.order[this.index]) || null);
  }

  get currentId() {
    return this.current?.id ?? null;
  }

  setContext(tracks, id) {
    const unique = new Map();
    for (const track of tracks) {
      if (Number.isSafeInteger(track?.id) && track.id > 0) unique.set(track.id, track);
    }
    if (!unique.has(id)) throw new Error('Song is no longer in this view.');
    this.tracks = unique;
    this.order = [...unique.keys()];
    if (this.mode === 'shuffle') this.order = this.shuffled(this.order, id);
    this.index = this.order.indexOf(id);
  }

  shuffled(ids, selected) {
    const others = ids.filter(id => id !== selected);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    return selected == null ? others : [selected, ...others];
  }

  setMode(mode) {
    if (!MODES.includes(mode)) throw new Error('Unknown playback mode.');
    if (mode === this.mode) return;
    const selected = this.currentId;
    this.mode = mode;
    if (mode === 'shuffle') this.order = this.shuffled([...this.tracks.keys()], selected);
    else this.order = [...this.tracks.keys()];
    this.index = selected === null ? -1 : this.order.indexOf(selected);
  }

  next({ ended = false } = {}) {
    if (this.index < 0) return null;
    if (ended && this.mode === 'repeat-one') return this.currentId;
    return this.order[this.index + 1] ?? null;
  }

  previous() {
    return this.index > 0 ? this.order[this.index - 1] : null;
  }

  selectId(id) {
    const next = this.order.indexOf(id);
    if (next < 0) throw new Error('Song no longer exists in the queue.');
    this.index = next;
  }

  syncTracks(availableTracks) {
    const available = new Map(availableTracks.map(track => [track.id, track]));
    const previous = this.currentId;
    this.order = this.order.filter(id => available.has(id));
    this.tracks = new Map([...this.tracks.keys()]
      .filter(id => available.has(id))
      .map(id => [id, available.get(id)]));
    this.index = previous === null ? -1 : this.order.indexOf(previous);
    return previous !== null && this.index === -1;
  }

  clear() {
    this.order = [];
    this.tracks.clear();
    this.index = -1;
  }
}
