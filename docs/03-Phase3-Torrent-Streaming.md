# Implementation Guide — Phase 3: Torrent Streaming End-to-End

**Version:** 2.1 (revised: reconciled against the actual Phase 1/2 codebase — route params, `WatchHistoryItem` shape, stream-specific merge, and settings placeholders now reference what really exists; resolved season-pack file selection, health-indicator unknown state, torrent background lifecycle, autoplay stream selection, switch-source resume, and iOS/Web button behavior)
**Status:** Planned — starts after Phase 2 metadata integration is complete
**Depends on:** `02-Phase2-API-Integration.md` (needs real `imdbId`/canonical media identity to look up streams, and reuses the same Addon Manager built there), `PRD.md` §18–25 (Addon/Stream/Player/Torrent architecture)

---

## 1. Goal

Turn the "Find Streams" and "Play" buttons — disabled placeholders since Phase 1 — into a real end-to-end flow: pick a media item → see available stream sources → select one → buffer via a native torrent engine → play in a native video player, with full playback controls.

### In scope
* New **Streams** screen (source selection).
* Fully functional **Player** screen (replacing the Phase 1 stub).
* Native Android torrent module (libtorrent4j) + native player (Media3).
* Support for the **`stream` and `subtitles`** addon capabilities in the same Addon Manager built in Phase 2 (`/settings/addons`) — installed by manifest URL, no backend involved, detected generically via `supports()`. **Torrentio, Comet, and MediaFusion** (stream) and **OpenSubtitles v3** (subtitles) are the reference addons this app is validated against (Section 4).
* Buffering/health UI, playback controls, subtitle/audio track selection.
* New Settings sections: Playback and Torrent preferences (enabling the placeholders left disabled since Phase 1).

### Out of scope (future, per `PRD.md` §21 Phase 5)
* Offline downloads.
* Cross-device resume sync.
* iOS/Web playback of torrent streams (Phase 3 targets **Android** for the native torrent+player path per `PRD.md` §23; iOS/Web may get a direct-HTTP-stream-only path later, out of scope here).

### Project-wide constraint (reaffirmed from Phase 1/2)
No backend of any kind and no authentication/accounts. Stream and subtitle addons are called directly from the client with plain `GET` requests, precisely like the catalog/meta addons in Phase 2 — this phase adds two new addon *capabilities* (`stream`, `subtitles`) to the same manager and the same `supports()` capability-detection helper (`02-Phase2-API-Integration.md` §2.3), it does not introduce any new infrastructure.

### Styling constraint (all phases)
No visual design/theming/branding work happens in this phase either — the Streams screen, Player controls, and Settings additions need correct **sizing and layout structure only**, per `01-Phase1-UI-Navigation.md`'s constraints. No new theming beyond the existing light/dark/system toggle.

### No compromises
Every behavior defined in this document — including the torrent engine's piece-prioritization behavior and the multi-addon merge rules — is a mandatory requirement. "Works with Torrentio" is not sufficient; the Streams screen and subtitle picker must work identically with any manifest-compliant `stream`/`subtitles` addon (Comet, MediaFusion, OpenSubtitles, or any future one), with zero addon-specific code.

---

## 2. Architecture recap

```text
Movie/Series/Episode (from Phase 2, has imdbId)
        ↓
   Installed stream addons (Stremio protocol, e.g. Torrentio — client calls their
   manifest URL directly over plain HTTP, no backend in between)
        ↓
   Normalized Stream List
        ↓
   Streams screen (user selects one)
        ↓
   Torrent Engine (native, Kotlin + libtorrent4j)
        ↓
   Piece prioritization / streaming buffer
        ↓
   Native Player (Media3) ← played from local streaming buffer, not a generic download
```

The JS layer never touches BitTorrent directly — it only calls a stable native module interface (`PRD.md` §24, reproduced in Section 6).

---

## 3. New / changed screens

