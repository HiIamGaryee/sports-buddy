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
| Tests | Vitest (`npm test`); Firestore rules against the emulator (`npm run test:rules`, needs JDK 21+) |
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
  └ AppShell (layout route: breakpoint-aware navigation + content column)
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
  compatibility engine — do not write a second version.
- Deliberately absent: Connect and distance. There are no coordinates yet, so
  nothing may display "4 km away"; area is the stand-in. Ranking became
  compatibility-based in STEP 7; `updatedAt` is only retrieval order.
- Responsive (STEP 9.5): 1-column feed on a phone, 2 from `sm`, 3 from `xl`.
  Filters are a bottom sheet below `lg` and a persistent sidebar from `lg`;
  both render the same `DiscoverFilterFields` over the same session state, so
  there is one filter implementation, not three.
- Full walkthrough: `docs/discover.md`.

### Compatibility + matching (STEP 7)

```
publicProfiles batch
        ↓  isVisibleCandidate()   self + discoverable  → HARD exclusion
        ↓  matchesFilters()       active Discover filters → HARD exclusion
        ↓  calculateCompatibility()   per viewer, at runtime
        ↓  rankBuddies()          score desc, deterministic tie-breaks
RankedBuddy[] → BuddyCard / /discover/:userId
```

- Responsibilities stay split: `DiscoverRepository` retrieves candidates,
  the **matching engine** scores them, `discoverService` filters and ranks.
  No scoring in a page, a card or a Firestore query.
- `src/services/matching/` is the engine and it is **pure** — no Firebase, no
  storage, no React, no `Date.now()`, no `Math.random()`. The same pair always
  produces the same score.
  - `matching-constants.ts` — **every** weight, threshold and label band.
  - `matching-factors.ts` — the five pure calculators
    (`calculateSportCompatibility`, `calculateSkillCompatibility`,
    `calculateAvailabilityCompatibility`,
    `calculateLocationCompatibility`, `calculateBudgetCompatibility`) plus
    `getSharedSports`, `getBestSportMatch`, `getSkillScore`.
  - `matching-service.ts` — `toMatchingSubject`, `calculateCompatibility`,
    `getTopMatchingReasons`, `getCompatibilityLabel`, `rankBuddies`.
- Types (`src/types/matching.ts`): `MatchingSubject` (all the engine may know
  about the viewer), `CompatibilityFactor`, `CompatibilityResult`,
  `MatchingReason`, `RankedBuddy` (`{ profile, compatibility }` — the
  projection is never mutated, so STEP 8 adds connection state *beside*
  compatibility).

| Factor | Weight | Rule |
| --- | --- | --- |
| Sports overlap | 35 | 0.70 first shared sport (0.50 if not a preferred sport), +0.15 each extra, 0 with none |
| Skill | 20 | best shared sport only; rank distance 0/1/2/3 → 1.0/0.8/0.4/0.1 |
| Availability | 20 | shared periods 0/1/2/3+ → 0/0.6/0.8/1.0 |
| Location | 15 | same area 1.0, same region 0.6, different 0.2, missing 0 |
| Budget | 10 | real overlap 1.0, touching 0.6, gap ≤ RM10 0.4, else 0 |

Weights total 100 (asserted by a test). Every factor normalizes to 0–1, then
weights are applied, so the breakdown always sums to the headline score.

- **Score is derived, never persisted.** No `compatibilityScore` field, no
  `matches/{id}` collection, no stored reasons — a score depends on who is
  looking. Computed from data already in the batch: no extra reads, no N+1.
- **Filtering ≠ ranking.** Hard filters run first and an excluded candidate
  is never scored; a low score never hides anyone.
- **Location is approximate area only.** No coordinates exist, so nothing may
  render a distance. Areas declare a coarse `AreaRegion`
  (`src/constants/areas.ts`) documented as *not* travel distance, and
  `calculateLocationCompatibility()` is the single function a real distance
  provider will replace. `maxDistanceKm` is stored but cannot be enforced.
- Reasons are typed (`MatchingReason`) and deterministic: only factors with
  something positive to say (`strength ≥ 0.5`), ordered by contribution
  (`strength × weight`) with `REASON_PRIORITY` as the tie-break, and the
  sports reason dropped when a single shared sport makes the skill reason say
  it already.
- `hasAvailabilityOverlap` / `getSharedAvailability` / `countSharedPeriods`
  live once in `src/lib/availability.ts` and are shared with Discover
  filtering. Never write a second version.
- Tests: `npm test` (Vitest) — `src/services/matching/matching-service.test.ts`
  and `src/lib/discover-filters.test.ts`.
- Full walkthrough: `docs/matching.md`.

### Connect + mutual connection (STEP 8)

```
UI (BuddyCard / candidate profile / success dialog)
  ↓ useConnections()
ConnectionProvider        one React source of truth, one scoped subscription
  ↓
connectionService         self-connect guard, user-safe error mapping
  ↓
connectionRepository      chosen once in repositories.ts
  ↓
Firebase (transaction + onSnapshot)  |  Mock (localStorage + listeners)
```

- **Compatibility and relationship are separate systems.** Nothing in
  `src/services/matching` imports the connection domain, and nothing in the
  connection domain imports matching. The engine stays pure, deterministic
  and unaware that connections exist.
- `src/types/connection.ts` — `ConnectionStatus` (`pending | connected`, what
  Firestore stores), `ConnectionState` (`none | pending-outgoing |
  pending-incoming | connected`, what a *viewer* sees), `Connection`,
  `ConnectionMap`. `DiscoverBuddy` (`src/types/discover.ts`) is
  `{ profile, compatibility, connectionState }` — three fields, three
  concerns. `CompatibilityResult` is never given a `connectionState`.
- `src/lib/connection.ts` is pure — no Firebase, no storage, no React:
  - `createConnectionId(a, b)` — the deterministic pair id: **sorted** ids
    joined with `__`. `(a, b)` and `(b, a)` must return the same string; it is
    what makes one relationship one document. The separator is `__` because
    mock ids contain single underscores (`a_b` + `c` would collide with `a` +
    `b_c`).
  - `getConnectionState(connection, uid)` — the one perspective rule.
  - `getOtherParticipantId()` / `toConnectionMap()` / `toConnectionStates()`.
  - `findNewMutualConnection(before, after)` — the success dialog fires on a
    **transition**, never on existing state.
- `src/services/connection/connection-service.ts` — rejects self-connection
  (defence in depth), delegates, and converts every failure into a
  `ConnectionError` with a user-safe message
  (`connection-error.ts`). No React state, no Firebase.
- `src/repositories/connection/*` — contract, Firestore document mapper (the
  one place a malformed pair is rejected, returning `null`), plus the Firebase
  and mock implementations. Only stable ids and relationship metadata are
  persisted.
- `src/providers/connection-provider.tsx` + `connection-context.ts` — mounted
  in `ProtectedRoute` only, so connections are never queried on the auth or
  onboarding screens. `useConnections()` exposes `connections` (a
  `otherUserId → Connection` map), `getConnectionState`, `incomingUserIds`,
  `connectedCount`, `connect`, `cancelRequest`, `justConnectedUserId`,
  `clearJustConnected`.
