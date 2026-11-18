# Noctune

*Your music, without the noise.*

Noctune is an offline-first Android music player. It is independent from [GT SoundMaster](https://github.com/sirawitchotika-boop/Music-Player-Local), whose app and music data remain untouched.

## Development status — 18 November 2026

- **Phases 0–4 merged.** Boss reported that Checkpoint A (library/playback) and Checkpoint B (Bluetooth, notifications, background and timer) passed on a real phone. Android Gate 2 fix build #44252646203 was green.
- **Phase 5 experience pass proposed.** Larger touch targets, clear error announcements and accessible player names; the web background and native system-bar surfaces now aim to share a single charcoal color. The specific **Realme camera/status-bar mismatch remains unverified** and [UX issue #4](https://github.com/sirawitchotika-boop/Noctune/issues/4) stays open until Boss confirms it later.
- **Phase 6 not implemented.** Stable signing, safe in-place updates and release verification belong to Checkpoint C.

## Protect existing data

Noctune stores imported copies and playlists in private Android WebView storage. **Never uninstall the original Noctune or clear its app data to update it.** Keep source music files elsewhere; imported app copies are not a backup.

GitHub Actions builds are **manual-only** to conserve quota. Debug APKs from GitHub runners may use changing signing certificates and cannot be assumed to upgrade existing Noctune installations. The earlier Gate 2 tests used separate package IDs `com.noctune.player.gate2` and `com.noctune.player.gate2fix`. These are test apps, not an update path for original Noctune.

## Developer checks

Requires Node 22+, Java 21, Android SDK 36 and Gradle 8.14.3.

```sh
npm ci
npm run check
npm run sync
cd android
gradle --no-daemon assembleDebug
```

Do not dispatch a GitHub Actions APK build just for Phase 5 CSS/UX edits. Phase 6 prepares the signed release candidate and the next grouped device Checkpoint C. UI styling and Android system-bar colors **must be checked on an actual Realme phone** before Issue #4 can be closed.

The `HTMLAudioElement` remains the only playback engine. The Android media session mirrors its state; Bluetooth route loss pauses without auto-resume. The sleep timer uses a saved deadline and Android's best-effort alarm; Checkpoint B was reported passed by Boss.

See [ROADMAP.md](ROADMAP.md), [BASELINE.md](BASELINE.md), and [TEST-GATE-2.md](TEST-GATE-2.md) (historical completed gate) for context.
