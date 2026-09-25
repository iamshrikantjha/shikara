# Phase 1 — Measurable Acceptance Criteria

Phase 1 is considered complete only when the following functional, performance, reliability, cross-platform, and architectural criteria are met.

---

## 1. Search

### Functional

* [ ] User can search for a movie by exact title.
* [ ] User can search for a movie using a partial title.
* [ ] User can search for a TV series by exact title.
* [ ] User can search for a TV series using a partial title.
* [ ] Search results distinguish between movies and TV series.
* [ ] Each result contains a stable provider ID.
* [ ] Empty searches are handled without an unnecessary API request.
* [ ] Empty-result searches display a dedicated empty state.
* [ ] Network/API failures display a retryable error state.

### Performance

On a production/release build and a representative mid-range Android device:

* [ ] Search input is debounced by approximately **250–350 ms**.
* [ ] Cached search results begin rendering within **100 ms** of the request being satisfied from cache.
* [ ] For a warm backend request, the first results should normally appear within **1.5 seconds** on a reasonable broadband/mobile connection.
* [ ] Search results must not cause visible UI freezing while the request is running.
* [ ] Typing must remain responsive while search requests are in flight.

---

# 2. Movie Details

For a valid movie ID:

* [ ] Movie title is displayed.
* [ ] Release year/date is displayed when available.
* [ ] Poster is displayed.
* [ ] Backdrop is displayed where available.
* [ ] Overview is displayed when available.
* [ ] Genres are displayed when available.
* [ ] Runtime is displayed when available.
* [ ] Rating is displayed when available.
* [ ] External/provider IDs are available internally.
* [ ] Missing metadata fields do not break the page.
* [ ] Invalid/non-existent IDs display a proper not-found state.
* [ ] API errors provide a retry action.

### Performance

* [ ] Previously cached movie details render immediately from cache.
* [ ] A cold movie-details request begins rendering within **2 seconds** under normal network conditions.
* [ ] The UI displays a skeleton/loading state instead of blocking the entire application.
* [ ] Image loading does not block textual metadata rendering.

---

# 3. TV Series Details

For a valid series ID:

* [ ] Series title is displayed.
* [ ] Poster is displayed.
* [ ] Backdrop is displayed where available.
* [ ] Overview is displayed when available.
* [ ] Genres are displayed when available.
* [ ] Rating is displayed when available.
* [ ] Series status is displayed when available.
* [ ] Season count is displayed when available.
* [ ] Episode count is displayed when available.
* [ ] Missing fields are handled gracefully.

### Performance

* [ ] Cached series details render within **100 ms** after cache availability.
* [ ] Cold series details begin rendering within **2 seconds** under normal network conditions.
* [ ] Loading the series page does not block navigation.

---

# 4. Seasons

For a valid TV series:

* [ ] All available seasons returned by the metadata provider are displayed.
* [ ] Season number is displayed.
* [ ] Season title is displayed where available.
* [ ] Season poster/thumbnail is displayed where available.
* [ ] Episode count is displayed where available.
* [ ] Selecting a season loads its episode list.
* [ ] Invalid season numbers are handled gracefully.
* [ ] Missing season metadata does not crash the application.

### Performance

* [ ] Cached seasons appear within **100 ms** after cache availability.
* [ ] Cold season requests begin rendering within **2 seconds** under normal network conditions.
* [ ] Switching between seasons does not recreate the entire series screen unnecessarily.

---

# 5. Episodes

For a selected season:

* [ ] All available episodes are displayed.
* [ ] Episode number is displayed.
* [ ] Episode title is displayed.
* [ ] Episode overview is displayed when available.
* [ ] Air date is displayed when available.
* [ ] Runtime is displayed when available.
* [ ] Episode thumbnail is displayed when available.
* [ ] Episode rating is displayed when available.
* [ ] Episode has a stable internal/provider ID.
* [ ] Selecting an episode navigates to the episode destination.
* [ ] Missing episode metadata does not crash the application.

### Performance

For a season containing at least 20 episodes:

* [ ] Initial episode rendering must not require rendering all episode cards simultaneously.
* [ ] Episode lists must use virtualization.
* [ ] Scrolling through 50+ episodes must remain responsive on the target Android test device.
* [ ] Images must load lazily.
* [ ] Navigating between episodes must not trigger unnecessary refetching of the entire series.