- `src/features/connections/components/connect-action.tsx` is the **only**
  place connection wording and button behaviour live, so Discover and the
  candidate profile cannot drift apart. It owns its own busy flag (what stops
  a double tap) and its own error line. `connected` renders a status, never a
  clickable button — no dead controls.

**Transaction strategy.** `connect()` is one Firestore transaction: read the
pair document, create it pending when missing, otherwise add the caller and
promote to `connected` once both have asked. Both people can press Connect in
the same second, so a read-then-write would leave the pair stuck pending or
create two documents. It is also **idempotent** — a repeated Connect returns
the existing document untouched. `cancelPending()` is a transaction too, and
refuses a connected relationship or someone else's request.

**Security model** (`firestore.rules`, `match /connections/{connectionId}`):
read requires `uid in resource.data.participants`; create requires exactly two
distinct participants, an id that matches the pair, `requestedBy == [uid]` and
`status == 'pending'`; update pins the write to *exactly the caller adding
themselves* (`newRequestedBy.removeAll(old) == [uid]`, nothing removed,
participants and `createdAt` unchanged) and permits `connected` only when both
participants have asked; delete only for the sole requester of a pending
document. A key allowlist rejects any extra field, so no score, profile copy
or chat id can be smuggled in. `npm run test:rules` verifies all of it against
the emulator (20 tests).

**Realtime strategy.** Connections are the **only** realtime data in the app,
and the subscription is scoped to
`participants array-contains currentUserId` with a limit. This is where
realtime earns its cost: the other person connecting back updates the screen
without a refresh. There is **no listener on `publicProfiles`** — Discover
stays a one-time read plus manual refresh — and never a global `connections`
listener.

- Connection state is joined **after** ranking
  (`discoverService.joinConnectionStates()`), from the provider's single
  subscription, so decorating 30 candidates costs zero extra reads (no N+1)
  and cannot change a compatibility score or the order.
- Incoming requests are lifted into a "Wants to connect" section above the
  ranked feed. That is ordering only — the score is calculated normally and
  never inflated because someone asked first.
- "Not now" is session-only in-memory state. No `dismissedProfiles`
  collection exists, and refresh brings the candidate back.
- Deliberately absent: disconnect/unfriend, block/report, chat, notification
  delivery, a connections list screen.
- Full walkthrough: `docs/connections.md`.

### Realtime chat (STEP 9)

```
UI (Messages list / conversation screen)
  ↓ useConversations() · useConversation(id)
chatService              authorization + content rules, user-safe errors
  ↓
chatRepository           chosen once in repositories.ts
  ↓
Firebase (transaction + batch + onSnapshot)  |  Mock (localStorage + listeners)
```

- **A connection is the permission; a conversation is the channel; a message
  is an immutable text event.** `chatService` never performs a connection
  transition and `connectionService` never touches a message. The only thing
  crossing the line is the pure `canChat()` in `src/lib/chat.ts`, which calls
  STEP 8's `getConnectionState()` rather than re-deriving it.
- **`conversationId === connectionId`.** The STEP 8 pair id is the
  conversation's document id, so authorization is one lookup, navigation
  needs no lookup, and there is no second pair-id system.
- `src/types/chat.ts` — `Conversation`, `ChatMessage`, `MessagePage`,
  `EnsureConversationInput`, `SendMessageInput`. ISO strings in the domain;
  `Timestamp` and `DocumentSnapshot` never leave the repository.
  `ChatMessage.createdAt` is `null` while a local write resolves its server
  timestamp — every consumer tolerates it.
- `src/lib/chat.ts` is pure — `canChat`, `normalizeMessageContent`,
  `getMessageError`, `compareMessages`, `mergeMessages` (dedupe by **id**,
  incoming wins, chronological with a stable tie-break).
  `src/lib/chat-format.ts` is the only place chat dates are formatted
  (`Intl` only, no date library).
- `src/constants/chat.ts` — `MAX_MESSAGE_LENGTH` (1000), `MESSAGE_PAGE_SIZE`
  (20), `MESSAGE_COUNTER_THRESHOLD`, `SCROLL_BOTTOM_THRESHOLD_PX`. Nothing
  inlines those numbers.
- `src/services/chat/chat-service.ts` — every guarded call takes a
  `Connection`, never a bare user id, so `createConversation('random-user')`
  does not exist. Validates trimmed content before anything is written and
  maps every failure to a `ChatError` with a user-safe message
  (`chat-error.ts`).
- `src/repositories/chat/*` — contract, document mappers (the one place a
  malformed conversation or message is rejected), Firebase and mock
  implementations, plus `mock-conversations.ts` for seeded threads.
- `useConversations()` builds the Messages list from the **connection list**,
  so a connected buddy who has never messaged still gets a "Start a
  conversation" row. `useConversation(id)` owns one open conversation —
  messages are never held in a global provider.
  `useChatScroll()` owns scroll behaviour.

**Lazy creation.** `ensureConversation()` runs when a connected pair first
opens the chat, not when they connect, and is idempotent (a transaction in
Firebase mode). Buddies who never chat cost no documents.

**Realtime strategy.** Two scoped subscriptions and nothing else: the user's
own conversations (`participants array-contains uid`, limit 100) and the
newest 20 messages of the **open** conversation. No whole-history listener,
no global message listener, and still no listener on `publicProfiles`. With
STEP 8's connections listener a session holds at most three, all scoped.

**Pagination.** `orderBy('createdAt','desc') limit(20)`, reversed to
oldest → newest in one function so realtime updates cannot flip the list.
"Load earlier messages" is an explicit button using
`startAfter(<cursor doc>)`; the cursor never leaves the repository — the
service and UI pass a **message id**. `hasMore` comes from the first realtime
page, then only from pagination.

**Atomic send.** The message and the conversation preview are written
together (a Firestore `writeBatch`), so the list can never show a preview for
a message that does not exist. Nothing optimistic is inserted: the composer
clears only after a confirmed write, which is what preserves the user's text
on failure.

**Security boundary.** `firestore.rules` reads
`connections/{conversationId}` on every conversation and message access and
requires `status == 'connected'` plus `uid in participants`.
`uid in resource.data.participants` alone would let somebody fabricate a
conversation with a person they are not connected to. Messages are
create-only; `senderId` must equal `request.auth.uid`; content must be a
string that is non-empty after `trim()` and ≤ 1000 characters; key allowlists
reject any extra field. 23 of the 43 emulator rules tests cover chat.

- **Master–detail (STEP 9.5).** `/messages` and `/messages/:conversationId`
  are both children of `MessagesLayout` inside `AppShell`. Below `md` one
  pane shows at a time (list, or conversation); from `md` the list stays
  beside the conversation, and `/messages` renders a "select a buddy" detail
  pane. Deep links work identically at every width. On a phone the bottom
  navigation is not rendered on the conversation route, so the composer owns
  the bottom safe area.
- The list pane stays mounted while a conversation is open, so its single
  conversations subscription is not torn down and recreated on navigation —
  the trade is that the batched profile query also runs while a phone shows
  the chat.
