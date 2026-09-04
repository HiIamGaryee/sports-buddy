# Sports Buddy — Engineering Guide

## 1. Product summary

Sports Buddy is a people-first sports social app. The long-term flow is:
find compatible sports partners → connect → chat → plan an activity →
choose availability → agree on budget → find a venue → confirm → add to
calendar → reminders → view upcoming and past activities.

None of those features exist yet. Only the foundation does (STEP 1).

## 2. Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 19 + TypeScript (strict) |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first config) |
| Components | shadcn/ui (`radix-nova` style, `radix-ui` primitives, `lucide-react` icons) |
| Mobile shell | Capacitor 8 (config only, no native folders yet) |
| Backend | Firebase (planned — not installed yet) |

Planned Firebase services: Auth, Firestore, Cloud Messaging, Analytics,
Crashlytics. Planned external services: Google Maps/Places, OneSignal,
RevenueCat. Do not install any of them before the step that uses them.

## 3. Architecture

```
UI (pages / components)
  ↓ calls
Service (src/services/api/*)   ← mock today, Firebase repository later
  ↓
Data source (mock data now → Firestore / Cloud Functions later)
```

Rules:

- UI never imports mock data or a backend SDK directly. It calls a service
  function (`getCurrentUser()`), which returns a `Promise`.
- Firebase access is confined to `src/services/firebase/`. When repositories
  arrive they live there and services call them, so the UI contract never
  changes.
- Theme is a single provider (`src/providers/theme-provider.tsx`). No
  component reads or writes theme state directly; they use `useTheme()` or,
  far more often, just semantic classes.

### Routing (STEP 2)

```
main.tsx → App → ThemeProvider → AppRouter (BrowserRouter)
  └ AppShell (layout route: centred column + BottomNavigation)
      └ page: <AppHeader /> + <PageContainer />
```

- `src/routes/routes.ts` — the `ROUTES` object and `AppRoute` type. Never
  write a path string in a component; import `ROUTES`.
- `src/routes/app-router.tsx` — every route declared in one place. `/`
  and any unknown path redirect to `ROUTES.home`.
- `src/config/navigation.ts` — `mainNavigation`, the single source of truth
  for the five main tabs (`label`, `path`, `icon`). Navigation UI is always
  `mainNavigation.map(...)`; never hand-written tab markup.

### Authentication (STEP 3)

```
UI (pages)
  ↓ useAuth()
AuthProvider              one React source of truth for auth state
  ↓
authService               normalizes input, maps errors, first-login user doc
  ↓
authRepository / userRepository      chosen once in repositories.ts
  ↓
Firebase (Auth + Firestore)   |   Mock (localStorage)
```

- `src/providers/auth-provider.tsx` + `auth-context.ts` — the only auth state
  in the app. Never mirror `user` in another component or service.
- `src/hooks/use-auth.ts` — `useAuth()` exposes `user`, `isAuthenticated`,
  `isLoading`, `signIn`, `signUp`, `signInWithGoogle`, `signOut`.
- `src/services/auth/auth-service.ts` — trims/lowercases email, calls the
  repositories, creates the minimal user document on first sign-in, converts
  every failure into an `AuthError` with a human message. No React in here.
- `src/services/auth/auth-error.ts` — the single Firebase-code → message map.
  Popup cancellations resolve quietly instead of raising.
- `src/repositories/auth/*` — `AuthRepository` contract plus the Firebase and
  mock implementations. `src/repositories/user/*` — `UserRepository`
  (`getById`, `createIfMissing`).
- `src/repositories/repositories.ts` — the one place the backend is selected
  from `env.dataSource`. Nothing else branches on the data source.
- `src/services/firebase/config.ts` reads/validates env;
  `src/services/firebase/client.ts` is the **only** place `initializeApp`,
  `initializeAuth` and `getFirestore` are called, all lazily so mock mode
  needs no credentials.
- Firebase types never leave the repository layer: UI consumes `AuthUser`
  (`src/types/auth.ts`), profile persistence uses `UserRecord`
  (`src/types/user.ts`).

### Profile state (STEP 4)

```
UI (pages / onboarding)
  ↓ useProfile()
ProfileProvider            one React source of truth for the sports profile
  ↓
profileService             normalizes, validates, then persists
  ↓
profileRepository          chosen once in repositories.ts
  ↓
Firebase (users/{uid})     |   Mock (localStorage)
```

