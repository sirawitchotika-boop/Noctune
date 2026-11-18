import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('candidate signing is opt-in and never replaces the existing Noctune identity', () => {
  const gradle = read('android/app/build.gradle');
  const config = JSON.parse(read('capacitor.config.json'));
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  assert.equal(config.appId, 'com.noctune.player');
  assert.match(gradle, /applicationId "com\.noctune\.player"/);
  assert.match(gradle, /noctuneCandidate.*== 'true'/);
  assert.match(gradle, /applicationIdSuffix "\.rc"/);
  assert.match(gradle, /signingConfig signingConfigs\.candidate/);
  assert.match(gradle, /versionCode \(noctuneCandidate \? noctuneVersion\.toInteger\(\) : 1\)/);
  assert.match(gradle, /Candidate signing not configured/);
  assert.match(manifest, /android:allowBackup="false"/);
  assert.doesNotMatch(gradle, /storePassword\s+["'][^"']+["']/);
  assert.doesNotMatch(gradle, /keyPassword\s+["'][^"']+["']/);
});

test('RC workflow is manual-only and refuses unreviewed branches, mismatched signatures or unsafe app IDs', () => {
  const workflow = read('.github/workflows/release-candidate.yml');
  const triggers = workflow.split('permissions:')[0];
  assert.match(triggers, /workflow_dispatch:/);
  assert.doesNotMatch(triggers, /^\s*(push|pull_request|schedule):/m);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /NOCTUNE_RC_KEYSTORE_BASE64/);
  assert.match(workflow, /NOCTUNE_RC_CERT_SHA256/);
  assert.match(workflow, /com\.noctune\.player\.rc/);
  assert.match(workflow, /versionCode=/);
  assert.match(workflow, /apksigner/);
  assert.match(workflow, /ACTUAL.*EXPECTED/);
  assert.match(workflow, /scripts\/extract-apk-certs\.sh/);
  assert.match(workflow, /for ACTUAL in/);
  assert.match(workflow, /-storepass:env STORE_PASS/);
  assert.match(workflow, /GitHub keystore certificate does not match NOCTUNE_RC_CERT_SHA256/);
  assert.match(workflow, /Could not parse the signing certificate digest from apksigner output/);
  assert.ok(workflow.indexOf('GitHub keystore certificate matches the approved fingerprint') <
    workflow.indexOf('Build signed isolated release candidate'));
  assert.match(workflow, /Candidate APK is debuggable/);
  assert.match(workflow, /retention-days: 7/);
  assert.match(workflow, /if: always\(\)/);
  assert.doesNotMatch(workflow, /name:\s*noctune-debug-apk/);
});

test('existing Gate 2 debug workflow stays manual; signing material cannot be accidentally committed', () => {
  const workflow = read('.github/workflows/android.yml').split('permissions:')[0];
  const ignore = read('.gitignore');
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s*(push|pull_request|schedule):/m);
  assert.match(ignore, /^\*\.jks$/m);
  assert.match(ignore, /^\*\.keystore$/m);
  assert.match(ignore, /^\*\.p12$/m);
  assert.match(ignore, /^\*\.pfx$/m);
});

test('APK signer digest extractor supports numbered and SDK-range signers, but ignores public key digests', () => {
  const digest = 'a'.repeat(64);
  const input = [
    'Verifies',
    `Signer #1 certificate SHA-256 digest: ${digest.toUpperCase()}`,
    'Signer #1 public key SHA-256 digest: ' + '0'.repeat(64),
    `Signer (minSdkVersion=24, maxSdkVersion=32) certificate SHA-256 digest: ${digest}`,
    'Signer #1 certificate SHA-1 digest: ' + 'b'.repeat(40)
  ].join('\n');
  const run = text => execFileSync('bash', ['scripts/extract-apk-certs.sh'],
    { cwd: new URL('../', import.meta.url), input: text, encoding: 'utf8' });
  assert.deepEqual(run(input).trim().split('\n'), [digest, digest]);
  assert.equal(run('Verifies\nSigner #1 public key SHA-256 digest: deadbeef\n'), '');
});
