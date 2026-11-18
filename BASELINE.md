# Phase 0 — reference and fallback baseline

Reference only: [GT SoundMaster source](https://github.com/sirawitchotika-boop/Music-Player-Local) at `main`, commit `d519dbf1f330a55cbd7be93cc6446cd21a613851` (verified 2026-11-18).

## Behavior inventory (source review, not phone testing)
- Local music import and offline playback use the Web Audio/HTML audio UI with an IndexedDB database (`LocalMusicDB`, schema v4) and distinct metadata / audio blob stores.
- Playlist memberships and favorites are saved separately in browser local storage. Queue offers order, shuffle and repeat-one.
- Sleep timer uses an absolute deadline (wall clock) and scheduled checks.
- Reference Android workflow embeds native MediaSession, notification and audio-output-disconnection handling, with event-based synchronization.
- Original Android package: `com.gt.soundmaster`. New Noctune package: `com.noctune.player`.
- Reference build: [GitHub Actions run 41413574573](https://github.com/sirawitchotika-boop/Music-Player-Local/actions/runs/41413574573), succeeded 2026-11-02 for baseline commit. The GT-SoundMaster-APK artifact existed as of the 2026-11-18 inspection, with a listed expiry of 2027-01-31. **Durable external fallback copy not verified**. Retain one privately outside GitHub Actions before relying on it.

## Guardrails for Noctune
- Never write to, update, uninstall, re-sign or clear GT SoundMaster; it is the fallback.
- Noctune uses a separate package and WebView data directory. It does not read or migrate GT SoundMaster storage.
- Render imported filenames as text, never injected HTML. The reference UI contains HTML string interpolation of names.
- Import into Favorites must not import files; playlist membership removal must never delete audio.
- Destructive paths and update tests use disposable music only.
- Reference APK / source success does **not** verify actual Bluetooth, notification, phone lifecycle, or signing behavior.

## Phase 0 conclusion
Source baseline documented; reference repository left untouched. Durable fallback archive and actual phone behavior remain **not verified**.
