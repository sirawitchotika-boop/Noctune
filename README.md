# Noctune

*Your music, without the noise.*

Noctune is an offline-first Android music player. It is separate from [GT SoundMaster](https://github.com/sirawitchotika-boop/Music-Player-Local); the original app and its data remain untouched.

## Development status — 19 November 2026

**PAUSED at Boss's direction; current code and installed apps are preserved.** The technical MVP and isolated update gate are complete, but Noctune's unique product direction is undecided. No additional polish or release work is authorized by this status update.

- Phases 0–6 implemented; Boss reported real-phone Checkpoints **A, B and C passed**.
- Signed isolated RC v1 and RC v2 workflows passed: [v1 run](https://github.com/sirawitchotika-boop/Noctune/actions/runs/44305375218) · [v2 run](https://github.com/sirawitchotika-boop/Noctune/actions/runs/44348221153). Normal RC v1 → v2 update retained disposable songs, Favorite and playlist, per Boss.
- **Still open:** [Issue #4](https://github.com/sirawitchotika-boop/Noctune/issues/4) (Realme status/navigation colors and deferred UX refinements). Phase 5 color adjustments are not confirmed visually.
- **Not production-release ready:** This update test covers the separate `com.noctune.player.rc` package only, not upgrading a previous debug-signed `com.noctune.player` installation. No migration strategy or public release approved.
- For exact evidence, safeguards and a single resume decision, see [ROADMAP.md](ROADMAP.md) and [RELEASE-SAFETY.md](RELEASE-SAFETY.md). Preserve private signing-key backups; do not place signing material in Git.

## Protect installed music

Noctune stores imported audio, Favorites and playlists in private app storage. **Do not uninstall, clear storage, or overwrite an app just to make an APK install.** Your source music files should always exist separately as the permanent backup.

Old debug APKs might have different signing certificates. The proposed signed test package is deliberately a **separate** `com.noctune.player.rc` app; it can be tested without replacing the original `com.noctune.player`, either Gate 2 debug app, or GT SoundMaster. A successful RC-to-RC upgrade is **not** proof of an in-place upgrade for the old debug app.

## Developer verification

Needs Node 22+, Java 21, Android SDK 36 and Gradle 8.14.3:

```sh
npm ci
npm run check
```

Both Android debug and signed-RC workflows are **manual-only** to conserve quota. The release-candidate workflow will **fail closed** without an explicitly approved private keystore and known certificate fingerprint. No signing keys or passwords are stored in the repository.

Read [RELEASE-SAFETY.md](RELEASE-SAFETY.md) for owner signing decisions and the short Checkpoint C procedure. [ROADMAP.md](ROADMAP.md) tracks broader scope, [BASELINE.md](BASELINE.md) documents the untouched GT SoundMaster fallback.

The HTMLAudioElement remains the only playback authority; Android MediaSession mirrors its state. Bluetooth route-loss pauses without auto-resume. No new media engine, database migration or permission expansion was part of Phase 6.
