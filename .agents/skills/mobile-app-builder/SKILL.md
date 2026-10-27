---
name: mobile-app-builder
description: Use when building or changing the Lighthouse Fellowship mobile app in mobile/ (Expo + TypeScript + expo-router), including screens, the paginated reader, the page-turn animation, the word game, offline caching, visitor sign-in, theming and EAS builds.
---

The mobile app is where visitors read sermon notes and play the fill-in-the-blank game. It is anonymous by default and must work offline once a note has been opened. Product rules are in [[lighthouse-domain-rules]]; screens are in `docs/PLAN.md` §7. Phase 3a built Home, Archive and the paginated Reader (`src/features/reader/`: `paginate.ts` pure planner, `renderItems.ts`, `usePages.tsx` measure-and-plan loop, `Paper.tsx`). Phase 4 built the game (`src/features/game/`: `game.ts` pure rules incl. attempts/best score, `progress.ts` AsyncStorage, `GameProvider.tsx`, `Blank.tsx` inline drop target, `WordBank.tsx`, `ResultsSheet.tsx`). Keep these conventions.

## Stack

Expo SDK (latest stable), TypeScript strict mode, expo-router, react-native-reanimated, react-native-gesture-handler, TanStack Query with a persisted cache, expo-secure-store, expo-image (cached cover images), EAS Build.

## Folder Layout

```
mobile/
└── src/
    ├── app/                  expo-router routes only (thin screens; Expo's current default location)
    │   ├── _layout.tsx       providers: QueryClient + persister, GestureHandlerRootView, theme
    │   ├── index.tsx         Home
    │   ├── archive/          year → month → Sundays
    │   ├── note/[id]/index.tsx    Reader (Read / Play modes)
    │   ├── note/[id]/results.tsx  Results
    │   ├── save-progress.tsx email → code → consent
    │   └── settings.tsx      About / Settings / delete my data
    ├── components/           shared UI (Button, Card, Chip, Screen)
    ├── features/reader/      block renderers, measurement, pagination, page turn
    ├── features/game/        word bank, blanks, drag/tap, scoring, attempt queue
    ├── features/archive/     year/month/Sunday grouping
    ├── features/auth/        code sign-in, token storage, consent
    ├── api/                  fetch client, endpoint functions, query keys, types
    └── theme/                colors, fonts, spacing
```

Route files compose feature components; logic lives in `src/features`. Pure logic (pagination, word bank, scoring, grouping) sits in plain `.ts` files with no React imports so jest-expo can test it ([[lighthouse-testing-review]]).

## API and Config

* Base URL from `EXPO_PUBLIC_API_URL`. During testing it is plain HTTP to the VPS IP and port 8099; release builds must use HTTPS. Allow cleartext only in development/preview build profiles, never production.
* `EXPO_PUBLIC_*` values are baked into the bundle and readable by anyone. No secrets in the app: no Cloudinary keys, no JWT secrets, no admin credentials.
* Content types in `src/api/types.ts` mirror `docs/API.md` and PLAN §4 exactly (block union on `type`, segment union of text/blank).
* All server data goes through TanStack Query; no ad-hoc fetch in components.

## Offline

* Persist the query cache (`@tanstack/react-query-persist-client` with an AsyncStorage persister). Note detail queries and the archive list are persisted; set a long `gcTime` so opened notes survive restarts.
* Use `contentVersion` from the list to refetch a stale cached note.
* Cover images use expo-image with disk caching.
* Game attempts and personal notes are written to local storage first. Attempts go into an upload queue with a `clientAttemptId` (UUID) and are sent when signed in and online; a failed upload stays queued.
* The app must open to a usable state with no network.

## Visitor Sign-in

* Optional "Save my progress" flow only. Never gate reading or playing behind it.
* The visitor token is stored with expo-secure-store, never AsyncStorage. Clear it on 401 and fall back to anonymous mode without losing local progress.
* Never log the email or the code. See [[lighthouse-auth-guardrails]].
* Settings shows the signed-in email and an in-app "Delete my data" (required by Apple and GDPR). It creates a deletion request, explains that data is deleted 30 days after the church confirms, signs the visitor out, and offers "Cancel deletion" if they sign in again before the purge (ADR 0004).

## Reader and Pagination

* Pagination is measured-and-packed: render each block off-screen (or measure with `onLayout` in a hidden pass) at the current width and font scale, collect heights, then a pure function packs blocks into pages given the page height minus header and footer.
* A block taller than a page (long SCRIPTURE) is split at sentence boundaries by the same pure logic.
* Header and footer repeat on every page and must match the photographed sheet in `docs/brand/sample-notes/` (the dashboard's `PaperFrame.tsx` + `.paper__*` styles already do; mirror them):
  * Header: small picture top left (about a fifth of the width); "Sermon Notes" bold serif in maroon `#7A3328`, centred on the page; a maroon rule from the picture's right edge to the margin; the title centred under it. Pages after the first add a small "(con't)" after the title.
  * Footer: "(over)" small at the bottom right on every page **except the last** (on paper it is on the front, meaning "turn over"); a thick-over-thin double rule; preacher with "Lighthouse Fellowship Napoli" under it on the left; the date as "September 13, 2026" on the right; serif.
  * Body: sans serif; scripture bold italic with the reference bold, upright, right-aligned; headings bold with "I." numbers and a hanging indent.