- `AuthProvider` answers *who is signed in*; `ProfileProvider`
  (`src/providers/profile-provider.tsx` + `profile-context.ts`) answers *what
  is their Sports Buddy profile*. Never merge the two, and never copy either
  into page state.
- `src/hooks/use-profile.ts` — `useProfile()` exposes `profile`, `isLoading`,
  `completeOnboarding`, `updateProfile` and `updatePreferences`.
- `src/services/profile/profile-service.ts` — `loadProfile()` (read, creating
  the minimal document if missing), `completeOnboarding()` (also seeds default
  preferences), `updateProfile()` (profile editing) and `updatePreferences()`.
  All of them normalize, validate and map failures to one user-safe message.
- `src/services/profile/profile-validation.ts` — **every** profile rule, each
  taking only the field it inspects so onboarding can reuse them per step.
- `src/repositories/profile/*` — `ProfileRepository` contract
  (`getByUserId`, `createIfMissing`, `saveProfile`, `updatePreferences`) with
  Firebase and mock implementations. This replaced STEP 3's
  `repositories/user/*`: one repository owns `users/{uid}`, never two.

### Profile vs preferences vs discovery (STEP 5)

Three shapes, deliberately distinct:

| Type | Question it answers | Where |
| --- | --- | --- |
| `AuthUser` | Who is signed in? | `types/auth.ts` |
| `SportsProfile` | Who am I as a sports buddy? (PRIVATE) | `types/user.ts` |
| `UserPreferences` | Who do I want to see, and what may others see? | `types/preferences.ts` |
| `DiscoveryProfile` | What may another user ever see? | `types/discovery-profile.ts` |

- `UserPreferences` lives under `profile.preferences` (`discovery`, `privacy`,
  `notifications`). Defaults and normalization: `src/lib/preferences.ts` —
  `createDefaultUserPreferences()` derives discovery settings from the profile
  so nothing is configured twice, and `normalizeUserPreferences()` fills gaps
  when reading older documents. Never write `?? true` in a component.
- **The privacy boundary is `toDiscoveryProfile()`** (`src/lib/discovery-profile.ts`).
  It picks fields explicitly — never spreads — so email, account metadata,
  preferences and `radiusKm` cannot leak. Both the in-app preview and every
  Discover surface render `DiscoveryProfile`, which keeps the boundary honest.

### Discover (STEP 6)

```
users/{uid} (PRIVATE) → toDiscoveryProfile() → publicProfiles/{uid}
                                                     ↓
                              DiscoverRepository → discoverService → UI
```

- `publicProfiles/{uid}` is the **only** collection another member can read.
  `users/{uid}` stays owner-only; Discover never falls back to it.
- `src/repositories/public-profile/*` writes your own projection;
  `src/repositories/discover/*` reads other people's. Separate contracts on
  purpose — read and write have different trust boundaries.
- `profileService` owns synchronization: projection written on onboarding
  completion and profile edits, **deleted** when `discoverable` goes false,
  recreated when it goes true, and repaired on load when missing. A page must
  never write the private and public documents itself.
- `discoverService` excludes the signed-in user and anything not
  discoverable, then sorts by `updatedAt` descending. One batch of
  `CANDIDATE_BATCH_LIMIT` (30), **no realtime listeners**.
- Filters (`src/types/discover.ts`, `src/lib/discover-filters.ts`) are
  session-only and pure: seeded from saved `DiscoveryPreferences`, never
  written back, applied client-side so changing one costs no reads. Reset
  returns to the saved preferences.
- `hasAvailabilityOverlap()` (`src/lib/availability.ts`) is shared with the
  future compatibility engine — do not write a second version.
- Deliberately absent in STEP 6: compatibility scores, Connect, distance.
  There are no coordinates yet, so nothing may display "4 km away"; area is
  the stand-in. Ranking is recency, not recommendation.
- Full walkthrough: `docs/discover.md`.

### Profile editing and settings (STEP 5)

- `/profile` (`features/profile/pages/profile-page.tsx`) — hero, derived
  completeness, edit + preview actions, then read-only sections.
