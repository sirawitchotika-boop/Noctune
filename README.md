# Noctune

*Your music, without the noise.*

Independent, offline-first Android music player. **Noctune is a new app**, not a rename or migration of [GT SoundMaster](https://github.com/sirawitchotika-boop/Music-Player-Local). No GT SoundMaster files, package IDs, or user data are modified.

## Development status

**Phase 0–1 Android shell** is in [draft PR #1](https://github.com/sirawitchotika-boop/Noctune/pull/1); it has **not been merged, installed, or released**. The shell intentionally shows empty Songs and Playlists views. Music import, storage, playback, timer and Android media controls are later milestones, not available yet.

- Android application ID: `com.noctune.player` (separate from GT SoundMaster's `com.gt.soundmaster`)
- Capacitor 8.6.2, vanilla HTML/CSS/JavaScript
- Pinned dependencies via `package-lock.json`, committed Android Java/XML/Gradle project
- [Full MVP roadmap](ROADMAP.md) and [V1 baseline/fallback](BASELINE.md)
- A/B/C phone checkpoints follow Phases 3, 4 and 6. A brief optional Phase 1 launch check is separate.

## Developer checks and debug build

Requirements: Node 22, Java 21, Android SDK 36 and Gradle 8.14.3.

```sh
npm ci
npm run check
npm run sync
cd android
gradle --no-daemon assembleDebug
```

The GitHub Actions [Android debug workflow](.github/workflows/android.yml) runs these checks, verifies the APK package identity, and uploads a temporary **debug APK** artifact. Debug APKs are not signed with a stable release identity. CI passing does not prove real phone launch, Bluetooth or background playback.

No build installs or modifies either Android app automatically. **Do not merge, install, sign for release or publish without separate approval.**
