# Firebase Debug Audit

Audit date: 2026-09-15 · Branch: `main` · Commit: `008b44b`
Method: static tracing of every UI → hook/provider → service → repository →
Firebase SDK chain, plus read-only Firebase CLI checks. No code was changed.

Scope note: this audits `main` only. The `gy-person-b` branch adds a ratings /
reliability feature (`src/features/ratings/*`, `src/types/buddy-rating.ts`), a
privacy policy page, a segmented toggle and a 304-line `post-activity-page.tsx`
— none of which exist on `main` and none of which are covered below.

## Overall Status

| | |
| --- | --- |
| **Firebase Project** | **CONNECTED** — `sportbuddy-4d596`, `(default)` Firestore database is live (`FIRESTORE_NATIVE`, `STANDARD`) |
| **Active Data Source** | **FIREBASE** — `.env.local` has `VITE_DATA_SOURCE=firebase`. `.env.example` and `.env.test` say `mock`; **`.env.local` wins for `npm run dev` and `npm run build`** |
| **Auth** | Firebase Auth wired end to end (email/password, Google popup, `onAuthStateChanged`, `signOut`). **Not live-verified in this session** — no sign-in was performed |
| **Firestore** | 9 collections in code, all reachable through repositories. **Not live-verified** — no document read/write was performed against the project |
| **Security Rules** | `firestore.rules` covers **all 9** collections + default deny. No permissive rule found. **Deployment state UNVERIFIED** — the CLI offers no read-only way to fetch the live ruleset |
| **Indexes** | Deployed indexes **match** `firestore.indexes.json` exactly (2 composite indexes on `activities`). Verified read-only via `firebase firestore:indexes` |
| **Emulator** | **CANNOT RUN.** `npm run test:rules` aborts: *"firebase-tools no longer supports Java version before 21."* Installed JDK is **17.0.15**. The 139 rules tests did not execute |
| **Live Verification** | **NONE.** No feature has been verified against live Firestore in this session or, per `docs/firebase-handoff.md`, in any previous one |
| **Config Mismatch** | **NONE.** `.firebaserc` default, `VITE_FIREBASE_PROJECT_ID` and the CLI's current project all agree on `sportbuddy-4d596`; `authDomain` and `appId` are well-formed |

### Firebase package

`firebase@^12.18.0`. Modules actually imported anywhere in `src/`:

| Module | Used | Where |
| --- | --- | --- |
| `firebase/app` | Yes (1 file) | `services/firebase/client.ts` |
| `firebase/auth` | Yes (2 files) | `client.ts`, `repositories/auth/firebase-auth-repository.ts` |
| `firebase/firestore` | Yes (20 imports / 14 files) | `client.ts` + every `firebase-*-repository.ts` and `*-document.ts` |
| `firebase/storage` | **No** | not imported — photo upload is not implemented |
| `firebase/functions` | **No** | not imported |
| `firebase/analytics` | **No** | not imported |
| `firebase/messaging` | **No** | not imported — push is STEP 14 |

### Environment variable names

Values are never printed. `.env.local` is the file Vite actually loads.

| Variable | `.env.local` | `.env.example` | `.env.test` |
| --- | --- | --- | --- |
| `VITE_DATA_SOURCE` | PRESENT (`firebase`) | PRESENT (`mock`) | PRESENT (`mock`) |
| `VITE_FIREBASE_API_KEY` | PRESENT | EMPTY (template) | MISSING |
| `VITE_FIREBASE_AUTH_DOMAIN` | PRESENT | EMPTY | MISSING |
| `VITE_FIREBASE_PROJECT_ID` | PRESENT | EMPTY | MISSING |
| `VITE_FIREBASE_STORAGE_BUCKET` | PRESENT | EMPTY | MISSING |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | PRESENT | EMPTY | MISSING |
| `VITE_FIREBASE_APP_ID` | PRESENT | EMPTY | MISSING |
| `VITE_VENUE_SOURCE` | PRESENT (`mock`) | PRESENT (`mock`) | PRESENT (`mock`) |
| `VITE_GOOGLE_MAPS_API_KEY` | **EMPTY** | absent from template | MISSING |

`.env.local` is gitignored. `.env.test` is **not** gitignored but contains no
credentials. `.gitignore` covers `.env`, `.env.local`, `.env.*.local`.

### Repository selection

**CENTRALIZED and correct** — `src/repositories/repositories.ts` is the only
module that reads `env.dataSource`, computing `useFirebase` once and exporting
11 pre-selected repositories. `venueRepository` is selected independently from
`env.venueSource`, as designed.

**One violation:** `src/features/auth/pages/login-page.tsx:31` branches on
`env.dataSource === 'mock'` and imports `MOCK_LOGIN_DEFAULTS` from
`repositories/auth/mock-auth-repository`. The branch is inert in Firebase
mode, but the import pulls the mock auth repository into the production
bundle — the demo credentials `demo@sportsbuddy.app` / `password123` are
present in `dist/assets/index-*.js` of a Firebase-mode build.

### Firebase initialization

**Correct.** `src/services/firebase/client.ts` is the only `initializeApp`
call site, guarded by `getApps()[0] ?? initializeApp(...)`, with `app`, `auth`
and `db` memoized in module scope and created lazily on first use. `auth` uses
`initializeAuth` with `[indexedDBLocalPersistence, browserLocalPersistence]`.
`assertFirebaseConfigured()` throws a readable developer error naming the
missing `VITE_FIREBASE_*` keys. No feature re-initializes Firebase, and mock
mode never touches the module, so missing credentials cannot crash it.

---

## MASTER FEATURE TABLE

