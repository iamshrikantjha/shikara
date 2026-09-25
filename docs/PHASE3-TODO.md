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

## 2. Navigation + Streams screen
- [ ] Add `MovieStreams: { id }` and `EpisodeStreams: { id, season, episode }` to `RootStackParamList` (`routes.ts`) + `linking.ts`
- [ ] Extend `Player` route param with `streamId`
- [ ] Build `src/features/streams/` screen: list, quality/codec/size/health badges, sort control (Best Match formula, doc §3.1), loading/empty/partial-failure/full-failure states
- [ ] Wire "Find Streams" buttons on Movie Details / Episode Details

## 3. Settings
- [ ] Build a `useSettings()` context/store (persisted, mirroring `ThemeContext`/`LibraryContext` pattern)
- [ ] Playback section: subtitle language, audio language, autoplay toggle, preferred quality
- [ ] Torrent section: max peers, Wi-Fi/mobile data mode, max cache size (LRU eviction), storage location, clear cache button

## 4. Native Android torrent module (biggest, most isolated)
- [ ] `TorrentModule.kt` implementing the full API in doc §5.1 (`addMagnet`, `addTorrent`, `start/pause/resume/stop/remove`, `getStatus/getFiles/getPeers/getProgress`, `setFilePriority`)
- [ ] libtorrent4j dependency wiring in `android/app/build.gradle`
- [ ] File selection logic: prefer `behaviorHints.fileIdx`, fallback to largest video file (doc §5.2)
- [ ] Read-ahead piece prioritization + expose piece-level progress to JS

## 5. Native player + real Player screen
- [ ] Media3/ExoPlayer wired to the torrent engine's local streaming buffer
- [ ] Replace `PlayerScreen.tsx` stub with real screen: controls, scrub bar (two-layer buffered/position), buffering overlay, error overlay, subtitle/audio picker, TV D-pad behavior
- [ ] High-level player ops exposed to JS only (`play/pause/seek/stop/setQuality/setAudioTrack/setSubtitle`)

## 6. Lifecycle, history, autoplay (ties everything together)
- [ ] Periodic `WatchHistoryItem.progressSeconds` writes (5–10s cadence), including aborted/error sessions
- [ ] `LibraryItem.lastStream` write on stream selection
- [ ] Pause-on-background / resume-on-foreground, single paused-session eviction rule
- [ ] Switch Source → resume from last known position
- [ ] Autoplay next episode → reuse `lastStream` addon+quality, fallback to Streams screen
- [ ] Wi-Fi↔mobile handover pause+reconfirm
- [ ] Confirm iOS/Web buttons stay disabled
