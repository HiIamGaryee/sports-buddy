# Discover

How Sports Buddy shows people to each other without exposing private data.

## 1. Data flow

```
users/{uid}                 PRIVATE profile + preferences
    │  profileService (save / preferences change / first load)
    ▼
toDiscoveryProfile()        the allowlist mapper — the privacy boundary
    ▼
publicProfiles/{uid}        DISCOVERY-SAFE projection
    ▼
DiscoverRepository          reads publicProfiles only
    ▼
discoverService             excludes self, filters, sorts
    ▼
useDiscover() → Discover UI
```

Writes and reads are separate repositories on purpose:
`PublicProfileRepository` only ever writes **your own** projection;
`DiscoverRepository` only ever reads **other people's**.

## 2. Privacy boundary

`publicProfiles/{uid}` contains exactly the `DiscoveryProfile` fields —
`userId`, `displayName`, `photoUrl`, `bio`, `sports`, `intents`,
`preferredIntensity`, `availability`, `area`, `budget`,
`profileCompleteness`, `discoverable`, `updatedAt`.

It never contains email, auth metadata, notification settings, discovery
filters, `radiusKm`, `createdAt`, or `onboardingCompleted`. The mapper picks
every field explicitly and never spreads the private profile, so adding a
private field cannot leak it. `users/{uid}` stays owner-only in
`firestore.rules`; Discover never reads it.

Travel radius stays private deliberately: it is a filter for *your* feed, not
information other people need about you.

## 3. Projection synchronization

`profileService` owns it — the UI never writes two documents:

| Trigger | Effect |
| --- | --- |
| onboarding completes | projection created |
| profile edited | projection rewritten |
| `discoverable` turned off | projection **deleted** |
| `discoverable` turned on | projection recreated |
| profile loaded (app open) | projection repaired if missing or stale |

Turning discovery off deletes the document rather than flagging it, so a
stale profile can never be browsed and no query needs a `discoverable`
filter. The flag is still stored and re-checked in the service as a
belt-and-braces defence.

The repair pass on load costs one read per session and exists so STEP 3/4/5
users get a projection without any migration.

## 4. Candidate retrieval

- One limited batch: `CANDIDATE_BATCH_LIMIT = 30`, ordered by `updatedAt`
  descending (single-field order → no composite index needed).
- **No realtime listeners.** Discover is a one-time read plus a manual
  refresh button, which keeps Firestore reads predictable.
- Exclusions live in `discoverService.loadCandidates()`: the signed-in user
  is filtered out by `userId`, and anything with `discoverable !== true` is
  dropped.

## 5. Filters

`DiscoverFilters` is session-only state. It is seeded from the saved
`DiscoveryPreferences` and **never written back** — changing a filter in
Discover must not silently rewrite the profile. Internally the hook stores
`null` for "use my saved preferences", which makes **Reset** a return to the
saved preferences (not "show everything").

Filtering is pure and client-side (`src/lib/discover-filters.ts`), so
changing a filter never triggers another read:

| Filter | Rule |
| --- | --- |
| Sports + Skill | one sport must satisfy both at once |
| Looking for | intent overlap |
| Area | candidate's area is in the selection |
| Matching availability | `hasAvailabilityOverlap()` against your own slots |

An empty array means "no restriction".

## 6. Mock mode

`VITE_DATA_SOURCE=mock` uses ten seeded Klang Valley candidates
(`src/repositories/discover/mock-candidates.ts`) plus any projection the
signed-in mock account has written, so projection sync is observable locally.

## 7. Firebase mode

Reads `publicProfiles` through `firebaseDiscoverRepository`. There is **no
fallback to `users`** if a projection is missing — a missing projection is
fixed by the repair pass, not by reading private data.

## 8. Current MVP limits

- One batch of 30, newest first. Pagination is not wired up; the repository
  method takes a limit so `startAfter` can be added without touching the UI.
- Ranking is `updatedAt` descending. It is **not** a recommendation order.
- No distance: only approximate areas exist, so nothing shows "4 km away".
  Area filtering stands in until coordinates exist.
- No compatibility score and no Connect action — both are deliberately
  absent rather than faked.

## 9. Next: STEP 7 compatibility

STEP 7 can score `SportsProfile` + `DiscoveryPreferences` against each
`DiscoveryProfile` candidate using the same pure helpers
(`hasAvailabilityOverlap`, the sports/skill/intent comparisons) and sort the
list in `discoverService`. `BuddyCard` takes a `DiscoveryProfile`, so a score
block and match reasons can be added without changing the data contract.

## 10. Next: location and radius

When coordinates are introduced, the projection gains a coarse location (not
an exact point), `maxDistanceKm` becomes a real filter, and the area filter
becomes a fallback. That change belongs to the Maps step, and must keep the
same allowlist discipline.