### 3.1 Streams screen (new) — `/movie/:id/streams` and `/series/:id/season/:season/episode/:episode/streams`

**Purpose:** List every available stream source for the selected media/episode, mirroring Stremio's stream-picker.

Adds two new entries to `RootStackParamList` (`src/navigation/routes.ts`), following the existing naming/param convention (`MovieDetails`, `EpisodeDetails` — param keys spelled out as `season`/`episode`, not abbreviated):

```ts
MovieStreams: { id: string };
EpisodeStreams: { id: string; season: number; episode: number };
```

**Entry point:** "Find Streams" button on Movie Details / Episode Details (now enabled).

**Layout:**
* Header: title + episode label if applicable
* List of stream results, one row per source, each showing:
  * Source/provider name (which installed stream addon it came from, e.g. "Torrentio")
  * Quality badge (`4K`, `1080p`, `720p`, `480p`, `SD`)
  * Codec badge (`H.264` / `H.265` / `AV1`) where known
  * File size (e.g. `2.1 GB`)
  * Health indicator (seeders/peers count → colored dot: green = healthy ≥10 seeders, yellow = moderate 1–9, red = poor 0, **gray = unknown** when the addon didn't report a seeder/peer count at all — never default missing data to red)
  * Audio info (e.g. `5.1`, language) where known
  * Subtitle availability indicator where known
* Sort control: `Best Match` (default) | `Quality (High→Low)` | `Size (Small→Large)` | `Seeders`
  * `Best Match` ranking, in order: (1) quality tier matching Settings → Playback "Preferred quality" ranks first if set to anything other than `Auto`, (2) quality tier high→low, (3) seeders desc (unknown treated as lowest), (4) size desc as a final tiebreak.
* Duplicate results: no cross-addon dedup by infohash/magnet — if two installed addons surface the same torrent, both rows render as-is (each still shows its own `source` addon name), since that's the only signal distinguishing them from the user's perspective.
* Tap a row → navigates to Player screen with the selected stream and begins buffering immediately

**States:**
* Loading: skeleton rows while enabled stream addons are queried (query all in parallel).
* Empty: `EmptyState` — "No streams found for this title" + suggestion to try again later, or to install another stream addon from the Addon Manager.
* Partial failure: if one addon fails and others succeed, show the successful results and a small non-blocking banner "Some sources are unavailable" (per `PRD.md` §18 addon error isolation — one addon failing must never break the others or crash the screen).
* Full failure (no stream addon installed, or all installed ones fail): `ErrorState` + Retry, with a shortcut to `/settings/addons`.

---

### 3.2 Player screen (`/player/:mediaId`) — now fully functional, replacing the Phase 1 stub

The existing `Player` route param (`{ mediaId: string; type?: 'movie' | 'series' }`, `src/navigation/routes.ts`) has no slot for which stream was selected — extend it so the Streams screen can hand off its selection:

```ts
Player: { mediaId: string; type?: 'movie' | 'series'; streamId: string };
```

`streamId` is looked up against the same Streams-screen query result already cached by TanStack Query (Section 4.3) rather than serializing the whole `Stream` object through navigation params.

**Layout — full screen, controls auto-hide after ~3s of inactivity, tap/focus to reveal:**

* **Top bar** (visible on control reveal): back button, title + episode label, subtitle/audio track selector icon, quality label (read-only, e.g. "1080p · H.264")
* **Center**: tap-to-toggle play/pause (large icon), double-tap left/right zones for -10s/+10s seek (touch platforms)
* **Bottom control bar**:
  * Scrub/seek bar — shows **two layers**: playback position, and buffered range sourced from torrent piece-download progress (not just a generic HTML5 buffered range)
  * Current time / total duration labels
  * Play/pause button
  * Volume control (touch/web) — not shown on TV (use remote hardware volume)
  * Fullscreen toggle (web)
  * Cast/AirPlay — out of scope, omit
* **Buffering overlay**: shown when playback is waiting on data —
  * Spinner
  * Download speed (e.g. `4.2 MB/s`)
  * Peers connected count
  * Percent buffered
  * "Switch Source" button → returns to Streams screen. Selecting a new source resumes playback from the same `WatchHistoryItem.progressSeconds` this media/episode already had (read before starting the new torrent's buffering), never restarts at 0 — the failure was the source's fault, not the user's progress.
* **Subtitle/Audio track picker** (bottom sheet, opened from top bar icon):
  * Subtitle: `Off` + a **merged** list of tracks from two sources — any embedded directly in the selected `Stream` object (`stream.subtitles[]`) **and** any returned by every enabled `subtitles`-capable addon for this media id (Section 4.2). Dedupe only *exact* duplicates (same addon + same language + same url); otherwise keep every track and show all of them per language, using each track's `source` addon name as the visible label so the user can pick between differently-synced releases — do not collapse to one track per language. Order: Addon Manager priority, then by language.
  * Audio: list of available audio tracks by language/channel layout (where the source provides multiple)
* **Error overlay** (playback failure — bad source, network loss, unsupported codec): message + "Switch Source" button + "Back" button

**TV-specific controls:** D-pad left/right = seek ±10s when controls are visible, up = reveal controls, down = hide, center/select = play/pause, back = exit player (with confirmation only if less than ~95% watched, else exits directly). Watch-position writes (Section 8) continue on their normal 5–10s cadence regardless of how the session ends — an aborted/backed-out session persists its last-written position exactly like a completed one; there is no separate "abandoned session" case.

**Torrent session lifecycle (backgrounding):** Leaving the Player screen (back button or the app backgrounding) **pauses** the active torrent via `pause(torrentId)` rather than stopping/removing it — no further piece downloads or upload/seed traffic while backgrounded, but the session and its already-downloaded pieces are kept so returning to the same Player resumes instantly via `resume(torrentId)` rather than re-buffering from scratch. Only one torrent session is kept paused-and-resumable at a time: starting a new stream (a different title, or "Switch Source" on the same title) calls `stop(torrentId)`/`remove(torrentId)` on whatever was previously paused before starting the new one. An app kill (not just backgrounding) does not need to preserve the paused session — the next launch starts clean.

---

### 3.3 Settings — new sections activated

Only "Default subtitle language" and "Autoplay next episode" existed as disabled placeholder rows since Phase 1 (`01-Phase1-UI-Navigation.md` §3.11) — those two are now made functional. "Default audio language," "Preferred quality," and the entire **Torrent** section are net-new UI and state (no placeholder row, no backing context, exists for them yet) — build a `useSettings()`-style context/store for this section the same way `ThemeContext`/`LibraryContext` back the other settings, rather than assuming existing inert controls just need wiring:

* **Playback**
  * Default subtitle language (functional picker)
  * Default audio language (functional picker, net-new)
  * Autoplay next episode (functional toggle) — on playback end, attempts to auto-resume the same addon+quality as `lastStream` for the next episode; if that addon returns no result (or errors) for the new episode, falls back to the normal Streams screen for a manual pick rather than silently substituting a different addon
  * Preferred quality (`Auto`, `1080p`, `720p`, `480p`, net-new) — used to auto-rank the Streams list's default sort (Section 3.1's "Best Match" formula)
* **Torrent** (entirely new section, no Phase 1/2 placeholder)
  * Max connected peers (functional stepper, default 50)
  * Download on: `Wi-Fi only` | `Wi-Fi + Mobile Data` (mobile data warns with a confirmation dialog before starting a stream; if the network hands over from Wi-Fi to mobile data mid-download while this is set to `Wi-Fi only`, the active torrent pauses and re-shows the same confirmation dialog rather than silently continuing on mobile data)
  * Max streaming cache size (functional stepper/picker, default 5GB) — when exceeded, oldest completed/paused torrents' downloaded data is evicted first (LRU), independent of the manual clear button below
  * Storage location for streaming buffer cache
  * "Clear streaming cache" button

---

## 4. Stream & subtitle addons

This phase adds two more addon capabilities — `stream` and `subtitles` — to the exact same Addon Manager and `supports()` capability-detection helper built in Phase 2 (`02-Phase2-API-Integration.md` §2.3, §4). There is no separate system, no separate manager screen, and no backend. Both are installed the same way a catalog addon is: paste a manifest URL into `/settings/addons`, and the manager detects what it supports from `manifest.resources` — never from the addon's name.

The app ships with **no** stream or subtitle addon pre-installed (unlike Cinemeta in Phase 2) — the user installs one themselves via the Addon Manager, exactly as in real Stremio.

**Pre-existing cross-phase note:** the Addon Manager's install-dedup check (`AddonsContext.installAddon`) currently compares raw `manifestUrl` strings, not `manifest.id` — so the same addon reachable via two different URL forms (trailing slash, http vs https, or a regenerated Comet/MediaFusion config URL with identical settings) can be installed twice, producing duplicate rows in the Streams screen with no existing guard against it. Not introduced by this phase, but worth fixing (dedupe by `manifest.id` instead) alongside the Phase 3 work since this is the first phase where the duplication becomes user-visible.

### 4.1 Stream capability

#### 4.1.1 Reference addons

Any manifest declaring `"resources": ["stream"]` must work with zero addon-specific code. Use these to validate that:

```text
Torrentio     — https://torrentio.strem.io/manifest.json
Comet         — torrent/debrid stream addon, same protocol
MediaFusion   — torrent/debrid stream addon; also declares `catalog`, a good test that
                one addon can expose more than one capability at once
```

Comet and MediaFusion are typically installed via a **personalized** manifest URL: the user configures a debrid provider (Real-Debrid, etc.) on the addon's own web page, which generates a manifest URL with that config (including debrid API keys) encoded directly in the URL path. The Addon Manager doesn't need any special handling for this — it's still just "paste a manifest URL" — but note that `installAddon` persists `manifestUrl` verbatim in local storage (`src/lib/storage.ts`), so those credentials end up stored as plain URL text on-device. Accepted as-is for this device-only, no-cloud-sync app; no additional secret-handling is required.

#### 4.1.2 Request endpoint (Stremio stream protocol)

```text
GET {addonBaseURL}/stream/{type}/{id}.json
```

* `{type}` — `movie` or `series`.
* `{id}` — for a movie, the IMDb id (`tt0816692`); for a series episode, `{imdbId}:{season}:{episode}` (e.g. `tt0944947:1:1`).

Called directly by the client, plain `GET`, no API key, no auth header — identical calling convention to the catalog/meta requests in Phase 2.

#### 4.1.3 Normalized `Stream` object

The addon's raw JSON response (an array of stream objects under a `streams` key) is normalized into the same internal shape used app-wide:

```text
Stream
├── id
├── title
├── url            // magnet URI (or direct link), exactly as returned by the addon
├── type           // "torrent" | "direct"
├── quality        // "2160p" | "1080p" | "720p" | "480p" | "sd"
├── resolution
├── codec
├── audioTracks[]
├── subtitles[]     // embedded subtitle refs, if the addon provides any — merged with 4.2's dedicated subtitle addons at the Player level
├── size
├── source         // addon name, shown on the Streams screen (e.g. "Torrentio", "Comet")
├── behaviorHints   // { seeders?, peers?, fileIdx? } used for the health indicator and file selection (§5.2)
```

`behaviorHints.seeders`/`peers` are optional and frequently absent — the Streams screen's health indicator (§3.1) must render its "unknown" (gray) state rather than assuming a number, and the "Best Match" sort must not treat a missing count as zero seeders' worth of ranking penalty beyond "unknown sorts last."

The Streams screen queries every enabled addon with the `stream` capability in parallel, then **concatenates and sorts** the results — it does **not** run them through Phase 2's `mergeMediaLists` (`src/lib/addons/merge.ts`), which dedupes by canonical `Media.id` and is correct only for catalog/meta results where the same title from two addons should collapse to one entry. A stream list's entire purpose is showing multiple sources for the same title, so a distinct stream-list combinator (concatenate all addons' results, then apply the Section 3.1 sort — no id-based collapsing) is needed instead; only `settleAcrossAddons`'s per-addon failure isolation is reused as-is. This still has no addon-specific logic, satisfying `PRD.md` §51's dependency-direction rule (React components never talk to a provider's raw format directly).

### 4.2 Subtitle capability

#### 4.2.1 Reference addon

```text
OpenSubtitles v3 — https://opensubtitles.strem.io/manifest.json (or the current OpenSubtitles v3 Stremio addon manifest)
Provides: subtitles (movie, series)
```

#### 4.2.2 Request endpoint (Stremio subtitles protocol)

```text
GET {addonBaseURL}/subtitles/{type}/{id}.json
```

Same `{type}`/`{id}` convention as Section 4.1.2. Called directly by the client, no auth.

**Known limitation (deferred, not a Phase 3 requirement):** real OpenSubtitles-style addons often accept `videoHash`/`videoSize` as `extra` params on this request for frame-accurate sync to the specific rip being played. Phase 3 calls the bare `{type}/{id}.json` endpoint only — subtitles may be mistimed for some releases. This is an accepted, documented limitation, not a bug to fix in this phase; revisit only if it blocks the Definition of Done in practice.

#### 4.2.3 Normalized `SubtitleTrack` object

Reuses the shape already defined in `02-Phase2-API-Integration.md` §5:

```text
SubtitleTrack
├── id
├── lang       // e.g. "en", "hi"
├── url        // .srt/.vtt file location
├── source     // addon name (e.g. "OpenSubtitles")
```

The Player's subtitle picker (§3.2) merges these results with any `subtitles[]` embedded directly in the selected `Stream` object — see §3.2 for the merge/dedupe rule. A subtitle addon failing or timing out simply means fewer merged tracks, never a broken picker (same partial-failure isolation as stream addons, Section 7).

### 4.3 Caching (TanStack Query)

Reuses the exact query-key convention and `QueryClient` setup from `02-Phase2-API-Integration.md` §7.1 — no new caching infrastructure is introduced in this phase, only new keys within the same convention:

```ts
['addon', addonId, 'stream', type, id]      // e.g. ['addon', 'torrentio', 'stream', 'movie', 'tt0816692']
['addon', addonId, 'subtitles', type, id]   // e.g. ['addon', 'opensubtitles', 'subtitles', 'movie', 'tt0816692']
```

| Resource | `staleTime` | Why |
|---|---|---|
| Stream results | 5 min | Matches Phase 2 §7.2 — seeder/peer counts drift, but the source list itself is stable; re-opening the Streams screen for the same title within this window must not re-query every addon |
| Subtitle results | 24h | Matches Phase 2 §7.2 — track lists don't change |

Same aggressive behaviors as Phase 2 §7.3 apply here too: `keepPreviousData` on the Streams list while sorting/re-querying, and cache persisted to disk so re-entering a recently viewed Streams screen renders instantly from cache while silently revalidating. Watch-position writes (Section 8) are a local mutation, not a TanStack query, and are unaffected by any of this.

---

## 5. Native torrent engine (Android)

Per `PRD.md` §23, implemented as a Kotlin native module wrapping `libtorrent4j`:

```text
React Native (JS)
      |
Native Module (TorrentModule)
      |
Kotlin
      |
libtorrent4j
      |
libtorrent (C++)
```

### 5.1 Module API (JS-facing, matches `PRD.md` §24)

```text
addMagnet(uri): Promise<torrentId>
addTorrent(torrentFile): Promise<torrentId>
start(torrentId)
pause(torrentId)
resume(torrentId)
stop(torrentId)
remove(torrentId)

getStatus(torrentId): { progress, downloadSpeed, peers, state }
getFiles(torrentId): FileInfo[]
getPeers(torrentId): PeerInfo[]
getProgress(torrentId): number

setFilePriority(torrentId, fileIndex, priority)
```

### 5.2 Streaming-specific behavior

* On `addMagnet`, once metadata resolves, select the file to prioritize as follows: if the selected `Stream.behaviorHints.fileIdx` is present (common for season-pack magnets, where the addon already knows which file within the torrent is the requested episode), use that file index directly; otherwise fall back to identifying the largest video file in the torrent. Never assume "largest file" alone is correct — a season-pack magnet's largest file is not necessarily the requested episode.
* Piece prioritization must front-load pieces near the current playback position (sequential-ish download with a "read-ahead window"), not a flat sequential download of the whole file — this is what makes it playable before 100% complete.
* Expose piece-level progress to JS so the Player's seek bar can render the real buffered range (Section 3.2).
* Player seeking into an unbuffered region must trigger re-prioritization around the new position and show the buffering overlay.

### 5.3 Native player

* Android: Media3 (`ExoPlayer`) reading from the torrent engine's local streaming buffer (a file/socket interface, not a raw download-then-play model).
* Expose only high-level operations to JS (`PRD.md` §22): `play()`, `pause()`, `seek()`, `stop()`, `setQuality()`, `setAudioTrack()`, `setSubtitle()`. No ExoPlayer internals leak into TypeScript.

---

## 6. Native module boundary

Per `PRD.md` §26 — nothing above the native adapter layer should know libtorrent4j or Media3 exist:

```text
React Native
     |
     | stable API (Section 5.1 + player ops above)
     v
Native Adapter
     |
     +── Media3
     +── libtorrent4j
     +── filesystem
```

---

## 7. Error handling specific to streaming

| Scenario | UI behavior |
|---|---|
| No peers found after timeout | Buffering overlay → "No peers found" message + "Switch Source" |
| Torrent metadata fails to resolve | `ErrorState` on Player, "Switch Source" |
| Selected file unsupported codec | Error overlay, "Try a different source" |
| Network drops mid-playback | Pause + buffering overlay, auto-resume when connectivity returns |
| Stream or subtitle addon times out during lookup | That addon's results simply don't appear; others still render (Section 3.1 / §4.2's partial failure isolation) |
| Mobile data + "Wi-Fi only" setting | Confirmation dialog before starting stream, not a silent block |
| Network hands over Wi-Fi → mobile data mid-download, with "Wi-Fi only" set | Pause the active torrent, re-show the same confirmation dialog — never continue silently on mobile data |
| Player screen exited (back / app backgrounded) with an active torrent | `pause(torrentId)`, not `stop`/`remove` — resumes instantly via `resume(torrentId)` if the user returns before starting a different stream (§3.2) |
| "Find Streams" / "Play" tapped on iOS or Web | Buttons remain disabled, identical to Phase 1/2 — no native torrent/player path exists on these platforms in Phase 3 |

---

## 8. Data model additions

Extends the **actual existing types** in `src/lib/types.ts` (not a new parallel shape) — `LibraryItem` and `WatchHistoryItem` already exist and are already consumed by `LibraryContext`/`HistoryScreen`:

```ts
// LibraryItem — add one field
interface LibraryItem {
  // ...existing fields (mediaId, type, addedAt)
  lastStream?: { source: string; quality: string };   // for quick "resume with same source" / autoplay (§3.3)
}

// WatchHistoryItem already has progressSeconds/durationSeconds, not position/duration —
// no rename needed, Phase 3 just starts writing real values into the existing fields:
interface WatchHistoryItem {
  mediaId: string;
  type: MediaType;
  episodeId?: string;
  title: string;
  posterUrl?: string;
  episodeLabel?: string;
  progressSeconds: number;   // written periodically during playback
  durationSeconds: number;
  updatedAt: string;
}
```

Watch position is written periodically during playback (e.g. every 5–10s) so History (`01-Phase1-UI-Navigation.md` §3.9) and Home's "Continue Watching" row become real instead of mock — this write continues on the same cadence regardless of how the session ends (completed, backed out of, or aborted by an error), per §3.2.

---

## 9. Definition of Done — Phase 3

* [ ] "Find Streams" button navigates to a working Streams screen with real addon-resolved results.
* [ ] Streams screen and subtitle picker work unmodified against **Torrentio, Comet, and MediaFusion** for streams, and **OpenSubtitles v3** for subtitles (§4.1.1/§4.2.1) — installed via the Addon Manager, zero addon-specific code anywhere.
* [ ] Subtitles capability is implemented per Section 4.2, structurally parallel to the `stream` capability (same manifest-driven detection via `supports()`, same request/normalize/merge pattern).
* [ ] Selecting a stream begins buffering and transitions to a fully functional Player screen (no more stub).
* [ ] Native Android torrent module implements the full API in Section 5.1.
* [ ] Playback starts before the full file is downloaded (sequential/read-ahead piece prioritization verified).
* [ ] Seek bar shows real buffered range from torrent progress, not a fake/static bar.
* [ ] Play/pause/seek/stop/quality/audio-track/subtitle-track all function through the native player; the subtitle picker shows the merged list per §3.2.
* [ ] Buffering overlay shows real download speed/peers/percent.
* [ ] One stream or subtitle addon failing does not break its screen or crash the app (isolation verified).
* [ ] Settings → Playback's two Phase 1 placeholders (subtitle language, autoplay) are functional; Playback's two net-new controls (audio language, preferred quality) and the entire net-new Torrent section (including max cache size) are built and functional (§3.3).
* [ ] Watch position is persisted into the existing `WatchHistoryItem.progressSeconds`/`durationSeconds` fields (not a new shape) and populates History/Continue Watching with real data — verified for completed, backed-out-of, and error-aborted sessions alike.
* [ ] Stream/subtitle TanStack caching (Section 4.3) is implemented and verified — query keys match Phase 2 §7.1's convention exactly.
* [ ] All error scenarios in Section 7 have been manually tested (kill network mid-stream, pick a dead/no-peer source, Wi-Fi→mobile handover, backgrounding/resuming the Player, etc.).
* [ ] A season-pack magnet (one torrent, multiple episode files) plays the correct episode when the addon supplies `behaviorHints.fileIdx` (§5.2) — not just the largest file in the torrent.
* [ ] "Find Streams"/"Play" remain disabled on iOS and Web, unchanged from Phase 1/2 (§7).
* [ ] `__tests__/App.test.tsx`'s manual mock of `src/lib/addons/api` is updated with `fetchStream`/`fetchSubtitles` alongside the new real exports, so the existing app-render test doesn't break.
* [ ] No BitTorrent protocol logic exists in JavaScript — confirmed the JS layer only calls the native module interface.
* [ ] Confirmed: no backend service and no authentication were introduced anywhere in this phase — the app still only calls addon URLs directly from the client.

---

## 10. Legal/compliance note

Torrent client technology itself is legal and dual-use (it is a generic P2P file-transfer protocol used for many legitimate purposes: Linux ISOs, game patch distribution, open-source project distribution, etc.), and the Stremio addon protocol referenced throughout this doc (including Torrentio, named here because it was the reference implementation requested) is an open, widely-used, third-party ecosystem — this app does not run, host, or control any addon; it only implements the generic client-side capability to call one the user chooses to install, the same way a browser can be pointed at any URL. What content a given installed addon actually indexes or returns is entirely up to that addon and its operator, not this app, and is outside this document's control or scope. Compliance with local law for whichever addons a user installs is the user's responsibility.
