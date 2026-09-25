# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
yarn start              # Metro dev server
yarn android             # build + run on Android
yarn ios                 # build + run on iOS
yarn lint                 # eslint .
yarn test                 # jest (all tests)
yarn test <pattern>       # jest, single file/suite by path or name pattern
yarn test -t "<name>"     # jest, single test by test name
npx tsc --noEmit          # typecheck (no script in package.json, run directly)
yarn clean                 # cd android && ./gradlew clean
yarn build                 # cd android && ./gradlew build
yarn generate               # regenerate codegen artifacts from schema (android)
yarn doctor                  # npx react-native doctor
yarn reset                    # adb uninstall com.shikara
```

Before considering a change done: `npx tsc --noEmit`, `yarn lint`, `yarn test` must all pass (mirrors `docs/PHASE3-TODO.md`'s own "Verified" checklist).

## Architecture

Shikara is a React Native (CLI, not Expo) client for the **Stremio addon protocol**. There is no backend in this repo — the app talks directly to remote addon servers over HTTP. `docs/PRD.md` describes a much larger long-term vision (Go backend, TMDB/IMDb provider normalization, native torrent playback); treat it as aspirational context only. What's actually built follows `docs/01-Phase1-UI-Navigation.md` (UI/nav), `docs/02-Phase2-API-Integration.md` (addon protocol + data layer — currently implemented), and `docs/03-Phase3-Torrent-Streaming.md` (streams/subtitles — partially implemented, see `docs/PHASE3-TODO.md` for the live checklist before touching stream/player/torrent work).

### Addon data layer (`src/lib/addons/`)

This is the core of the app and the thing to understand first:

- `manifest.ts` — fetches and validates an addon's `manifest.json`.
- `api.ts` — raw fetches: `catalog/{type}/{catalogId}[/extra].json`, `meta/{type}/{id}.json`, `stream/{type}/{id}.json`, `subtitles/{type}/{id}.json`. Same convention for every addon; never special-cased by addon identity.
- `capability.ts` — the *only* place that should decide "which addons can answer this," always via declared capability (`addonsSupporting`, `supportsCapability` in `src/lib/types.ts`), never by addon name/id.
- `normalize.ts` — converts each addon's raw JSON into the internal `Media`/`Stream`/`SubtitleTrack` shapes (`src/lib/types.ts`). Stream quality/codec/resolution/size/seeders are parsed out of free-text titles (Torrentio-style emoji convention — the protocol has no structured fields for these).
- `merge.ts` — combines results across addons queried in parallel, with per-addon failure isolation (`settleAcrossAddons`). Catalog/meta results collapse by id (`mergeMediaLists`); stream results concatenate with **no** id-dedup (`combineStreamResults` — multiple sources for the same title is the point); subtitles dedupe only exact duplicates.
- `queries.ts` — the fan-out orchestration screens/hooks actually call (`fetchMergedCatalog`, `fetchMergedMeta`, `fetchMergedStreams`, `fetchMergedSubtitles`, `genresFor`). Catalog/stream/subtitle fetches fan out to every capable addon in parallel; meta fetch stops at the first addon (in Addon Manager priority order) that returns a result.

When adding a new addon-backed feature, extend this pipeline (api → normalize → merge → queries) rather than querying an addon ad hoc from a screen/hook.

### State & persistence

- `src/context/AddonsContext.tsx` — installed addons list, persisted to MMKV. Background-refreshes the bundled Cinemeta manifest on startup without blocking the shell.
- `src/context/LibraryContext.tsx` — library + watch history, device-only via MMKV. No account, no sync, by design — don't add any.
- `src/context/ThemeContext.tsx` — theme state.
- `src/lib/storage.ts` — single MMKV instance (`shikara-storage`) with `getJSON`/`setJSON` helpers; `StorageKeys` is the source of truth for keys.
- `src/lib/query-client.ts` — TanStack Query client with per-resource `staleTime` (search/meta/catalog/manifest/stream/subtitles each differ). `addonQueryKey(addonId, resource, type, params)` is the canonical query key shape — one query per enabled addon, fanned out and merged by the caller, never one combined query. Persisted across restarts via `query-persister.ts` (7-day `maxAge`).

### Navigation

`src/navigation/routes.ts` is the single hand-maintained source of truth for route names and params (`MainTabParamList`, `RootStackParamList`). Keep it in sync with the route table in `docs/01-Phase1-UI-Navigation.md` §2.2 when adding/changing screens. `MainTabs.tsx` / `RootNavigator.tsx` / `linking.ts` consume these types.

### Feature structure

Each `src/features/<name>/` holds `screens/` and, where the screen needs addon data, a `hooks/use<Name>.ts` that wraps the `queries.ts` fan-out + `useAddons()`. Screens stay thin and consume the hook; put addon-fetching/merging logic in the hook or in `lib/addons/`, not in the screen component.

### Tests

`__tests__/App.test.tsx` mocks `src/lib/addons/manifest` and `src/lib/addons/api` — CI must never depend on the network. Follow the same pattern (mock those two modules) for any new test that renders through the addon-fetching tree.
