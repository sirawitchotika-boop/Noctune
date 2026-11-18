# Noctune MVP Roadmap v1.1 — execution status

Approved by Boss for **Phase 0–1 only** on 2026-11-18. The attached full **Noctune MVP Roadmap v1.1** remains the product and safety reference; this file records the short execution plan and status. Approval to implement is *not* approval to merge, install, sign for release, or publish.

- **Phase 0:** Record GT SoundMaster behavior, commit `d519dbf`, and fallback safety in `BASELINE.md`. No V1 changes.
- **Phase 1:** Separate name/icon/UI/package `com.noctune.player`; pinned Capacitor dependencies; committed Android source; CI-built early APK. Initial app has no imports/playback.
- **Phase 2:** Safe IndexedDB imports/search, favorites and playlists; no destructive membership behavior.
- **Phase 3:** Single playback authority, queue/modes/seek, deadline-based sleep timer. **Boss checkpoint A** (combined Phase 2–3).
- **Phase 4:** Native MediaSession, notification/background media service, Bluetooth disconnect and audio focus. **Boss checkpoint B**.
- **Phase 5:** Deliberate UI and accessibility polish; no new full Boss test round unless behavior changes.
- **Phase 6:** Stable signing and update/rollback plan, regression APK. **Boss checkpoint C**.

Non-negotiables: offline-first, no accounts/cloud/analytics, no extra features, no rewriting the reference app, no real-data deletion tests, no unexpected installs, no automatic merges/releases. CI is not a physical-phone test.

**Current state:** Phase 0 baseline recorded, Phase 1 shell submitted for review. First APK build and launch verification tracked in GitHub Actions. Noctune has no user data or signed release.