| Feature | Route | Service | Repository | Firebase Repo | Collection/Auth | Mock | Live Connected | Rules | Status |
|---|---|---|---|---|---|---|---|---|---|
| Register (email) | `/auth/register` | `authService` | `authRepository` | `firebaseAuthRepository` | Firebase Auth | Yes | Yes | n/a | CONNECTED NOT VERIFIED |
| Login (email) | `/auth/login` | `authService` | `authRepository` | `firebaseAuthRepository` | Firebase Auth | Yes | Yes | n/a | CONNECTED NOT VERIFIED |
| Google login | `/auth/login` | `authService` | `authRepository` | `firebaseAuthRepository` | Firebase Auth | Yes | Yes | n/a | CONNECTED NOT VERIFIED |
| Logout | all | `authService` | `authRepository` | `firebaseAuthRepository` | Firebase Auth | Yes | Yes | n/a | CONNECTED NOT VERIFIED |
| Session restore | all | `authService` | `authRepository` | `firebaseAuthRepository` | `onAuthStateChanged` | Yes | Yes | n/a | CONNECTED NOT VERIFIED |
| Route guards | all | — | — | — | `AuthProvider` state | Yes | Yes | n/a | CONNECTED NOT VERIFIED |
| Onboarding save | `/onboarding` | `profileService` | `profileRepository` | `firebaseProfileRepository` | `users/{uid}` | Yes | Yes | PASS | CONNECTED NOT VERIFIED |
| Profile read | `/profile` | `profileService` | `profileRepository` | `firebaseProfileRepository` | `users/{uid}` | Yes | Yes | PASS | CONNECTED NOT VERIFIED |
| Profile edit | `/profile/edit` | `profileService` | `profileRepository` | `firebaseProfileRepository` | `users/{uid}` | Yes | Yes | PASS | CONNECTED NOT VERIFIED |
| Settings / prefs | `/settings`, `/settings/discovery` | `profileService` | `profileRepository` | `firebaseProfileRepository` | `users/{uid}` | Yes | Yes | PASS | CONNECTED NOT VERIFIED |
| Public projection | (side effect) | `profileService` | `publicProfileRepository` | `firebasePublicProfileRepository` | `publicProfiles/{uid}` | Yes | Yes | PASS | CONNECTED NOT VERIFIED |
| **Discover feed** | `/discover` | *(bypassed)* | *(bypassed)* | *(bypassed)* | **`src/data/discover-list.json`** | n/a | **No** | n/a | **BROKEN** |
| Discover data load | `/discover` | `discoverService` | `discoverRepository` | `firebaseDiscoverRepository` | `publicProfiles` | Yes | Yes | PASS | PARTIAL (read runs, result unused for the feed) |
| Buddy detail | `/discover/:userId` | `discoverService` | `discoverRepository` | `firebaseDiscoverRepository` | `publicProfiles/{uid}` | Yes | Yes | PASS | CONNECTED NOT VERIFIED (unreachable from the feed) |
| Matching engine | — | `matchingService` | — | — | none by design | n/a | n/a | n/a | NOT REQUIRED |
| Connect / cancel | `/discover`, `/discover/:userId` | `connectionService` | `connectionRepository` | `firebaseConnectionRepository` | `connections/{pairId}` | Yes | Yes | PASS | PARTIAL (writes against fake ids from the feed) |
| Connection realtime | app-wide | `connectionService` | `connectionRepository` | `firebaseConnectionRepository` | `connections` `onSnapshot` | Yes | Yes | PASS | CONNECTED NOT VERIFIED |
| Block / unblock | profile, chat, settings | `safetyService` | `blockRepository` | `firebaseBlockRepository` | `blocks/{blockerId__blockedId}` | Yes | Yes | PASS | PARTIAL (one-directional client view) |
| Blocked users list | `/settings` | `safetyService`+`discoverService` | `blockRepository` | `firebaseBlockRepository` | `blocks`, `publicProfiles` | Yes | Yes | PASS | CONNECTED NOT VERIFIED |
| Report user | profile, chat | `safetyService` | `reportRepository` | `firebaseReportRepository` | `reports/{auto}` | Yes | Yes | PASS | CONNECTED NOT VERIFIED |
| Conversation list | `/messages` | `chatService` | `chatRepository` | `firebaseChatRepository` | `conversations` | Yes | Yes | PASS | CONNECTED NOT VERIFIED |
| Open / send message | `/messages/:id` | `chatService` | `chatRepository` | `firebaseChatRepository` | `conversations/{id}/messages` | Yes | Yes | PASS | CONNECTED NOT VERIFIED |
| Message pagination | `/messages/:id` | `chatService` | `chatRepository` | `firebaseChatRepository` | `messages` | Yes | Yes | PASS | CONNECTED NOT VERIFIED |
| Unread state | `/messages` | — | — | — | **`localStorage`** | n/a | No | n/a | LOCALSTORAGE ONLY (by design) |
| Plan draft / proposals | `/messages/:id/plan` | `activityPlanService` | `activityPlanRepository` | `firebaseActivityPlanRepository` | `activityPlans/{id}__active` | Yes | Yes | PASS | CONNECTED NOT VERIFIED |
| Venue search | `/messages/:id/plan` | `venueService` | `venueRepository` | `googleVenueRepository` | Google Places (New) | Yes | **No** | n/a | FIREBASE CODE NOT WIRED (source=`mock`, key EMPTY) |
| Venue persistence | `/messages/:id/plan` | `activityPlanService` | `activityPlanRepository` | `firebaseActivityPlanRepository` | `activityPlans` | Yes | Yes | PASS | CONNECTED NOT VERIFIED |
| Confirm activity | `/messages/:id/plan` | `activityService` | `activityRepository` | `firebaseActivityRepository` | `activities/{planId}` | Yes | Yes | PASS | CONNECTED NOT VERIFIED |
| Activities upcoming/past | `/activities` | `activityService` | `activityRepository` | `firebaseActivityRepository` | `activities` | Yes | Yes | PASS | CONNECTED NOT VERIFIED |
| Activity detail | `/activities/:id` | `activityService` | `activityRepository` | `firebaseActivityRepository` | `activities/{id}` | Yes | Yes | PASS | CONNECTED NOT VERIFIED |
| Home next activity | `/home` | `activityService` | `activityRepository` | `firebaseActivityRepository` | `activities` | Yes | Yes | PASS | CONNECTED NOT VERIFIED |
| Home recommendations | `/home` | — | — | — | **`src/data/recommendations.json`** | n/a | No | n/a | MOCK ONLY |
| Add to calendar | `/activities/:id` | `calendarService` | — | — | reads `Activity` only | n/a | n/a | n/a | NOT REQUIRED |
| **Venue map page** | `/map` | `openstreetmapService` | *(none)* | *(none)* | Nominatim + Overpass | n/a | No | n/a | NOT REQUIRED (no Firebase, but bypasses `VenueRepository`) |
| **Post an activity** | `/discover/post-activity` | **none** | **none** | **none** | **none** | n/a | No | n/a | **MISSING — writes nothing** |
| Account deletion | — | — | — | — | — | n/a | No | delete denied | NOT IMPLEMENTED |
| Photo upload | — | — | — | — | Storage not imported | n/a | No | n/a | MISSING |
| Push notifications | — | — | — | — | Messaging not imported | n/a | No | n/a | MISSING |

---

## COLLECTION TABLE

| Collection | Used By | Read | Create | Update | Delete | Realtime | Rule Status | Repository | Status |
|---|---|---|---|---|---|---|---|---|---|
| `users/{uid}` | profile, onboarding, settings | Yes (`getDoc`) | Yes (`setDoc`) | Yes (`setDoc` merge) | **No** | No | PASS | `firebaseProfileRepository` | CONNECTED NOT VERIFIED |
| `publicProfiles/{uid}` | discover, messages, blocked list | Yes (`getDoc`/`getDocs`) | Yes (`setDoc`) | Yes (`setDoc`) | Yes (`deleteDoc`) | No | PASS | `firebasePublicProfileRepository` (write), `firebaseDiscoverRepository` (read) | CONNECTED NOT VERIFIED |
| `connections/{pairId}` | connect, chat auth, planning auth | Yes | Yes (txn) | Yes (txn) | Yes (txn) | **Yes** | PASS | `firebaseConnectionRepository` | CONNECTED NOT VERIFIED |
| `blocks/{blockerId__blockedId}` | safety | Yes (`getDoc`/`getDocs`) | Yes (`setDoc`) | Denied | Yes (`deleteDoc`) | **Yes** | PASS | `firebaseBlockRepository` | CONNECTED NOT VERIFIED |
| `reports/{auto}` | safety | **Denied (by design)** | Yes (`addDoc`) | Denied | Denied | No | PASS | `firebaseReportRepository` | CONNECTED NOT VERIFIED |
| `conversations/{connectionId}` | chat | Yes | Yes (txn) | Yes (batch) | Denied | **Yes** | PASS | `firebaseChatRepository` | CONNECTED NOT VERIFIED |
| `conversations/{id}/messages/{msgId}` | chat | Yes (`getDocs`) | Yes (batch) | Denied | Denied | **Yes** | PASS | `firebaseChatRepository` | CONNECTED NOT VERIFIED |
| `activityPlans/{connectionId}__active` | planning | Yes | Yes (txn) | Yes (txn) | Denied | **Yes** | PASS | `firebaseActivityPlanRepository` | CONNECTED NOT VERIFIED |
| `activities/{planId}` | activities, home | Yes (`getDoc`/`getDocs`) | Yes (txn) | Denied | Denied | No | PASS | `firebaseActivityRepository` | CONNECTED NOT VERIFIED |

