# Phase 3 Implementation Todo

Tracks implementation of `docs/03-Phase3-Torrent-Streaming.md` (v2.1). Ordered by dependency — each phase unblocks the next. Check items off as they land; this file is the source of truth across sessions (no external tracker).

## 1. JS data layer — `src/lib/addons/` ✅ done
- [x] `fetchStream(addon, type, id)` in `api.ts` — `GET /stream/{type}/{id}.json`
- [x] `fetchSubtitles(addon, type, id)` in `api.ts` — `GET /subtitles/{type}/{id}.json`
- [x] `normalizeStream(raw, addonName)` in `normalize.ts` — maps to the `Stream` shape (doc §4.1.3), including `behaviorHints.fileIdx`; also parses quality/codec/resolution/size/seeders/peers/audio tracks out of the free-text `title`/`name` fields (Torrentio-family emoji convention — the Stremio protocol has no structured fields for these)
- [x] `normalizeSubtitle(raw, addonName)` in `normalize.ts` — maps to `SubtitleTrack`
- [x] `combineStreamResults` (concatenate, no id-dedup — deliberately not `mergeMediaLists`) and `mergeSubtitleTracks` (exact-duplicate dedupe only) added to `merge.ts`
- [x] `sortStreams()` added in new `src/lib/stream-sort.ts`, implementing the "Best Match" formula from doc §3.1 (preferred quality → quality desc → seeders desc → size desc), mirroring `media-sort.ts`'s pattern
- [x] `fetchMergedStreams`/`fetchMergedSubtitles` added to `queries.ts`, following the existing `fetchMergedCatalog` pattern
- [x] `Stream`/`StreamQuality`/`StreamBehaviorHints`/`StreamSortOption` types added to `types.ts`
- [x] `addonQueryKey`/`STALE_TIME` already supported `stream`/`subtitles` in `query-client.ts` — reused as-is, no changes needed
- [x] Updated `__tests__/App.test.tsx`'s addon API mock with `fetchStream`/`fetchSubtitles`
- [x] Verified: `tsc --noEmit`, `eslint`, and `jest` all pass
- [ ] (Still open, optional) Fix addon install dedup in `AddonsContext.tsx` to key on `manifest.id` instead of `manifestUrl`