- `/profile/edit` — one scrollable screen of sections (not an 8-step wizard),
  built on the **same** `profileDraftReducer` as onboarding
  (`src/lib/profile-draft.ts`) and the same field selectors
  (`src/components/profile/*`). Explicit Save; `isDirty` compares the draft to
  the initial one; Cancel discards without writing.
- `/settings` (`features/settings/pages/settings-page.tsx`) — Preferences
  (Discovery link + theme), Notifications, Privacy & safety, Account, About.
  Simple toggles persist immediately (one merge write each);
  `/settings/discovery` uses an explicit Save like profile editing. That split
  is the rule: single switches save on toggle, multi-field screens save once.
- `src/components/layout/edit-layout.tsx` — the shared full-screen form shell
  (back/cancel header, scrolling body, sticky safe-area save bar). These
  routes sit inside `ProtectedRoute` but **outside** `AppShell`, so the sticky
  save area never fights the bottom navigation.
- Profile completeness: `getProfileCompleteness()`
  (`src/lib/profile-completeness.ts`) only. Required fields are worth 90,
  the optional bio the last 10. Never hardcode a percentage.
- Display formatting: `src/lib/profile-format.ts` only — `getSportName`,
  `getSkillLabel`, `getIntentLabel`, `getIntensityLabel`/`getIntensityHint`,
  `getAreaName`, `formatRadius`, `formatBudget`, `formatAvailability`,
  `formatAvailabilityRows`. Discover will reuse these; do not re-derive
  labels in a component.
- Account deletion is **not** implemented and shows no button: deleting the
  Firebase Auth user without clearing `users/{uid}` (and, later, connections
  and messages) would leave orphaned data. Required before production.
- Photo upload is **not** implemented (it needs Firebase Storage): the
  provider photo URL is used when present, otherwise initials.

### Onboarding (STEP 4)

- One route, `/onboarding`, with internal step state — no browser route per
  step. `src/features/onboarding/`:
  - `onboarding-draft.ts` — draft type, `useReducer` reducer, `toSaveInput()`
    and `onboardingDraftStore` (the only place the draft touches storage).
  - `onboarding-steps.ts` — the eight step definitions plus
    `getStepError()`, which composes `profileRules`.
  - `pages/onboarding-page.tsx` — reducer, step index, save handling.
  - `steps/*` — one component per screen; `components/*` — layout, progress,
    `SelectableCard`, `SelectionChip`, `AvailabilitySelector`.
- Draft state is local and persisted to localStorage per user, so moving
  between steps (or refreshing) never loses progress. Firestore is written
  **once**, when the user presses Complete Profile.
- On success the draft is cleared, `ProfileProvider` updates, the route state
  flips to `ready` and the user lands on `/home`. On failure nothing is marked
  complete, the message is shown and the draft is kept for retry.

### Route protection

`src/routes/use-route-state.ts` derives the app's three states in one place:

| `RouteState` | Meaning | `/auth/*` | `/onboarding` | app routes |
| --- | --- | --- | --- | --- |
| `loading` | auth or profile resolving | splash | splash | splash |
| `guest` | signed out | render | → login | → login |
| `onboarding-required` | signed in, `onboardingCompleted !== true` | → onboarding | render | → onboarding |
| `ready` | signed in and onboarded | → home | → home | render |

- Guards: `guest-route.tsx`, `onboarding-route.tsx`, `protected-route.tsx`.
  Pages never check auth or onboarding status themselves.
- `<AppSplash />` covers every loading case, so no route flashes.

### App shell

- `AppShell` centres the phone-width column (`max-w-content`), applies the
  horizontal safe-area insets, draws the desktop frame edges (`sm:border-x`)
  and hosts the fixed `BottomNavigation`. It renders `<Outlet />` — it does
  not know about individual pages.
- `AppHeader` is sticky, handles `pt-safe-top`, and takes `title`,
  `subtitle?`, `showBack?`, `action?`, `transparent?`. Back uses
  `useNavigate(-1)`.
- `PageContainer` is the page body: `px-page`, `pt-5`, `gap-6` section
  rhythm, `pb-bottom-nav-space` clearance and the shared page-enter
  transition (CSS only, ~200ms fade + 4px rise via `tw-animate-css`).
