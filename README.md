# Noctune

*Your music, without the noise.*

Noctune is an offline-first Android music player. It is **not GT SoundMaster**; the original app, ID, files and music data remain untouched.

## Current development state — 18 November 2026

- **Phases 0–3 merged:** the independent Android shell, local audio library, Favorites, playlists, queue/modes, playback, seeking and sleep timer. Boss reported the first combined phone checkpoint passed.
- **Phase 4 in review:** Android foreground media service, MediaSession lock-screen/notification controls, Bluetooth/headphone route-loss pause (Chromium manages audio focus), and Android sleep-timer alarm. **A prior APK compiled, but the Bluetooth-disconnect playback blocker failed on the phone. The fix APK and retest remain unverified.**
- **Phases 5–6 later:** deferred UX polish (including [Realme system-bar colors](https://github.com/sirawitchotika-boop/Noctune/issues/4)), privately protected signing identity and safe in-place update checks.

## Safety at Test Gate 2

The GitHub Actions APK build is **manual-only**; editing and opening PRs do **not** trigger a build. The first Gate 2 APK (`com.noctune.player.gate2`) compiled and installed, but Bluetooth disconnect revealed a persistent play-then-pause blocker. The fix build uses a *new isolated package* `com.noctune.player.gate2fix` and label **Noctune Gate 2 Fix**, so neither the original Noctune nor the first Gate 2 app must be uninstalled or overwritten. GitHub-runner debug certificates can differ between builds. Import only disposable files into the fix app.

**Never uninstall, clear storage, or overwrite Boss's installed Noctune to test a new debug APK.** If Android proposes replacing the original app, stop. See [Test Gate 2 checklist](TEST-GATE-2.md).

## Developer checks

Requires Node 22+, Java 21, Android SDK 36, and Gradle 8.14.3:

```sh
npm ci
npm run check
npm run sync
cd android
gradle --no-daemon -PnoctuneGate2=true assembleDebug
```

The [manual workflow](.github/workflows/android.yml) runs automated tests, native build, APK package identity check and uploads `noctune-gate2-fix-debug-apk` (14-day retention). No running Actions job means **no build has been verified** for the latest Phase 4 source. Read [ROADMAP.md](ROADMAP.md) and [BASELINE.md](BASELINE.md) for scope and the preserved GT SoundMaster fallback.

### Architecture notes

The WebView's **HTMLAudioElement remains the only real playback engine**. Android MediaSession and notifications mirror its state; lock-screen and headset commands return to that same controller. Position is published on meaningful events or notable drift (not every `timeupdate`). A native alarm backs the deadline timer, but Android can delay non-exact idle alarms and a suspended WebView can delay its pause command. **Test Gate 2 must verify screen-off timing and background controls on the Realme phone**. Do not claim this behavior is proven just because an APK compiles.