- No index was added: the conversation query is `array-contains` + `limit`
  with **no `orderBy`** (ordering is client-side because the list merges with
  buddies who have no conversation), and the message query is single-field
  inside a subcollection.
- Deliberately absent: unread state and any nav badge, read receipts, typing,
  presence, media, replies, reactions, editing, deletion, group chat, push
  notifications, and structured planning.
- Full walkthrough: `docs/chat.md`.

### Plan Together (STEP 10)

```
UI (planner page / chat plan card)
  ↓ useActivityPlan(id) · usePlanPreview(id)
activityPlanService     authorization + validation, user-safe errors
  ↓
activityPlanRepository  chosen once in repositories.ts
  ↓
Firebase (transactions + onSnapshot)  |  Mock (localStorage + listeners)
```

- **Connection is the permission, chat is the conversation, the plan is the
  decisions.** `activityPlanService` never sends a message, `chatService`
  never touches a plan, and no plan state is written into message history.
  `canPlanTogether()` calls STEP 8's `getConnectionState()` rather than
  re-deriving the rule.
- `src/types/planning.ts` — `Proposal<T>` (`value`, `proposedBy`,
  `acceptedBy`, `version`, `updatedAt`), `PlannedTime`, `PlanStatus`
  (`draft | ready`), `ProposalKind`, `ActivityPlan`, `SharedSportOption`,
  `SuggestedSlot`.
- `src/lib/planning.ts` is pure — `getSharedSportOptions`,
  `getSharedAvailabilitySlots` (re-exported STEP 9 helper, not a second
  implementation), `getUpcomingDatesForAvailability`, `getTimeRangeError`,
  `getSuggestedBudget`, `applyProposal`, `applyAcceptance`, `isAcceptStale`,
  `isProposalAgreed`, `isPlanReady`, `getProposalState`.
  `src/lib/plan-format.ts` is the only place plan values become words.
- `src/lib/budget.ts` is new and **shared**: the compatibility engine and the
  planner now use one overlap formula (`getBudgetRangeOverlap`,
  `getSharedBudget`), extracted from `matching-factors.ts` in this step.
- `src/constants/planning.ts` — `PERIOD_TIME_WINDOWS`,
  `DEFAULT_SESSION_MINUTES`, `MIN_SESSION_MINUTES`, `SUGGESTED_DATES_PER_SLOT`,
  `SUGGESTION_HORIZON_DAYS`, `PLAN_STEPS`. Nothing inlines those.

**Active-draft strategy.** One active plan per connection, at the
deterministic id `{connectionId}__active`. `ensureActivePlan()` is a
transaction on that exact document, so two people tapping "Plan a session" at
once share one draft — no query, no composite index, and the STEP 8 connection
schema and rules were **not** touched (no `activePlanId` pointer). The id is
derived from the connection but not equal to it, leaving room for archived
plans later.

**Proposal model.** Proposing accepts implicitly and bumps `version`, resetting
`acceptedBy` to the proposer; a value is agreed only when both participants
have accepted at its current version. Both operations are idempotent.
`version` closes the stale-acceptance race — an accept names the version it
saw, checked inside the transaction — so agreeing to a screen that has since
changed is refused, not silently applied.

**Readiness.** `ready` ⟺ sport, time AND budget each agreed by both. Status is
recomputed in the same transaction as the change, and the rules recompute it
independently, so a participant cannot claim `ready`. Replacing an agreed
value drops the plan back to `draft`.

**Time.** `PlannedTime` stores a local date, local start/end and the IANA zone
— deliberately not a UTC instant, and nothing hardcodes UTC+8. Suggestions are
REAL upcoming dates walked forward from today, never hardcoded, never in the
past. The copy says "Based on your Sports Buddy availability" because we have
no access to anyone's actual calendar.

**Realtime.** One `onSnapshot` on ONE document while the planner (or a chat
showing the plan card) is open. No query over `activityPlans`, no global
listener.

**Security.** `match /activityPlans/{planId}` reads
`connections/{connectionId}` on every access and requires
`status == 'connected'`. A proposal may change in exactly three ways:
unchanged, a new proposal by the caller, or the caller adding **only
themselves** to `acceptedBy` — so one participant can never agree on the
other's behalf, remove their agreement, or fake `ready`. Identity fields are
frozen; delete is denied. 19 of the 62 emulator rules tests cover plans.

- The planner is a `size="wide"` page inside `AppShell` (not the chat pane):
  focused steps on a phone, and `grid-aside-end` with a sticky `PlanSummary`
  from `lg`.
- Chat is the single entry point: a header action and a plan card above the
  composer, via `ChatLayout`'s new `action` and `banner` slots.
- `PlanSummary` already renders a venue row so STEP 11 can fill it in.
- Deliberately absent: venue, maps/places, GPS, confirmed activity, calendar,
  notifications, plan history, cancellation, AI suggestions.
- Full walkthrough: `docs/planning.md`.

### Venue discovery (STEP 11)

```
UI (venue step / map)
  ↓ useVenueSearch(sport, area)
venueService            search area, ranking, snapshot validation
  ↓
venueRepository         chosen once in repositories.ts, from env.venueSource
  ↓
Google Places (New) REST  |  Mock venues
```

- **PRIVACY IS THE DESIGN.** The app still stores an `areaId` and nothing
  else: no `navigator.geolocation` anywhere, no permission requested, no
  coordinates on `users/{uid}`, no live or background location.
- `AreaDefinition` gained `center` — the **public approximate centroid** of
  the area, the thing a map label points at. It is not anyone's home, it does
  not move, and it is identical for everyone who picked that area.
- `venueService.getSearchArea(areaA, areaB)` → `PlanningSearchArea`
  (`center`, `radiusMeters`, `areaIds`), the midpoint of the two AREA
  centroids. Transient: never persisted, never stored against a user, never
  called anyone's location. Copy says "around the midpoint of Subang Jaya and
  Petaling Jaya", and distance is always "from the search area".
- `src/lib/geo.ts` is pure: `isValidCoordinate`, `calculateMidpoint`,
  `calculateHaversineDistance`, `deriveVenueSearchRadius` (5 km base widening
  with area spread, clamped 3–12 km — deliberately NOT the profile's
  `radiusKm`), `formatDistance`, `buildGoogleMapsUrl`.
- `src/types/venue.ts` — `GeoPoint`, `AreaLocation`, `PlanningSearchArea`,
  `Venue`, `VenueSelection`, `VenueSearchParams`, `VenueSearchResult`.
- `src/constants/venues.ts` — `SPORT_VENUE_SEARCH` (every `SportId` → search
  terms + label; running/cycling-style sports map to parks, tracks, stadiums),
  radius bounds, `VENUE_RESULT_LIMIT`, debounce and minimum query length.
- `googleVenueRepository` calls **Places API (New)** over REST with a narrow
  field mask; `mapGooglePlaceToVenue()` is the only boundary, so a raw place
  object never reaches state or storage. `mockVenueRepository` serves 12 real
  Klang Valley venues tagged by sport.
- `src/services/google/maps-loader.ts` is the ONLY place the Maps JavaScript
  API is loaded — one cached promise, one script tag. Search does not use it,
  so a page with no map loads no Google JavaScript.
