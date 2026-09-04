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
discoverService             excludes self → applies hard filters
    ▼
Matching engine             scores the survivors, ranks them
    ▼
Connection state join       the viewer's relationship with each of them
    ▼
DiscoverBuddy[] → useDiscover() → Discover UI
```

Full pipeline, in order:

```
publicProfiles batch (≤ 30, newest first)
        ↓  hard exclusions — self, discoverable !== true
        ↓  hard filters — sports/skill/intent/area/availability
        ↓  compatibility calculation (per viewer, at runtime)
        ↓  ranking — score desc, shared sports desc, name, userId
        ↓  connection state join (from ConnectionProvider, no extra reads)
BuddyCard
```

The join is **last** and purely additive: `joinConnectionStates()` attaches a
`connectionState` to each already-ranked candidate and never touches the
`CompatibilityResult` or the order it produced.

Filters run **before** scoring, so an excluded candidate is never scored, and
a low score never hides anyone: ranking and filtering are different things.
The score is **never stored** — it depends on who is looking. Details:
`docs/matching.md`.

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
- Exclusions live in `discoverService.loadCandidates()` via the pure
  `isVisibleCandidate()`: the signed-in user is filtered out by `userId`, and
  anything with `discoverable !== true` is dropped.

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

Filters are **hard**: they decide who is in the feed at all. Anything softer
— a skill gap, a different area, a budget gap — lowers the compatibility
score instead of hiding the person.

## 6. Mock mode

`VITE_DATA_SOURCE=mock` uses eleven seeded Klang Valley candidates
(`src/repositories/discover/mock-candidates.ts`) plus any projection the
signed-in mock account has written, so projection sync is observable locally.
The seed set deliberately spans strong, medium and weak matches, candidates
with no sport overlap, no availability overlap, a different region, a budget
gap and an open-ended (RM60+) budget, so ranking is visibly different rather
than uniform.

## 7. Firebase mode

Reads `publicProfiles` through `firebaseDiscoverRepository`. There is **no
fallback to `users`** if a projection is missing — a missing projection is
fixed by the repair pass, not by reading private data.

## 8. Current MVP limits

- One batch of 30, newest first. Pagination is not wired up; the repository
  method takes a limit so `startAfter` can be added without touching the UI.
- Ranking is compatibility descending (STEP 7). `updatedAt` is only the
  order the batch is retrieved in.
- No distance: only approximate areas exist, so nothing shows "4 km away".
  Area filtering and approximate area compatibility stand in until
  coordinates exist, and `maxDistanceKm` still cannot be enforced.
- Connected members stay in the feed, clearly marked, because no connections
  or messages screen exists yet — STEP 9 gives them a home.

## 9. Connection state (STEP 8)

`DiscoverBuddy` is the view model: `{ profile, compatibility,
connectionState }` — three separate concerns as three separate fields.
Connection state comes from `ConnectionProvider`, which holds **one** scoped
subscription for the signed-in user, so decorating 30 candidates costs **zero
extra reads** — no N+1. Discover and the candidate profile read the same
provider, so they can never disagree about a relationship.

| State | Discover treatment |
| --- | --- |
| `pending-incoming` | lifted into a **"Wants to connect"** section above the ranked feed, with a "<name> wants to connect." line and a **Connect back** button |
| `none` | **Connect** plus a subtle session-only **Not now** |
| `pending-outgoing` | **Request sent** (disabled) with **Cancel request** beneath |
| `connected` | a **Connected** status row, not a button; the candidate stays in the feed because there is no connections screen yet |

Surfacing incoming requests first is an ordering decision only — **their
compatibility score is calculated exactly the same way**, and nothing is
inflated because someone asked first. Within each section the ranking is
still score-descending.

Low scores are never hidden: only active filters remove people. Filters
continue to work unchanged — sport, skill, intent, area and availability all
apply before scoring and before the join.

"Not now" is in-memory only. It hides a candidate for this Discover session
and is deliberately not persisted; refresh (or the refresh button) brings
them back. No `dismissedProfiles` backend exists.

Full walkthrough: `docs/connections.md`.

## 10. Compatibility (STEP 7)

`discoverService.getRankedCandidates()` filters, then scores, then ranks, and
returns `RankedBuddy[]` (`{ profile, compatibility }`). `BuddyCard` and
`/discover/:userId` render the compatibility; the projection itself is never
mutated, so STEP 8 can add a connection state beside `compatibility`.

Weights are sports 35, skill 20, availability 20, location 15, budget 10.
The whole engine — formulas, thresholds, reasons, ranking and its limits —
is documented in `docs/matching.md`.

## 11. Next: location and radius

When coordinates are introduced, the projection gains a coarse location (not
an exact point), `maxDistanceKm` becomes a real filter, and the area filter
becomes a fallback. That change belongs to the Maps step, and must keep the
same allowlist discipline.
