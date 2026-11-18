import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
test('package and Capacitor IDs are independent from reference app', () => {
  const config = JSON.parse(read('capacitor.config.json'));
  const pkg = JSON.parse(read('package.json'));
  assert.equal(config.appId, 'com.noctune.player');
  assert.equal(config.appName, 'Noctune');
  assert.equal(pkg.dependencies['@capacitor/core'], '8.6.2');
  assert.equal(pkg.dependencies['@capacitor/android'], '8.6.2');
  assert.equal(pkg.devDependencies['@capacitor/cli'], '8.6.2');
});
test('phase 1 makes no false claim of playable or imported audio', () => {
  const html = read('web/index.html');
  assert.match(html, /No imports or audio storage/);
  assert.match(html, /Playback not available/);
  assert.doesNotMatch(html, /type="file"|<audio|autoplay/);
});
test('custom identity has text and Android icon assets', () => {
  assert.match(read('web/icon.svg'), /#B77B59/);
  assert.match(read('android/app/src/main/res/drawable/ic_noctune_foreground.xml'), /pathData/);
});