- `VenueMap` is presentation only: it draws markers and reports a click. It
  never searches, never touches a plan, never sees Firebase. **If it fails to
  load it renders nothing and the list is untouched** — nothing is map-only.
  Marker colours are read from live theme tokens, since the Maps API needs
  colour strings and cannot take a class.

**Environment.** `VITE_VENUE_SOURCE` (`mock | google`, defaults to `mock`) is
**independent of `VITE_DATA_SOURCE`**, so Firebase plus mock venues is a
normal setup and Google billing is never a prerequisite. The key lives only in
`env.google.mapsApiKey`, is never logged, and a missing key gives a developer
setup message in dev and a plain unavailable state in production — it never
crashes the app. Restrict production keys by referrer + API and set quotas
(`docs/venues.md` §17).

**Cost controls.** A Places request happens when the venue step opens, when
typing pauses (400 ms, 3+ characters) or on retry — never on render, hover,
marker click or map pan, and never before the plan is `ready`. A small
in-memory cache serves repeats, results are capped at 16 in the request and
again after ranking, and there is no auto-search on map movement.

**Plan integration.** `ActivityPlan` gained
`venueProposal: Proposal<VenueSelection>` using the STEP 10 machinery
unchanged, plus status `venue-agreed`. `ready` kept its name and now means
"ready for a venue" — no migration. Plans predating the field read it as an
empty proposal (mapper, `normalizeActivityPlan()`, and `data.get(...)` in the
rules). A venue may only be proposed from `ready`, because the search depends
on the agreed sport.

**Persistence.** Only the `VenueSelection` snapshot (`placeId`, `name`,
`address`, `location`, `googleMapsUri`) is stored — ratings, categories and
price bands are dropped because they go stale and were not agreed to. There is
**no `venues` collection**; discovery results are transient.

- Deliberately absent: booking, availability, pricing in ringgit, travel time
  or ETA, Routes API, custom manual venues, confirmed activity, calendar,
  notifications.
- Full walkthrough: `docs/venues.md`.

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
- `ProtectedRoute` also mounts `ConnectionProvider` (and the single
  `ConnectionSuccessDialog`), so relationship state is only ever queried for
  an authenticated, onboarded user — never on `/auth/*` or `/onboarding`.

### App shell

- `AppShell` owns the frame and is the **only** place that decides which
  navigation exists at a given width (STEP 9.5):

  | Width | Navigation | Scrolling |
  | --- | --- | --- |
  | `< md` (<768px) | `BottomNavigation`, fixed | the document scrolls |
  | `md` (768–1023px) | `NavigationRail`, 80px | the content column scrolls |
  | `lg` (≥1024px) | `DesktopSidebar`, 240px | the content column scrolls |

  The variants are **rendered conditionally by breakpoint**, not all mounted
  and hidden. From `md` up the content column owns the scrolling (`h-dvh` +
  `overflow-y-auto`), so the sidebar stays put with no page-level margin and
  page sticky headers stick to the column. It renders `<Outlet />` — it does
  not know about individual pages.
- `AppShell` holds exactly one piece of route awareness: `useMatch` on the
  conversation route, because the mobile chat screen needs the viewport for
  its own composer, so the bottom bar is not rendered there.
- `AppHeader` is sticky, handles `pt-safe-top`, and takes `title`,
  `subtitle?`, `size?`, `showBack?`, `action?`, `transparent?`. It is a
  compact top bar on a phone and a real page heading from `md`
  (`md:text-display`). `size` must match the page's `PageContainer` so the
  heading and body share one left edge. Back uses `useNavigate(-1)`.
- `PageContainer` is the page body: responsive `px-gutter`, `gap-6`
  (`md:gap-8`) section rhythm, `pb-bottom-nav-space` clearance on mobile
  only, and the shared page-enter transition (CSS only, ~200ms fade + 4px
  rise via `tw-animate-css`). It takes a `size`:

  | `size` | Width | Used by |
  | --- | --- | --- |
  | `narrow` | `max-w-narrow` (26rem) | auth forms |
  | `default` | `max-w-default` (44rem) | forms, reading columns |
  | `wide` | `max-w-wide` (72rem) | home, discover, profile, settings, activities |
  | `full` | none | panes that own their width (messages workspace) |

- `BottomNavigation`, `NavigationRail` and `DesktopSidebar` all render from
  the same `mainNavigation` config with `.map()` — **one navigation source of
  truth, three presentations**. Items are `NavLink`s, so the active tab is
  `aria-current="page"` and nested paths (`/discover/:userId`,
  `/messages/:conversationId`, `/profile/edit`) keep the parent tab active
  automatically.
- Pages compose `AppHeader` + `PageContainer` themselves, so a page can skip
  the header. Pages never build their own outer layout, and never care which
  navigation variant is active.