- `BottomNavigation` is fixed, `max-w-content`, centred with
  `left-1/2 -translate-x-1/2`, `bg-surface/85` + `backdrop-blur-xl`,
  `border-t border-border`, `pb-safe-bottom`. Items are `NavLink`s, so the
  active tab is expressed as `aria-current="page"` (styled with
  `aria-[current=page]:text-primary`) and nested paths such as
  `/messages/user123` keep the parent tab active automatically.
- Pages compose `AppHeader` + `PageContainer` themselves, so a page can skip
  the header. Pages never build their own outer layout.

## 4. Directory structure

```
src/
  components/
    common/     empty-state.tsx, section-header.tsx, app-splash.tsx
    profile/    shared profile-domain UI used by onboarding, editing and
                (later) Discover: selectable-card, selection-chip,
                sport/skill/intent/intensity/area/radius/budget selectors,
                availability-selector, bio-field, profile-summary
                (renders DiscoveryProfile only)
    layout/     app-shell.tsx, app-header.tsx,
                bottom-navigation.tsx, page-container.tsx
    ui/         shadcn/ui primitives (customized — see §10)
  config/       env.ts (import.meta.env boundary), navigation.ts (tabs)
  constants/    app.ts (name, tagline, storage keys), sports.ts, areas.ts,
                profile-options.ts (skills, intents, intensity, days,
                periods, radius, budget, bio limit)
  features/
    auth/       components/ (auth-field, auth-alert, auth-divider,
                password-input, google-sign-in-button),
                pages/ (login-page, register-page), validation.ts
    discover/   components/ (buddy-card, discover-filter-sheet,
                active-filter-chips), pages/ (discover-page,
                buddy-profile-page), use-discover.ts
    profile/    components/ (profile-hero, profile-completeness-card,
                profile-section, sport-skill-list, availability-summary,
                edit-section), pages/ (profile-page, edit-profile-page)
    settings/   components/ (settings-section, preference-toggle),
                pages/ (settings-page, discovery-settings-page),
                use-preference-update.ts
    onboarding/ onboarding-draft.ts (draft storage only), onboarding-steps.ts,
                pages/onboarding-page.tsx,
                steps/ (welcome, sports, skills, intent, availability,
                location, budget, preview),
                components/ (onboarding-layout, onboarding-progress,
                selectable-card, selection-chip, availability-selector)
  hooks/        use-theme.ts, use-auth.ts, use-profile.ts
  lib/          utils.ts (cn + tailwind-merge config), initials.ts,
                storage.ts, validation.ts, profile-format.ts,
                profile-draft.ts (shared reducer), preferences.ts,
                profile-completeness.ts, discovery-profile.ts,
                discover-filters.ts, availability.ts
  pages/        home-page.tsx, activities-page.tsx, messages-page.tsx
                (auth, onboarding, profile, settings and discover live
                under features/)
  providers/    theme-context.ts, theme-provider.tsx,
                auth-context.ts, auth-provider.tsx
  repositories/
    auth/       auth-repository.ts (contract),
                firebase-auth-repository.ts, mock-auth-repository.ts
    profile/    profile-repository.ts (contract),
                firebase-profile-repository.ts, mock-profile-repository.ts
    public-profile/  public-profile-repository.ts (contract),
                firebase/mock implementations — writes own projection
    discover/   discover-repository.ts (contract), firebase/mock
                implementations, discovery-profile-document.ts,
                mock-candidates.ts — reads publicProfiles
    mock-store.ts, repositories.ts (data-source selection)
  routes/       routes.ts (ROUTES + AppRoute), app-router.tsx,
                use-route-state.ts, protected-route.tsx, guest-route.tsx,
                onboarding-route.tsx
  services/
    auth/       auth-service.ts, auth-error.ts
    profile/    profile-service.ts, profile-validation.ts
    discover/   discover-service.ts
    firebase/   config.ts (env + validation), client.ts (app/auth/db)
  styles/       theme.css — ONLY file with raw color values
  types/        theme.ts, auth.ts, user.ts, sports-profile.ts,
                preferences.ts, discovery-profile.ts, discover.ts,
                data-source.ts
  index.css     Tailwind + shadcn + theme imports, base layer
```

The Step 1 `services/api/` mock layer was removed: the mock repositories now
own development data, so the app no longer has two competing mock systems.

`features/` stays absent until the first real feature (STEP 3+). Do not
pre-create empty folders.