---

# 6. Navigation

The following routes must work:

```text
/
 
/search

/movie/:id

/series/:id

/series/:id/season/:season

/series/:id/season/:season/episode/:episode
```

Acceptance:

* [ ] Every route can be opened directly.
* [ ] Back navigation returns to the previous logical screen.
* [ ] Forward navigation works where supported by the platform.
* [ ] Navigation parameters are type-safe.
* [ ] Invalid route parameters produce a controlled error/not-found state.
* [ ] Navigation does not reload unrelated application state.

---

# 7. Web

The following URLs must be directly accessible in a browser:

```text
/search?q=interstellar

/movie/{id}

/series/{id}

/series/{id}/season/1

/series/{id}/season/1/episode/1
```

Acceptance:

* [ ] Browser refresh works on every supported route.
* [ ] Browser Back works correctly.
* [ ] Browser Forward works correctly.
* [ ] URLs are shareable.
* [ ] Query parameters survive browser refresh.
* [ ] No platform-specific React Native code is required for basic navigation.
* [ ] Web does not expose internal API credentials.

---

# 8. Android

Acceptance:

* [ ] Application installs successfully on the minimum supported Android version.
* [ ] Application launches without a crash.
* [ ] Search flow works.
* [ ] Movie flow works.
* [ ] Series flow works.
* [ ] Season flow works.
* [ ] Episode flow works.
* [ ] Android Back behavior is correct.
* [ ] Screen rotation does not corrupt application state where rotation is supported.
* [ ] Application survives normal background/foreground transitions.

---

# 9. iOS

Acceptance:

* [ ] Application builds successfully.
* [ ] Application launches successfully.
* [ ] Search flow works.
* [ ] Movie flow works.
* [ ] Series flow works.
* [ ] Season flow works.
* [ ] Episode flow works.
* [ ] Native navigation/back behavior is correct.
* [ ] Application survives normal background/foreground transitions.

---

# 10. Android TV

Phase 1 does not require a complete TV-optimized UI, but the architecture must be TV-compatible.

Acceptance:

* [ ] Application builds using the TV-compatible React Native configuration.
* [ ] Application launches on a supported Android TV/emulator.
* [ ] Core navigation is accessible using a D-pad.
* [ ] Search can be opened using the remote.
* [ ] Media cards can receive focus.
* [ ] Focus cannot become permanently lost during normal navigation.
* [ ] Select/Enter opens the focused item.
* [ ] Back returns to the previous screen.
* [ ] At least one movie and series discovery flow can be completed using only the remote.

---

# 11. Loading States

Every asynchronous Phase 1 operation must have an explicit loading state.

Required for:

```text
Search
Movie details
Series details
Seasons
Episodes
```

Acceptance:

* [ ] No screen remains visually blank while waiting for a network request.
* [ ] Skeleton/loading indicators are displayed where appropriate.
* [ ] Loading indicators disappear when data arrives.
* [ ] Loading indicators disappear when an error occurs.
* [ ] Repeated requests do not create overlapping uncontrolled loading states.

---

# 12. Error Handling

The following scenarios must be tested:

```text
No internet
Slow internet
HTTP 4xx
HTTP 5xx
Timeout
Malformed response
Missing metadata
Invalid ID
Provider unavailable
```

Acceptance:

* [ ] Application does not crash.
* [ ] User receives an understandable error state.
* [ ] Retry is available for recoverable network failures.
* [ ] Provider-specific errors are translated into application-level errors.
* [ ] Raw provider errors are not displayed directly to users.

---

# 13. Caching

TanStack Query must be used for server-state caching.

Acceptance:

* [ ] Reopening recently viewed metadata does not unnecessarily refetch it.
* [ ] Cache behavior is explicitly configured rather than relying entirely on defaults.
* [ ] Search results are cached.
* [ ] Movie details are cached.
* [ ] Series details are cached.
* [ ] Season data is cached.
* [ ] Episode data is cached.
* [ ] Failed requests do not permanently poison the cache.
* [ ] Cache invalidation behavior is documented.

### Cache performance

For an already cached resource:

```text
Navigation
   ↓
Cached data
   ↓
Immediate render
```

Target:

**<100 ms perceived data availability** on a warm local cache, excluding UI animation time.