- `/profile/edit` and `/settings/discovery` stay **outside** `AppShell` at
  every width: a focused task with an explicit Save/Cancel, so the navigation
  is deliberately out of the way. `EditLayout` moves the actions into the
  header from `md` instead of a sticky bottom bar.

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
    layout/     app-shell.tsx, app-header.tsx, page-container.tsx,
                bottom-navigation.tsx (phone), navigation-rail.tsx (tablet),
                desktop-sidebar.tsx (desktop),
                auth-layout.tsx, edit-layout.tsx, chat-layout.tsx
    ui/         shadcn/ui primitives (customized — see §10)
  config/       env.ts (import.meta.env boundary), navigation.ts (tabs)
  constants/    app.ts (name, tagline, storage keys), sports.ts, areas.ts,
                profile-options.ts (skills, intents, intensity, days,
                periods, radius, budget, bio limit),
                chat.ts (message length, page size, scroll threshold),
                planning.ts (period windows, session length, suggestions),
                venues.ts (sport search terms, radius, limits, debounce)
  features/
    auth/       components/ (auth-field, auth-alert, auth-divider,
                password-input, google-sign-in-button),
                pages/ (login-page, register-page), validation.ts
    chat/       components/ (messages-layout — the master–detail workspace,
                messages-list-pane, conversation-list-item, message-bubble,
                message-composer, date-separator),
                pages/ (conversation-page, conversation-empty-page),
                use-conversations.ts, use-conversation.ts, use-chat-scroll.ts
    connections/ components/ (connect-action — the only connection wording,
                connection-success-dialog)
    planning/   components/ (plan-progress, proposal-status, plan-summary,
                sport-step, time-step, budget-step, venue-step, venue-card,
                venue-map, plan-chat-card),
                pages/ (plan-page), use-activity-plan.ts, use-plan-preview.ts,
                use-venue-search.ts
    discover/   components/ (buddy-card, discover-filters — the shared filter
                fields, discover-filter-sheet (<lg), discover-filter-panel
                (lg+), active-filter-chips, compatibility-score,
                matching-reasons, compatibility-breakdown),
                pages/ (discover-page, buddy-profile-page), use-discover.ts
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
  hooks/        use-theme.ts, use-auth.ts, use-profile.ts, use-connections.ts
  lib/          utils.ts (cn + tailwind-merge config), initials.ts,
                storage.ts, validation.ts, profile-format.ts,
                profile-draft.ts (shared reducer), preferences.ts,
                profile-completeness.ts, discovery-profile.ts,
                discover-filters.ts (+ .test.ts), availability.ts,
                connection.ts (+ .test.ts), chat.ts (+ .test.ts),
                chat-format.ts, budget.ts (shared with matching),
                planning.ts (+ .test.ts), plan-format.ts,
                geo.ts (+ .test.ts)
  pages/        home-page.tsx, activities-page.tsx
                (auth, onboarding, profile, settings, discover and chat
                live under features/)
  providers/    theme-context.ts, theme-provider.tsx,
                auth-context.ts, auth-provider.tsx,
                profile-context.ts, profile-provider.tsx,
                connection-context.ts, connection-provider.tsx
  repositories/
    activity-plan/ activity-plan-repository.ts (contract),
                activity-plan-document.ts,
                firebase-activity-plan-repository.ts,
                mock-activity-plan-repository.ts
    auth/       auth-repository.ts (contract),
                firebase-auth-repository.ts, mock-auth-repository.ts
    chat/       chat-repository.ts (contract), chat-document.ts,
                firebase-chat-repository.ts, mock-chat-repository.ts,
                mock-conversations.ts (seeded threads)
    connection/ connection-repository.ts (contract),
                connection-document.ts, firebase-connection-repository.ts,
                mock-connection-repository.ts
    venue/      venue-repository.ts (contract), google-place-mapper.ts,
                google-venue-repository.ts, mock-venue-repository.ts,
                mock-venues.ts
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
    chat/       chat-service.ts (+ .test.ts), chat-error.ts
    planning/   activity-plan-service.ts (+ .test.ts), planning-error.ts
    venue/      venue-service.ts (+ .test.ts), venue-error.ts
    google/     maps-loader.ts (the only Maps JS API load)
    connection/ connection-service.ts (+ .test.ts), connection-error.ts
    discover/   discover-service.ts
    matching/   matching-constants.ts, matching-factors.ts,
                matching-service.ts (+ matching-service.test.ts)
    firebase/   config.ts (env + validation), client.ts (app/auth/db)
  styles/       theme.css — ONLY file with raw color values
  types/        theme.ts, auth.ts, user.ts, sports-profile.ts,
                preferences.ts, discovery-profile.ts, discover.ts,
                matching.ts, connection.ts, chat.ts, planning.ts,
                venue.ts, data-source.ts
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
- Layout tokens: `px-gutter` (responsive page padding), `bleed-gutter`
  (cancels it), `max-w-narrow|default|wide|conversations`, `w-rail`,
  `w-sidebar`, `w-nav-column`, `w-conversations`, `grid-aside-start`,
  `grid-aside-end`, `grid-nav-start`, `h-bottom-nav`, `pt-safe-top`,
  `pb-safe-bottom`, `pl-safe-left`, `pr-safe-right`. Never write a one-off
  `max-w-[…]` or `grid-cols-[…]` in a page.
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

**Mobile-first does not mean mobile-only.** The app has three intentional
experiences that share every route, service, repository and piece of state —
only the presentation adapts (STEP 9.5):

| | Breakpoint | Shape |
| --- | --- | --- |
| Phone | `< md` | single column, bottom navigation, native feel |
| Tablet | `md` 768–1023 | navigation rail, 2-column grids, master–detail messages |
| Desktop | `lg` ≥1024 | sidebar, wider grids, side panels, higher density |

- Design for 390–430px width first, then give tablet and desktop a real
  layout — never a stretched phone.
- Use the standard Tailwind breakpoints (`sm md lg xl`). Do not invent custom
  media queries, and do not branch on `window.innerWidth` in components;
  layout is CSS.
- Desktop must use the space it has. A 430px column centred in a 1440px
  window is a bug, not a style.
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

`firestore.rules` (+ `firebase.json`, still-empty `firestore.indexes.json`):

| Path | Rule |
| --- | --- |
| `users/{uid}` | owner may `get`/`create`/`update` only their own; delete disabled |
| `publicProfiles/{uid}` | any signed-in member may read; only the owner may write, and `userId` must match |
| `connections/{pairId}` | only the two participants may read; create/update/delete are pinned to the exact legal transitions (see §3 and `docs/connections.md`) |
| `conversations/{connectionId}` | every access reads `connections/{conversationId}` and requires `status == 'connected'` plus `uid in participants`; participants and ids frozen; only the caller's own message preview may be written; delete denied |
| `conversations/{id}/messages/{messageId}` | same connected-participant check; create-only, `senderId == request.auth.uid`, content non-empty after `trim()` and ≤ 1000 chars; update and delete denied |
| `activityPlans/{connectionId}__active` | same connected-participant check; identity frozen; each of the FOUR proposals may only be unchanged, replaced by its proposer, or accepted by the caller adding **only themselves**; a venue change requires sport/time/budget already agreed; `status` (incl. `venue-agreed`) recomputed by the rules; delete denied |
| everything else | read and write denied |

Deploy with `firebase deploy --only firestore:rules`. Verify with
`npm run test:rules`, which starts the Firestore emulator and runs
`tests/firestore-rules.test.ts` (70 tests) against the real rules file — it
needs **JDK 21+**, and never runs as part of `npm test`.

## 12. Mock data architecture

- `VITE_DATA_SOURCE=mock` swaps in the mock auth, profile, public-profile,
  discover and connection repositories. The UI cannot tell which backend is
  active — never branch on the data source in a component.
- Mock state lives in localStorage through `src/repositories/mock-store.ts` —
  the only module allowed to touch storage for mocks. Keys are declared once
  in `MOCK_STORAGE_KEYS` (`src/constants/app.ts`). Pages never call
  `localStorage` directly.
- Every mock method is Promise-based with a small delay, so swapping in a real
  backend changes no call site.
- Mock sessions, completed profiles and connections survive a refresh;
  sign-out clears the session but leaves the relationship store, so signing
  back in restores it. Onboarding is never repeated after a reload. There is
  no fake auth server and no Express backend.
- `mockConnectionRepository` seeds one relationship of each state per mock
  account (incoming, three connected, outgoing) so every UI branch is
  reachable, records that it has seeded, and notifies its listeners on every
  write — the same live behaviour as the Firebase subscription. To simulate
  the other person connecting back, edit the mock store from the console;
  there is deliberately no "simulate connection" button
  (`docs/connections.md` §11).
- `mockChatRepository` seeds threads for the connected buddies: one 28-message
  history (so the 20-message page and "Load earlier messages" are testable),
  one short thread, and one connected buddy with no conversation at all.
  Scripts live in `mock-conversations.ts`, never in UI code.

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
- Cross-cutting app state goes in a provider under `src/providers/`: theme,
  auth, profile and connections. `AuthProvider` is the sole owner of the
  signed-in user, `ProfileProvider` of their profile, and
  `ConnectionProvider` of relationship state — do not copy any of them into
  page state, and never let Discover and the candidate profile hold separate
  connection state.
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
  blocked users, policy links, a chat button before STEP 9).
- Read `users/{uid}` for anything about another member, or widen its rules to
  make Discover easier — project through `publicProfiles/{uid}` instead.
