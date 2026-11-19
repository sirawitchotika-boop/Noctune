# Phase 6 — signing and safe-update gate (RC gate passed; project paused)

**Status as of 19 November 2026:** Boss set Noctune to **PAUSED**, not released. Signed isolated RC v1 and v2 APK workflows succeeded, and Boss reported successful RC v1→v2 phone update and retained disposable data. This proves only the isolated `com.noctune.player.rc` signing/update path. Do not treat it as approval to replace existing debug-signed Noctune or publish a release.

**Evidence:** [RC v1 workflow](https://github.com/sirawitchotika-boop/Noctune/actions/runs/44305375218); [RC v2 workflow](https://github.com/sirawitchotika-boop/Noctune/actions/runs/44348221153). The original private keystore and GitHub secrets were configured by Boss; keep all private key material backed up privately and do not add it to Git. Artifacts have 7-day retention, not permanent backup.

**No new actions while paused:** No signed builds, migrations, installations, key rotation/deletion, or public release. The sections below are retained as procedural reference, not pending instructions for Boss to repeat Checkpoint C.

## Why the test app is separate

- Existing Noctune debug APKs may use ephemeral GitHub runner debug certificates.
- Android normally requires the same signing certificate for an in-place app update. A new private signing key cannot simply overwrite an existing debug-signed app.
- The test package is therefore **`com.noctune.player.rc`**, labeled **Noctune RC**. It does not replace `com.noctune.player`, earlier Gate 2 test apps, or GT SoundMaster.
- Both trial releases must use the *same* private signing key, with increasing `versionCode` values. This proves the upgrade **within the RC package only**. It does **not** prove an update to an original debug-installed Noctune.
- Any migration or permanent package/signing choice for the current installed Noctune is a separate product decision. **Never uninstall or clear existing app storage** as a shortcut.

## Owner-only signing prerequisites (approval required separately)

Do **not** create, rotate, upload or share a private signing key without Boss's explicit approval. Do not send keystores or passwords in chat or attach them to PRs.

Once Boss approves a stable signing arrangement, keep the original keystore **privately backed up outside GitHub** and configure these GitHub Actions repository secrets using the GitHub interface:

- `NOCTUNE_RC_KEYSTORE_BASE64` — base64 text of the approved keystore (base64 is transport encoding, **not encryption**)
- `NOCTUNE_RC_STORE_PASSWORD`
- `NOCTUNE_RC_KEY_ALIAS`
- `NOCTUNE_RC_KEY_PASSWORD`

Set repository Actions **variable** `NOCTUNE_RC_CERT_SHA256` to the expected SHA-256 fingerprint of the public signing certificate (64 hex characters, optional colons). This publicly comparable fingerprint acts as a fail-closed guard against accidentally changing keys. Make sure the keystore has a durable backup, and never commit or upload it as source code.

## Manual build — only after signing setup and Boss approval

Workflow: [Noctune signed RC (manual, isolated)](.github/workflows/release-candidate.yml).

1. **Merge the reviewed Phase 6 PR only with approval.** This secret-using job is explicitly restricted to `main`; dispatching from an unmerged branch cannot build.
2. Boss confirms the signing identity is privately backed up and GitHub secrets + certificate fingerprint are configured.
3. Manually run the workflow from **main** with `version_code = 1`. Confirm green and download its 7-day temporary signed APK artifact. Keep a private local copy of this approved candidate before it expires.
4. Later, manually run the **same workflow** from main with `version_code = 2` using the **same key**. The workflow checks the package ID, requested version, non-debuggable state and signer fingerprint before uploading.
5. Never use the Gate 2 *debug* APK for this update test. Do not make a public GitHub release or distribute the candidate.

Both APK runs are explicit manual work; there are **no push or PR build triggers**.

## Checkpoint C — one short phone test (disposable data)

1. On the phone, install **Noctune RC v1** alongside existing Noctune. **Stop** if Android offers to replace or uninstall a different app.
2. Import two **disposable** tracks. Save one Favorite and one playlist. Play a track briefly; leave the original Noctune and GT SoundMaster untouched.
3. Install **Noctune RC v2 over Noctune RC v1**, using Android's normal Update flow. **Never uninstall or clear data between versions.**
4. Reopen Noctune RC. Verify the two tracks, Favorite and playlist remain. Play/Pause and a quick screen-off/notification smoke test should still work.
5. Open the original Noctune and GT SoundMaster to confirm they remain installed and unchanged. The postponed Realme top/bottom system-bar color check can be combined here; keep [Issue #4](https://github.com/sirawitchotika-boop/Noctune/issues/4) open until observed.

**Stop immediately** if an APK refuses the update, requests uninstall/data removal, replaces the wrong app, shows empty imported music after a normal update, or the certificate verification fails. Report the exact failed step; do not retry by deleting anything.

## Release decision still open

A passing Checkpoint C proves RC-to-RC update safety for this *isolated* package, not user-data migration or upgrade compatibility with the original debug-installed `com.noctune.player`. A permanent stable signing/package choice and any migration strategy need separate approval before declaring Noctune release-ready.