---

# 14. Image Performance

Acceptance:

* [ ] Images are cached.
* [ ] Images are requested at an appropriate resolution.
* [ ] Full-resolution images are not unnecessarily loaded into small cards.
* [ ] Lists use lazy image loading.
* [ ] Failed images have a fallback.
* [ ] Placeholder/skeleton states exist.
* [ ] Image loading does not block text rendering.

For a media grid containing 50+ items:

* [ ] Only the visible/near-visible image set should be actively loaded.
* [ ] Scrolling must not result in unbounded image memory growth.

---

# 15. UI Performance

Performance must be measured using **release/production builds**, not development mode.

### Target

On the selected baseline Android device:

* [ ] Normal scrolling maintains approximately **55+ FPS** in representative media lists.
* [ ] No repeated frame drops occur during ordinary scrolling.
* [ ] Search typing remains responsive.
* [ ] Opening a details page does not visibly freeze the UI.
* [ ] Navigation transitions remain responsive.
* [ ] Large episode lists remain virtualized.

The goal is not to guarantee a fixed FPS on every device; the benchmark device and test conditions must be documented.

---

# 16. Startup Performance

Define a baseline device and network state before measuring.

Targets:

### Cold start

From launching the application to rendering the initial application shell:

**≤ 2 seconds** on the baseline Android device.

### Warm start

From resuming the application to displaying the existing application shell:

**≤ 500 ms** target.

### Important rule

The application must not wait for:

* TMDB
* IMDb
* Backend metadata
* Search
* Remote configuration

before displaying the basic application shell.

---

# 17. API Performance

For backend endpoints tested independently:

Target:

```text
p50 < 300 ms
p95 < 1,000 ms
```

for cached metadata requests under the defined staging test environment.

Provider-dependent uncached requests may exceed these values and must be measured separately.

The frontend must never assume that provider latency is predictable.

---

# 18. Backend Correctness

For a test dataset containing at least:

* 20 movies
* 10 TV series
* 5 multi-season TV series
* 100 episodes

Acceptance:

* [ ] Search returns the expected media type.
* [ ] IDs remain stable.
* [ ] Provider responses are normalized into the internal schema.
* [ ] Missing provider fields are represented as nullable/optional values.
* [ ] Invalid provider responses do not crash the API.
* [ ] Provider failures produce controlled API errors.

---

# 19. Metadata Accuracy

For a predefined Phase 1 verification dataset:

```text
10 movies
10 TV series
5 seasons
50 episodes
```

Acceptance:

* [ ] At least **95%** of expected canonical IDs match the verification dataset.
* [ ] Movie/series type classification is correct for **≥99%** of verification records.
* [ ] Season/episode numbering is correct for **≥99%** of verification records.
* [ ] No duplicate canonical media IDs are produced for the same provider identity.

Metadata fields that are unavailable from the provider are excluded from accuracy calculations rather than treated as failures.

---

# 20. Type Safety

Acceptance:

* [ ] TypeScript compilation succeeds with zero errors.
* [ ] No `any` is introduced in core domain models without documented justification.
* [ ] API responses are validated before entering the domain layer.
* [ ] Navigation parameters are typed.
* [ ] Domain models are independent from provider response types.

---

# 21. Architecture

The following dependency direction must be maintained:

```text
UI
 ↓
Feature
 ↓
Application
 ↓
Domain
 ↓
Infrastructure
```

Acceptance:

* [ ] React components do not call TMDB/IMDb directly.
* [ ] React components do not know provider response formats.
* [ ] Provider-specific models do not leak into the UI.
* [ ] Native Android modules are not imported directly into domain logic.
* [ ] Backend provider credentials are never present in the client.
* [ ] Provider adapters can be replaced without rewriting the frontend.

---

# 22. Testing

Minimum Phase 1 automated coverage:

### Unit tests

* [ ] Provider normalization
* [ ] Media identity handling
* [ ] Search transformation
* [ ] Movie transformation
* [ ] Series transformation
* [ ] Season transformation
* [ ] Episode transformation
* [ ] Error mapping

Target:

**≥80% statement coverage for core domain/application logic.**

Coverage is not a substitute for meaningful tests.

---

### Integration tests

At minimum:

