import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Realme system-bar surfaces share Noctune charcoal and avoid OEM contrast tint', () => {
  const colors = read('android/app/src/main/res/values/colors.xml');
  const theme = read('android/app/src/main/res/values/styles.xml');
  const css = read('web/styles.css');
  const html = read('web/index.html');
  assert.match(colors, /name="noctune_background">#141619</);
  assert.match(theme, /android:windowBackground">@color\/noctune_background/);
  assert.match(theme, /android:enforceNavigationBarContrast">false/);
  assert.match(theme, /android:enforceStatusBarContrast">false/);
  assert.match(theme, /android:windowLightNavigationBar">false/);
  assert.match(css, /\.now-playing\s*\{[\s\S]*?background:\s*#141619/);
  assert.match(html, /name="theme-color" content="#141619"/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});

test('common interactive surfaces have touch targets and visible focus', () => {
  const css = read('web/styles.css');
  assert.match(css, /\.primary-button, \.subtle-button, \.danger-button\s*\{[^}]*min-height:\s*44px/);
  assert.match(css, /\.playlist-select\s*\{[^}]*min-height:\s*44px/);
  assert.match(css, /\.playlist-choice\s*\{[^}]*min-height:\s*44px/);
  assert.match(css, /\.mode-button\s*\{[^}]*min-height:\s*44px/);
  assert.match(css, /#seek\s*\{[^}]*min-height:\s*44px/);
  assert.match(css, /:focus-visible/);
});

test('experience pass does not change original storage identity or auto-build policy', () => {
  const config = JSON.parse(read('capacitor.config.json'));
  const workflow = read('.github/workflows/android.yml').split('permissions:')[0];
  const app = read('web/app.js');
  assert.equal(config.appId, 'com.noctune.player');
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s*push:|^\s*pull_request:/m);
  assert.match(app, /title\.textContent = track\.name/);
  assert.match(app, /setAttribute\('aria-label'/);
});
