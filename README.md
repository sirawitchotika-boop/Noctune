# Noctune

*Your music, without the noise.*

Noctune is an offline-first Android music player. It is separate from [GT SoundMaster](https://github.com/sirawitchotika-boop/Music-Player-Local); the original app and its data remain untouched.

## Development status — 18 November 2026

- **Phases 0–5 merged.** Boss reported successful Checkpoints A and B on a real Android phone. Phase 4's Bluetooth bug was fixed and confirmed during Gate 2; the follow-up Phase 5 appearance adjustment has **not yet been visually verified on Realme**.
- **Phase 6 release-safety candidate:** opt-in private-keystore configuration, a manual-only signed APK workflow, guarded signer and package identity checks, and a two-build update checklist. **No signing key has been created or configured, no signed APK built, and no Checkpoint C phone test done.**
- [Issue #4](https://github.com/sirawitchotika-boop/Noctune/issues/4): deferred small UX logic and Realme camera/system-bar color mismatch; stays open.

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
