# Compatibility & matching engine (STEP 7)

How Sports Buddy answers *"why is this person a good sports buddy for me?"*

## 1. Philosophy

- **Transparent, not clever.** A rule-based weighted sum. No AI, no
  embeddings, no machine learning, no randomness. The same two profiles
  always produce the same number.
- **Explainable.** Every score carries a factor breakdown and human-readable
  reasons, so a developer can answer "why is Aina 80%?" from the result
  object alone.
- **Compatibility, not judgement.** The score measures the fit *between two
  people*. Wording never grades a person: "Possible fit", never "bad match".
- **One meaningful sport is enough.** Two people need a single sport that
  works, not identical profiles. The formulas reward the first real overlap
  heavily and treat extra overlap as a bonus.
- **Derived, never stored.** See §9.

## 2. Where the code lives

| File | Responsibility |
| --- | --- |
| `src/types/matching.ts` | `MatchingSubject`, `CompatibilityFactor`, `CompatibilityResult`, `MatchingReason`, `RankedBuddy` |
| `src/services/matching/matching-constants.ts` | **every** weight, threshold and label band |
| `src/services/matching/matching-factors.ts` | the five pure factor calculators |
| `src/services/matching/matching-service.ts` | `calculateCompatibility`, `rankBuddies`, `getTopMatchingReasons`, `getCompatibilityLabel`, `toMatchingSubject` |
| `src/services/matching/matching-service.test.ts` | 36 unit tests over the engine |
| `src/lib/availability.ts` | `getSharedAvailability`, `countSharedPeriods`, `hasAvailabilityOverlap` — shared with Discover filtering |
| `src/lib/discover-filters.ts` | hard filters and `isVisibleCandidate` — **not** scoring |

The engine is pure: no Firebase, no storage, no React, no `Date.now()`, no
`Math.random()`. Input in, score out.

```
SportsProfile ─ toMatchingSubject() ─┐
                                     ├─► Compatibility engine ─► CompatibilityResult
DiscoveryProfile (publicProfiles) ───┘
```

`MatchingSubject` is the only view of the viewer the engine gets: their
sports, availability, area, budget and `preferredSports`. The private profile
never reaches it.

## 3. Weights

| Factor | Weight | Why |
| --- | --- | --- |
| Sports overlap | **35** | Without a shared sport there is nothing to do together |
| Skill compatibility | **20** | A mismatched level ruins an otherwise perfect match |
| Availability overlap | **20** | A buddy you can never meet is not a buddy |
| Location (approximate area) | **15** | Matters, but areas are coarse — see §7 |
| Budget compatibility | **10** | Smallest, but a real dealbreaker at the extremes |
| **Total** | **100** | asserted by a unit test |

Each factor is normalized to **0–1** first, then multiplied by its weight, so
the breakdown always adds up to the headline score:

```
score = round( Σ normalized(factor) × weight(factor) )   clamped to 0–100
```

## 4. Sport compatibility (35%)

Shared sports are the intersection of the viewer's sports and the candidate's
sports, **ordered with the viewer's preferred sports first** (an empty
`preferredSports` means "no preference", not "none").

```
no shared sport            → 0
first shared sport         → 0.70   (0.50 if none of the shared sports is preferred)
each additional shared     → +0.15  (capped at 1.0)
```

So one shared sport scores 0.70, two 0.85, three 1.00. Nothing is divided by
how many sports a person plays, so a five-sport profile is never penalised
for breadth — and a single strong shared sport always beats a pile of
unrelated ones.

**Best matching sport.** `getBestSportMatch()` returns the one shared sport
with the highest skill compatibility (ties broken by the preferred-first
order). It drives the skill factor and the sport wording.

## 5. Skill compatibility (20%)

Skill is compared **per sport**, by rank — never alphabetically:

```
beginner 0 · casual 1 · intermediate 2 · advanced 3
```

| Rank difference | Normalized |
| --- | --- |
| 0 (same level) | 1.0 |
| 1 | 0.8 |
| 2 | 0.4 |
| 3 | 0.1 |

**Multiple shared sports use the BEST shared sport, not an average.** Two
people only need one sport where their levels work; averaging would punish a
perfect badminton match because one of them also happens to climb. Extra
overlap is already credited to the sports factor, so it is not counted twice.

No shared sport → 0 (there is nothing to compare).

## 6. Availability compatibility (20%)

`getSharedAvailability()` returns shared day+period slots in week order, so
anything derived from it is deterministic. The score counts shared
**periods** (Sat afternoon + Sat evening is two):

