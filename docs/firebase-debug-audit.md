# Firebase Debug Audit

Audit date: 2026-09-19. This document reflects the current source after the
production data wiring pass. Values from environment files are intentionally
omitted.

## Current Status

| Check | Status | Evidence |
| --- | --- | --- |
| Firebase client SDK installed | YES | `firebase@^12.18.0` in `package.json` |
| Firebase initialized | YES | `src/services/firebase/client.ts` |
| Firebase Admin SDK | NO | No `firebase-admin` package or import |
| Firebase REST API | NO | No direct Firebase/Google database REST calls |
| Firebase Auth | YES | `src/repositories/auth/firebase-auth-repository.ts` |
| Firestore app data | YES | Firebase repositories under `src/repositories/` |
| Firebase Storage | NO | No `firebase/storage` import; profile photos remain URL/local fallback |
| Push notifications | NO | No FCM or OneSignal implementation |
| Account deletion | UNCONFIRMED | Auth rollback deletion exists, but user-facing deletion and cleanup are not implemented |
| Firebase live reads/writes in this pass | PASS | Normal tester Auth, `users`, and `publicProfiles` verified without dumping private data |
| Firestore emulator suite | NOT RUN | Installed Firebase CLI requires Java 21; environment has Java 17 |

## Architecture

```text
React page/component
  ↓
Hook
  ↓
Service
  ↓
Repository factory
  ↓
Firebase JavaScript SDK
  ↓
Firebase Auth / Firestore
```

The repository factory is the only production/mock switch. UI files do not
branch on `VITE_DATA_SOURCE`.

## Production Data Source Matrix

| Feature | Production source | Mock source | Status |
| --- | --- | --- | --- |
| Profile recap banner | Firebase `activities`, group activities, attendance → `recapService` | Mock repositories; JSON recap hook retained for demo/tests only | CONNECTED |
| `/recap` | Same `recapService` as the Profile banner | Mock repositories | CONNECTED |
| Buddy ratings | Firestore `buddyRatings` | `mockRatingRepository` / `mock-ratings.ts` | CONNECTED |
| Home recommendations | Existing venue service → OpenStreetMap | Mock venue repository | CONNECTED; `.env.local` now selects OpenStreetMap |
| Planner venue search | OpenStreetMap adapter by default; Google Places optional | Mock venue repository | CONNECTED; `.env.local` selects OpenStreetMap |
| Selected planner venue | Firebase `activityPlans` venue proposal/snapshot | Mock activity-plan repository | CONNECTED |
| Purchases | RevenueCat native adapter | Web/demo repository | REVENUECAT PENDING for web; native adapter exists |
| Push | FCM/OneSignal | None | NOT IMPLEMENTED |
| Account deletion | Firebase Auth + Firestore cleanup + reauthentication | Mock account removal | NOT READY |
| Photo upload | None; existing profile URL/local fallback | Local fallback | NOT IMPLEMENTED |

## Recap

Before this pass, `src/features/recap/components/monthly-recap-banner.tsx`
called `useMonthlyRecapDemo`, which read `src/data/last-month-exercise.json`.

Now both the banner and `/recap` call `useMonthlyRecap`, which calls:

```text
Firebase/mock Activities + Group Activities + Attendance
  ↓
src/services/recap/recap-service.ts
  ↓
src/features/recap/use-monthly-recap.ts
  ↓
/recap and Profile MonthlyRecapBanner
```

Confirmed one-to-one activities are queried for the signed-in user with a
bounded `startAt` calendar range and ended-session filtering. The query is
implemented by `getForUserInRange` in both activity repositories and uses the
`activities` composite index on `participants` and `startAt`.

The live recap derives total sessions, active days, sport breakdown, top sport,
and venue frequency only from stored activity/group-activity fields. Duration
and distance are omitted because confirmed Activity documents do not store
usable measurements.

`use-monthly-recap-demo.ts` and `last-month-exercise.json` remain available for
mock/demo tests, but no production recap component imports the demo hook.

## Ratings

The canonical collection is:

```text
buddyRatings/{eventId}__{reviewerId}
```

The stored model matches the existing rating UI: `eventId`, `reviewerId`,
`reviewedUserId`, `attendanceStatus`, `punctuality`, `experience`, `note`, and
`createdAt`.

Rules require:

- an authenticated reviewer;
- `reviewerId == request.auth.uid`;
- reviewer and reviewed user are different participants;
- the referenced confirmed Activity exists and has ended;
- the reviewer and reviewed user are participants in that Activity;
- deterministic IDs and valid enumerated values;
- no updates or deletes after creation.

Reads are authenticated because the existing Profile track-record UI presents
an aggregate reliability signal. The repository reads only a bounded list for
the requested profile/reviewer; it does not run a rating query per Discover
card.

## Home and Venue Wiring

Home recommendation cards currently represent places/venues, not people. The
static `src/data/recommendations.json` import was removed from the production
component. Home now uses `useRecommendations` → `venueService` →
`venueRepository`, with bounded results, loading, empty, and retry states.

The planner and Home use the same venue abstraction. The existing
`src/services/openstreetmap/openstreetmap-service.ts` is adapted by
`src/repositories/venue/openstreetmap-venue-repository.ts`. Failed production
provider requests show the venue error and retry; they do not silently inject
mock venues. Only the explicitly selected mock provider returns mock venues.

The selected venue still persists through:

```text
Planner UI
  ↓
venueService.toSelection()
  ↓
activityPlanService
  ↓
Firebase activityPlans venueProposal
```

The current `.env.local` setting is `VITE_VENUE_SOURCE=openstreetmap`.
`.env.example` documents `openstreetmap` as the default live option.

## Purchases, Push, Storage, and Deletion

Purchases are not moved into Firebase. Native purchase authority remains
RevenueCat through `native-purchases-repository.ts`. Browser mode uses the
explicit demo/web repository and is not a production payment gateway.

No push transport is implemented. No fake Firestore notification records were
added.

No Firebase Storage upload was added because the current profile flow does not
require it, and recap share images remain local-only.

Account deletion is not ready: `firebaseAuthRepository.deleteCurrentUser()` is
currently a rollback helper, Firestore user deletion is denied by rules, and
there is no user-facing reauthentication plus multi-collection cleanup flow.

## Firestore Indexes

Added one index required by the bounded recap query:

```text
activities: participants CONTAINS + startAt ASCENDING
```

Existing activity indexes remain unchanged. No speculative recommendation or
rating index was added; rating reads are bounded equality queries without an
explicit order.

## Important Files

- `src/services/firebase/client.ts`
- `src/services/firebase/config.ts`
- `src/repositories/repositories.ts`
- `src/repositories/activity/activity-repository.ts`
- `src/repositories/activity/firebase-activity-repository.ts`
- `src/repositories/activity/mock-activity-repository.ts`
- `src/services/recap/recap-service.ts`
- `src/features/recap/use-monthly-recap.ts`
- `src/features/recap/components/monthly-recap-banner.tsx`
- `src/features/recap/components/monthly-recap-dialog.tsx`
- `src/types/recap.ts`
- `src/lib/recap.ts`
- `src/repositories/ratings/rating-repository.ts`
- `src/repositories/ratings/firebase-rating-repository.ts`
- `src/repositories/ratings/mock-rating-repository.ts`
- `src/repositories/ratings/rating-document.ts`
- `src/services/ratings/ratings-service.ts`
- `src/lib/buddy-rating.ts`
- `src/features/ratings/use-buddy-ratings.ts`
- `src/features/home/use-recommendations.ts`
- `src/features/home/components/recommendation-swiper.tsx`
- `src/services/venue/venue-service.ts`
- `src/services/openstreetmap/openstreetmap-service.ts`
- `src/repositories/venue/openstreetmap-venue-repository.ts`
- `src/repositories/venue/openstreetmap-venue-repository.ts`
- `src/repositories/venue/mock-venue-repository.ts`
- `src/config/env.ts`
- `.env.example`
- `firestore.rules`
- `firestore.indexes.json`
- `tests/firestore-rules.test.ts`

## Verification

| Check | Result |
| --- | --- |
| TypeScript | PASS — `npm run typecheck` |
| Unit tests | PASS — 32 files, 556 tests |
| Lint | PASS with existing non-blocking warnings |
| Firestore emulator tests | NOT RUN — Java 21 required by installed Firebase CLI; Java 17 available |
| Production build | PENDING final run after this documentation update |

No credentials, private keys, tokens, emails, UIDs, messages, or private
Firestore documents are included in this audit.