## 5. Code conventions

- Function components, named exports (`export function Foo()`); only `App`
  is a default export.
- File names: `kebab-case.tsx`. Components: `PascalCase`. Hooks: `useThing`.
- Render datasets from a module-level `const` array + `.map()` instead of
  repeating JSX.
- Keep files single-purpose. Delete unused props, imports and boilerplate
  immediately.
- Formatting: single quotes, no semicolons, 2-space indent (matches existing
  files).

## 6. TypeScript rules

- `strict: true`. No `any`, no `@ts-ignore`, no `as` casts to paper over a
  type — model the type properly.
- Shared shapes live in `src/types/`. Local shapes stay local.
- Use `import type { ... }` for type-only imports (`verbatimModuleSyntax` is
  on and requires it).
- Prefer `as const satisfies T[]` for literal config arrays.
- Env vars are typed in `src/vite-env.d.ts`.

## 7. Tailwind rules

- Tailwind v4: no `tailwind.config.js`. All design tokens are declared in
  `src/styles/theme.css` inside `@theme inline`.
- Use semantic utilities only: `bg-background`, `bg-card`, `text-foreground`,
  `text-muted-foreground`, `border-border`, `bg-primary`,
  `text-primary-foreground`, `bg-secondary`, `bg-accent`, `bg-success`,
  `bg-warning`, `bg-destructive`.
- Never write arbitrary color values: `bg-[#B8FF32]`, `text-[#111]`,
  `style={{ color: '#FC5200' }}` are forbidden in components.
- Typography uses the token levels: `text-display`, `text-heading-1..3`,
  `text-title`, `text-body`, `text-body-small`, `text-label`, `text-caption`,
  `text-metric`.
- Layout tokens: `px-page`, `max-w-content`, `h-bottom-nav`, `pt-safe-top`,
  `pb-safe-bottom`, `pl-safe-left`, `pr-safe-right`.
- Layout clearance: `pb-bottom-nav-space` (nav height + bottom safe area) on
  any scrollable page body. `PageContainer` already applies it.
- `cn()` from `@/lib/utils` merges class names; use it whenever a component
  accepts `className`.
- **When you add a `text-*` typography token to the theme, also register it in
  the `font-size` class group in `src/lib/utils.ts`.** tailwind-merge
  otherwise classifies it as a text *color* and silently drops the real color
  class (this caused unreadable buttons before it was fixed).

## 8. Theme rules

- `src/styles/theme.css` is the single source of raw values. Light values in
  `:root`, dark overrides in `.dark` (dark block must stay after `:root`).
- Dark mode is the primary identity; light mode must stay accessible.
- The only permitted hex outside `theme.css` is the `theme-color` meta tag in
  `index.html` (browser chrome cannot read CSS variables).
- The single permitted `bg-[...]` is shadcn's token-derived
  `color-mix(in oklch, var(--secondary), var(--foreground) 5%)` hover in
  `button.tsx` — it contains no raw value. Anything with a literal color is
  forbidden.
- Full design-system reference: `theme.md`.

## 9. Mobile-first rules

- Design for 390–430px width first, then let it scale up.
- Desktop is a centred column: `max-w-content` (30rem) inside `AppShell`,
  with `sm:border-x` frame edges. Never a desktop dashboard.
- The fixed bottom navigation is centred on the same `max-w-content` column,
  so it stays aligned with the app on any screen.
- Minimum touch target 44px — `Button` default is `h-11`, icon buttons
  `size-11`, primary CTA `size="lg"` is `h-13` full-width.
- Safe areas come from `env(safe-area-inset-*)` mapped to spacing tokens.
  Never hardcode notch offsets.
- Use `min-h-dvh`, not `min-h-screen`.

## 10. shadcn usage

- Installed: button, card, avatar, badge, input, textarea, dialog, sheet,
  tabs, separator, skeleton, switch, dropdown-menu. Add more only when a step
  needs them (`npx shadcn@latest add <name>`).
- Components in `src/components/ui/` are ours — edit them freely, but keep
  edits token-based. Already customized: mobile button/icon sizes, solid
  `destructive` button, `rounded-2xl` bordered card with `shadow-sm`,
  uppercase caption badges, `border-border` instead of `ring-foreground/10`
  on card/dialog/sheet/dropdown.