## 2. Navigation + Streams screen ✅ done
- [x] Added `MovieStreams: { id }` and `EpisodeStreams: { id, season, episode }` to `RootStackParamList` (`routes.ts`) + `linking.ts` (`movie/:id/streams`, `series/:id/season/:season/episode/:episode/streams`)
- [x] Extended `Player` route param with `streamId?: string` (optional — History's existing "Resume" call-site doesn't pick a stream yet, that's item 6)
- [x] Built `src/features/streams/`: `hooks/useStreams.ts` (merged-query pattern matching `useDiscover`/`useHomeRows`), `components/HealthDot.tsx`, `components/StreamRow.tsx`, `components/StreamsListView.tsx` (sort control, loading/no-addons/full-failure/empty/partial-failure-banner states), `screens/MovieStreamsScreen.tsx`, `screens/EpisodeStreamsScreen.tsx`
- [x] Registered both screens in `RootNavigator.tsx`
- [x] Wired "Find Streams" (Movie Details) and "Play" (Episode Details) buttons to navigate to the new Streams screens
- [x] Verified: `tsc --noEmit`, `eslint`, `jest` all pass
- [ ] **Not verified visually** — no `react-native-web` target or Android emulator is set up in this environment, so the screen hasn't been eyeballed running. Worth a manual pass (`npm run android` or add a web target) before considering this screen done.

## 3. Settings ✅ mostly done
- [x] Built `SettingsContext`/`useSettings()` (`src/context/SettingsContext.tsx`), persisted via MMKV under `StorageKeys.settings`, mirroring `ThemeContext`/`LibraryContext`; wired into `Providers.tsx`
- [x] New shared `src/components/Stepper.tsx` (+/− control) for numeric settings
- [x] Playback section: subtitle language, audio language, autoplay toggle, preferred quality — all functional Tabs/Switch controls in `SettingsScreen.tsx`
- [x] Torrent section: max peers stepper, Wi-Fi/Wi-Fi+mobile mode, max cache size stepper, storage location (display-only for now), "Clear streaming cache" button
- [x] Verified: `tsc --noEmit`, `eslint` (2 pre-existing-pattern warnings, no errors), `jest` all pass
- [ ] `clearStreamingCache()` is currently a no-op stub — there's no native module yet (item 4) with an actual cache to clear; needs wiring once `TorrentModule` exists
- [ ] "Storage location" is a static display row, not a real folder picker — real implementation needs native filesystem access (item 4/5)
- [ ] Mobile-data confirmation dialog, Wi-Fi→mobile handover pause, and cache LRU eviction are *settings values only* right now — the actual behaviors land in item 6

## 4. Native Android torrent module ✅ done, real-compiled
- [x] Added libtorrent4j 2.1.0-27 to `android/app/build.gradle` (base + 4 Android ABI artifacts). **Pinned to -27, not the newer -39 base** — later 2.1.0-3x releases only published the desktop/base jar, not Android native `.so`s; the base jar's JNI bindings must exactly match the native lib's ABI, so all 5 artifacts must stay on the same version.
- [x] `android/app/src/main/java/com/shikara/torrent/TorrentSession.kt` — singleton wrapping libtorrent4j's `SessionManager`; magnet→torrentId via btih (hex + base32) extracted synchronously from the URI (no alert wait needed); `AlertListener` handles `ADD_TORRENT` (auto-resume + file selection) and `METADATA_RECEIVED` (file selection once files are known)
- [x] `android/app/src/main/java/com/shikara/torrent/TorrentModule.kt` — the `@ReactMethod` bridge implementing doc §5.1's full API: `addMagnet`, `addTorrent`, `start/pause/resume/stop/remove`, `getStatus/getFiles/getPeers/getProgress`, `setFilePriority`
- [x] `android/app/src/main/java/com/shikara/torrent/TorrentPackage.kt` registered in `MainApplication.kt`
- [x] File selection: prefers a `setFilePriority(torrentId, fileIndex, TOP_PRIORITY)` call made before metadata arrives (JS passes the Stream's `behaviorHints.fileIdx` this way), falls back to largest file (doc §5.2) — implemented in `TorrentSession.applyFileSelection`/`selectFile`
- [x] Read-ahead piece prioritization via `TorrentHandle.setPieceDeadline` with a 24-piece stepped window (`applyReadAheadWindow`), recomputed via the extra `updatePlaybackPosition(torrentId, byteOffset)` method for seek support (doc §5.2 — not in §5.1's literal list, but required by §5.2's behavior spec)
- [x] Extra `clearCache()` method backing the "Clear streaming cache" Settings button (still not wired from the JS side — that's item 6)
- [x] JS wrapper `src/lib/native/TorrentModule.ts` — typed interface matching the native API, Android-only guard that throws clearly on other platforms instead of silently no-op-ing
- [x] **Actually compiled with a real Android SDK + Gradle in this environment** (`./gradlew :app:compileDebugKotlin` → `BUILD SUCCESSFUL`) — this is real verification against the actual libtorrent4j 2.1.0-27 API (`SessionManager`, `TorrentHandle`, `TorrentInfo`, `Priority`, `AlertListener`, etc. — checked against the library's real source/demo code on GitHub, not guessed), not just "looks plausible"
- [x] Verified: `tsc --noEmit`, `eslint`, `jest` all pass for the JS side
- [ ] **Not runtime-tested** — compilation succeeded, but nothing here has run on an actual device/emulator (no AVD was launched, no real magnet/peer network activity was exercised). Native `.so` loading, alert callback timing, and actual buffering behavior are unverified beyond code review + successful compilation against the real API.
- [ ] Design choice worth knowing: `TorrentModule` is a **classic `ReactContextBaseJavaModule`** (registered via a plain `ReactPackage`), not a codegen'd TurboModule spec, even though `newArchEnabled=true`. This relies on RN's Turbo Module interop layer to resolve it from JS — works without running codegen, but if strict New-Architecture-only typing is ever required, this should be upgraded to a real TurboModule spec (JS spec file + generated `NativeTorrentModuleSpec`).
- [ ] `start(torrentId)` and `resume(torrentId)` are equivalent (both just call `TorrentHandle.resume()`) — torrents auto-resume the moment they're added (matching libtorrent4j's own official demo pattern), so `start()` doesn't gate anything by itself. Same for `stop()`/`pause()` — libtorrent has no third "stopped" state distinct from "paused".

## 5. Native player + real Player screen ✅ done, real-compiled
- [x] Added Media3 1.11.1 (`media3-exoplayer`/`-ui`/`-common`/`-datasource`) to `android/app/build.gradle`
- [x] `android/app/src/main/java/com/shikara/player/TorrentDataSource.kt` — custom Media3 `DataSource` (modeled on Media3's own `FileDataSource`) reading a torrent's selected file directly off disk via `torrent://<torrentId>/<fileIndex>` URIs, blocking per-read on `TorrentSession.awaitPiece()` until the covering piece has downloaded — this is the actual "local streaming buffer" doc §5.3 describes, not a generic download-then-play
- [x] `TorrentSession.kt` extended with `getStreamFile`/`pieceIndexForFileOffset` (via libtorrent's own `FileStorage.mapFile`, not manual piece-length math) /`isPieceAvailable`/`awaitPiece`/`getSelectedFileIndex`
- [x] `PlayerBridge.kt` (singleton) — owns the single active `ExoPlayer`, builds a `ProgressiveMediaSource` over `TorrentDataSource.Factory` for torrent streams, or a plain `MediaItem`/default source for `Stream.type === "direct"` HTTP streams; implements `load/loadDirect/play/pause/stop/seek/setQuality(no-op)/setAudioTrack/setSubtitle/getState`
- [x] `PlayerViewManager.kt` — renders the video surface only (`PlayerView`, `useController = false`); all control goes through `PlayerModule`, not view commands/events — deliberately sidesteps Old/New-Architecture event-dispatch differences
- [x] `PlayerModule.kt`/`PlayerPackage.kt` registered in `MainApplication.kt`; state (position/duration/buffered/playing/state/real embedded audio-track languages/ExoPlayer error) polled via `getState()`, same pattern as `TorrentModule.getStatus()`
- [x] JS wrappers: `src/lib/native/PlayerModule.ts`, `src/lib/native/TorrentPlayerView.tsx` (Android-only guards, same pattern as `TorrentModule.ts`)
- [x] `src/features/player/hooks/usePlayerSession.ts` — owns addMagnet→setFilePriority→start→getSelectedFileIndex→load lifecycle, status/state polling, periodic `WatchHistoryItem` writes (docs §8), no-peers timeout, ExoPlayer-error surfacing, pause-on-unmount
- [x] `src/features/player/hooks/useSubtitles.ts` — merged subtitle-addon query, combined with the Stream's embedded `subtitles[]` via `mergeSubtitleTracks` (item 1)
- [x] `LibraryContext` extended with `upsertHistory`/`setLastStream`; `LibraryItem.lastStream` field added
- [x] `PlayerScreen.tsx` fully rewritten (stub removed): top bar, center play/pause, two-layer scrub bar (position + buffered), buffering overlay (speed/peers/percent + Switch Source), error overlay (metadata/no-peers/playback + Switch Source + Back), subtitle/audio bottom sheet (RN `Modal`, dedup via `mergeSubtitleTracks`/exact-duplicate rule), back-button watched-threshold confirmation (`BackHandler`, ≥95% per docs §3.2)
- [x] Small supporting fix: `useMovie`/`useSeries` gained an optional `{ enabled }` param so `PlayerScreen` doesn't fire a wasted/invalid meta query for the media type it isn't playing
- [x] **Actually compiled with the real Android SDK + Gradle** (`./gradlew :app:compileDebugKotlin` → `BUILD SUCCESSFUL`) against the real Media3 1.11.1 API (`BaseDataSource`, `DataSpec`, `ProgressiveMediaSource.Factory`, `MediaItem.SubtitleConfiguration`, `TrackSelectionParameters`, `Tracks.Group`, `PlaybackException` — checked against Media3's real source on GitHub, not guessed)
- [x] Verified: `tsc --noEmit`, `eslint` (only the same pre-existing inline-style warning pattern), `jest` all pass
- [ ] **Not runtime-tested** — same caveat as item 4: compiles correctly, but nothing has actually played a video on a device/emulator. Piece-wait blocking, ExoPlayer/DataSource threading, and Fabric view-manager rendering are unverified beyond code review + successful compilation.
- [ ] **Known gaps, deliberately scoped out:**
  - No volume slider (Android hardware volume buttons work regardless) and no fullscreen toggle (mobile-first pass; doc marks both touch/web-only)
  - TV D-pad seek (±10s without moving focus) needs a `TVEventHandler`, not implemented — currently D-pad would move focus between the seek buttons rather than seeking directly
  - "Player seeking into an unbuffered region must show the buffering overlay" (docs §5.2) — `updatePlaybackPosition` reprioritization is wired on every `seek()`, but the overlay only reappears once `playbackState` actually drops to `buffering`/`idle`, not immediately on seek
  - Autoplay-next-episode's *navigation* (finding and jumping to the next episode) is NOT implemented here — only the prerequisite `lastStream` write is. Item 6 owns the actual "on end, reuse lastStream for the next episode" flow.
  - Byte-offset-from-seek-time is a linear estimate (`PlayerBridge.notifySeekPosition`), not exact demuxer-level byte mapping — a standard, accepted approximation for VBR content

## 6. Lifecycle, history, autoplay (ties everything together)
- [ ] Periodic `WatchHistoryItem.progressSeconds` writes (5–10s cadence), including aborted/error sessions
- [ ] `LibraryItem.lastStream` write on stream selection
- [ ] Pause-on-background / resume-on-foreground, single paused-session eviction rule
- [ ] Switch Source → resume from last known position
- [ ] Autoplay next episode → reuse `lastStream` addon+quality, fallback to Streams screen
- [ ] Wi-Fi↔mobile handover pause+reconfirm
- [ ] Confirm iOS/Web buttons stay disabled
