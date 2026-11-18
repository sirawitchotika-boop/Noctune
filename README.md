# Noctune

*Your music, without the noise.*

Noctune is an independent, offline-first Android music player with a distinct app ID, icon, UI, and private music storage. [GT SoundMaster](https://github.com/sirawitchotika-boop/Music-Player-Local) is a functional reference only, and its app/data remain untouched.

## Development status — 18 Nov 2026

- **Phase 0–1:** [PR #1 merged](https://github.com/sirawitchotika-boop/Noctune/pull/1); native Capacitor shell and distinct identity.
- **Phase 2:** [PR #2 merged](https://github.com/sirawitchotika-boop/Noctune/pull/2); safe imports/search/Favorites/playlists.
- **Phase 3:** [PR #3](https://github.com/sirawitchotika-boop/Noctune/pull/3) (unmerged) adds local playback/queue/timer. CI tests/build and physical-phone checks must be tracked separately.
- **Phase 4–6:** NOT implemented. Android MediaSession, foreground/background media service, Bluetooth-disconnect handling, experience pass and stable release signing are future milestones.

## What Phase 3 adds

Tap **Play** beside a song to start playing its stored Noctune copy. The mini-player opens a dedicated view with play/pause, next/previous, position seek, and modes: **Order → Shuffle → Repeat one**. Choosing a different library view does not unexpectedly change the active queue. Failed audio loads do not automatically skip to another track.

**Sleep timer:** choose 1–720 whole minutes or a saved preset, Start/Stop, and optionally save/remove presets. It uses a stored wall-clock deadline, not a decrementing counter. If Android suspends the WebView, its timer callback may be late; notification/background reliability and audio-route handling are Phase 4. **Do not assume the screen-off timer or background playback works until Checkpoint B.**

IndexedDB stores imported audio copies and their metadata separately. File names and playlist names are shown as text, not injected HTML. Favorite changes are explicit; removing a song from a playlist never removes audio. Deleting an imported track requires confirmation and removes only Noctune's stored copy. This app is **not a backup**; keep the original files. Never use valuable music for destructive/update testing.

## Developer verification

Requirements: Node 22+, Java 21, Android SDK 36, Gradle 8.14.3.

```sh
npm ci
npm run check
npm run sync
cd android
gradle --no-daemon assembleDebug
```

[GitHub Actions Android debug workflow](.github/workflows/android.yml) executes automated tests, JavaScript syntax checks, APK build, package-ID verification, and a temporary debug APK artifact. Passing CI **does not** prove playback on a real phone.

The three planned major Boss tests remain **Checkpoint A** after Phase 3 (local library/playback/timer), **Checkpoint B** after Phase 4 (Bluetooth/notifications/background/screen-off timer), and **Checkpoint C** after Phase 6 (safe, signed updates). A/B/C must use disposable test audio and a short grouped checklist. Installation and release remain unapproved, and debug APKs have no stable release signing plan yet.

See [ROADMAP.md](ROADMAP.md) for the approved scope and [BASELINE.md](BASELINE.md) for the preserved V1 fallback.
