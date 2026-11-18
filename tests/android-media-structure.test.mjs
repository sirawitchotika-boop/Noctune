import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('Android service is media playback foreground only and not externally exported', () => {
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  assert.match(manifest, /android\.permission\.FOREGROUND_SERVICE_MEDIA_PLAYBACK/);
  assert.match(manifest, /android:foregroundServiceType="mediaPlayback"/);
  assert.match(manifest, /android:name="\.NoctuneMediaService"\s+android:exported="false"/);
  assert.doesNotMatch(manifest, /android\.permission\.(BLUETOOTH_CONNECT|READ_MEDIA_AUDIO)/);
});

test('native command path and noisy audio focus safety are present', () => {
  const activity = read('android/app/src/main/java/com/noctune/player/MainActivity.java');
  const plugin = read('android/app/src/main/java/com/noctune/player/NoctuneMediaPlugin.java');
  const service = read('android/app/src/main/java/com/noctune/player/NoctuneMediaService.java');
  assert.match(activity, /registerPlugin\(NoctuneMediaPlugin\.class\)/);
  assert.match(plugin, /notifyListeners\("command", data\)/);
  assert.match(service, /ACTION_AUDIO_BECOMING_NOISY/);
  assert.match(service, /AUDIOFOCUS_LOSS/);
  assert.match(service, /new MediaSession\(/);
  assert.match(service, /SystemClock\.elapsedRealtime\(\)/);
  assert.match(service, /setAndAllowWhileIdle/);
  assert.doesNotMatch(service, /MediaPlayer\(|ExoPlayer\(/);
});

test('workflow remains manual-only; Java tests do not spend Actions quota', () => {
  const yaml = read('.github/workflows/android.yml');
  const on = yaml.split('permissions:')[0];
  assert.match(on, /workflow_dispatch:/);
  assert.doesNotMatch(on, /^\s*pull_request:/m);
  assert.doesNotMatch(on, /^\s*push:/m);
});

test('Test Gate 2 APK has isolated package and distinct install label', () => {
  const gradle = read('android/app/build.gradle');
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  const workflow = read('.github/workflows/android.yml');
  assert.match(gradle, /applicationIdSuffix "\.gate2"/);
  assert.match(gradle, /Noctune Gate 2/);
  assert.match(manifest, /noctuneLabel/);
  assert.match(workflow, /-PnoctuneGate2=true/);
  assert.match(workflow, /com\.noctune\.player\.gate2/);
  assert.match(workflow, /noctune-gate2-isolated-debug-apk/);
});