- Note: `secondary` maps to sport orange (brand decision), so
  `variant="secondary"` is an energetic CTA, not neutral chrome. Use
  `variant="outline"` or `ghost` for neutral actions.

## 11. Firebase architecture

- `src/services/firebase/config.ts` — reads `env.firebase`, reports which
  keys are missing, `assertFirebaseConfigured()`.
- `src/services/firebase/client.ts` — the single `initializeApp`. `auth` uses
  `initializeAuth` with `[indexedDBLocalPersistence, browserLocalPersistence]`,
  so Firebase keeps users signed in across reloads and manages its own
  tokens. We never store tokens ourselves.
- Everything is created on first use, so mock mode never initialises Firebase.
- Only `src/repositories/**` may import from `firebase/*`. Pages, components
  and providers must not.

### Firestore user document

`users/{uid}` is created on first sign-in with the account fields only, then
completed by onboarding. Full schema and field semantics:
`docs/data-model.md`.

- `createIfMissing()` reads before writing, so repeated Google sign-ins never
  overwrite a profile.
- `saveProfile()` uses `setDoc(..., { merge: true })` with a server
  `updatedAt`, so `email`, `photoUrl` and `createdAt` from the auth step
  survive onboarding. Never write the document without merge.
- Only stable ids are persisted (`badminton`, `training`, `subang-jaya`);
  labels are resolved for display by `src/lib/profile-format.ts`.

### Privacy rules

- Location is **approximate only**: an area slug plus a travel radius. No
  coordinates, addresses, GPS permission or Maps integration — and none may
  be added without an explicit step that designs it.
- Do not collect phone numbers, ids, relationship status, orientation, dating
  preferences, weight or health data.
- Profile photo upload is not implemented (it would pull in Firebase
  Storage). Use the provider photo URL when present, otherwise initials.

### Future: Discover must not read `users/{uid}`

The private document is owner-only and the rules enforce it. When Discover is
built, expose a deliberate projection (e.g. `publicProfiles/{uid}` holding
only discovery-safe fields) rather than opening these reads up. That
collection does not exist yet — do not create it early.

### Security rules

`firestore.rules` (+ `firebase.json`, empty `firestore.indexes.json`): a
signed-in user may `get`/`create`/`update` only `users/{their uid}`; delete is
disabled and every other path denies read and write. Deploy with
`firebase deploy --only firestore:rules`.

## 12. Mock data architecture

- `VITE_DATA_SOURCE=mock` swaps in `mockAuthRepository` and
  `mockProfileRepository`. The UI cannot tell which backend is active — never
  branch on the data source in a component.
- Mock state lives in localStorage through `src/repositories/mock-store.ts` —
  the only module allowed to touch storage for mocks. Keys are declared once
  in `MOCK_STORAGE_KEYS` (`src/constants/app.ts`). Pages never call
  `localStorage` directly.
- Every mock method is Promise-based with a small delay, so swapping in a real
  backend changes no call site.
- Mock sessions and completed profiles survive a refresh; sign-out clears the
  session. Onboarding is never repeated after a reload. There is no fake auth
  server and no Express backend.

## 13. Capacitor rules

- `capacitor.config.ts`: `appId: com.sportsbuddy.app`,
  `appName: Sports Buddy`, `webDir: dist`.
- The app must keep running as a plain web app in dev (`npm run dev`).
- Native packaging later: `npm run build && npx cap sync` (or
  `npm run cap:sync`). `android/` and `ios/` are gitignored and are only
  generated when `npx cap add <platform>` is actually needed.
- No native plugins until a feature requires one.
- **Google sign-in caveat:** the current implementation is the Firebase web
  popup flow, intended for browser development. Popups are unreliable in a
  Capacitor WebView, so a native Google auth plugin will be introduced in the
  dedicated native phase; only the repository layer will change. Email/password
  auth is already portable.

## 14. Environment variable rules

- Client env vars must be prefixed `VITE_`.
- Read them only in `src/config/env.ts`; import `env` elsewhere.
- `.env.example` lists required keys with empty values. Real `.env` files are
  gitignored and must never be committed.
