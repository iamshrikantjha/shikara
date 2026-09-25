# Implementation Guide — Phase 2: Metadata via Stremio-Style Addons

**Version:** 2.0 (revised: no custom backend, no authentication)
**Status:** Planned — starts after Phase 1 UI shell is complete
**Depends on:** `01-Phase1-UI-Navigation.md` (all screens/components must already exist and consume mock data through the same hook signatures this phase will fill with real data)

---

## 1. Goal

Replace the Phase 1 mock data layer with real metadata, sourced **directly by the client from third-party addons** — the exact model Stremio itself uses. There is **no backend service of any kind** in this project, and **no authentication/accounts**. The app is a pure client: it ships with a default catalog/metadata addon pre-installed, and users can install additional addons by URL, all queried straight from the device with plain HTTP requests.

### In scope
* The addon protocol (manifest + catalog/meta endpoints).
* A default, pre-installed metadata addon (Cinemeta-compatible) providing catalog + details.
* A functional **Addon Manager** (install/enable/disable/reorder/remove addons by URL) built to **generically detect all four addon capabilities this app supports — `catalog`, `meta`, `stream`, `subtitles`** — from each addon's manifest, even though only `catalog`/`meta` results are consumed by any screen this phase. Building the detection generically now means Phase 3 adds zero new manager infrastructure, only new *consumers* of `stream`/`subtitles` data.
* Wiring TanStack Query directly to addon HTTP endpoints for every screen from Phase 1, with an aggressive caching strategy (Section 7) that spans all four capabilities from the start.
* Real loading/error/empty/retry behavior (no more dev-toggle simulation).
* Local persistence for installed addons, Library, and History (device-only, no account, no sync).

### Out of scope (deferred to Phase 3)
* *Consuming* stream results (Streams screen, playback) and subtitle results (subtitle picker) — the capability is detected and the query plumbing exists, but nothing in this phase's UI calls or renders `stream`/`subtitles` data yet.
* Torrent resolution and playback in general.
* The "Find Streams" and "Play" buttons remain disabled — still "Available in a future phase."

### Explicitly not part of this project, at any phase
* Any backend/API service owned by this project. All data (catalog, metadata, and later streams) comes from third-party addons the user installs, called directly from the client.
* Any authentication, accounts, sign-in, or API keys owned by this project.

### Styling constraint (all phases)
No visual design/theming/branding work happens in this phase. Screens (Addon Manager included) need correct **sizing and layout structure only** — spacing, alignment, responsive columns/rows as already specified in `01-Phase1-UI-Navigation.md`. The only "theming" in scope anywhere is the light/dark/system toggle already defined in Phase 1 — nothing beyond that.

### No compromises
Every behavior defined in this document is a mandatory requirement, not a suggestion — including the parts that look like plumbing (capability detection, caching) rather than visible UI. "Works with Cinemeta" is not sufficient; it must work generically with **any** manifest-compliant addon.

---

## 2. How Stremio addons work (the model this app follows)

An addon is just a plain HTTP server that exposes a JSON manifest and a small set of predictable JSON endpoints. Anyone can run one; the app doesn't ship or run any of them — it only knows how to *call* them. This is why Stremio itself needs no backend: **the addons are the backend**, and they're supplied by whoever the user chooses to install.

### 2.1 Manifest

Every addon is identified by a manifest URL, e.g. `https://v3-cinemeta.strem.io/manifest.json`:

```json
{
  "id": "com.linvo.cinemeta",
  "version": "1.4.0",
  "name": "Cinemeta",
  "description": "Movie/series catalog and metadata",
  "logo": "https://...",
  "resources": ["catalog", "meta"],
  "types": ["movie", "series"],
  "catalogs": [
    { "type": "movie", "id": "top", "name": "Popular", "extra": [{ "name": "search" }, { "name": "skip" }] },
    { "type": "series", "id": "top", "name": "Popular", "extra": [{ "name": "search" }, { "name": "skip" }] }
  ],
  "idPrefixes": ["tt"]
}
```

`resources` tells the app what this addon can answer (`catalog`, `meta`, and — for Phase 3 — `stream`, `subtitles`). The Addon Manager reads this to know how to route requests to each installed addon.

### 2.2 Request endpoints (fixed convention, same for every addon)

```text
GET {addonBaseURL}/manifest.json
GET {addonBaseURL}/catalog/{type}/{catalogId}.json
GET {addonBaseURL}/catalog/{type}/{catalogId}/search={query}.json
GET {addonBaseURL}/catalog/{type}/{catalogId}/skip={n}.json
GET {addonBaseURL}/meta/{type}/{id}.json
```