* Re-paginate on rotation, window size change and font-scale change. Keep the reader position close to the same block.
* The dashboard preview uses the same rules; keep the packing function free of React Native so it can be shared or copied verbatim ([[dashboard-builder]]).

## Checking layout without a phone

* `npx expo start --web` against a local backend (`docker compose -p lf-local up postgres backend`, port 8099) renders the real screens. Screenshot them with puppeteer-core driving the installed Chrome and `page.emulate({ viewport: { width: 390, height: 844, isMobile: true } })`. Plain `chrome --headless --window-size=390,...` lays out at about 500px on Windows, and `--virtual-time-budget` stalls `onLayout`, so the reader looks blank or cut off.
* Don't start the dev server with `CI=1` while iterating: it turns off file watching and serves the old bundle.
* Web has no `onTextLayout`, so scripture is never split there (it is clipped at the footer). Splitting can only be checked on a phone.
* Git Bash rewrites arguments starting with `/` into Windows paths; prefix such commands with `MSYS_NO_PATHCONV=1`.
* `<Link asChild>` drops a `style` function on its child; use a `Pressable` with `router.push` when the pressed style matters.

## Library versions that differ from older docs

* Gesture Handler is v3: use the hooks API (`usePanGesture`, `useTapGesture`, `useExclusiveGestures`, `<GestureDetector gesture={...}>`); callbacks are `onBegin/onActivate/onUpdate/onDeactivate/onFinalize`. `Gesture.Pan()` still exists but is the legacy API.
* Reanimated 4 + react-native-worklets: call JS from a worklet with `scheduleOnRN(fn, ...args)` (from `react-native-worklets`); mark gesture callbacks `'worklet'`.
* React Native 0.88: `View`/`ScrollView` refs are host elements; type them `HostInstance` / `ScrollViewInstance`, not the component type.
* Blanks are inline views inside `<Text>` (fixed note-wide width from `blankWidth`); the measuring pass renders them inside `<NoGame>` so they don't register as drop targets.
* Another `npx expo start` (the user's own, for Expo Go) may already hold port 8081; never kill it, run a second server on another port.

## Animation and Gestures

* Page turn and chip drag use Reanimated shared values and Gesture Handler `Gesture.Pan()`; gesture callbacks are worklets running on the UI thread.
* During a gesture, do not call `setState`, do not trigger layout, and do not cross to the JS thread every frame. Use `runOnJS` only on gesture end (page committed, chip dropped).
* Animate `transform` and `opacity` only (rotateY around the left edge with `perspective`, shadow opacity). Do not animate width, height or position props.
* Pre-render the next and previous page; keep page components memoized.
* Drop targets: measure blank positions once per page layout into a shared value, so hit-testing happens in the worklet.
* Snap forward or back based on distance and velocity with `withSpring`/`withTiming`.
* Provide the simpler slide-and-shadow fallback, chosen automatically when the device cannot hold 60 fps.
* Test on a low-end Android release build, not in dev mode.

## Accessibility

* Tap chip then tap blank always works in addition to drag-and-drop.
* Support system font scaling; pagination re-runs for it. Do not set `allowFontScaling={false}` on reading text.
* Accessibility labels on chips, blanks ("blank 3 of 10, empty") and page controls; buttons for next/previous page as well as the swipe.
* Touch targets at least 44 pt. Correct/incorrect is shown with an icon or text as well as green/red.

## Theme (PLAN §11)

`src/theme` exports tokens; components never hardcode colors.

* Navy `#1F2A4A`: text, headings, header bar
* Lighthouse red `#C62828`: primary buttons, active states, score highlight
* Beam yellow `#F4C542`: word-bank chips, celebration, "new note" badge
* Paper `#FBF8F1`: reader page background
* Maroon `#7A3328`: "Sermon Notes" and the header rule (estimated from the photo)

A serif for titles and headings, a readable sans serif for body, italics for scripture (load with expo-font). English strings only.

## EAS Build Profiles

`eas.json` defines:

* `development`: dev client, internal distribution, HTTP allowed.
* `preview`: Android APK (`buildType: "apk"`) for installing on test phones; HTTP to the VPS IP allowed.
* `production`: store builds (AAB / iOS), HTTPS only, no cleartext.

Each profile sets its own `EXPO_PUBLIC_API_URL` in `env`. iPhone testing uses Expo Go until the Apple Developer account exists. Release and store steps belong to phase 6; see [[docker-vps-deployment]] for the server side.