**No collection is missing a rule.** No collection referenced in code is
absent from `firestore.rules`, and `match /{document=**} { allow read, write: if false; }`
closes everything else.

**Live collection existence is UNKNOWN** — the Firebase CLI has no
non-destructive collection listing, and no Admin SDK credentials exist here.
No documents were read or written.

---

## FIRESTORE RULES AUDIT

| Collection | READ | CREATE | UPDATE | DELETE | Status |
|---|---|---|---|---|---|
| `users/{userId}` | `get, list`: owner only (`uid == userId`) | owner, `hasOnly` key allowlist, size caps, `createdAt == request.time` | owner, key allowlist | **`if false`** | PASS (delete blocks STEP 15B) |
| `publicProfiles/{userId}` | `get, list`: **any signed-in user** | owner, `userId` must match doc id, key allowlist | owner, key allowlist | owner | PASS (open read is the deliberate discovery boundary) |
| `connections/{connectionId}` | `list`: participant of existing doc · `get`: `uidInPairId` + (`!exists` ∥ participant) | participant, `wellFormed`, id == `pairId(a,b)`, `requestedBy == [uid]`, `status == 'pending'`, `pairIsUnblocked` | participant, caller may only add **themselves**, participants/`createdAt` frozen, `connected` only when both asked | sole pending requester only | PASS |
| `blocks/{blockId}` | `get`: `blockId.split('__')[0] == uid` · `list`: `resource.data.blockerId == uid` | `blockerId == uid`, id == `uid__blocked`, not self, reason enum, key allowlist | **`if false`** | `blockId.split('__')[0] == uid` | PASS |
| `reports/{reportId}` | **`if false`** | `reporterId == uid`, not self, reason enum, `context` shape + key allowlist, note ≤ 500, `status == 'submitted'`, `createdAt == request.time` | **`if false`** | **`if false`** | PASS |
| `conversations/{conversationId}` | `get`/`list` require `connections/{id}.status == 'connected'` + participant + unblocked | `connectedParticipant()`, ids/participants frozen, key allowlist | `connectedParticipant()`, only caller's own preview | **`if false`** | PASS |
| `conversations/{id}/messages/{msgId}` | `get`/`list` via `connectedParticipant()` | `senderId == uid`, content non-empty after `trim()`, ≤ 1000, key allowlist | **`if false`** | **`if false`** | PASS |
| `activityPlans/{planId}` | `get`/`list` via `connectedParticipant(connectionId)` | connected participant, identity fields pinned, proposals must start empty | each proposal: unchanged ∥ replaced by proposer ∥ caller adds **only themselves**; `status` recomputed by the rules; `venue-agreed → confirmed` is the one free transition; `confirmed` is read-only | **`if false`** | PASS |
| `activities/{activityId}` | `uid in participants` (+ `uidInPairId` for non-existent) | re-derives sport/venue/budget/participants **from the plan document**, all four proposals agreed, caller is a plan participant, `status == 'confirmed'` | **`if false`** | **`if false`** | PASS |
| `/{document=**}` | `if false` | `if false` | `if false` | `if false` | PASS |

### SECURITY RED FLAGS

**None found.** Searched for `allow read, write: if true`, `allow read: if true`
and bare `if request.auth != null` without an ownership constraint.

The only rule gated on authentication alone is `publicProfiles` `get, list:
if request.auth != null`. That is intentional and documented: it is the
discovery-safe projection built by `toDiscoveryProfile()`, and `users/{uid}`
stays owner-only. Two consequences worth stating plainly rather than
flagging as a bug:

- Any signed-in account can enumerate **every** public profile. There is no
  `discoverable == true` constraint in the rule and no rate limiting.
- A user who has blocked you can still be read by you, because
  `pairIsUnblocked` is not applied to `publicProfiles`. Blocking cuts off
  connecting, chatting and planning, not profile readability.

---

## DIRECT FIREBASE IMPORT AUDIT

| File | Direct Firebase Import | Allowed? | Reason | Fix Required? |
|---|---|---|---|---|
| `src/services/firebase/client.ts` | `firebase/app`, `firebase/auth`, `firebase/firestore` | **Yes** | the single initialization point | No |
| `src/repositories/auth/firebase-auth-repository.ts` | `firebase/auth` | Yes | repository layer | No |
| `src/repositories/profile/firebase-profile-repository.ts` | `firebase/firestore` | Yes | repository layer | No |
| `src/repositories/public-profile/firebase-public-profile-repository.ts` | `firebase/firestore` | Yes | repository layer | No |
| `src/repositories/discover/firebase-discover-repository.ts` | `firebase/firestore` | Yes | repository layer | No |
| `src/repositories/discover/discovery-profile-document.ts` | `firebase/firestore` | Yes | document mapper | No |
| `src/repositories/connection/firebase-connection-repository.ts` | `firebase/firestore` | Yes | repository layer | No |
| `src/repositories/connection/connection-document.ts` | `firebase/firestore` | Yes | document mapper | No |
| `src/repositories/block/firebase-block-repository.ts` | `firebase/firestore` (+ a **dynamic** `import('firebase/firestore')` for `getDocs`) | Yes, layer-wise | the dynamic import is pointless — the module is statically imported in the same file; the build warns `INEFFECTIVE_DYNAMIC_IMPORT` | Cleanup (P3) |
| `src/repositories/chat/firebase-chat-repository.ts` | `firebase/firestore` | Yes | repository layer | No |
| `src/repositories/chat/chat-document.ts` | `firebase/firestore` | Yes | document mapper | No |
| `src/repositories/activity-plan/firebase-activity-plan-repository.ts` | `firebase/firestore` | Yes | repository layer | No |
| `src/repositories/activity-plan/activity-plan-document.ts` | `firebase/firestore` | Yes | document mapper | No |
| `src/repositories/activity/firebase-activity-repository.ts` | `firebase/firestore` | Yes | repository layer | No |
| `src/repositories/activity/activity-document.ts` | `firebase/firestore` | Yes | document mapper | No |

**`src/pages`, `src/components`, `src/features`, `src/providers` and
`src/hooks` contain ZERO `firebase/*` imports and zero `addDoc` / `setDoc` /
`updateDoc` / `deleteDoc` / `getDoc` / `getDocs` / `onSnapshot` /
`runTransaction` calls.** The layering rule holds without exception.

---

## FILE-LEVEL FIREBASE TABLE (issues only)