- Display a distance, a fake compatibility percentage or any invented metric.
- Persist a compatibility score, reason or factor breakdown anywhere — it is
  derived per viewer and recomputed at runtime.
- Put a matching formula, weight or threshold outside
  `src/services/matching/matching-constants.ts`.
- Use AI, embeddings, a remote model or randomness to score or explain a
  match — the engine is rule-based and deterministic.
- Touch Firebase, storage, React or the clock inside the matching engine.
- Hide a candidate because their score is low; only active filters exclude.
- Put connection logic inside the matching engine, or a compatibility score
  inside a connection document.
- Store a viewer-dependent state (`pending-outgoing`) in Firestore; persist
  `pending`/`connected` and derive the perspective.
- Create two documents for one pair, or write a connection id that is not
  `createConnectionId(a, b)`.
- Copy profile fields into `connections/{id}` — ids and status only.
- Read or write Firestore from a component; connection actions go through
  `useConnections()` → service → repository.
- Attach a realtime listener to anything but the signed-in user's own
  connections.
- Fetch a connection document per Discover candidate (N+1); the provider's
  one subscription already has them.
- Show the mutual-connection success UI for a relationship that was already
  connected — it reacts to a transition, not to state.
- Ship a control that does not work yet (a "Start chat" button before STEP 9),
  or a "simulate connection" button in production UI.
- Loosen the connection rules to make a later step easier.
- Persist a Discover "Not now" dismissal.
- Let a pending (or absent) connection reach a conversation or a message —
  the check belongs in the UI, the service AND the rules, never only in a
  hidden button.
- Copy a display name, email, photo url or sport into a conversation or a
  message; resolve display data from `publicProfiles` at render time.
- Attach a realtime listener to a whole message history, to all messages, or
  to a conversation the signed-in user is not in.
- Load messages into a global provider at app start; they belong to the open
  conversation.
- Render message content as HTML, or with `dangerouslySetInnerHTML`.
- Clear the composer before a send is confirmed, or insert an optimistic
  message.
- Write a message without updating the conversation preview in the same
  atomic operation.
- Edit or delete a message — they are immutable in this step.
- Show an unread badge, a read receipt, a typing indicator or presence; none
  of them are implemented, and a fake one is worse than none.
- Add a second pair-id system for conversations; the conversation id IS the
  connection id.
- Let a pending (or absent) connection reach an activity plan — the check
  belongs in the UI, the service AND the rules.
- Write plan state into the message history, or add system messages.
- Offer a sport the other person does not list, or claim a real calendar is
  free — availability is recurring Sports Buddy availability, nothing more.
- Store a UTC instant for a planned time, or hardcode a UTC offset.
- Mark a plan `ready` because fields have values; `ready` means both people
  agreed at the proposal's current version.
- Accept a proposal without naming the version that was on screen.
- Add or remove the OTHER participant's entry in `acceptedBy`.
- Suggest a date in the past, or a hardcoded one.
- Copy profile data or a compatibility score into a plan.
- Add a venue field, a maps/places call, a calendar entry or a notification —
  those are STEPS 11, 13 and 14.
- Overwrite a whole plan document from a stale local copy; patch the one
  proposal that changed, inside a transaction.
- Call `navigator.geolocation`, request a location permission, or store any
  coordinate against a user — profiles hold an `areaId` and nothing else.
- Describe an area centre or the search midpoint as somebody's location, or
  show a distance "from Gary" rather than from the search area.
- Persist a raw provider place object, or create a venues collection; only the
  `VenueSelection` snapshot is stored.
- Hardcode a Google API key, log one, or read it anywhere but `config/env.ts`.
- Call Places on render, hover, marker click or map pan, or before the plan is
  `ready`.
- Make a venue reachable only from the map; the list is the primary surface.
- Show a venue price in ringgit, an availability state, a booking action or a
  travel time — none of those are real data.
- Tie `VITE_VENUE_SOURCE` to `VITE_DATA_SOURCE`, or branch on either outside
  `repositories.ts`.
- Attach a realtime listener to `publicProfiles`.
- Add dependencies that nothing uses yet.
- Create empty placeholder files/folders or single-implementation
  abstractions (factories, interfaces, wrappers) "for later".
- Suppress type errors with `any` or `@ts-ignore`.
- Build a desktop-first layout, or leave a route with no tablet/desktop
  treatment at all.
- Constrain the whole app to a phone width on desktop.
- Render every navigation variant and hide the wrong ones with CSS; the shell
  picks one per breakpoint.
- Branch on `window.innerWidth` (or add a resize listener) for layout.
- Write a one-off `max-w-[…]`, `grid-cols-[…]` or `@media` in a page instead
  of using the layout tokens.
- Hardcode gradient colour stops in a component; use `bg-primary-gradient`.
- Put the primary gradient on badges, chips, cards, borders or headings — it
  is an accent for the main CTA and the brand mark, not wallpaper.
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

STEP 7 — Compatibility + Matching Engine:

- Pure, deterministic, rule-based engine in `src/services/matching/`
  (constants / factors / service) with `src/types/matching.ts`. No AI, no
  embeddings, no randomness, no Firebase or React inside it.
- Weights sports 35 / skill 20 / availability 20 / location 15 / budget 10,
  totalling 100 (asserted by a test); every factor normalizes to 0–1 before
  weighting, so the breakdown sums to the headline score.
- `CompatibilityResult` carries the 0–100 integer score, a band label, a
  five-factor breakdown (normalized, weighted points, qualitative label,
  human detail, matched flag), typed reasons, shared sports and the best
  matching sport. `RankedBuddy` pairs it with the untouched projection.
- Location is **approximate area compatibility only** — same area / same
  coarse `AreaRegion` / different — and no surface renders a distance.
  `maxDistanceKm` remains unenforceable until coordinates exist.
- `discoverService.getRankedCandidates()` applies hard exclusions and active
  filters, then scores and ranks; `rankCandidate()` serves the detail page.
  Nothing is persisted and no extra reads are made.
- `BuddyCard` shows the real score, band and up to three strongest reasons,
  with shared sports listed first; `/discover/:userId` adds a compatibility
  card with the reasons and the full factor breakdown.
- Vitest added (`npm test`): 41 tests over the engine and the hard filters.
- Mock feed gained one open-ended-budget (RM60+) candidate, so the seed set
  spans strong, medium and weak matches plus every "no overlap" case.
- Full walkthrough: `docs/matching.md`.

Verified in mock mode by running the engine over the whole seeded candidate
set: scores spread 81 → 7 with a sensible order (two strong badminton /
climbing matches, then a same-area weeknight player with no availability
overlap, down to candidates with no shared sport), each card's reasons leading
with the sport or skill fact, no "km" wording anywhere, and the breakdown
adding up to the printed score in every case. 41 unit tests, `tsc -b`, oxlint
and the production build all pass. **A visual browser pass (dark/light at
390px and 430px) was not automated in this environment** — no headless browser
is installed — so the UI is verified by types, build and the dev server
serving every new module, not by screenshots.

STEP 8 — Connect + Mutual Connection Flow:

- `connections/{pairId}` added as a third collection, readable only by its two
  participants. One document per pair on the deterministic id
  `createConnectionId(a, b)` (sorted ids joined with `__`).
