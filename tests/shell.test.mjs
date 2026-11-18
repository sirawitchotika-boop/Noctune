import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
test('package and Capacitor IDs remain separate from GT SoundMaster', () => {
  const config = JSON.parse(read('capacitor.config.json'));
  const pkg = JSON.parse(read('package.json'));
  assert.equal(config.appId, 'com.noctune.player');
  assert.equal(config.appName, 'Noctune');
  assert.equal(pkg.dependencies['@capacitor/core'], '8.6.2');
  assert.equal(pkg.dependencies['@capacitor/android'], '8.6.2');
});
test('Phase 3 has real playback controls but no unapproved native media service', () => {
  const html = read('web/index.html');
  const app = read('web/app.js');
  assert.match(html, /id="player-sheet"/);
  assert.match(html, /id="seek"/);
  assert.match(html, /id="timer-start"/);
  assert.match(app, /playback\.select/);
  assert.match(app, /deleteTrackPermanently/);
  assert.match(app, /if \(view !== 'songs'\)/);
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  assert.doesNotMatch(manifest, /MediaPlaybackService|FOREGROUND_SERVICE|READ_MEDIA_AUDIO/);
});
test('custom identity retains distinct web and Android icon assets', () => {
  assert.match(read('web/icon.svg'), /#B77B59/);
  assert.match(read('android/app/src/main/res/drawable/ic_noctune_foreground.xml'), /pathData/);
});