| File | Firebase Usage | Correct Layer? | Issue | Fix |
|---|---|---|---|---|
| `src/features/discover/pages/discover-page.tsx` | indirect (`useDiscover`) | Yes | calls the Firestore-backed hook but renders `src/data/discover-list.json`; the live result is used only to look up `connectionState` by `item.buddyId` | Render `incoming`/`suggested`, delete the JSON feed |
| `src/features/auth/pages/login-page.tsx:31` | none | **No** | branches on `env.dataSource` and imports `MOCK_LOGIN_DEFAULTS`, shipping mock credentials into the Firebase-mode bundle | Gate on `import.meta.env.DEV`, or drop the prefill |
| `src/services/google/maps-service.ts` | none | **No** | reads `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` directly (rule: only `config/env.ts`), and **nothing imports this file** — it duplicates `services/google/maps-loader.ts` | Delete |
| `src/services/venue/venue-error.ts:34` | none | Borderline | reads `import.meta.env.DEV` outside `config/env.ts` | Acceptable; a build flag, not config |
| `src/repositories/public-profile/firebase-public-profile-repository.ts:29` | `setDoc({ ...profile, updatedAt })` | Yes | object **spread** into a Firestore write, against the "explicit field list" rule; safe today only because `toDiscoveryProfile()` picks fields and the rules have a `hasOnly` allowlist | List the fields explicitly |
| `src/providers/safety-provider.tsx` | indirect | Yes | mounted in `App.tsx` **above** `ProtectedRoute`, so the `blocks` listener attaches on `/onboarding` too | Move inside `ProtectedRoute` |
| `src/features/map/pages/map-page.tsx` | none | n/a | a third venue system (Nominatim + Overpass) parallel to `VenueRepository` and `maps-loader`; no repository, no service contract | Decide: fold into `VenueRepository` or document as a separate feature |
| `src/features/planning/pages/post-activity-page.tsx` | none | n/a | four-step form whose "Post activity" button calls `navigate(ROUTES.discover)` — no service, no repository, no write | Remove the route or implement it |

---

## NOT CONNECTED TO FIREBASE

1. **Discover feed (`/discover`)** — the visible list, the filters, the match
   percentages, the distances and the result count all come from
   `src/data/discover-list.json` (12 hardcoded items). The Firestore read
   through `useDiscover()` still happens, but its output only feeds a lookup
   map. Status: **BROKEN**.
2. **`googleVenueRepository`** — implemented, but `VITE_VENUE_SOURCE=mock` and
   `VITE_GOOGLE_MAPS_API_KEY` is EMPTY, so `mockVenueRepository` is always
   returned. Status: **FIREBASE CODE NOT WIRED** (Google, not Firebase).
3. **Post an activity (`/discover/post-activity`)** — a complete-looking
   4-step wizard that persists nothing anywhere. Status: **MISSING**.
4. **Home recommendations** — `src/data/recommendations.json`, static.
   Status: **MOCK ONLY**.
5. **Venue map (`/map`)** — OpenStreetMap Nominatim + Overpass, called
   directly from the page. No Firebase involvement is correct for venue
   search, but it bypasses the repository architecture entirely.
   Status: **NOT REQUIRED** (architecture note, not a Firebase gap).
6. **Chat unread state** — `localStorage` via `lib/chat-read-state.ts`.
   Deliberate and documented. Status: **LOCALSTORAGE ONLY**.
7. **`users/{uid}` delete** — no repository method, `allow delete: if false`.
   Status: **MISSING** (STEP 15B blocker).
8. **Firebase Auth `deleteUser` / reauthentication** — not implemented
   anywhere. Status: **MISSING** (STEP 15B blocker).
9. **Firebase Storage (photo upload)** — not imported. Status: **MISSING**.
10. **Firebase Cloud Messaging** — not imported. Status: **MISSING**.
11. **`src/services/google/maps-service.ts`** — never imported by anything.
    Status: **DEAD / NOT WIRED**.
12. **`safetyService.assertCanInteract`** — defined, exported, called from
    nowhere. Status: **DEAD**.
13. **`blockedUserIds()` in `lib/safety.ts`** — exported, never called. Its
    bidirectional logic (and the matching logic in
    `firebaseBlockRepository.records()`) is unreachable, because the only
    query is `where('blockerId', '==', uid)`. Status: **DEAD**.

---

## CONNECTED TO FIREBASE

Every chain below is complete from UI to collection.

```
Auth
  login-page / register-page / google-sign-in-button
    → useAuth() → AuthProvider
    → authService (+ auth-error map)
    → authRepository → firebaseAuthRepository
    → firebase/auth  ·  createUserWithEmailAndPassword · signInWithEmailAndPassword
                        signInWithPopup · onAuthStateChanged · signOut
```
```
Profile
  onboarding-page / profile-page / edit-profile-page / settings-page
    → useProfile() → ProfileProvider
    → profileService (+ profile-schema validation)
    → profileRepository → firebaseProfileRepository
    → users/{uid}          [serverTimestamp, setDoc merge]
    ⟂ publicProfileRepository → firebasePublicProfileRepository
    → publicProfiles/{uid}  [upsert on save, delete when discoverable=false]
```
```
Connections
  connect-action (buddy card / buddy profile)
    → useConnections() → ConnectionProvider  [1 onSnapshot]
    → connectionService  (self-connect guard + block check)
    → connectionRepository → firebaseConnectionRepository
    → connections/{a__b}    [runTransaction on connect and cancel]
```
```
Safety — block
  safety-actions / blocked-users-list
    → useSafety() → SafetyProvider  [1 onSnapshot]
    → safetyService
    → blockRepository → firebaseBlockRepository
    → blocks/{blocker__blocked}
```
```
Safety — report
  safety-actions
    → useSafety() → SafetyProvider
    → safetyService (validateReport)
    → reportRepository → firebaseReportRepository
    → reports/{auto}        [addDoc, serverTimestamp, write-only]
```
```
Chat
  messages-list-pane / conversation-page / message-composer
    → useConversations() · useConversation(id) → ConversationsProvider
    → chatService  (canChat + block check + content validation)
    → chatRepository → firebaseChatRepository
    → conversations/{connectionId}            [runTransaction ensure]
    → conversations/{id}/messages/{msgId}     [writeBatch send, 2 onSnapshot]
```
```
Planning
  plan-page / sport-step / time-step / budget-step / venue-step
    → useActivityPlan(id)  [1 onSnapshot]
    → activityPlanService  (canPlanTogether + block check + version check)
    → activityPlanRepository → firebaseActivityPlanRepository
    → activityPlans/{connectionId}__active    [3 runTransaction paths]
```
```
Activities
  activities-page / activity-detail-page / home-page
    → useUpcomingActivities() · usePastActivities() · useActivity(id)
    → activityService (canConfirmActivity)
    → activityRepository → firebaseActivityRepository
    → activities/{planId}   [runTransaction confirm, bounded endAt queries]
```

---

## PARTIALLY CONNECTED

**1. Discover**
```
DiscoverPage → useDiscover() → discoverService → firebaseDiscoverRepository
             → publicProfiles                                    ✅ works
BUT: DiscoverPage renders `discoverList` from src/data/discover-list.json,
     not `incoming` / `suggested`.
```
The Firestore batch is fetched, filtered, scored by the matching engine and
ranked — then discarded except as a `Map` keyed by `item.buddyId`. The 12
`buddyId`s in the JSON (`buddy_aina`, `buddy_jason`, …) are the **mock
candidate ids**, which do not exist in `publicProfiles` in Firebase mode, so
the map never hits. Therefore: **PARTIAL**.

