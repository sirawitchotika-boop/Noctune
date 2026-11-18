import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexedDB } from 'fake-indexeddb';

class Element extends EventTarget {
  constructor(id = '') {
    super();
    this.id = id;
    this.children = [];
    this.dataset = {};
    this.classList = { toggle() {} };
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.textContent = '';
    this.open = false;
  }
  replaceChildren(...nodes) { this.children = nodes; }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute() {}
  matches() { return false; }
  click() { this.dispatchEvent(new Event('click')); }
  showModal() { this.open = true; }
  close() { this.open = false; }
}
class Audio extends Element {
  paused = true;
  ended = false;
  duration = 80;
  currentTime = 0;
  src = '';
  load() { this.currentTime = 0; this.dispatchEvent(new Event('durationchange')); }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  async play() {
    this.paused = false;
    this.dispatchEvent(new Event('play'));
    this.dispatchEvent(new Event('playing'));
  }
  removeAttribute(name) { if (name === 'src') this.src = ''; }
}
async function until(condition) {
  for (let i = 0; i < 60; i++) {
    if (condition()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail('UI did not complete the expected action');
}

test('browser entrypoint boots, imports locally and plays selected track without DOM injection', async () => {
  const html = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
  const ids = new Map([...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, new Element(id)]));
  const tabs = ['songs', 'favorites', 'playlists'].map(name => {
    const element = ids.get('tab-' + name);
    element.dataset.view = name;
    return element;
  });
  globalThis.document = {
    createElement: name => name === 'audio' ? new Audio() : new Element(),
    getElementById: id => ids.get(id) || null,
    querySelectorAll: selector => selector === '.tab' ? tabs : [],
    addEventListener() {}
  };
  globalThis.indexedDB = indexedDB;
  const values = new Map();
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
  await import('../web/app.js');
  await until(() => ids.get('song-count').textContent === '0 songs');

  const file = new File(['offline audio'], '<img src=x onerror=alert(1)>.mp3', { type: 'audio/mpeg', lastModified: 123 });
  ids.get('audio-files').files = [file];
  ids.get('audio-files').dispatchEvent(new Event('change'));
  await until(() => ids.get('song-count').textContent === '1 song');
  const row = ids.get('songs').children[0];
  assert.equal(row.children[0].children[0].textContent, file.name);
  row.children[1].children[0].click();
  await until(() => ids.get('mini-title').textContent === file.name);
  assert.equal(ids.get('player-sheet').open, true);
  assert.equal(ids.get('mini-subtitle').textContent, 'Playing locally');

  ids.get('tab-favorites').click();
  ids.get('audio-files').files = [new File(['b'], 'blocked.mp3', { type: 'audio/mpeg' })];
  ids.get('audio-files').dispatchEvent(new Event('change'));
  await until(() => ids.get('notice').textContent.includes('Import cancelled'));
  assert.equal(ids.get('song-count').textContent, '1 song');
});