| Shared periods | Normalized |
| --- | --- |
| 0 | 0 |
| 1 | 0.6 |
| 2 | 0.8 |
| 3 or more | 1.0 |

Identical diaries are not required — one workable slot is already meaningful,
which is why a single overlap already earns 60% of the factor.

## 7. Location compatibility (15%) — approximate area only

**The app has no coordinates, no GPS, no distance and no Maps integration, so
this factor must never imply one.** Nothing anywhere may render "4 km away".

| Case | Normalized | Wording |
| --- | --- | --- |
| Same area | 1.0 | "Both in Subang Jaya" |
| Same region | 0.6 | "Same general region" |
| Different region | 0.2 | "Different area — Cheras" (not a reason) |
| Either area missing | 0 | "No area set yet" |

Regions are a **coarse approximate grouping** declared on each area in
`src/constants/areas.ts` (`AreaRegion`), documented there as *not* travel
distance:

| Region | Areas |
| --- | --- |
| `kl-city` | Kuala Lumpur, Cheras, Ampang, Kepong, Setapak |
| `west-klang-valley` | Petaling Jaya, Subang Jaya, Shah Alam |
| `south-klang-valley` | Puchong |

`calculateLocationCompatibility()` is the entire upgrade path: when real
coordinates exist, that one function is replaced by a distance-based provider
and nothing else in the engine changes.

## 8. Budget compatibility (10%)

Structured ranges only (`{ min, max }`, `max: null` meaning open ended like
RM60+, handled as `Infinity`). Display strings are never parsed.

```
from = max(mine.min, theirs.min)
to   = min(mine.max ?? ∞, theirs.max ?? ∞)
```

| Case | Normalized |
| --- | --- |
| `to > from` — a real shared range | 1.0 |
| `to === from` — ranges just touch | 0.6 |
| gap ≤ RM10 | 0.4 |
| gap > RM10 | 0 |
| either budget missing | 0 |

Examples: RM20–40 vs RM30–60 → shared RM30–40 → 1.0. RM20–40 vs RM40–60 →
touching → 0.6. RM10–20 vs RM40–60 → gap RM20 → 0. RM60+ vs Flexible
(RM0+) → 1.0.

## 9. Filtering vs scoring — and what is *not* stored

These are separate concerns and are never mixed:

| Concern | Where | Effect |
| --- | --- | --- |
| Signed-in user | `isVisibleCandidate()` | **hard exclusion** |
| `discoverable !== true` | `isVisibleCandidate()` | **hard exclusion** |
| Active sport / skill / intent / area filters | `matchesFilters()` | **hard exclusion** |
| "Matching availability" switch | `matchesFilters()` | **hard exclusion** |
| Everything else (skill gap, different area, budget gap) | the engine | **lower score**, still shown |

Filters run **before** scoring — an excluded candidate is never scored — and
a low score never hides anyone. Ranking is not filtering.

**No compatibility value is ever persisted.** A score depends on who is
looking: Aina is 80% for Gary and something else entirely for Jason. So there
is no `compatibilityScore` field on `users/{uid}` or `publicProfiles/{uid}`,
no `matches/{id}` collection, and no stored reasons. Everything is computed at
runtime from data already in the batch — no extra reads, no N+1.

### Preferences the engine honours, and one it cannot

`DiscoveryPreferences.preferredSports` shapes the sports factor (§4).
`preferredSkillLevels`, `preferredIntents` and `requireAvailabilityOverlap`
stay **hard filters** in Discover so they are not counted twice.

`maxDistanceKm` **cannot be enforced**: there are no coordinates, so no
distance can be computed. It is stored, shown in Discovery settings as a
travel radius, and used as nothing more until the location step lands.

## 10. Reasons

```ts
MatchingReason { type: MatchingFactorKey; text: string; strength: number }
```

`strength` is the factor's normalized score. Reasons are only generated for
factors with something positive to say (`strength ≥ 0.5`); a weak factor
contributes to the breakdown instead, never a negative "reason".

`getTopMatchingReasons()` orders by **contribution** (`strength × weight`),
so a shared sport outranks a perfect budget match while a genuinely strong
factor can still jump the queue. Ties fall back to the fixed
`REASON_PRIORITY` (sports → skill → availability → location → budget), so the
order never changes between renders or refreshes.

One deliberate de-duplication: with exactly one shared sport the skill reason
already names it ("Same badminton level"), so the sports reason is dropped
rather than repeated.

## 11. Ranking