**2. Connect from Discover**
```
OpportunityCard → ConnectAction userId={item.buddyId} → connectionService
                → firebaseConnectionRepository → connections/{uid__buddy_aina}
```
Nothing in the service or the rules requires the other participant to be a
real account — `wellFormed()` only checks two distinct strings and a matching
pair id. Connecting from the Discover feed writes a **real, orphaned
connection document** naming a user that does not exist. Therefore:
**PARTIAL**.

**3. Blocking**
```
block/unblock → blocks/{blocker__blocked}                          ✅ works
enforcement in rules (pairIsUnblocked, both directions)            ✅ works
enforcement in services (connection, chat, planning)               ✅ present
BUT: subscribeToBlocks / getBlockedUserIds query only
     where('blockerId','==',uid) — the blocker's own side.
```
So if **B blocks A**, A's client has no idea: B still appears in A's Discover
feed and Messages list, and A's service-level check passes. A's Connect, chat
send or plan write is then refused by the rules and surfaces as a generic
failure. That is the correct privacy posture (never reveal who blocked whom)
but the UI shows a control that cannot succeed. Therefore: **PARTIAL**.

**4. Venue step**
```
venue proposal → activityPlans                                     ✅ Firebase
venue SEARCH   → venueRepository → mockVenueRepository             ⛔ mock
```
Google persistence is wired; Google discovery is not. Therefore: **PARTIAL**.

---

## BROKEN / HIGH PRIORITY

### CRITICAL

**C1 — `/discover` is a static demo page in Firebase mode.**
`src/features/discover/pages/discover-page.tsx:17,21`. The entire feed,
filter set, counts and empty states are driven by `src/data/discover-list.json`.
Real users who complete onboarding and turn on discovery **will never appear
in anyone's Discover feed**, and the signed-in user sees 12 fictional cards
with fabricated `matchPercentage` values and fabricated `distanceKm` values.
This also silently defeats the compatibility engine, the discovery filters,
the `publicProfiles` projection and the STEP 14B block exclusion for the
visible list.

**C2 — Connecting from `/discover` writes orphaned documents to production
Firestore.** Every card's Connect targets a hardcoded mock id. The rules
accept it. Result: `connections/{realUid}__buddy_aina` documents with a
participant that has no account, no `publicProfiles` doc and no way to connect
back. These then flow into `ConnectionProvider`, the Messages list (as
"Start a conversation" rows) and the unread badge.

