import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const config = JSON.parse(read('capacitor.config.json'));
const gradle = read('android/app/build.gradle');
const manifest = read('android/app/src/main/AndroidManifest.xml');
const shell = read('web/index.html');
assert.equal(config.appId, 'com.noctune.player');
assert.equal(config.appName, 'Noctune');
assert.match(gradle, /applicationId\s+["']com\.noctune\.player["']/);
assert.match(gradle, /namespace\s*=\s*["']com\.noctune\.player["']/);
assert.doesNotMatch(gradle, /com\.gt\.soundmaster/);
assert.match(manifest, /android:name="\.MainActivity"/);
assert.match(shell, /Your music, without the noise/);
assert.doesNotMatch(shell, /<script[^>]*src=["']https?:/);
console.log('Phase 1 identity and offline shell checks passed');