- Pure connection domain in `src/lib/connection.ts` (pair id, perspective,
  map, transition detection), `connectionService` (self-connect guard,
  user-safe errors), `ConnectionRepository` with Firebase and mock
  implementations, and `ConnectionProvider` mounted inside `ProtectedRoute`.
- Connect is one Firestore transaction and is idempotent: first Connect
  creates `pending`, the second promotes the pair to `connected` with a server
  `connectedAt`, and a repeated Connect changes nothing.
- Perspective is derived, never stored: the same `pending` document reads as
  `pending-outgoing` to the requester and `pending-incoming` to the other.
- A pending outgoing request can be cancelled by its sender; an incoming
  request and a connected relationship cannot (enforced in the transaction
  and in the rules). No disconnect, block or report in this step.
- One scoped realtime subscription (`participants array-contains uid`) — the
  only listener in the app — so connecting back updates the other person's
  screen live. `publicProfiles` stays a one-time read.
- Discover joins connection state after ranking from that single
  subscription: no N+1, no change to any compatibility score. Incoming
  requests are lifted into a "Wants to connect" section (ordering only).
  `BuddyCard` and `/discover/:userId` share one `ConnectAction`, and the
  candidate profile gained a sticky CTA above the bottom navigation.
- Mutual success dialog ("You found a sports buddy.") fires on the
  **transition** only, names the shared sport from the STEP 7
  `bestSportMatch`, and offers View profile / Done — no chat button, because
  chat does not exist.
- Session-only "Not now" hides a candidate for the current Discover session
  and is deliberately not persisted.
- Firestore rules extended with the full connection invariants (participants
  immutable, id must match the pair, a user may only add themselves,
  `connected` only when both asked, delete only by the sole pending
  requester, exact key allowlist).
- Vitest suite grew to 81 unit tests; `npm run test:rules` runs 20 security
  rules tests against the Firestore emulator (JDK 21+).
- Full walkthrough: `docs/connections.md`.

Verified in mock mode through the same repository the app uses: a first
Connect creating one pending document on the deterministic pair id, the
requester seeing `pending-outgoing` while the recipient sees
`pending-incoming`, the second Connect producing `connected` for both, a
triple Connect leaving exactly one document with one requester, cancel
removing a pending request, the recipient being refused when trying to cancel
the sender's request, a connected relationship refusing the cancel path,
every state surviving a reload, the seeded one-of-each mock states, and a
connection join that leaves the `CompatibilityResult` object identical.
Security rules verified against the Firestore emulator (20 tests) including
unauthorised reads, forged requests, self-connection, participant tampering
and connected-relationship deletion. `tsc -b`, oxlint and the production
build all pass. **A visual browser pass (dark/light at 390px and 430px) was
not automated in this environment** — no headless browser is installed.

STEP 9 — Realtime Chat:

- `conversations/{connectionId}` plus a `messages` subcollection added as the
  fourth collection, readable only by the two participants and only while
  their connection is `connected`. The conversation id **is** the STEP 8 pair
  id, so authorization is one lookup and no second pair-id system exists.
- Pure chat domain in `src/lib/chat.ts` (authorization check, content
  validation, id-based merge, chronological ordering) and
  `src/lib/chat-format.ts` (all chat dates, `Intl` only, no date library).
- `chatService` guards every call with a `Connection` rather than a user id,
  validates trimmed content, and maps failures to user-safe `ChatError`
  messages. `ChatRepository` with Firebase and mock implementations.
- Conversations are created lazily and idempotently the first time a
  connected pair opens the chat — never when they connect.
- Two scoped realtime subscriptions only: the user's own conversations, and
  the newest 20 messages of the open conversation. No whole-history listener,
  no global message listener, still none on `publicProfiles`.
- History pages 20 at a time behind an explicit "Load earlier messages";
  Firestore cursors never leave the repository (the UI passes a message id),
  and pages merge by id so nothing duplicates or flips order.
- Sends are atomic (message + conversation preview in one `writeBatch`) and
  confirmed before the composer clears, so a failed send keeps the text.
- `/messages` rebuilt from the connection list, so a connected buddy with no
  messages still gets a "Start a conversation" row; profiles resolve in ONE
  batched `publicProfiles` query (no N+1, never `users/{uid}`).
  `/messages/:conversationId` is a full-screen chat outside `AppShell`.
- Scroll behaviour: lands on the newest message, follows your own sends, only
  pulls you down on an incoming message if you were already at the bottom
  (otherwise a "New message" button), and preserves position when loading
  history.
- Connected states gained a **Message** CTA, and the STEP 8 success dialog
  now leads with "Message <name>".
- Firestore rules read the connection on every conversation and message
  access; messages are create-only with `senderId == request.auth.uid`,
  non-empty after `trim()`, ≤ 1000 characters, and an exact key allowlist.
- Vitest suite grew to 127 unit tests; emulator rules tests grew to 43.
- Full walkthrough: `docs/chat.md`.

Verified in mock mode through the same repository the app uses: a pending
connection refused at the service in both directions and for an outsider with
nothing written, a conversation opening on the connection id and staying a
single document across repeated opens from both sides, blank / whitespace /
over-length messages rejected with nothing reaching storage, a valid message
trimmed and stored with the conversation preview updated in the same
operation, an open subscription receiving the other person's message without
a refetch and going quiet after unsubscribe, 25 messages paginating as
20 + 5 with `hasMore` correct at every step and no overlap between pages,
everything surviving a reload, and the seeded mock threads giving one long
(paginating) thread, one short one and one connected buddy with no
conversation. Security rules verified against the Firestore emulator (43
tests, 23 for chat) including unauthenticated and unrelated reads, pending
users, forged senders, blank and over-length content, participant tampering
and message edits/deletes. `tsc -b`, oxlint and the production build all
pass. **A visual browser pass (dark/light at 390px and 430px) was not
automated in this environment** — no headless browser is installed.

STEP 9.5 — Responsive UI + Tablet/Desktop + Gradient Polish:

- `AppShell` rebuilt around three intentional experiences: bottom navigation
  below `md`, an 80px `NavigationRail` at `md`, a 240px `DesktopSidebar` at
  `lg`, all rendered from the one `mainNavigation` config. The phone-width
  `max-w-content` frame is gone from the shell — desktop uses its width.
- `PageContainer` and `AppHeader` gained a shared `size`
  (`narrow | default | wide | full`), and `px-gutter` replaced fixed page
  padding with one responsive scale.
- New layout tokens in `theme.css`: gutters, rail/sidebar/aside/nav-column
  widths, four content widths, and `grid-aside-start` / `grid-aside-end` /
  `grid-nav-start` so no page writes its own `grid-cols-[…]`.
- Messages became a master–detail workspace from `md` (list beside
  conversation) while the phone flow is unchanged; deep links behave the same
  at every width.
- Discover is a responsive grid (1 / 2 / 3 columns) with a persistent filter
  sidebar from `lg` and the bottom sheet below it, sharing one set of filter
  fields and one piece of state.
- Auth splits into a brand panel + form at `lg`; onboarding puts step title
  and progress in a fixed left column at `lg`; profile, settings and the
  candidate profile gained real two-column desktop layouts; `EditLayout`
  moves its actions into the header from `md`.