- Keys: `VITE_DATA_SOURCE` (`mock` | `firebase`, defaults to `mock`),
  `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
  `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
  `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
- In `mock` mode Firebase credentials are not required and never read. In
  `firebase` mode missing keys raise a readable developer error.
- Full setup walkthrough: `docs/firebase.md`.

## 15. Naming conventions

| Thing | Convention | Example |
| --- | --- | --- |
| Files / folders | kebab-case | `foundation-preview.tsx` |
| Components | PascalCase | `MobilePage` |
| Hooks | camelCase `use*` | `useTheme` |
| Types / interfaces | PascalCase, no `I` prefix | `User`, `ThemePreference` |
| Constants | SCREAMING_SNAKE_CASE | `THEME_STORAGE_KEY` |
| Service functions | verb first | `getCurrentUser` |
| CSS tokens | kebab-case, semantic | `--muted-foreground` |

## 16. Import conventions

- Always use the `@/` alias for anything under `src/` — no `../../`.
- Order: React → third-party → `@/` internal → types. Blank line between
  groups.
- No barrel `index.ts` files; import the module directly.

## 17. State management expectations

- Local `useState` by default. Navigation state belongs to React Router
  (`useNavigate`, `NavLink`, `useLocation`) — never mirror the current route
  in component state.
- Cross-cutting app state goes in a provider under `src/providers/`: theme and
  auth. `AuthProvider` is the sole owner of the signed-in user — do not copy
  it into page state.
- Server data belongs in service calls; add a data-fetching library only when
  caching/invalidation is genuinely needed — not before.
- No Redux/Zustand/MobX unless a step justifies it.

## 18. Feature organization

When features start (STEP 2+), each gets a folder:

```
src/features/<feature>/
  components/   feature-only UI
  hooks/        feature-only hooks
  <feature>-service.ts   calls src/services/*
  types.ts
```

Promote a component to `components/common/` only when a second feature uses
it. Feature logic never leaks into `components/ui/`.

## 19. Things that must NOT be done

- Hardcode colors in components (hex/rgb/hsl or `bg-[...]` color values).
- Duplicate theme logic outside the theme provider.
- Import mock data or a backend SDK inside UI components; pages talk to
  `useAuth()` / services only.
- Log passwords, Firebase tokens or raw auth errors, or surface a raw
  `auth/...` code to a user.
- Branch on `env.dataSource` outside `src/repositories/repositories.ts`.
- Hardcode option lists in JSX — sports, skills, intents, intensity, days,
  periods, radius, budget and areas all come from `src/constants/*` via
  `.map()`.
- Persist display labels (`"Subang Jaya"`, `"RM20–40"`) instead of stable ids.
- Write to Firestore on every tap during onboarding; save once on completion.
- Ask for precise location, GPS permission or a photo upload.
- Render a private profile field in anything a second user could see — build
  a `DiscoveryProfile` with `toDiscoveryProfile()` instead.
- Hardcode a completeness percentage, a preference default, or a display
  label; use the completeness, preferences and formatter modules.
- Write to Firestore on every chip tap in an editing screen.
- Ship a control that looks functional but is not (account deletion,
  blocked users, policy links, a Connect button before STEP 8).
- Read `users/{uid}` for anything about another member, or widen its rules to
  make Discover easier — project through `publicProfiles/{uid}` instead.
- Display a distance, a compatibility percentage or any invented metric.
- Attach a realtime listener to `publicProfiles`.
- Add dependencies that nothing uses yet.
- Create empty placeholder files/folders or single-implementation
  abstractions (factories, interfaces, wrappers) "for later".
- Suppress type errors with `any` or `@ts-ignore`.
- Build a desktop-first layout.
- Commit `.env` or any real secret.
- Design against notch sizes instead of `env(safe-area-inset-*)`.

## 20. Current implementation status

STEP 1 — Project Foundation: Vite + React 19 + strict TypeScript, `@/` alias,
Tailwind v4 semantic token system, dark/light/system theme with persistence
and a no-flash boot script, typography/radius/elevation/safe-area tokens,
13 customized shadcn primitives, Capacitor config.

STEP 2 — App Shell + Mobile Navigation: React Router 7 with a centralized
route table, `AppShell` / `AppHeader` / `PageContainer` / `BottomNavigation`,
`mainNavigation` rendered with `.map()`, CSS-only page transitions.

STEP 3 — Firebase + Authentication Foundation: single lazy Firebase
initialisation, `VITE_DATA_SOURCE` switching, repository contracts with
Firebase and mock implementations, `authService` + error mapper,
`AuthProvider` / `useAuth()`, auth routes and guards, email + Google sign-in,
idempotent `users/{uid}` creation, `firestore.rules`.

STEP 4 — Onboarding + Sports Profile: `/onboarding` with eight steps behind
one route, shared draft reducer with localStorage persistence, centralized
sports/areas/option datasets, per-sport skill levels, intents, intensity,
availability, area + radius, budget, bio, step validation, `ProfileProvider`,
`useRouteState()` guards, one merged write on completion.

STEP 5 — User Profile Experience + Preferences: rebuilt `/profile` with a
hero and derived profile strength, `/profile/edit` reusing the onboarding
reducer and selectors, `UserPreferences` (discovery / privacy /
notifications) with centralized defaults and read-time normalization,
upgraded `/settings` plus `/settings/discovery`, and the `DiscoveryProfile`
privacy boundary with an in-app preview.

STEP 6 — Discover Sports Buddies:

- `publicProfiles/{uid}` added as the only member-readable collection;
  `users/{uid}` stays owner-only and Discover never reads it.
- `DiscoveryProfile` tightened to the discovery allowlist — `radiusKm`
  removed (it is a private filter), `discoverable` and `updatedAt` added.
- `PublicProfileRepository` (writes own projection) and `DiscoverRepository`
  (reads others), each with Firebase and mock implementations, plus ten
  seeded mock candidates.
- `profileService` synchronizes the projection: written on onboarding and
  edits, deleted when discovery is switched off, recreated when switched on,
  and repaired on load for users who predate it.
- `discoverService` excludes the signed-in user and non-discoverable
  profiles, returns one batch of 30 ordered by recency, and exposes pure
  client-side filtering.
- `/discover` rebuilt: buddy cards, active filter chips, a bottom filter
  sheet, refresh, skeleton, empty, no-match and error/retry states.
- `/discover/:userId` shows a candidate's discovery-safe profile through the
  shared `ProfileSummary`, with the Discover tab staying active.
- Firestore rules extended: `publicProfiles` readable by any signed-in user,
  writable only by its owner with a matching `userId`.
- Deliberately absent: compatibility scores, Connect, distance, pagination.

Verified in mock mode with a headless browser at 390px, dark and light: the
feed rendering four candidates under the saved discovery preferences with
active filter chips; the signed-in user's own seeded projection never
appearing in their feed; the filter sheet narrowing and Reset restoring the
saved preferences; an area filter producing the no-match empty state; a
forced repository failure producing "We couldn't load sports buddies." with
Try again and no raw error text; the candidate detail page rendering only
discovery-safe fields; a missing projection being created automatically on
app open; a skill edit propagating to the projection with no second action;
and switching discovery off deleting the projection (`[]`) and back on
restoring it.

**Live Firebase verification is still outstanding** — no project credentials
exist in this environment. The firebase-mode paths (auth, profile,
preferences, projection writes and Discover reads) are implemented and typed
but have not run against a real project.

Not done (by design): compatibility scoring, Connect and mutual connections,
chat, activity planning, maps and precise distance, calendar, notification
delivery, subscriptions, analytics, native platforms, account deletion,
photo upload.

## 21. Local development credentials (mock mode only)

`VITE_DATA_SOURCE=mock` seeds one demo account. These are development-only
values and are never displayed in the UI:

| Field | Value |
| --- | --- |
| Email | `demo@sportsbuddy.app` |
| Password | `password123` |

"Continue with Google" in mock mode signs in a second seeded account
(`gary.google@sportsbuddy.app`). Registration creates additional local
accounts that persist in localStorage until cleared.

## 22. Documentation upkeep

Update `CLAUDE.md` (§20) and `theme.md` at the end of every step, with what
actually exists — not what was planned.

---

**Completed:**
STEP 1 — Project Foundation
STEP 2 — App Shell + Mobile Navigation
STEP 3 — Firebase + Authentication Foundation
STEP 4 — Onboarding + Sports Profile
STEP 5 — User Profile Experience + Preferences
STEP 6 — Discover Sports Buddies

**Current Step:** STEP 6 — Discover Sports Buddies

**Next Step:** STEP 7 — Compatibility + Matching Engine