* [ ] Search → backend → provider
* [ ] Movie → backend → provider
* [ ] Series → backend → provider
* [ ] Season → backend → provider
* [ ] Episodes → backend → provider

---

### E2E tests

Minimum automated E2E flows:

```text
Launch
 ↓
Search movie
 ↓
Open movie
 ↓
Back
```

and:

```text
Launch
 ↓
Search series
 ↓
Open series
 ↓
Select season
 ↓
Open episode
 ↓
Back
```

All critical E2E flows must pass before Phase 1 is accepted.

---

# 23. Stability

During final Phase 1 validation:

* [ ] No P0 crashes.
* [ ] No P1 crashes blocking core navigation.
* [ ] No known data-loss bugs.
* [ ] No navigation dead ends in core flows.
* [ ] No reproducible crash in the primary search → details → season → episode flows.

A final regression run must be performed on:

* Android
* iOS
* Web
* Android TV

where the relevant Phase 1 functionality is supported.

---

# 24. Accessibility

Minimum requirements:

* [ ] Interactive controls have accessible labels.
* [ ] Images have appropriate accessibility behavior.
* [ ] Text has sufficient contrast.
* [ ] Touch targets meet platform accessibility expectations.
* [ ] Keyboard navigation works for supported web controls.
* [ ] TV focus state is visually obvious.
* [ ] Screen-reader behavior is tested for core navigation.

---

# 25. Security Acceptance

* [ ] All production API communication uses HTTPS.
* [ ] Provider secrets are server-side only.
* [ ] No API secret appears in the mobile/web bundle.
* [ ] User-controlled search parameters are validated.
* [ ] External metadata is treated as untrusted input.
* [ ] No arbitrary remote JavaScript is executed.
* [ ] Dependency audit has no unresolved critical vulnerabilities.

---

# 26. Phase 1 Exit Gate

Phase 1 may be declared **COMPLETE** only when all of the following are true:

### Functional

* [ ] Movie search works.
* [ ] TV search works.
* [ ] Movie details work.
* [ ] Series details work.
* [ ] Season browsing works.
* [ ] Episode browsing works.
* [ ] Navigation works.
* [ ] Loading states work.
* [ ] Empty states work.
* [ ] Error/retry states work.

### Cross-platform

* [ ] Android passes core E2E flow.
* [ ] iOS passes core E2E flow.
* [ ] Web passes core E2E flow.
* [ ] Android TV passes the defined TV smoke flow.

### Performance

* [ ] Cold startup ≤2 seconds on the defined baseline Android device.
* [ ] Warm startup ≤500 ms target.
* [ ] Cached resources render within 100 ms target.
* [ ] Search normally produces first results within 1.5 seconds under the defined network conditions.
* [ ] Representative media lists maintain approximately 55+ FPS under the defined test conditions.
* [ ] No obvious UI freezes during core workflows.

### Quality

* [ ] Core domain/application logic has ≥80% statement coverage.
* [ ] All mandatory E2E flows pass.
* [ ] No unresolved P0/P1 defects.
* [ ] TypeScript has zero compilation errors.
* [ ] No critical dependency vulnerabilities.
* [ ] Provider-specific models do not leak into the UI.
* [ ] Performance measurements have been recorded on real hardware.

---

# 27. Phase 1 Benchmark Specification

To make these measurements reproducible, the project must maintain a benchmark document containing:

```text
Device:
Android version:
React Native version:
Build type:
Backend version:
Network:
Provider:
Dataset:
Test date:
```

Every performance claim should identify its testing conditions.

Example:

```text
Cold start:
1.84 seconds

Search first result:
742 ms

Cached movie details:
38 ms

Episode list render:
71 ms

Scroll performance:
58–60 FPS
```

These numbers should be treated as **observed measurements**, not universal guarantees.

---

# 28. Phase 1 Final Deliverable

At the end of Phase 1, the repository must contain:

```text
Working React Native application
        +
Working Go API
        +
Metadata provider adapters
        +
Normalized domain models
        +
TanStack Query integration
        +
React Navigation
        +
Web routing
        +
Android TV-compatible navigation
        +
Automated tests
        +
Performance benchmark results
        +
Architecture documentation
```

The result should be a **stable media-discovery foundation**, not a partially implemented streaming application.

Torrenting, addons, stream resolution and native playback remain explicitly outside the Phase 1 acceptance boundary.