`rankBuddies(candidates, subject)` maps each survivor to a `RankedBuddy` and
sorts:

1. compatibility score, descending
2. shared sport count, descending
3. `displayName`, ascending
4. `userId`, ascending

Fully deterministic — a refresh never reshuffles the feed. The candidate
projection is never mutated: `RankedBuddy` keeps `profile` and
`compatibility` separate, which is also how STEP 8 will add a connection
state without touching the engine.

Cost is O(n × small comparison) over one batch of ≤ 30 candidates, entirely
client-side. Firestore retrieves; TypeScript scores.

## 12. Missing and incomplete data

Nothing throws, and nothing gets free points:

| Missing | Result |
| --- | --- |
| No shared sport | sports 0, skill 0 |
| Empty availability | availability 0 |
| `area: null` on either side | location 0 |
| `budget: null` on either side | budget 0 |
| Everything missing | score 0, no reasons, `bestSportMatch: null` |

Empty arrays and `null` maxima are guarded, so there is no division by zero
and no `NaN`.

## 13. Worked example

Viewer (mock demo account onboarded as in `docs/data-model.md`): badminton
intermediate + climbing beginner, free Saturday afternoon and evening, Subang
Jaya, RM20–40. Real engine output over the mock candidates:

| Candidate | Score | sports | skill | avail | loc | budget |
| --- | --- | --- | --- | --- | --- | --- |
| Chloe (climbing casual, badminton beginner, PJ) | 81 | 30/35 | 16/20 | 16/20 | 9/15 | 10/10 |
| Aina (badminton intermediate, running casual, PJ) | 80 | 25/35 | 20/20 | 16/20 | 9/15 | 10/10 |
| Amir (badminton advanced, Subang Jaya, weeknights) | 66 | 25/35 | 16/20 | 0/20 | 15/15 | 10/10 |
| Jason (climbing advanced, Subang Jaya, Sat morning) | 48 | 25/35 | 2/20 | 0/20 | 15/15 | 6/10 |
| Mei (pickleball only, KL, Sat afternoon) | 21 | 0/35 | 0/20 | 12/20 | 3/15 | 6/10 |
| Ryan (basketball only, Kepong, Sun evening) | 7 | 0/35 | 0/20 | 0/20 | 3/15 | 4/10 |

Aina's reasons: "Same badminton level", "Both free Saturday afternoon",
"Shared budget RM20–40". No score in this table is hardcoded anywhere.

Note a perfect twin scores ~91, not 100: full sports and availability marks
need three shared sports and three shared slots. That is intentional — more
overlap really is more compatible.

## 14. Score bands

| Score | Label |
| --- | --- |
| 90–100 | Excellent fit |
| 75–89 | Great fit |
| 60–74 | Good fit |
| 40–59 | Possible fit |
| 0–39 | Low fit |

Bands live in `COMPATIBILITY_LABELS`; per-factor wording ("Excellent",
"Great", "Good", "Some", "Low") in `FACTOR_LABELS`. No threshold appears in
JSX.

## 15. UI surfaces

- **`BuddyCard`** takes a `RankedBuddy`: score + band beside the name, up to
  three reasons, then shared sports first (tinted `bg-primary/10`).
- **`/discover/:userId`** adds a compatibility card above the profile — score,
  reasons, and the full factor breakdown with weighted points.
- The score is never expressed by colour alone: the number, the `%` and the
  band label are all text, and the score carries
  `aria-label="80 percent compatible"`.

## 16. Tests

`npm test` (Vitest). 41 tests across `matching-service.test.ts` and
`discover-filters.test.ts`, covering: weights totalling 100, sport overlap and
preference effects, best-sport selection, all four skill distances,
rank-not-alphabetical comparison, availability tiers, same/region/different
area, the absence of any "km" wording, all four budget cases including
open-ended, identical profiles, 0–100 bounds, determinism, breakdown
summing to the score, incomplete documents, reason/factor correspondence,
reason ordering and de-duplication, ranking order and tie-breaks,
non-mutation of the projection, self-exclusion and `discoverable: false`.

## 17. Future

- Replace `calculateLocationCompatibility()` with a distance provider once
  coarse coordinates exist; `maxDistanceKm` becomes a real filter and area
  becomes the fallback.
- Optional weight tuning per user ("availability matters most to me") — the
  weights are already one constant.
- Intent and intensity as scored factors rather than filters, if the product
  wants them ranked.
- Nothing here changes when Connect (STEP 8) arrives: relationship state
  sits alongside `compatibility` on `RankedBuddy`, never inside it.
