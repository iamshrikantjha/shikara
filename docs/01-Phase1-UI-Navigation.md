# Implementation Guide — Phase 1: UI Layer & Navigation (Barebones)

**Version:** 1.1 (revised: added Addon Manager screen, reaffirmed no backend/no auth at any phase)
**Status:** Ready for implementation
**Depends on:** `PRD.md` (product architecture), `PRD_Phase 1.md` (acceptance criteria — note: that doc's "Phase 1" bundles UI + real metadata; **this doc narrows Phase 1 to UI + navigation only, with mock data**, and pushes real provider calls to `02-Phase2-API-Integration.md`)
**Reference UX model:** Stremio (board/discover/search/details/library/player shell layout)

---

## 1. Goal

Build the complete navigable UI shell of the app with **zero real network calls**. Every screen exists, every button exists, every transition works — all data is local mock/fixture data. This proves out layout, navigation, responsive design, and TV focus behavior before any backend or provider integration exists.

### In scope
* All screens listed in Section 3.
* Full navigation graph (stack + tabs + deep links).
* Mock data layer (static fixtures, simulated network delay).
* Responsive layout for phone / tablet / web / Android TV.
* Loading / empty / error state UI (triggered manually via mock flags, not real failures).
* Component library (Section 6).

### Out of scope (explicitly deferred)
* Real addon calls (catalog/metadata) → Phase 2.
* Real playback → Phase 3.
* Real torrent/stream resolution → Phase 3.
* Persistent storage (library/history persist only in-memory for Phase 1).

### Project-wide constraint (all phases, not just Phase 1)
This app has **no backend of its own and no authentication/accounts, ever**. It is a pure client. All content comes from third-party Stremio-style addons the user installs by URL (catalog/metadata addons in Phase 2, stream/subtitle addons like Torrentio/Comet/MediaFusion/OpenSubtitles in Phase 3) — see the Addon Manager (§3.12) and `02-Phase2-API-Integration.md`. There is no "Sign in" screen anywhere in this spec.

### Styling constraint (all phases)
No visual design, theming, or branding work is in scope in this phase or later ones — only correct **sizing and layout structure** (spacing, alignment, responsive columns/rows per Section 8). The single exception is the light/dark/system theme toggle in Settings (§3.11), which is functional even in Phase 1; nothing beyond that needs "design."

### No compromises
Every screen and every option listed in Section 3 is a mandatory requirement, not an aspirational nice-to-have — "the screen exists but is missing an option described here" does not satisfy this doc.

---

## 2. Navigation Architecture

### 2.1 Structure

```text
RootStack
│
├── MainTabs (Bottom Tabs — phone/tablet; Side Rail — web/TV)
│   ├── HomeTab        → HomeScreen ("/")
│   ├── DiscoverTab     → DiscoverScreen ("/discover")
│   ├── SearchTab       → SearchScreen ("/search")
│   ├── LibraryTab      → LibraryScreen ("/library")
│   └── SettingsTab     → SettingsScreen ("/settings")
│
├── MovieDetailsScreen      ("/movie/:id")
├── SeriesDetailsScreen     ("/series/:id")
├── SeasonScreen            ("/series/:id/season/:season")
├── EpisodeDetailsScreen    ("/series/:id/season/:season/episode/:episode")   [presented as modal/bottom-sheet]
├── PlayerScreen            ("/player/:mediaId")   [stub in Phase 1]
├── HistoryScreen           ("/history")
├── SettingsAddonsScreen    ("/settings/addons")
├── SettingsAboutScreen     ("/settings/about")
└── NotFoundScreen          ("*")
```

### 2.2 Route table

| Route | Screen | Params | Notes |
|---|---|---|---|
| `/` | HomeScreen | — | Default tab |
| `/discover` | DiscoverScreen | `?type=movie\|series` | |
| `/search` | SearchScreen | `?q=` | |
| `/library` | LibraryScreen | `?tab=movies\|series\|watchlist` | |
| `/history` | HistoryScreen | — | Reachable from Home + Library |
| `/movie/:id` | MovieDetailsScreen | `id` | |
| `/series/:id` | SeriesDetailsScreen | `id`, `?season=` | |
| `/series/:id/season/:season` | SeasonScreen | `id`, `season` | |
| `/series/:id/season/:season/episode/:episode` | EpisodeDetailsScreen | `id`, `season`, `episode` | Modal |
| `/player/:mediaId` | PlayerScreen | `mediaId`, `?type=movie\|episode` | Stub screen only |
| `/settings` | SettingsScreen | — | |
| `/settings/addons` | SettingsAddonsScreen | — | Addon Manager — see §3.12 |
| `/settings/about` | SettingsAboutScreen | — | |

Deep link scheme: `shikara://` mirrors the same paths. Web uses plain paths (no hash routing).

### 2.3 Platform navigation chrome

| Platform | Primary nav | Notes |
|---|---|---|
| Phone | Bottom tab bar, 5 items with icon + label | Native stack push for details |
| Tablet | Bottom tab bar (wider) or left rail depending on width breakpoint | Master-detail optional (not required Phase 1) |
| Web | Left sidebar rail, always visible | Browser back/forward must map to stack pop/push |
| Android TV | Left rail, collapsed to icons, expands on focus | D-pad navigable, see Section 7 |

---

## 3. Screens — full spec

For every screen below: **Purpose**, **Layout**, **Data shown (mock shape)**, **User actions/options**, **States**.

### 3.1 Home (`/`)

**Purpose:** Landing board, mirrors Stremio's "Board" — quick re-entry + discovery teaser.

**Layout (top → bottom):**
* Header: app logo/name, search icon shortcut (top-right)
* Featured banner carousel (auto-rotating, 3–5 mock items): backdrop image, title, short overview, "More Info" button → navigates to details
* Row: **Continue Watching** (mock watch-progress items with a progress bar overlay) — hidden if empty
* Row: **Popular Movies** (horizontal scroll of `MediaCard`)
* Row: **Popular Series** (horizontal scroll of `MediaCard`)
* Row: **Trending** (horizontal scroll)

**Options per row item (`MediaCard`):** tap → details screen; long-press (or focus+menu on TV) → context menu with "Add to Library" / "Remove from Library".

**States:**
* Loading: skeleton banner + skeleton rows (shimmer placeholders), shown for a fixed mock delay (~600ms) on screen mount.
* Empty: if "Continue Watching" mock list is empty, row is omitted entirely (not shown as empty state).
* Error: manual mock toggle (dev-only switch in Settings → "Simulate error state") shows `ErrorState` with Retry button replacing the row.

---

### 3.2 Discover (`/discover`)

**Purpose:** Browse full catalog by type, genre, sort — mirrors Stremio's "Discover" board.

**Layout:**
* Header: title "Discover"
* **Type toggle**: segmented control — `Movies` | `Series`
* **Genre filter bar**: horizontal scrollable chips (Action, Comedy, Drama, Sci-Fi, Horror, Animation, Documentary, Thriller, Romance, Family) — multi-select, "All" clears selection
* **Sort dropdown**: options — `Popularity`, `Newest`, `Top Rated`, `A–Z`
* **Grid**: responsive `MediaGrid` of `MediaCard` (poster + title + year + rating badge)
* Pagination: "Load More" button at grid bottom (mock — appends next fixture page)

**Options:** tap card → details; changing type/genre/sort re-filters the local mock dataset client-side (no debouncing needed, it's local).

**States:**
* Loading: grid skeleton (12 placeholder cards) on filter change (simulated 300ms delay).
* Empty: `EmptyState` — "No titles match these filters" + "Clear Filters" button.
* Error: `ErrorState` with Retry (dev-toggle only).

---

### 3.3 Search (`/search`)

**Purpose:** Find titles by text.

**Layout:**
* `SearchInput` at top, auto-focus on screen entry
* Below input, two mutually exclusive sections depending on state:
  * **No query entered:** "Recent Searches" list (mock, max 10, each with an ✕ to remove one and a "Clear All" link)
  * **Query entered:** results grid, same `MediaCard` grid as Discover, mixed movies + series with a type badge on each card

**Options:** tap a recent search term → re-runs it as the query; tap a result → details screen; clear (✕) button inside the input clears text and returns to recent-searches view.

**States:**
* Loading: results area shows skeleton grid while the mock "search" debounce (300ms) resolves.
* Empty: query entered but zero matches → `EmptyState` "No results for “{query}”".
* Error: `ErrorState` with Retry (dev-toggle only).

---

### 3.4 Movie Details (`/movie/:id`)

**Purpose:** Full metadata page for a movie.

**Layout (scrollable):**
* Backdrop image (top, parallax optional) with gradient overlay
* Poster (overlapping backdrop on larger screens, stacked on phone)
* Title, year, runtime, star rating (e.g. `★ 8.7`)
* Genre chip row
* Action row: **Add to Library** (toggle: outline heart ↔ filled heart), **Find Streams** button (Phase 1: disabled, tooltip "Available in a future phase"; Phase 3 will wire this to the Streams screen)
* Overview paragraph
* Cast row (horizontal scroll of person avatar + name, mock data)
* Crew / production info block (Director, Studio — mock)
* "More Like This" row (mock related titles → tap navigates to their details)

**States:**
* Loading: skeleton for backdrop/poster/text on mount.
* Error (invalid id / dev-toggle): `ErrorState` full-page with Retry + Back button.
* Missing optional fields (backdrop, cast) simply omit that block — never show a broken/empty box.

---

### 3.5 Series Details (`/series/:id`)

**Purpose:** Full metadata page for a series, entry point into seasons/episodes.

**Layout:** Same header block as Movie Details (backdrop, poster, title, rating, genres, overview, cast, Add to Library) plus:
* Series-only fields: status (`Ongoing` / `Ended`), season count, episode count
* **Season selector**: horizontal tab strip — `Season 1`, `Season 2`, … — selecting one does not navigate away, it loads that season's episode list inline below (also independently reachable at `/series/:id/season/:season`)
* Episode list for the selected season (see 3.6's row format), scrollable within the page

**Options:** tapping an episode row opens `EpisodeDetailsScreen` as a modal/bottom sheet; "Add to Library" here saves the whole series.

---

### 3.6 Season (`/series/:id/season/:season`)

**Purpose:** Deep-linkable standalone view of one season's episode list (same content embedded in Series Details, but directly addressable).

**Layout:**
* Header: series title + "Season N"
* Season switcher (same tab strip as 3.5, changes the `:season` param)
* `EpisodeRow` list, virtualized:
  * Thumbnail
  * `S01E01` badge
  * Title
  * Air date
  * Runtime
  * Overview (truncated 2 lines)
  * Rating badge
  * "Play" icon button (Phase 1: disabled/stub)

**States:**
* Loading: skeleton rows (5).
* Empty: season has no mock episodes → `EmptyState` "No episodes available".
* Error: `ErrorState` with Retry.

---

### 3.7 Episode Details (`/series/:id/season/:season/episode/:episode`)

**Purpose:** Expanded single-episode info, presented as a modal/bottom sheet over Season/Series screen.

**Layout:**
* Large thumbnail
* `S01E01 — Title`
* Air date, runtime, rating
* Full overview (untruncated)
* Action row: **Play** button (Phase 1: disabled, label "Coming in Phase 3"), **Mark as Watched** toggle (mock, local state only)
* Close (✕) button / swipe-down-to-dismiss

---

### 3.8 Library (`/library`)

**Purpose:** User's saved items — mirrors Stremio's Library.

**Layout:**
* Segmented control: `Movies` | `Series` | `Watchlist`
* Grid of `MediaCard` for items added via "Add to Library" across the app (in-memory store, Phase 1)
* Each card supports a remove action (✕ overlay on long-press/focus)
* Link/button to `/history`

**States:**
* Empty (any tab with nothing added yet): `EmptyState` — "Nothing here yet" + "Browse Discover" button linking to `/discover`.

---

### 3.9 History (`/history`)

**Purpose:** Continue-watching list, mirrors Stremio's watch history.

**Layout:**
* List of mock in-progress items: poster thumb, title, episode label if applicable, progress bar, "Resume" button (stub) and a "Remove from History" action.

**States:**
* Empty: `EmptyState` — "You haven't watched anything yet".

---

### 3.10 Player (`/player/:mediaId`) — **stub only**

**Purpose:** Reserve the route and render the eventual player's static shell so navigation/back-behavior can be validated now.

**Layout:**
* Full-screen dark background
* Centered message: "Playback will be available in a future phase"
* Non-functional control bar mock: play/pause icon, scrub bar (static, no drag), time labels `00:00 / 00:00`, fullscreen icon, back button (top-left, functional — returns to previous screen)

No video decoding, no player library wired in Phase 1.

---

### 3.11 Settings (`/settings`)

**Purpose:** App preferences and diagnostics.

**Layout — sectioned list:**
* **General**
  * Theme: `System` | `Light` | `Dark` (segmented control, actually functional — swaps app theme)
* **Playback** (placeholders, disabled controls, labeled "Available in a future phase")
  * Default subtitle language (disabled picker)
  * Autoplay next episode (disabled toggle)
* **Addons** → navigates to `/settings/addons` (see 3.12) — this row is fully navigable in Phase 1, it just manages mock data until Phase 2
* **Developer** (Phase 1 only, remove before Phase 2 ships)
  * "Simulate error state" toggle — forces `ErrorState` on Home/Discover/Search for QA
  * "Reset mock library/history" button
* **About** → navigates to `/settings/about`
  * App version, licenses link, "About" static content page

There is no "Account" or "Sign in" section anywhere in Settings — this app has no authentication at any phase; all data (addons, library, history) lives only on the device.

---

### 3.12 Addon Manager (`/settings/addons`)

**Purpose:** Install, enable/disable, reorder, and remove addons — the mechanism through which this app gets *all* of its content (catalog/metadata in Phase 2, streams in Phase 3). Built now, in Phase 1, against mock data so the interaction pattern is proven before it does real work.

**Layout:**
* List of "installed" addons (Phase 1: 1–2 mock entries pre-seeded, e.g. a mock "Cinemeta" and a mock "Torrentio" row), each showing:
  * Logo, name, version
  * Capability badges (`catalog`, `meta`, `stream`, `subtitles`) — mock-populated in Phase 1; from Phase 2 onward these are rendered generically from each addon's manifest, never hardcoded per addon (see `02-Phase2-API-Integration.md` §2.3)
  * Enabled/disabled toggle
  * Drag handle to reorder (reordering affects priority when multiple addons provide the same data — see Phase 2/3 docs)
  * Remove (✕) button
* **"Add Addon"** row: text input for a manifest URL + "Install" button.
  * Phase 1 behavior: pressing "Install" only validates that the field isn't empty and appends a mock entry — no real HTTP request is made yet.
  * Real manifest fetch/validation is wired in Phase 2 (see `02-Phase2-API-Integration.md` §4).

**States:**
* Empty: `EmptyState` — "No addons installed" + focus on the Add Addon input.
* Install failure (Phase 1: mock-triggered via empty input): inline validation error under the input.

**Note:** there is no addon marketplace/store screen in this app — installing means pasting a manifest URL, exactly like Stremio.

---

### 3.13 Not Found (`*`)

**Purpose:** Catch invalid/unmatched routes (mistyped deep link, bad web URL).

**Layout:** Centered `ErrorState`-style illustration, "Page not found", "Go Home" button.

---

## 4. Global UI elements

* **Tab bar / rail**: 5 destinations (Home, Discover, Search, Library, Settings) with icon + label; active state highlighted; on TV, rail expands on focus and collapses when unfocused.
* **Header bar**: present on all non-tab-root screens with a back button (native gesture also supported on iOS/Android).
* **Toast/snackbar**: used for lightweight confirmations ("Added to Library", "Removed from History").
* **Bottom sheet / modal**: used for Episode Details.

---

## 5. Mock data layer

* Location: `packages/mock-data` (or `src/mocks` if no monorepo split yet).
* Provides async functions with the **same signatures the real API client will have in Phase 2** (e.g. `getMovie(id): Promise<Movie>`, `searchMedia(query): Promise<SearchResult[]>`), each resolving from static JSON fixtures after an artificial delay (`setTimeout` 200–600ms) to make loading states visible and real.
* Fixture dataset should include at minimum: 20 movies, 10 series (at least 2 multi-season), enough episodes to test virtualization (one season with 20+ episodes).
* Wired into TanStack Query the same way Phase 2 will wire the real client — **only the data-fetching function implementation changes between Phase 1 and Phase 2**, hooks/components do not change.

---

## 6. Component checklist

Build once, reuse everywhere (matches `PRD.md` §13):

```text
Button, Text, Icon, Image, Card, MediaCard, MediaRow, MediaGrid,
Badge, Rating, Chip, Tabs, Modal, BottomSheet, SearchInput,
EpisodeRow, SeasonSelector, LoadingSkeleton, ErrorState, EmptyState
```

TV-specific: `Focusable`, `FocusableCard`, `FocusableRow`, `FocusBoundary`, `TVDialog`.

---

## 7. TV / D-pad behavior

* Every interactive element (cards, chips, tabs, buttons) must be a `Focusable*` wrapper with a visible focus ring.
* Arrow keys move focus predictably: within a row (`←`/`→`), across rows (`↑`/`↓`).
* `Select` activates the focused element; `Back` pops the navigation stack.
* Focus must be restored to a sensible element when returning from a pushed screen (e.g. back from Movie Details restores focus to the card that opened it).

---

## 8. Responsive breakpoints

| Breakpoint | Columns (grid/rows) |
|---|---|
| Phone (<600dp) | 2 |
| Tablet (600–1024dp) | 3–4 |
| Desktop/Web (>1024px) | 5–6 |
| TV (10-foot UI) | Large cards, 5–6 per row, horizontal rows preferred over grids |

---

## 9. Definition of Done — Phase 1

* [ ] Every screen in Section 3 is implemented and reachable via its route.
* [ ] Every listed option/button/toggle exists in the UI (may be visually disabled where noted).
* [ ] Full navigation graph works: forward, back, deep link, browser refresh (web).
* [ ] All screens use mock data only — zero real network requests present in the codebase.
* [ ] Loading, empty, and error states are implemented and can be triggered (via Settings → Developer toggle or natural mock scenarios).
* [ ] Layout is verified responsive at phone, tablet, web, and TV breakpoints.
* [ ] TV focus navigation works across all screens with no lost/trapped focus.
* [ ] Theme switching (light/dark/system) works app-wide.
* [ ] Addon Manager screen (§3.12) exists with mock install/enable/disable/reorder/remove interactions.
* [ ] No TypeScript errors, lint passes.

---

## 10. Explicitly NOT part of Phase 1

* Any real addon/network request — see `02-Phase2-API-Integration.md`.
* Any torrent/stream/player functionality — see `03-Phase3-Torrent-Streaming.md`.
* Persisted storage (SQLite/MMKV) — Phase 1 state resets on app restart.
* Authentication/accounts — not part of this project at any phase (see §1 project-wide constraint).

---

## 11. Project Structure & Cross-Platform Workflow

This project is React Native CLI + TypeScript, not a web app — so the reference below (`shadcn-admin`, a Vite + React + TanStack Router admin template) is used **loosely, as an organizing philosophy, not a literal template**: feature-based folders, a small shared component library, a thin config/lib layer, and hand-owned routing. The parts of that template that are web/Tailwind/shadcn-specific (`components.json`, `styles/` as Tailwind CSS, file-based routing with a generated route tree) don't transplant directly onto React Native — the mapping below says explicitly what carries over and what's a stand-in for something React Native does differently.

### 11.1 Folder layout

```text
src/
├── app/                 // Root composition: App.tsx, provider tree (QueryClientProvider,
│                         // ThemeProvider, AddonManagerProvider — Phase 2+), NavigationContainer
├── assets/               // Images, fonts, app icons
├── components/            // Shared, feature-agnostic UI primitives — the checklist in §6
│   └── MediaCard/
│       ├── MediaCard.tsx        // default implementation (phone/tablet/web)
│       ├── MediaCard.tv.tsx     // TV-specific variant — ONLY when it genuinely needs one (§11.3)
│       └── MediaCard.web.tsx    // web-specific variant — ONLY when it genuinely needs one
├── config/                // Env values, app constants, default addon list (Cinemeta, Phase 2),
│                         // TanStack QueryClient defaults, spacing/breakpoint tokens
├── context/               // React Context providers with no server state — theme, addon list
├── features/               // One folder per screen/feature, mirrors Section 3 1:1
│   ├── home/
│   │   ├── screens/HomeScreen.tsx
│   │   ├── components/    // feature-local components not reused elsewhere (FeaturedBanner)
│   │   └── hooks/          // useHomeRows() — mock in Phase 1, addon-backed from Phase 2 (§6 of that doc)
│   ├── discover/
│   ├── search/
│   ├── movie-details/
│   ├── series-details/
│   ├── season/
│   ├── episode-details/
│   ├── library/
│   ├── history/
│   ├── player/              // stub screen in Phase 1, real in Phase 3
│   ├── streams/              // Phase 3 only
│   ├── settings/
│   └── addons/               // Addon Manager (§3.12)
├── hooks/                  // Cross-feature shared hooks (useDebounce, usePlatformLayout)
├── lib/                     // addon client (manifest fetch, supports(), normalize.ts — Phase 2),
│                         // mock-data fixtures (Phase 1), native module wrappers (Phase 3)
├── navigation/               // Hand-authored route/stack/tab definitions — see §11.2
├── stores/                  // Lightweight global client state that isn't server data
│                         // (installed addons list, theme preference) — persisted via MMKV
├── styles/                  // Spacing scale + light/dark color tokens only — NOT a design
│                         // system (see the styling constraint at the top of this doc)
└── test-utils/               // Shared test helpers/mocks
```

Everything under `components/`, `hooks/`, `lib/`, and each `features/*/hooks` must stay 100% platform-agnostic — no `Platform.OS` checks buried inside business logic. Platform divergence lives only in the file-extension variants (§11.3) or in `navigation/` (§11.2's chrome-swap).

### 11.2 Navigation — the "routes" equivalent

`shadcn-admin` uses TanStack Router's **file-based** routing (`src/routes/`, auto-generating `routeTree.gen.ts`). React Navigation is not file-based — there's no code-gen step — so `navigation/` is a small, hand-maintained set of files that is the single source of truth for Section 2's route table and stack/tab structure:

```text
navigation/
├── RootNavigator.tsx      // the RootStack from §2.1
├── MainTabs.tsx            // swaps bottom-tabs / side-rail chrome per §2.3 (phone|tablet vs web|TV)
├── routes.ts               // typed route name + param list (single source of truth for §2.2's table)
└── linking.ts               // deep-link + web URL config
```

Keep `routes.ts` and the route table in `01-Phase1-UI-Navigation.md` §2.2 in sync by hand — if a route is added/changed, update both.

### 11.3 Handling mobile, web, and TV (Android TV + tvOS) from one codebase

* This is React Native CLI with `react-native-tvos` — the **same JavaScript targets Android, iOS, Android TV, and Apple tvOS**; TV support is not a separate app, it's a different native build target of the same `src/` tree (plus `react-native-web` for the browser target).
* Default to writing every component/screen once, platform-agnostic, using `Platform.isTV` / `Platform.OS` / a `useBreakpoint()` hook for the *small* conditional tweaks (e.g. hide the volume slider on TV, swap column count by width).
* Reach for a platform-extension file (`Component.tv.tsx`, `Component.web.tsx`) only when the implementation genuinely diverges, not just a style tweak — Metro/react-native-web resolve these automatically per build target, no manual branching needed at the call site. Expect this for: `MediaGrid`/`MediaRow` (TV favors rows over grids), `Focusable*` wrappers (TV-only concept), `Player` controls (D-pad vs touch/mouse), and `MainTabs` (rail vs bottom bar vs tabs).
* Everything in `features/*/hooks` and `lib/` (data fetching, normalization, the mock data layer, and — from Phase 2 — the addon client) must never branch on platform at all; the data layer is identical on every platform by construction.

### 11.4 Suggested day-to-day workflow

1. Build and verify a screen/feature on phone first (fastest iteration loop).
2. Check it at the web breakpoint (`react-native-web`) — this is usually just a layout/column-count check, rarely new code.
3. Do a TV focus pass last — confirm D-pad navigation, add a `.tv.tsx` variant only if the phone layout genuinely doesn't work with focus/remote input.
4. Any new shared UI element goes in `components/` from the start (never copy-pasted into a `features/*/components` folder) so the TV/web variants above have one place to diverge from.
