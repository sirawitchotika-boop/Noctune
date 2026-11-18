# Noctune

*Your music, without the noise.*

An independent, offline-first Android music player. This is a **separate app** from [GT SoundMaster](https://github.com/sirawitchotika-boop/Music-Player-Local); its package and app data are separate.

## Implementation status (18 Nov 2026)

- **Phases 0–1:** merged in [PR #1](https://github.com/sirawitchotika-boop/Noctune/pull/1). A debug Android shell built successfully in CI; actual phone launch not tested.
- **Phase 2:** local music library, search, Favorites and playlists in [PR #2](https://github.com/sirawitchotika-boop/Noctune/pull/2), pending review/merge.
- **Phase 3 and later:** music playback, queue, timer, Android background/notifications/Bluetooth and release signing are **not implemented**.

### Phase 2 behavior

Select **Add music** from Songs to import audio through Android's document picker into Noctune's own IndexedDB stores (metadata and audio blobs are separate). Files stay on-device; no accounts or streaming. Invalid/empty files are rejected. Duplicate detection uses **filename + byte size + lastModified**; it does not hash the audio and may keep two files if the picker reports different timestamps.

Use Favorites' star action to mark/unmark existing songs. In Playlists create/rename/delete a collection, then add songs from their Library rows. Removing a song from a playlist, clearing or deleting the playlist **does not delete music**. To delete an imported audio copy from the Noctune library, use Delete in **Songs** and explicitly confirm; this removes only Noctune's stored copy and its memberships, never the original file in the Android file picker or GT SoundMaster.

The music list **cannot play audio yet**; that is Phase 3. Avoid importing irreplaceable music or performing device update tests before the planned grouped phone checkpoint A.

### Data safety

Noctune stores files in the app's private IndexedDB. Android uninstallation, clearing app data or some storage recovery conditions can remove these copies. Keep the original audio files separately; Noctune is not a backup service. The current debug APK is not a stable release-signed update.

## Developer checks and debug build

Requirements: Node 22, Java 21, Android SDK 36 and Gradle 8.14.3.

```sh
npm ci
npm run check
npm run sync
cd android
gradle --no-daemon assembleDebug
```

The [Android workflow](.github/workflows/android.yml) runs tests, builds the debug APK, verifies the package ID `com.noctune.player` and stores a temporary artifact. Tests use disposable, in-memory fake IndexedDB. CI is **not** a physical phone test.

See the [full MVP roadmap](ROADMAP.md) and [V1 fallback baseline](BASELINE.md). Phone testing remains grouped in checkpoints A/B/C after Phases 3/4/6. **No automatic merge, install, release signing, data deletion, or release.**
