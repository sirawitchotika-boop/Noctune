# Test Gate 2 — Android reliability

**Status:** Phase 4 code candidate; APK build and physical tests not yet performed. Use this checklist only after a successful **manual** workflow build. The test app is separate, labeled **Noctune Gate 2**. Keep the installed Noctune and GT SoundMaster unchanged.

## Manual APK build (no automatic runs)

1. Open GitHub **Actions → Noctune Android debug APK (manual Gate 2) → Run workflow**.
2. Select branch `feat/phase-4-android-media` (the Phase 4 PR branch), then select **Run workflow** once.
3. Verify the run is green and the checked package is `com.noctune.player.gate2`.
4. Download artifact **`noctune-gate2-isolated-debug-apk`** from that run, extract the ZIP and install its `app-debug.apk` only when Boss chooses to proceed.
5. If Android asks to uninstall or replace the existing **Noctune**, **STOP**; do not accept or clear any data. The separate **Noctune Gate 2** app should have its own empty library.

The artifact is temporary (14-day retention). Never use a debug APK to attempt the signed in-place-update test; that belongs to Test Gate 3 / Phase 6.

## One grouped phone check (disposable music only)

- Import a short disposable audio file into **Noctune Gate 2** and start playback. Check the notification and lock-screen title and play/pause.
- Seek from the notification/lock screen; resume and use Next/Previous. The actual audio and notification position should agree.
- While playing over Bluetooth headphones/speaker, disconnect the Bluetooth device. Sound must stop **before** it can continue loudly through the phone speaker. Do not expect auto-resume.
- Play again, leave Noctune Gate 2 in the background with the screen off for **10 minutes**. Listen for interruptions and check that the notification clock does not remain materially out of sync (investigate persistent ~2+ second disagreement).
- Start a short sleep timer (for example 1 minute), turn the screen off, and confirm playback pauses at expiry. Android inexact alarms or suspended WebView might delay the command; report what actually happens rather than declaring a pass.
- Reopen the Gate 2 app. The library, Favorites and playlists in the **original** Noctune should remain untouched; **do not perform destructive tests on them**.

**Stop immediately** on any unexpected data-loss prompt, removal of the original app, uncontrolled speaker playback after Bluetooth loss, or inconsistent notification actions. Report Realme model/Android version and only the failed observations. Cosmetic top/bottom system-bar mismatches and minor UX logic are tracked separately in [issue #4](https://github.com/sirawitchotika-boop/Noctune/issues/4); do not mix those deferred fixes with this Android gate.