- Primary gradient added as semantic theme tokens
  (`--primary-gradient-start/-end`, light and dark) plus
  `bg-primary-gradient` / `text-primary-gradient` utilities. The shadcn
  `Button` `default` variant uses it, so every primary CTA is upgraded in one
  place; badges, chips, switches, bubbles and selected states stay flat.
- Depth improved through a `shadow-hover` token and desktop card hover, not
  through more gradients.
- Route-by-route audit: `docs/responsive-audit.md`.

No product logic, data flow, service, repository or subscription changed in
this step — only presentation. All 127 unit tests and 43 emulator rules tests
still pass.

STEP 10 — Plan Together: Sport + Shared Availability + Budget:

- `activityPlans/{connectionId}__active` added as the fifth collection,
  readable only by the two participants and only while their connection is
  `connected`. One active plan per connection, created by a transaction on a
  deterministic id, so simultaneous "Plan a session" taps share one draft —
  no query, no index, and STEP 8's connection schema and rules untouched.
- Collaborative `Proposal<T>` model with implicit proposer acceptance,
  agreement only when both accept, idempotent propose and accept, and
  `version`-based stale-acceptance protection enforced inside the transaction.
- Pure domain in `src/lib/planning.ts` and `src/lib/plan-format.ts`;
  `src/lib/budget.ts` extracted so the matching engine and the planner share
  one budget-overlap formula.
- Sport step offers only sports both people list, with both skill levels.
  Time step turns recurring availability into REAL upcoming dates (never
  hardcoded, never past) with editable start/end, storing local date + local
  time + IANA zone. Budget step suggests the profile overlap and still works
  when there is none.
- `ready` only when sport, time and budget are each agreed by both; the rules
  recompute it independently so it cannot be claimed. Venue stays absent.
- One scoped `onSnapshot` per plan document powers live collaboration; chat
  gained a header action and a plan card above the composer via `ChatLayout`'s
  new `action` / `banner` slots. No plan state is ever a chat message.
- Planner is a `size="wide"` route inside `AppShell`: focused steps on a
  phone, two-column time/budget steps and a sticky `PlanSummary` from `lg`.
- Vitest suite grew to 186 unit tests; emulator rules tests to 62.
- Full walkthrough: `docs/planning.md`.

Verified in mock mode through the same repository the app uses: pending and
unrelated users refused at the service with nothing written; a draft created
on the deterministic id and resumed rather than duplicated when either person
opens it; a sport outside the shared set rejected; proposing accepting
implicitly and the second acceptance completing agreement; an acceptance aimed
at a replaced version refused with the plan left untouched; past dates,
reversed ranges and sub-30-minute sessions rejected; open-ended budgets
accepted; a replaced value dropping the plan back to `draft`; readiness only
after all three; an open subscription receiving the other participant's change
without a refetch and going quiet after unsubscribe; state surviving a reload;
and no profile field appearing anywhere in a serialized plan. Security rules
verified against the Firestore emulator (62 tests, 19 for plans) including
impersonated acceptance, removed agreement, forged `ready`, tampered identity
fields, invented participants and a mismatched plan id — exercising the real
client write shape, server timestamps nested in proposal maps included.
`tsc -b`, oxlint and the production build all pass. **A visual browser pass
(dark/light at 390px and 430px) was not automated in this environment** — no
headless browser is installed.

STEP 11 — Venue Discovery + Google Maps / Places:

- `AreaDefinition` gained a public approximate `center`; `src/lib/geo.ts`
  added midpoint, Haversine, coordinate validation and an adaptive search
  radius. **No GPS, no permission, no user coordinate is stored** — profiles
  still hold an `areaId` and nothing else.
- `Venue` / `VenueSelection` domain, `VenueRepository` with a Places (New)
  REST implementation (narrow field mask, capped results, mapped through
  `mapGooglePlaceToVenue`) and a 12-venue Klang Valley mock.
- `VITE_VENUE_SOURCE` (`mock | google`) chosen independently of the backend,
  plus `VITE_GOOGLE_MAPS_API_KEY`; `.env.example` updated. A missing key never
  crashes anything.
- `ActivityPlan` gained `venueProposal: Proposal<VenueSelection>` and status
  `venue-agreed`, reusing the STEP 10 propose/accept/version machinery
  unchanged. `ready` kept its name (now "ready for a venue"), so no data
  migration was needed; older plans read the field as an empty proposal in the
  mapper, the mock normalizer and the rules.
- Venue step: search with debounce, honest "midpoint of your two areas" copy,
  a venue list that works with no map at all, and a map that renders nothing
  if it fails. Two-way marker/card selection. `PlanSummary` and the chat plan
  card now show the venue and a state-aware action.
- Rules extended: a venue change requires the other three agreed, acceptance
  cannot be impersonated, and `venue-agreed` cannot be claimed without both.
- Vitest suite grew to 237 unit tests; emulator rules tests to 70.
- Full walkthrough: `docs/venues.md`.

Verified in mock mode through the same repository and service the app uses:
the search area computed as the midpoint of two public area centroids with no
device position involved; sport-relevant venues only, ordered by distance from
that centre, capped at the result limit; a manual query narrowing and an
unmatched query returning nothing rather than inventing results; snapshots
trimmed to the five stable fields with ratings and price bands dropped;
impossible coordinates and empty names refused; venue proposals blocked before
the plan is `ready`, accepted implicitly by the proposer, completed by the
other participant into `venue-agreed`, reset back to `ready` when the venue is
replaced, and refused when aimed at a replaced version; everything surviving a
reload. Security rules verified against the Firestore emulator (70 tests, 8
for venue) including proposing before readiness, impersonated acceptance,
claiming `venue-agreed` with one approval, and a pre-STEP-11 plan document
still accepting updates. `tsc -b`, oxlint and the production build all pass.
**A visual browser pass (dark/light at 390px and 430px) was not automated in
this environment** — no headless browser is installed.

**Live Google Maps / Places verification is outstanding** — no API key exists
in this environment, so the Places request shape, the Maps script load and
marker rendering are implemented and typed but have not run against Google.

**Live two-user Firebase verification is still outstanding** — no project credentials
exist in this environment. The firebase-mode paths (auth, profile,
preferences, projection writes and Discover reads) are implemented and typed
but have not run against a real project.

Not done (by design): confirmed activities and history, court booking,
availability and payment, venue pricing in ringgit, travel time / Routes API,
live or background location, plan cancellation, calendar integration,
disconnect/unfriend, block and report, unread/read receipts, typing and
presence, media messages, notification delivery, subscriptions, analytics,
native platforms, account deletion, photo upload.

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
STEP 7 — Compatibility + Matching Engine
STEP 8 — Connect + Mutual Connection Flow
STEP 9 — Realtime Chat
STEP 9.5 — Responsive UI + Tablet/Desktop + Gradient Polish
STEP 10 — Plan Together: Sport + Availability + Budget
STEP 11 — Venue Discovery + Google Maps / Places

**Current Step:** STEP 11 — Venue Discovery

**Next Step:** STEP 12 — Confirmed Activity + Activity Card