Where `{type}` is `movie` or `series`, and `{id}` is the canonical id the addon understands (Cinemeta and the wider ecosystem key everything off the **IMDb id**, e.g. `tt0816692` — this is why `PRD.md` §5.6 already mandates IMDb id as the canonical media identity).

All of these are plain `GET` requests returning JSON — no API key, no auth header, no session. The client calls them exactly as a browser would call any public JSON endpoint.

### 2.3 Capability model — route by manifest, never by addon identity

This is the core architectural rule for the entire addon system, in every phase: **the app never special-cases an addon by name.** It only ever asks a manifest "which resources do you support?" and routes generically. There is no `if (addon.id === "torrentio") { ... }` anywhere in the codebase — any addon that declares a capability in its manifest is treated identically to any other addon declaring that same capability.

```text
                    Addon manifest
                          │
        ┌──────────┬──────┴───────┬────────────┐
        │          │              │            │
     catalog      meta          stream      subtitles
        │          │              │            │
   Cyberflix   Cinemeta       Torrentio    OpenSubtitles
   Cinemeta    TMDB Addon     Comet
   TMDB Addon                 MediaFusion
```

These four — `catalog`, `meta`, `stream`, `subtitles` — are the **only** capabilities this app implements, this phase and next. The wider addon ecosystem also has `availability`-style addons (e.g. WatchHub, "where can I legally watch this") and `local-files`-style addons (bridging a device's local media library into the catalog) — **both are explicitly non-goals for this project at any phase**, mentioned only so nobody mistakes their absence for an oversight.

A minimal capability helper, implemented once and reused everywhere:

```ts
function supports(addon: InstalledAddon, resource: "catalog" | "meta" | "stream" | "subtitles"): boolean {
  return addon.enabled && addon.manifest.resources.includes(resource);
}

const catalogAddons = installedAddons.filter(a => supports(a, "catalog"));
const metaAddons = installedAddons.filter(a => supports(a, "meta"));
const streamAddons = installedAddons.filter(a => supports(a, "stream"));      // detected now, consumed in Phase 3
const subtitleAddons = installedAddons.filter(a => supports(a, "subtitles")); // detected now, consumed in Phase 3
```

Every query hook in Section 6 is built on top of `supports()` — never on an addon's name, id, or any other identifying property.

---

## 3. Default addon

Ship the app pre-configured with one catalog/metadata addon installed out of the box, so it's usable with zero setup:

```text
Name: Cinemeta
Manifest URL: https://v3-cinemeta.strem.io/manifest.json
Provides: catalog (movie, series), meta (movie, series)
```

This is the same official addon Stremio itself ships by default. It is not something this project builds or runs — it's a third-party HTTP service the client simply calls.

### 3.1 Reference addons for testing/validation

Use these when verifying the Addon Manager's capability detection (Section 2.3) works generically — installing any of them must "just work" via `supports()`, with no code changes:

| Addon | Capability | Consumed by | Notes |
|---|---|---|---|
| Cinemeta | `catalog`, `meta` | Phase 2 (this phase) | Default, pre-installed |
| Cyberflix Catalog | `catalog` | Phase 2 | Catalog-only — good test that `meta` isn't assumed to always be present |
| TMDB Addon | `catalog`, `meta` | Phase 2 | A second catalog/meta source — use to verify multi-addon merge (Section 9) |
| Torrentio | `stream` | Phase 3 | Reference stream addon (see `03-Phase3-Torrent-Streaming.md`) |
| Comet | `stream` | Phase 3 | Second stream addon — must work identically to Torrentio, no special-casing |
| MediaFusion | `stream`, `catalog` | Phase 3 (stream) / Phase 2 (catalog, if installed) | Multi-capability addon — good test that one addon can expose more than one resource |
| OpenSubtitles v3 | `subtitles` | Phase 3 | Reference subtitles addon |

**Not implemented, any phase:** WatchHub-style `availability` addons, `local-files` addons. If a user installs one, it's simply ignored (no crash — `supports()` returns `false` for every capability this app checks) rather than treated as an error.

---

## 4. Addon Manager (now functional)

Phase 1 built this as a mock screen (`01-Phase1-UI-Navigation.md`, Settings → Addons). It now does real work:

**Screen: `/settings/addons`**

* List of installed addons, each row showing: logo, name, version, capability badges rendered generically from `manifest.resources` (any of `catalog`, `meta`, `stream`, `subtitles` the manifest declares — see Section 2.3's `supports()` helper, never a hardcoded per-addon list), enabled/disabled toggle, drag-to-reorder handle, remove (✕) button.
* "Add Addon" — text input for a manifest URL, "Install" button:
  1. `GET` the URL.
  2. Validate it's a well-formed manifest (has `id`, `name`, `resources`).
  3. On success → add to the installed list, persisted locally, toast "Addon installed."
  4. On failure (bad URL, malformed manifest, unreachable) → inline error, nothing is installed.
* Reordering matters: when multiple addons provide the same resource (e.g. two catalog addons), results are queried from all enabled ones and merged; order affects default sort/precedence and which addon "wins" for conflicting metadata.
* Disabling an addon stops it from being queried without uninstalling it.
* No addon requires login/account — install is just "provide a URL, fetch its manifest."

---

## 5. Normalized domain model

Addon `meta` responses (Stremio's own meta object shape) are mapped into the same internal model the Phase 1 mock fixtures already use, so no screen/component changes:

```text
Media
├── id                 // = addon's imdbId, e.g. "tt0816692" — canonical everywhere
├── type               // "movie" | "series"
├── title              // meta.name
├── year                // parsed from meta.releaseInfo
├── overview           // meta.description
├── posterUrl          // meta.poster
├── backdropUrl        // meta.background
├── genres[]           // meta.genres
├── rating             // meta.imdbRating
├── cast[]             // meta.cast (strings in Cinemeta; normalize to { name })
├── runtimeMinutes     // parsed from meta.runtime (e.g. "148 min")

Series extends Media
├── status              // derived: has meta.videos beyond current date → "ongoing" else "ended"
├── seasons[]           // grouped from meta.videos by season
Episode (from meta.videos[])
├── id                  // `${seriesId}:${season}:${episode}`
├── seasonNumber        // videos[].season
├── episodeNumber       // videos[].episode
├── title               // videos[].name
├── overview            // videos[].overview
├── airDate             // videos[].released
├── thumbnailUrl        // videos[].thumbnail

SubtitleTrack               // first-class shape for the `subtitles` capability (consumed in Phase 3)
├── id
├── lang                // e.g. "en", "hi"
├── url                 // .srt/.vtt file location, as returned by the subtitles addon
├── source              // addon name this track came from
```

A normalization module (e.g. `src/addons/normalize.ts`) converts any addon's raw meta/catalog JSON into this shape — screens never see an addon's raw response format, satisfying the same "no provider format leaks into the UI" rule from `PRD.md` §51, just applied to addons instead of TMDB.

---

## 6. Wiring per screen (what actually changes from Phase 1)

| Screen | Mock hook (Phase 1) | Real hook (Phase 2) | Source |
|---|---|---|---|
| Home | `useMockHomeRows()` | `useCatalog("movie","top")`, `useCatalog("series","top")` | All enabled addons with `catalog` resource, merged |
| Discover | `useMockDiscover(filters)` | `useCatalog(type, catalogId, { skip })` | Genre filter maps to whatever `extra` params an addon's manifest declares supporting; addons that don't support a filter are simply not asked for it |
| Search | `useMockSearch(query)` | `useCatalog(type, catalogId, { search: query })` | Per addon's declared `search` extra support |
| Movie/Series Details | `useMockMovie/Series(id)` | `useMeta(type, id)` | First addon (in priority order) that returns a result for this id |
| Season/Episode | derived from mock fixture | derived from `meta.videos` on the same `useMeta` response | Cinemeta returns the full episode list inside the series' meta object — no separate season/episode endpoint needed |
| Library / History | in-memory store | same store, now backed by local device persistence (MMKV or SQLite) | No server, no sync — this device only |

No new screens beyond the Addon Manager (Section 4) are added in Phase 2.

---

## 7. Caching strategy (TanStack Query — used aggressively, client-only)

Because a single screen can fan out to *multiple* addons for the same resource (Section 9), redundant network round-trips are the dominant performance risk in this architecture — not CPU, not rendering. TanStack Query's cache must do the deduping and reuse; components must never hold their own copy of server data in local state.

### 7.1 Query key convention (applies to all four capabilities, all phases)

Every addon request is keyed identically so cache entries are addressable per-addon/per-resource/per-params, and so this exact convention is reused unchanged when Phase 3 adds `stream`/`subtitles` consumers — no new caching design needed later:

```ts
['addon', addonId, resource, type, params]

// examples:
['addon', 'com.linvo.cinemeta', 'catalog', 'movie', { catalogId: 'top', skip: 0 }]
['addon', 'com.linvo.cinemeta', 'meta', 'movie', 'tt0816692']
['addon', 'torrentio', 'stream', 'series', 'tt0944947:1:1']   // defined now, consumed in Phase 3
['addon', 'opensubtitles', 'subtitles', 'movie', 'tt0816692'] // defined now, consumed in Phase 3
```

A screen-level hook (e.g. `useCatalog`) fans out one query per enabled addon using this key, then merges the results (Section 9) — it does not issue one combined request.

### 7.2 `staleTime` per resource

| Resource | `staleTime` | Notes |
|---|---|---|
| Search results | 60s | Short — results can shift with new queries |
| Movie/Series meta | 24h | Metadata rarely changes |
| Catalog/discover pages | 6h | |
| Addon manifests | 7d (or until manually refreshed from Addon Manager) | |
| Stream results (defined now, consumed Phase 3) | 5 min | Seeder/peer health drifts; source list itself is stable but health indicators shouldn't go stale for long |
| Subtitle results (defined now, consumed Phase 3) | 24h | Track lists don't change |

### 7.3 Aggressive caching behaviors to implement (not optional)

* **`keepPreviousData: true`** on every paginated/search query (Discover pagination, Search-as-you-type) — the grid must never flash empty/skeleton between pages or keystrokes, it shows the previous results until the next page resolves.
* **Prefetching**: `queryClient.prefetchQuery` for (a) the next Discover page before the user reaches the end of the current one, and (b) a title's `meta` query as soon as its `MediaCard` receives focus/hover, so opening Details is instant more often than not.
* **Persisted cache**: the `QueryClient` cache itself is persisted to disk (MMKV) so a cold app start can render from yesterday's cache immediately, then silently revalidate — this is what makes Phase 1's "never block the shell on network" rule (`PRD.md` §16) actually true once real network calls exist.
* **Long `gcTime`**: cached entries are kept long enough (well beyond `staleTime`) that back-navigation within a session is always an instant cache hit, even if the data is simultaneously revalidating in the background.
* Failed requests must not poison the cache; retry with backoff **per addon, independently**, so one slow/dead addon doesn't stall others — merged catalog/search/stream/subtitle results render incrementally as each addon responds, never waiting for the slowest.

---

## 8. Error / loading / retry — now real

```text
Loading      → request(s) to addon(s) in flight
Success      → data rendered
Empty        → all enabled addons returned zero results
Error        → an addon is unreachable/malformed → excluded from results this session,
                with a non-blocking indicator (see Section 9); total failure across all
                enabled addons → ErrorState + Retry
```

Raw addon error responses are never shown directly — normalize to a simple internal error shape before reaching the UI.

---

## 9. Multi-addon merge behavior

Because more than one addon can be enabled at once (e.g. Cinemeta plus a future community catalog addon):

* Catalog/search results from all enabled addons providing that resource are merged and de-duplicated by canonical id.
* If addons disagree on a field (e.g. two different overviews), the higher-priority addon (per Addon Manager ordering, Section 4) wins.
* One addon timing out or erroring must not block or fail the results from the others — surfaced only as a small "Some sources unavailable" banner, same pattern used later for stream addons in Phase 3.

---

## 10. Definition of Done — Phase 2

* [ ] Every Phase 1 screen renders real data from installed addons with no changes to the screen/component layer (only hook implementations changed).
* [ ] Cinemeta is pre-installed by default; the app is usable out of the box with no setup.
* [ ] Addon Manager (`/settings/addons`) is fully functional: install by manifest URL, validate, enable/disable, reorder, remove — all persisted locally.
* [ ] No backend service exists anywhere in the codebase for metadata — confirm the client calls addon URLs directly.
* [ ] No authentication, accounts, or API keys exist anywhere in the app.
* [ ] Search, Discover, Movie/Series/Episode details all pull live data through installed addons.
* [ ] Loading/empty/error states trigger from real conditions; the Phase 1 "Simulate error state" developer toggle is removed.
* [ ] Multi-addon merge/priority/partial-failure behavior (Section 9) is implemented and verified with at least two catalog addons installed simultaneously (e.g. Cinemeta + TMDB Addon per Section 3.1).
* [ ] Library/History persist across app restarts via local device storage only.
* [ ] Capability detection (`supports()`, Section 2.3) is generic — grep confirms no addon-name/id branching exists anywhere in the codebase.
* [ ] Capability badges render correctly for `stream`- and `subtitles`-capable addons (e.g. Torrentio, Comet, MediaFusion, OpenSubtitles per Section 3.1) when installed, even though their data isn't consumed by any screen until Phase 3.
* [ ] Query key convention (Section 7.1) and aggressive caching behaviors (Section 7.3 — `keepPreviousData`, prefetching, persisted cache, long `gcTime`) are all implemented, not just the `staleTime` table.
* [ ] Caching rules in Section 7 are verified (cached navigation renders within ~100ms per `PRD_Phase 1.md` §13; cold start renders from persisted cache before network response arrives).

---

## 11. Explicitly NOT part of Phase 2

* Stream addons (Torrentio-style), magnet/torrent resolution — see `03-Phase3-Torrent-Streaming.md`.
* Native playback — "Play"/"Find Streams" buttons remain disabled.
* Any backend, account system, or cloud sync — not part of this project at any phase.
