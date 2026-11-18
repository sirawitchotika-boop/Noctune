import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
test('package and Capacitor IDs are independent from reference app', () => {
  const config = JSON.parse(read('capacitor.config.json'));
  const pkg = JSON.parse(read('package.json'));
  assert.equal(config.appId, 'com.noctune.player');
  assert.equal(config.appName, 'Noctune');
  assert.equal(pkg.dependencies['@capacitor/core'], '8.6.2');
  assert.equal(pkg.dependencies['@capacitor/android'], '8.6.2');
  assert.equal(pkg.devDependencies['@capacitor/cli'], '8.6.2');
});
test('Phase 2 stores local audio but deliberately does not implement playback', () => {
  const html = read('web/index.html');
  assert.match(html, /Add music/);
  assert.match(html, /Favorites/);
  assert.match(html, /Playback arrives in the next milestone/);
  assert.doesNotMatch(html, /<audio|autoplay/);
  const app = read('web/app.js');
  assert.match(app, /if \(view !== 'songs'\)/);
  assert.match(app, /deleteTrackPermanently/);
});
test('custom identity retains web and Android icon assets', () => {
  assert.match(read('web/icon.svg'), /#B77B59/);
  assert.match(read('android/app/src/main/res/drawable/ic_noctune_foreground.xml'), /pathData/);
});
