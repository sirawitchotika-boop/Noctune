---
document_id: NOCTUNE-MVP-ROADMAP
version: 1.1
date: 2026-11-18
status: phase-5-pr-review
product: Noctune
platform: Android (Capacitor)
project_type: personal offline music player
implementation_authorized: phases-0-5-only
new_repository: sirawitchotika-boop/Noctune
new_repository_url: https://github.com/sirawitchotika-boop/Noctune
new_repository_status_verified: PRs #1 #2 #3 #5 #6 merged; main 8e31cb3; Phase 5 UX PR pending
new_repository_default_branch_setting: main
reference_repository: sirawitchotika-boop/Music-Player-Local
reference_branch: main
reference_commit: d519dbf1f330a55cbd7be93cc6446cd21a613851
owner_approval_required_for: [implementation, merging, release, installation, deletion, signing-key-changes]
---

## Current execution status — 18 November 2026

Boss merged [Phase 4 PR #6](https://github.com/sirawitchotika-boop/Noctune/pull/6). Main is verified at `8e31cb3afb0e086536ef8284a5f06703ba6346ec`. The latest Phase 4 manual debug APK run [#44252646203](https://github.com/sirawitchotika-boop/Noctune/actions/runs/44252646203) succeeded; Boss reported all Checkpoint B phone checks passing and the Bluetooth blocker [issue #8](https://github.com/sirawitchotika-boop/Noctune/issues/8) is closed. Checkpoint A had also passed. Auto APK builds remain **disabled** after [PR #5](https://github.com/sirawitchotika-boop/Noctune/pull/5). GT SoundMaster remains untouched.

Boss authorized continuation into **Phase 5 — experience pass**. The `feat/phase-5-ux-polish` PR proposes larger touch targets, accessible labels/error announcements and consistent dark web/native system-bar surfaces. The Realme color mismatch is not yet reverified on device; keep [issue #4](https://github.com/sirawitchotika-boop/Noctune/issues/4) open, and defer unspecified small UX logic reports rather than guessing fixes. **No separate Boss phone test and no APK build are planned for this styling pass.**

**Owner gate:** Phase 5 coding/PR is authorized. No merge, installation, release, data deletion, signing-key change or Phase 6 implementation without separate explicit approval. Phase 6 will address stable private signing and Checkpoint C in-place update safety.

# Noctune
## MVP product brief and end-to-end development roadmap

**Document state:** Roadmap v1.1; Phases 0–4 merged, manual builds enabled, Phase 5 UX PR proposed; Phase 6 and release signing pending.  
**Audience:** Boss (product owner) and future AI/software developers.  
**Principle:** KISS — one user, one device-focused music player, no overengineering.  
**Source of truth:** This document records agreed scope and proposed decisions. The live repository and actual test evidence take precedence over historical notes.

**Repository:** [sirawitchotika-boop/Noctune](https://github.com/sirawitchotika-boop/Noctune) — created by Boss, now initialized and built through Phase 1. The original 'empty' state below is historical. **Reference only:** [Music-Player-Local](https://github.com/sirawitchotika-boop/Music-Player-Local).

> **Product promise:** *Your music, without the noise.* Noctune is a quiet, offline-first Android music player that feels intentionally designed, not generated from a generic app template.

## 1. Executive decision

Build **Noctune** as a genuinely separate app, not a renamed GT SoundMaster. Use the current GT SoundMaster for **behavioral reference only**. Preserve its strengths (local playback, favorites, playlists, sleep timer, Bluetooth auto-pause, Android notification controls), but rethink the interface and simplify the implementation where evidence supports it.

**Success is not “more features.”** Success is an app Boss prefers to use daily because it feels cleaner, handles interruptions reliably, and does not risk music data. GT SoundMaster remains the stable fallback.

### Fixed vs. flexible

| Fixed decisions | Flexible until implementation |
|---|---|
| Name: **Noctune** | Exact icon geometry, typography, and accent shade |
| Separate Android package ID and independent app data | UI spacing and micro-interactions |
| Offline-first; no accounts, cloud, streaming, or analytics | Internal file names/module boundaries |
| KISS/MVP; preserve useful existing features | Optional convenience details identified during testing |
| No changes to the old app without separate permission | Which low-risk niceties are deferred |

## 2. Product identity — chosen design direction

**Personality:** late-night listening, quiet confidence, practical utility. Distinct from GT SoundMaster's cyberpunk disc/neon control panel.

- **Visual system:** matte charcoal (`#141619`), warm off-white (`#E9E7E1`), muted copper accent (`#B77B59`), understated secondary gray (`#90959A`). One accent, used sparingly.
- **Layout:** **library-first**. Songs and playlists are visible immediately; a small bottom now-playing strip expands into a dedicated playback view. No oversized decorative disc, no unnecessary tabs.
- **Typography:** system-native sans serif with purposeful size hierarchy. Track title first; secondary detail is quiet. Legibility beats decoration.
- **Icon concept:** a custom asymmetric **N-shaped notch mark**, built from two solid strokes and a deliberate negative-space break. It should read at 48 px. **No musical note, disc, waveform circle, gradient sphere, or glowing border.**
- **Motion:** only functional feedback (tap, playback state, sheet transition). Respect reduced-motion settings where practical.
- **Avoid AI slop:** no stock-art hero image, glassmorphism, busy gradients, invented statistics, interchangeable card grids, or visual effects without a purpose.

These are proposed creative choices under Boss's “surprise me” instruction. They can change before the visual baseline is approved.

## 3. MVP scope

### Must ship

1. **Local library:** import audio selected from Android's file picker; persist metadata and audio locally; list, search, and play offline. Never silently delete imported music.
2. **Playback:** play/pause, next/previous, seek, duration/position, order, shuffle, and repeat-one. No unexpected automatic skipping on recoverable errors.
3. **Favorites and playlists:** favorite/unfavorite, create/rename/delete custom playlists, add/remove songs, clear playlist membership without deleting source audio. Favorites are changed **only through the favorite action**, not by importing into that view.
4. **Android integration:** notification and lock-screen controls; background playback; immediate pause on relevant Bluetooth/audio-output disconnection; consistent playback state and useful progress synchronization.
5. **Sleep timer:** choose minutes or a saved preset, start/stop, pause when the deadline is reached. Keep it dependable rather than visually elaborate.
6. **Safety:** explicit destructive-action confirmations, honest error messages, no unnecessary permissions, repeatable builds, and a signing/update plan.
7. **Distinct identity:** Noctune name, own icon, own Android app ID, and different layout from GT SoundMaster.

### Not in MVP

Equalizer, visualizer, lyrics, cover-art scraping, streaming, accounts, sync, cloud backup, recommendations, theming system, telemetry, advanced audio processing, playlist sharing, elaborate settings, and multi-device support.

**Decision later, only if used:** “Open with Noctune” from another Android app (external `ACTION_VIEW` audio intent) exists in the reference. Defer it unless Boss confirms this is part of daily use; do not let it delay the first usable build.

## 4. Technical blueprint (deliberately small)

**Stack:** Vanilla JavaScript ES modules + HTML/CSS + Capacitor Android + IndexedDB. Keep Android native code only for functions that truly require it. Commit native Android source to the new repository instead of generating hundreds of Java lines inside CI.

```text
noctune/
  README.md
  ROADMAP.md                 # revised roadmap (copy into repo when implementation is authorized)
  package.json
  package-lock.json          # pinned dependency versions
  web/
    index.html
    styles.css
    app.js                    # app startup and wiring
    playback.js               # one audio controller/source of truth
    library.js                # IndexedDB, imports and safe deletion
    queue.js                  # order/shuffle/repeat and selection
    playlists.js              # favorites and playlist membership
    timer.js                  # deadline-based sleep timer
    ui.js                     # small UI rendering/event handlers
  android/                    # committed Capacitor Android project
  tests/                      # a few focused behavioral tests
  .github/workflows/build.yml
```

Do not force this exact tree if a simpler arrangement emerges. **Rule:** no framework, no dependency injection container, no elaborate state store, and no additional layers without a demonstrated problem.

### Non-negotiable design rules

- **One playback authority:** the actual audio element/controller owns `playing`, position, duration, and selected track. Notification state only mirrors it.
- **One Android command path:** native MediaSession controls and Bluetooth interruption actions reach that controller. Avoid competing, independent state machines.
- **Sync on meaningful events:** play, pause, seek, track change, ended, waiting/stalled, and resumed playback; correct large drift if needed, but **do not send an Android bridge update every second**.
- **One durable audio library:** separate metadata and blobs as useful; keep schema upgrades additive and tested. Store playlist memberships/favorites so deletion semantics are explicit.
- **No HTML injection:** render user-supplied song/playlist names as text, not interpolated HTML.
- **Safe installs:** choose a **different** Android `applicationId` from GT SoundMaster (`com.gt.soundmaster`). Proposed Noctune ID: `com.noctune.player` (confirm before initializing the app). Before V2 is used for real data, arrange stable signing for future updates; never store signing secrets in Git.

## 5. Roadmap — beginning to end

The phases are development milestones, **not seven separate manual test sessions**. The AI developer runs focused checks while implementing each slice. **Boss has three major phone-testing checkpoints: A, B, and C.** There is also one short initial APK launch smoke check when the Android shell first exists; this is not a full test round. Do not ask Boss to retest already-passed flows unless relevant behavior changes.

**Development policy:** one PR per meaningful outcome, not necessarily per phase. Combine closely related work when it reduces review overhead. Every PR is for Boss's review; merge requires explicit approval.

| Phase | Deliverable | Developer verification | Boss testing |
|---|---|---|---|
| **0 — Baseline** | V1 behavior and safe fallback recorded | Reference inventory reviewed; V1 untouched | None |
| **1 — Identity & shell** | Noctune initialized in existing repo; distinct ID/icon; bootable APK | Basic build + launch readiness | One quick launch/coexistence smoke check if required |
| **2 — Library & playlists** | Local imports, search, favorites, playlists | Focused storage and deletion tests | Wait for A |
| **3 — Playback core** | Play/pause, queue, modes, seek, timer | Focused audio/queue/timer tests | **Checkpoint A** |
| **4 — Android integration** | MediaSession, Bluetooth, background behavior | Build + targeted native integration checks | **Checkpoint B** |
| **5 — Experience pass** | Distinct UI refined without feature creep | UI/accessibility sanity checks | No new round unless behavior changes |
| **6 — Release candidate** | Signed reproducible APK, update plan, regression evidence | Final build + regression tests | **Checkpoint C** |

### Phase 0 — Baseline and fallback

**Work:** Read GT SoundMaster as a behavioral reference; inventory observable playback and storage behavior, original package ID, APK fallback, and signing/update constraints. Store a known-good V1 APK outside expiring Actions artifacts if one is available. Do not move or alter V1 data.

**Exit evidence:** a concise `BASELINE.md` or README section; V1 untouched. No Boss device test required.

### Phase 1 — Identity and Android shell

**Work:** **Initialize the already-created `sirawitchotika-boop/Noctune` repository** (do not create another). Make the initial `main` commit through an approved implementation workflow; pin Capacitor versions; choose a package ID distinct from `com.gt.soundmaster`; add the Noctune name, restrained library-first skeleton and custom icon; commit the Android source project and a minimal APK build workflow.

**Exit evidence:** source tree exists, APK builds, and Noctune's package ID is verified different. One **quick smoke check** on Boss's phone may confirm Noctune opens alongside V1. This check is not a full manual test session; if no phone test has occurred, record it as not tested.

### Phase 2 — Library and playlists

**Work:** Build IndexedDB local storage, metadata/blob separation as needed, safe duplicate detection, import validation, text-safe filename rendering, search, Favorites and custom playlists. Removing membership must never delete the underlying audio; full library deletion needs explicit confirmation. Reject Add Music on Favorites **before** storing files.

**Exit evidence:** automated/instrumented checks for persistence, duplicate files, unusual names, membership removal and disposable-track deletion. Save the combined phone checks for **Checkpoint A**.

### Phase 3 — Playback core and sleep timer

**Work:** Introduce one playback authority, correct queue/index handling, playback modes, seek, honest failed-play states and a deadline-based timer. Avoid unnecessary DSP; only add a gain ramp when an audible problem justifies it.

**Exit evidence:** focused controller tests and a working candidate APK. Then request **Checkpoint A** once, covering Phases 2–3 together.

### Phase 4 — Native Android and Bluetooth reliability

**Work:** Implement a small committed Android foreground media service and MediaSession; route native controls to the same playback controller. Handle noisy audio routes / Bluetooth disconnect and audio-focus interruptions. Synchronize notification position from actual playback events (including stalls/resumes) without flooding the bridge with a per-second timer.

**Exit evidence:** Android build/integration checks. Then request **Checkpoint B** for Bluetooth disconnect, resume, lock-screen controls, seeking and a 10-minute background check. A useful *investigation target* is roughly ≤2 seconds of persistent position difference after 10 minutes, not a guaranteed Android platform threshold. Pause-state disagreement or a notification clock advancing while paused needs investigation.

### Phase 5 — Deliberate UX, not feature growth

**Work:** Refine touch targets, long names, empty/loading/error states, accessible labeling, contrast and the now-playing view. Keep motion subtle and purposeful. Do not add unrelated features.

**Exit evidence:** developer UI sanity checks and screenshots of the distinct visual design. **No separate Boss device round** unless a change affects behavior already tested in A or B.

### Phase 6 — Release candidate and update safety

**Work:** Verify dependency versions and Android permissions; use a stable, privately stored signing arrangement for future Noctune updates; verify package ID/version and reproducible build inputs. Prepare safe in-place update and rollback notes. Build a candidate and run focused final regression checks using disposable data.

**Exit evidence:** APK artifact, build evidence, version/signing notes, and a short test checklist. Request **Checkpoint C** once. The app is only released/installed/merged after explicit Boss approval. V1 remains intact as the fallback.

### Three major phone-testing checkpoints

| Checkpoint | When | One grouped Boss test | Pass condition |
|---|---|---|---|
| **A — Core** | After Phase 3 | Import and reopen files; duplicates; playlist/favorite behavior; play/pause/seek/next; shuffle/repeat; timer | Music persists; controls work; no unexpected deletion or queue jump |
| **B — Android** | After Phase 4 | Bluetooth disconnect during playback; lock-screen/notification controls; seek/pause; background 10 minutes; screen-off timer | Real playback and notification agree; audio pauses on disconnection; no material drift |
| **C — Release** | After Phase 6 | Install candidate; check normal listening; perform an **in-place Noctune update** with test data if available; confirm coexistence with V1 | App remains usable and retained Noctune data survives; V1 is unchanged |

**Boss testing rule:** Provide one short checklist with expected results and a stop condition per checkpoint. Do not ask Boss to repeat a passing test for unrelated styling changes. **Never** use Boss's valuable music as deletion or update test data. CI success is not a substitute for on-device testing.

## 6. Small, high-value acceptance test matrix

The matrix below is a reference for developers and for the **three grouped phone checkpoints**; it is not a request for separate tests after each phase.

| Scenario | Expected result | Checkpoint |
|---|---|---|
| Import music, force-close, reopen | Tracks and memberships are intact | A |
| Import same files twice | Predictable duplicate handling; no accidental loss | A |
| Rename playlist or import a strange filename | Correct visible text; no broken HTML/UI | A |
| Add music while viewing Favorites | No files unexpectedly imported; clear explanation | A |
| Remove from a custom playlist | Source audio remains in the library | A |
| Delete one disposable library track | Only that track is removed after confirmation | A |
| Switch playlists while playing | Correct song continues; next/previous choose from the intended queue | A |
| Bluetooth disconnect during playback | App actually pauses; notification also pauses | B |
| Pause/seek/resume from lock screen | App and notification agree on state and position | B |
| Leave player in background for 10 minutes | Playback stays stable and notification time does not materially drift | B |
| Timer expires with screen off | Audio pauses; timer does not silently restart | B |
| Install a newer Noctune build over an older one | App data survives a normal, properly signed in-place update | C |
| Launch GT SoundMaster after using Noctune | The original app and its data are unaffected | C |

**Evidence rule:** CI success proves build completion, not that Bluetooth, timing, or Android lifecycle behavior passed. Record device and Android version when Boss performs the on-phone tests. If a test was not run, label it **not tested**.

## 7. Delivery cadence and stop rules

**Effort expectation (planning estimate, not a promise):** approximately **6–9 focused development sessions** to reach a serious first APK candidate, with **three grouped Boss phone-testing checkpoints (A/B/C)** plus a brief initial launch smoke check if needed. The interface and web logic should be quick because the reference exists; Android background media behavior and safe signing deserve the extra care.

- **Do not rewrite a working subsystem twice.** Address observed failures or clear correctness issues.
- **No big-bang launch.** Build an early APK; integrate feature slices progressively. The quick Phase 1 launch smoke check is not a fourth major test round.
- **Stop if data safety is uncertain.** Test destructive paths on disposable data and confirm rollback first.
- **Defer polish over reliability.** Shipping less is better than a fragile “feature complete” app.
- **No automatic merge, deploy, release, install, uninstall, or data deletion.** Boss must explicitly approve.

## 8. AI developer execution protocol

This section is intentionally explicit so another AI can continue without guessing:

1. **Before coding:** read this roadmap, `CODING-WORKFLOW-V2.md` (if accessible in project sources), and the *live* state of `sirawitchotika-boop/Noctune` (branch, PRs and CI). The repository exists but was empty at the 18 Nov 2026 review; verify again before acting.
2. **Authorization:** this roadmap is **planning-only**. Boss has already created the GitHub repository. This document does not authorize initializing it, code edits, PR creation, merging, signing changes, or release. Follow Boss's latest explicit instruction.
3. **Use reference safely:** `sirawitchotika-boop/Music-Player-Local` at baseline commit `d519dbf` is a behavior/reference source, **not a target for edits**. Re-verify its live state when using it.
4. **Implement the smallest useful slice**; keep focused developer tests and relevant documentation with the same meaningful PR. Reserve Boss testing for checkpoints A/B/C (plus an optional Phase 1 launch smoke check). Do not introduce frameworks or speculative layers.
5. **Report evidence:** distinguish source review, passing automated tests, CI build, and Boss-reported physical-phone tests. Never claim a physical test happened from a successful CI run.
6. **Protect data:** preserve original music and both apps' storage. Never recommend uninstalling V1, clearing app data, or rotating signing identity casually.
7. **At each handoff record only:** goal; current repository/branch/commit/PR; completed phase; checks actually run; blockers; next single action. Update roadmap status when approved changes materially affect scope.

### Initial handoff — 18 November 2026 (historical, before approval)

- **Current state:** Boss created `sirawitchotika-boop/Noctune` (public). It is **empty**: GitHub default branch setting `main`, but no actual branches or commits, no PRs and no Actions runs. No Noctune APK or tests are claimed.
- **Reference verified:** `sirawitchotika-boop/Music-Player-Local`, `main` at `d519dbf1f330a55cbd7be93cc6446cd21a613851`; no open PRs; latest Android APK workflow for that commit completed successfully on 2 November 2026.
- **Decisions made:** Name Noctune; distinct identity; separate app; local-first, KISS/MVP; original app as rollback.
- **Open implementation decisions:** final Android app ID (proposed `com.noctune.player`), first icon layout, stable signing arrangement. Repository name is resolved.
- **Next action:** Boss reviews/approves this revised roadmap and explicitly authorizes **initializing the existing Noctune repo**. Until then, **no source-code, commit, PR, or GitHub changes**.