**C3 — Fabricated metrics are rendered.** `matchPercentage` and `distanceKm`
come from the JSON file, not from `calculateCompatibility()` or any location
data. `CLAUDE.md` §19 forbids both explicitly ("Display a distance, a fake
compatibility percentage or any invented metric"). No coordinates exist in the
data model, so no distance can be honest.

**C4 — Firestore rules are unverifiable here.** `npm run test:rules` cannot
run: installed JDK is **17.0.15**, `firebase-tools@15` requires **21+**. 139
rules tests covering all 9 collections have not been executed on this machine,
and the live ruleset deployed to `sportbuddy-4d596` could not be read back. The
rules are the only thing standing between a signed-in attacker using the SDK
directly and other people's data.

### HIGH

**H1 — "Post an activity" ships a dead control.** `/discover/post-activity` is
reachable from the Discover header. Completing all four steps and pressing
"Post activity" navigates away and persists nothing. `CLAUDE.md` §19: "Ship a
control that looks functional but is not."

**H2 — Blocked-by users remain visible and actionable.** See PARTIAL §3. Also
means a blocked person's `publicProfiles` document stays readable to them.

**H3 — Mock demo credentials in the production bundle.**
`demo@sportsbuddy.app` / `password123` are present in
`dist/assets/index-*.js` of a Firebase-mode build, via `login-page.tsx`'s
import of `MOCK_LOGIN_DEFAULTS`.

**H4 — Account deletion is entirely absent.** `ProfileRepository` has no
delete, `AuthRepository` has no `deleteUser` or reauthentication, `blocks`
have no bulk-cleanup path, and `users/{uid}` rules deny delete outright. This
is the whole of STEP 15B.

### MEDIUM

**M1 — A block-state read runs on every guarded operation.**
`chatService.sendMessage` calls `blockRepository.getBlockedUserIds()` — an
unbounded `getDocs` on `blocks` — on **every message send**, and again on
every conversation open, connect and plan open. `SafetyProvider` already holds
a live subscription with the same data. Pure read-cost waste.

**M2 — `blocks` queries have no `limit()`.** Both `getBlockedUserIds` and
`subscribeToBlocks` are unbounded. Bounded in practice by how many people you
blocked, unbounded in code.

**M3 — Discover fetches 30 by recency, then filters `discoverable`
client-side.** `firebaseDiscoverRepository.getCandidates` has no
`where('discoverable','==',true)`. With enough non-discoverable profiles the
feed reads 30 documents and shows zero.

**M4 — `SafetyProvider` sits above `ProtectedRoute`.** The `blocks` listener
attaches during onboarding, where it can have nothing to report.

**M5 — `publicProfiles` is fully enumerable by any signed-in account.** No
`discoverable` constraint in the rule, no App Check, no rate limiting.

### LOW

**L1 — `src/services/google/maps-service.ts` is dead code** that also reads
`import.meta.env` directly.
**L2 — `assertCanInteract`, `blockedUserIds()` and the bidirectional branch of
`firebaseBlockRepository.records()` are dead.**
**L3 — Ineffective dynamic import** of `firebase/firestore` in
`firebase-block-repository.ts` (build warns).
**L4 — `publicProfiles` upsert uses object spread** instead of an explicit
field list.
**L5 — `/map` is a third parallel venue system** (OSM) alongside
`VenueRepository` and `maps-loader`, adding `leaflet`, `react-leaflet` and
`@types/leaflet` to the bundle.
**L6 — 1.38 MB single JS chunk** (411 kB gzipped); no code splitting.
**L7 — `CLAUDE.md` §20 is stale.** It documents STEP 1–13 plus 14B but does
not mention `/map`, `/discover/post-activity`, `src/data/*.json`,
`AppDropdown`, `OpportunityCard`, `RecommendationSwiper`, leaflet or the
OpenStreetMap service. It also claims services check block state — they do,
but only in the blocker's own direction.

---

## MOCK MODE PARITY

| Feature | Firebase | Mock | Both |
| --- | --- | --- | --- |
| Auth | Yes | Yes | **Both** |
| Profile (`users`) | Yes | Yes | **Both** |
| Public Profile | Yes | Yes | **Both** |
| Discover (repository) | Yes | Yes | **Both** |
| Discover (page feed) | **No** | **No** — static JSON, identical in both modes | neither |
| Connections | Yes | Yes | **Both** |
| Blocks | Yes | Yes | **Both** |
| Reports | Yes | Yes | **Both** |
| Chat | Yes | Yes | **Both** |
| Plans | Yes | Yes | **Both** |
| Activities | Yes | Yes | **Both** |
| Venues | Google (unwired) | Yes | **Both**, selected by `VITE_VENUE_SOURCE` |

---

## REPOSITORY INVENTORY

| Repository | Interface Exists? | Firebase Impl? | Mock Impl? | Actually Used? | Collection | Status |
|---|---|---|---|---|---|---|
| `AuthRepository` | Yes | `firebaseAuthRepository` | `mockAuthRepository` | **Firebase** (active) | Firebase Auth | CONNECTED NOT VERIFIED |
| `ProfileRepository` | Yes | `firebaseProfileRepository` | `mockProfileRepository` | **Firebase** | `users` | CONNECTED NOT VERIFIED |
| `PublicProfileRepository` | Yes | `firebasePublicProfileRepository` | `mockPublicProfileRepository` | **Firebase** | `publicProfiles` | CONNECTED NOT VERIFIED |
| `DiscoverRepository` | Yes | `firebaseDiscoverRepository` | `mockDiscoverRepository` | **Firebase** (result unused by the page) | `publicProfiles` | PARTIAL |
| `ConnectionRepository` | Yes | `firebaseConnectionRepository` | `mockConnectionRepository` | **Firebase** | `connections` | CONNECTED NOT VERIFIED |
| `BlockRepository` | Yes | `firebaseBlockRepository` | `mockBlockRepository` | **Firebase** | `blocks` | CONNECTED NOT VERIFIED |
| `ReportRepository` | Yes | `firebaseReportRepository` | `mockReportRepository` | **Firebase** | `reports` | CONNECTED NOT VERIFIED |
| `ChatRepository` | Yes | `firebaseChatRepository` | `mockChatRepository` | **Firebase** | `conversations` (+ `messages`) | CONNECTED NOT VERIFIED |
| `ActivityPlanRepository` | Yes | `firebaseActivityPlanRepository` | `mockActivityPlanRepository` | **Firebase** | `activityPlans` | CONNECTED NOT VERIFIED |
| `ActivityRepository` | Yes | `firebaseActivityRepository` | `mockActivityRepository` | **Firebase** | `activities` | CONNECTED NOT VERIFIED |
| `VenueRepository` | Yes | `googleVenueRepository` (Google, not Firebase) | `mockVenueRepository` | **Mock** | none (Places API) | GOOGLE CODE NOT WIRED |

There is no `UserRepository` — STEP 4 folded it into `ProfileRepository`, and
`CLAUDE.md` records that. No repository is dead: all 11 are selected in
`repositories.ts` and every one is reachable from a service.

---

## ROUTE TABLE

| Route | Firebase Dependency | Actual Source | Firebase Connected? | Mock Fallback? | Issues |
|---|---|---|---|---|---|
| `/auth/login` | Auth | Firebase Auth | Yes | Yes | ships `MOCK_LOGIN_DEFAULTS` into the bundle |
| `/auth/register` | Auth | Firebase Auth | Yes | Yes | — |
| `/onboarding` | Auth + `users` + `publicProfiles` | Firestore | Yes | Yes | `SafetyProvider` listener attaches here |
| `/home` | `activities`, `users` | Firestore + `recommendations.json` | Partial | Yes | recommendation swiper is static |
| `/map` | none | Nominatim + Overpass | n/a | No | bypasses `VenueRepository`; no service contract |
| `/discover` | `publicProfiles`, `connections`, `blocks` | **`discover-list.json`** | **No** | n/a | **C1, C2, C3** |
| `/discover/post-activity` | none | none | **No** | No | **H1** — writes nothing |
| `/discover/:userId` | `publicProfiles`, `connections` | Firestore | Yes | Yes | unreachable from the feed (cards have no link) |
| `/activities` | `activities`, `publicProfiles` | Firestore | Yes | Yes | — |
| `/activities/:activityId` | `activities`, `publicProfiles` | Firestore | Yes | Yes | — |
| `/messages` | `connections`, `conversations`, `publicProfiles`, `blocks` | Firestore + `localStorage` (unread) | Yes | Yes | orphan connections from C2 appear as rows |
| `/messages/:conversationId` | `conversations`, `messages`, `connections`, `blocks` | Firestore | Yes | Yes | block read on every send (M1) |
| `/messages/:conversationId/plan` | `activityPlans`, `connections`, `blocks` | Firestore | Yes | Yes | venue search is mock |
| `/profile` | `users` | Firestore | Yes | Yes | — |
| `/profile/edit` | `users`, `publicProfiles` | Firestore | Yes | Yes | — |
| `/settings` | `users`, `blocks`, `publicProfiles` | Firestore | Yes | Yes | no account-deletion control (correctly absent) |
| `/settings/discovery` | `users`, `publicProfiles` | Firestore | Yes | Yes | — |

---

## REALTIME LISTENER AUDIT

| Feature | Query scope | Listener target | Required? | Overly broad? | Cleanup exists? |
|---|---|---|---|---|---|
| Connections | `participants array-contains uid`, `limit(200)` | `connections` | Yes — the other person connecting back must land live | No | Yes (`connection-provider.tsx:94`) |
| Blocks | `blockerId == uid`, **no limit** | `blocks` | Debatable — block state changes only from this device | No, but unbounded and mounted too high | Yes (`safety-provider.tsx`) |
| Conversations | `participants array-contains uid`, `limit(100)` | `conversations` | Yes — list previews and unread badge | No | Yes (`conversations-provider.tsx:67`) |
| Messages | `orderBy createdAt desc`, `limit(20)`, one conversation | `conversations/{id}/messages` | Yes | No — newest page only, never the whole history | Yes (`use-conversation.ts:131`) |
| Activity plan | one document | `activityPlans/{id}__active` | Yes — two-person collaboration | No | Yes (`use-activity-plan.ts:121,143`) |

**5 listeners, all scoped, all with cleanup.** No whole-collection listener,
no listener on `publicProfiles` or `activities`, no duplicate subscription
(the conversations feed is shared by the Messages list and the tab badge
through one provider). Only defects: the `blocks` listener lacks a `limit()`
and mounts above `ProtectedRoute`.

---

## TRANSACTION AUDIT

| Operation | Required? | Implemented | Verdict |
|---|---|---|---|
| Connect / mutual transition | Yes | `runTransaction` (`firebase-connection-repository.ts:69`) | PASS — idempotent, promotes to `connected` when both asked |
| Cancel pending | Yes | `runTransaction` (`:123`) | PASS — refuses a connected pair and someone else's request |
| Ensure conversation | Yes | `runTransaction` (`firebase-chat-repository.ts:67`) | PASS — one conversation per pair |
| Send message + preview | Yes (atomicity, not contention) | `writeBatch` (`:166`) | PASS — preview can never outlive a missing message |
| Ensure active plan | Yes | `runTransaction` (`firebase-activity-plan-repository.ts:66`) | PASS |
| Propose (incl. venue) | Yes | `runTransaction` (`:104`) | PASS — patches one proposal, bumps `version` |
| Accept (incl. venue) | Yes | `runTransaction` (`:127`) | PASS — version checked inside the transaction |
| Confirm activity | Yes | `runTransaction` (`firebase-activity-repository.ts:104`) | PASS — activity + plan status written together, idempotent |
| Profile save / preferences | **No** | `setDoc merge` | PASS — correctly not a transaction |
| Block / unblock / report | **No** | `setDoc` / `deleteDoc` / `addDoc` | PASS |

---

## FIREBASE TIMESTAMP AUDIT

`serverTimestamp()` is used for every authoritative persisted timestamp:
`users.createdAt/updatedAt`, `publicProfiles.updatedAt`,
`connections.createdAt/updatedAt/connectedAt`, `blocks.createdAt`,
`reports.createdAt`, `conversations.createdAt/updatedAt/lastMessageAt`,
`messages.createdAt`, `activityPlans.*.updatedAt`,
`activities.createdAt/updatedAt`.

`new Date().toISOString()` appears in 5 places, all of them **optimistic
return values** handed back to the caller while the authoritative server value
arrives through the subscription or a read-back:
`firebase-connection-repository.ts:38,105,116`, `firebase-chat-repository.ts:85`,
`firebase-activity-plan-repository.ts:90,116,142`,
`firebase-activity-repository.ts:146`, `firebase-block-repository.ts:7`.
None is written to Firestore. The rules additionally pin
`createdAt == request.time` on `users`, `connections`, `blocks` and `reports`,
so a client-chosen timestamp is rejected server-side.

**Verdict: PASS.** No client-generated timestamp is authoritative.

---

## INDEX AUDIT

| Query | Index needed | Present | Status |
|---|---|---|---|
| Discover candidates — `orderBy('updatedAt','desc') limit(30)` | single-field (automatic) | automatic | NOT REQUIRED |
| Profiles by id — `where(documentId(),'in',chunk)` | none | — | NOT REQUIRED |
| Connections — `array-contains uid` + `limit`, no `orderBy` | none | — | NOT REQUIRED |
| Blocks — `where('blockerId','==',uid)` | single-field (automatic) | automatic | NOT REQUIRED |
| Conversations — `array-contains uid` + `limit`, no `orderBy` | none | — | NOT REQUIRED |
| Messages — `orderBy('createdAt','desc') limit(20)` in a subcollection | single-field (automatic) | automatic | NOT REQUIRED |
| Activities upcoming — `array-contains` + `endAt >= now` + `orderBy(endAt, startAt)` | **composite** | `firestore.indexes.json` #1 | **PRESENT + DEPLOYED** |
| Activities past — `array-contains` + `endAt < now` + `orderBy(endAt desc)` | **composite** | `firestore.indexes.json` #2 | **PRESENT + DEPLOYED** |

**No missing indexes.** The deployed set (read back via
`firebase firestore:indexes`) matches the local file field for field.

---

## ERROR HANDLING AUDIT

Every service maps failures to fixed, human strings before they reach the UI:
`auth-error.ts` (a Firebase-code → message map, with popup cancellations
resolving quietly), `connection-error.ts`, `chat-error.ts`, `planning-error.ts`,
`activity-error.ts`, `venue-error.ts`, `calendar-error.ts`, plus
`profileService`'s `SAVE_FAILED_MESSAGE` / `PREFERENCES_FAILED_MESSAGE` and
`discoverService`'s single `"We couldn't load sports buddies."`.

UI components that render `error.message` do so only for errors these services
threw: `login-page.tsx:56`, `register-page.tsx:56`, `onboarding-page.tsx:63`,
`edit-profile-page.tsx:64`, `discovery-settings-page.tsx:108`,
`use-conversation.ts:228`, `use-activity-plan.ts:195,261`. All fall back to a
generic string for non-`Error` values.

`safety-service.ts` is the one layer that lets a raw repository rejection
escape (`blockUser` / `unblockUser` / `reportUser` have no `try/catch`), but
`safety-actions.tsx` and `blocked-users-list.tsx` both discard the thrown value
with a bare `catch { }` and render their own copy, so **no Firebase code,
document path or stack trace can reach the screen**.

**`console.*` count in `src/`: 0.**

**Verdict: PASS. No raw Firebase error leaks found.**

---

## MOCK LEAK AUDIT

| File | Import | Verdict |
|---|---|---|
| `src/features/discover/pages/discover-page.tsx:17` | `@/data/discover-list.json` | **LEAK — critical.** Replaces the repository feed |
| `src/features/home/components/recommendation-swiper.tsx:7` | `@/data/recommendations.json` | **LEAK — low.** Static marketing content, never claimed to be live |
| `src/features/auth/pages/login-page.tsx:17` | `MOCK_LOGIN_DEFAULTS` from a mock repository | **LEAK — high.** See H3 |
| `src/constants/sports.ts:13` | `@/data/sport-list.json` | **Not a leak.** The sports dataset, which `CLAUDE.md` §19 requires to be centralized |

No feature file imports `mock-candidates`, `mock-conversations`,
`mock-activities`, `mock-venues` or `mock-store`.

---

## LOCALSTORAGE AUDIT

| File | Feature | Why Used | Mock-only? | Production path? | Safe? |
|---|---|---|---|---|---|
| `src/lib/storage.ts` | shared | the only module that touches `localStorage`; `readStore`/`readStoreArray`/`readStoreRecord` take a **type guard** and strip `__proto__`/`constructor`/`prototype` | No | Yes | **Yes** |
| `src/providers/theme-provider.tsx` | theme | remembers light/dark/system | No | Yes | **Yes** — a device preference |
| `src/lib/chat-read-state.ts` | chat unread | per-user, per-conversation read marker | No | **Yes** | Yes, with a known cost: two devices have two read states. Documented; the Firestore move changes this one file |
| `src/features/onboarding/onboarding-draft.ts` (via `storage.ts`) | onboarding | in-progress draft so a refresh loses nothing | No | Yes | **Yes** — written to Firestore once on completion |
| `src/repositories/mock-store.ts` + `mock-*-repository.ts` | mock backend | the whole mock backend | **Yes** | No | **Yes** |

**No page, component, provider or hook calls `localStorage` directly.** No
Firebase-backed domain data is stored there. `sessionStorage` is not used
anywhere.

---

## FIREBASE COST AUDIT

| Risk | Where | Severity |
|---|---|---|
| Unbounded `getDocs` on `blocks`, executed on **every message send**, conversation open, connect and plan open — while a live subscription already holds the same data | `chat-service.ts:54,115`, `connection-service.ts:46`, `activity-plan-service.ts:43` | **Medium** |
| `blocks` listener and query have no `limit()` | `firebase-block-repository.ts:9,10` | Medium |
| Discover reads 30 `publicProfiles` by recency and filters `discoverable` client-side — the read is paid whether or not anything is shown | `firebase-discover-repository.ts:22` | Medium |
| Discover's read is paid on every `/discover` visit and refresh, then **discarded** because the page renders static JSON | `discover-page.tsx` | **High** (pure waste today) |
| `blocks` listener attaches during onboarding | `App.tsx` / `safety-provider.tsx` | Low |
| Messages list pane stays mounted behind an open conversation, so the batched `publicProfiles` query runs on a phone showing the chat | `messages-layout.tsx` (documented trade) | Low |
| `publicProfiles` enumerable by any signed-in account, no App Check, no rate limiting | `firestore.rules` | Medium (abuse, not accident) |

**No N+1 found.** Profiles resolve through `getProfilesByIds` in chunks of 30;
connection state is joined from the single subscription; activities batch their
buddies in one query. No listener on `publicProfiles` or `activities`. No
unbounded `getDocs` outside `blocks`.

---

## AUTHORIZATION AUDIT

| Feature | Service check | Rules check | Verdict |
|---|---|---|---|
| Connect | self-connect guard + block check | participant, pair id, `requestedBy == [uid]`, `pairIsUnblocked` | **PASS** (both layers) |
| Cancel | transaction re-reads and refuses `connected` / someone else's request | sole pending requester | **PASS** |
| Open conversation | `canChat()` (requires `connected`) + block check | reads `connections/{id}`, requires `connected` + participant + unblocked | **PASS** |
| Send message | `canChat()` + block check + content validation | `senderId == uid`, trim/length, key allowlist, connected participant | **PASS** |
| Plan create / propose / accept | `canPlanTogether()` + block check + version check | connected participant, per-proposal legality, caller adds only themselves, `status` recomputed | **PASS** |
| Confirm activity | `canConfirmActivity()` (all four proposals agreed) | re-derives everything **from the plan document** | **PASS** |
| Block | id shape, not-self, reason enum | `blockerId == uid`, id match, not-self, enum, key allowlist | **PASS** |
| Report | `validateReport()` | reporter is caller, not-self, enums, context shape, note ≤ 500 | **PASS** |
| Profile write | `profile-schema.ts` enum membership + number ranges + allowlist | key allowlist + size caps | **PASS** |
| Discover read | excludes self and non-discoverable | any signed-in user may read `publicProfiles` | **PASS with a caveat** — exclusion is client-side; enumeration is possible |

No feature relies on a hidden button for authorization. **The caveat is that
none of the rules could be executed here** (C4), so "PASS" means the rule text
is correct on inspection, not that it was tested in this session.

---

## FIX PRIORITY

### P0 — blocks functionality or security

1. **Install JDK 21+ and run `npm run test:rules`.** 139 rules tests across
   all 9 collections are currently unverifiable. Nothing else on this list
   should be trusted in production before this passes.
2. **Fix `/discover` to render the repository feed.** Replace
   `discover-list.json` with `incoming` + `suggested` from `useDiscover()`.
   This is one page; the whole chain beneath it already works.
3. **Remove the fabricated `matchPercentage` and `distanceKm`.** Use
   `compatibility.score` from the matching engine and the area label. There
   are no coordinates in the data model, so no distance can be shown.
4. **Stop Connect from writing against mock ids** — a consequence of (2), but
   worth a service-level guard that the target has a `publicProfiles`
   document. Then clean up any orphaned `connections/*__buddy_*` documents
   already written to `sportbuddy-4d596`.

### P1 — required before STEP 15B

5. **Account deletion foundation:** `ProfileRepository.delete`,
   `AuthRepository.deleteUser` + reauthentication (note: Google popup
   reauthentication does not work in a Capacitor WebView — see
   `docs/firebase-handoff.md`), `publicProfiles` delete, owned-`blocks`
   cleanup, and a `users/{uid}` delete rule scoped to the owner.
6. **Decide the blocked-by posture.** Either keep it server-only and make the
   failure message honest, or add a second `where('blockedUserId','==',uid)`
   query and accept that it reveals a block.
7. **Remove or implement `/discover/post-activity`.** A wizard that persists
   nothing must not be reachable from the Discover header.
8. **Remove `MOCK_LOGIN_DEFAULTS` from the production bundle.**
9. **Live two-user verification in Firebase mode** — register, onboard,
   projection, discover, connect, chat, plan, venue, confirm, block, report.
   No step has ever been run against the live project.

### P2 — important, not a blocker

10. Read block state from `SafetyProvider` instead of re-querying Firestore on
    every send/open/connect (M1); add `limit()` to both `blocks` queries (M2).
11. Add `where('discoverable','==',true)` to `getCandidates` (M3) — needs a
    composite index with `orderBy('updatedAt','desc')`.
12. Move `SafetyProvider` inside `ProtectedRoute` (M4).
13. Configure **Firebase App Check** and consider tightening `publicProfiles`
    enumeration (M5).
14. Decide what `/map` is: fold OpenStreetMap into `VenueRepository` behind
    `VITE_VENUE_SOURCE`, or document it as a deliberate separate feature.

### P3 — cleanup

15. Delete `src/services/google/maps-service.ts` (dead, reads env directly).
16. Delete `assertCanInteract`, `blockedUserIds()` and the unreachable
    bidirectional branch in `firebaseBlockRepository.records()`.
17. Remove the ineffective dynamic `import('firebase/firestore')` in
    `firebase-block-repository.ts`.
18. Replace the object spread in `firebasePublicProfileRepository.upsert`
    with an explicit field list.
19. Code-split the 1.38 MB bundle.
20. **Update `CLAUDE.md` §20 and `theme.md`** to describe what actually
    exists: `/map`, `/discover/post-activity`, `src/data/*.json`, the
    OpenStreetMap service, leaflet, `AppDropdown`, `OpportunityCard`,
    `RecommendationSwiper`, and the true scope of the STEP 14B block checks.

---

## RUN CHECKS

| Check | Command | Result |
|---|---|---|
| TypeScript | `tsc -b --noEmit` | **PASS** — exit 0, no errors |
| Lint | `oxlint` | **PASS** — 0 errors, **8 warnings** (4 × fast-refresh `only-export-components`, 2 × `set-state-in-effect` in `safety-provider.tsx` and `buddy-profile-page.tsx`, 1 × `exhaustive-deps` unnecessary `searchVersion` dep in `discover-page.tsx`) |
| Unit tests | `vitest run` | **PASS** — 427 tests in 22 files, 0 failures, 31.8 s |
| Production build | `npm run build` | **PASS** — built in 7.31 s. Warnings: `INEFFECTIVE_DYNAMIC_IMPORT` (`firebase-block-repository.ts`), and a 1,384.21 kB chunk (410.74 kB gzip) over the 500 kB limit |
| Firestore rules tests | `npm run test:rules` | **FAIL TO RUN** — *"firebase-tools no longer supports Java version before 21."* Installed: OpenJDK 17.0.15. **139 tests did not execute** |
| Firebase CLI reachability | `firebase login:list`, `projects:list` | **PASS** — logged in, `sportbuddy-4d596` is the current project |
| Firestore database | `firestore:databases:list` | **PASS** — `(default)`, `FIRESTORE_NATIVE`, `STANDARD` |
| Deployed indexes | `firestore:indexes` | **PASS** — both `activities` composite indexes present and matching |
| Live document read/write | — | **NOT PERFORMED** — no data was read, created or modified |

---

## SUMMARY COUNTS

| | |
| --- | --- |
| Features fully connected **and live-verified** | **0** |
| Features connected, code-complete, **not live-verified** | **24** |
| Features partially connected | **4** (Discover, Connect-from-Discover, Blocking, Venue) |
| Features mock-only / static | **3** (Discover feed, Home recommendations, `/map`) |
| Features localStorage-only | **1** (chat unread — by design) |
| Features missing | **5** (account deletion, photo upload, push, post-activity, Google venue search) |
| Features not requiring Firebase | **2** (matching engine, calendar/ICS) |
| Firestore collections in code | **9** |
| Collections with rules | **9 / 9** |
| Collections missing rules | **0** |
| Security red flags | **0** |
| Direct Firebase imports in UI | **0** |
| Mock leaks in feature code | **3** (1 critical, 1 high, 1 low) |
| Realtime listeners | **5**, all scoped, all cleaned up |
| Missing indexes | **0** |
| STEP 15B blockers | **4** (JDK 21 / rules unverified, no delete paths, no reauthentication, no live verification) |
