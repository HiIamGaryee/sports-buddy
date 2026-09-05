# Confirmed activities

The moment a collaborative draft stops being a plan and becomes something two
people are actually doing.

## 1. Purpose

STEPS 10–11 got two connected members to agree a sport, a time, a budget and a
venue. Every one of those was agreed by both. STEP 12 performs the one
conversion left:

```
ActivityPlan  →  Activity
```

`ActivityPlan` is **how they agreed**. `Activity` is **what they agreed to
do** — a stable snapshot, not a live view of the plan.

## 2. Lifecycle

```
Discover → Connect → Chat → Plan Together
  → Sport ✓ → Time ✓ → Budget ✓ → Venue ✓
  → Final review → Confirm activity → Upcoming
```

| Plan status | Meaning |
| --- | --- |
| `draft` | sport / time / budget not all agreed |
| `ready` | those three agreed, ready for a venue |
| `venue-agreed` | all four agreed, ready to confirm |
| `confirmed` | an activity exists; the plan is read-only history |

## 3. Why one Confirm press

Both people already agreed every part, one at a time, during planning. Asking
each of them to press Confirm again would be a second round of agreement over
something already settled.

So: **once all four proposals are mutually agreed, either participant may
confirm**, and the activity belongs to both. The agreement happened in Plan
Together; confirmation is the system conversion.

## 4. Idempotency

Confirmation is safe to press twice, from either side, at the same instant.

The activity's id **is** its source plan's id, so both people confirming land
on the same document. In Firebase the whole conversion is one transaction: it
reads the activity, returns it if it already exists, otherwise re-verifies the
live plan and writes both documents together. The mock repository does the
same check in the same order.

A second confirm is not an error — it returns the existing activity.

## 5. Activity id strategy

```
activities/{planId}
```

One plan produces at most one activity, and that becomes a property of the
database rather than something the client has to be careful about. It also
lets the security rules read the source plan in a **single lookup** at
`activityPlans/{activityId}` — the same trick conversations and plans already
use.

The connection id is deliberately **not** used: one pair will eventually have
many activities.

**Constraint this creates:** the active plan currently lives at
`{connectionId}__active` (STEP 10 §4), so a pair has one plan slot and
therefore one confirmed activity. The archive step that lets a pair plan again
must move a confirmed plan to a unique id before the slot is reused — which it
has to do anyway.

## 6. Schema

`activities/{activityId}` — see `docs/data-model.md` for the field table.

```jsonc
{
  "id": "aina__gary__active",
  "sourcePlanId": "aina__gary__active",
  "connectionId": "aina__gary",
  "participants": ["aina", "gary"],
  "sportId": "badminton",
  "startAt": "<Timestamp>",
  "endAt": "<Timestamp>",
  "budget": { "min": 20, "max": 40, "currency": "MYR", "unit": "per-person" },
  "venue": { /* VenueSelection from STEP 11 */ },
  "status": "upcoming",
  "createdBy": "gary",
  "createdAt": "<serverTimestamp>",
  "updatedAt": "<serverTimestamp>"
}
```

Only `upcoming` is implemented. `completed` and `cancelled` exist in the type
so a later step can add their workflows without a type change; nothing
produces or renders them, and no UI hints at them.

## 7. Snapshot

An activity stores **stable agreed values**, not references back into the
plan. After confirmation the plan could theoretically change (it cannot — it
is locked) and the activity would still read correctly.

What is copied: sport, resolved start/end instants, budget, venue,
participants, connection and source plan ids.

What is **not**:

- **No proposal history** — no `acceptedBy`, `proposedBy` or `version`.
- **No profile data** — no name, email, photo, bio or sports. Participant ids
  only; display data comes from `publicProfiles` at render time.
- **No compatibility score** (derived per viewer).
- **No raw provider data.** The venue is the STEP 11 `VenueSelection`
  snapshot, carried straight over — **no second Places request** is ever made.

### Time

The plan stores what the two agreed in words — "5 Jan, 17:00,
Asia/Kuala_Lumpur". An activity needs a real instant, so
`resolvePlannedInstant()` resolves it **once, at confirmation**, using `Intl`
to ask the named zone for its offset.

Deliberately not `new Date(y, m, d, …)`: that would use whichever device
confirmed, so two people in different zones would disagree about when their
session is. Nothing hardcodes an offset, and display is always in the reader's
own locale and zone.

### Money

Structured: `{ min, max, currency: 'MYR', unit: 'per-person' }`, never a
display string. `max: null` means open ended. Formatting happens at render.

**It is a budget the two agreed, not a venue quote.** Nothing has been priced
or reserved.

## 8. Repository

```
UI → useUpcomingActivities / useActivity → activityService → activityRepository
                                                             → Firebase | Mock
```

Three methods, all used: `createFromPlan`, `getById`, `getForUser`. There is
deliberately **no update and no delete** — an activity is immutable in this
step, so those methods do not exist to be called by accident.

## 9. Firebase

`createFromPlan` is one `runTransaction` over two documents: it reads
`activities/{planId}`, returns any existing one, otherwise re-reads the plan,
re-runs `canConfirmActivity()` against the **live** plan (not the caller's
copy), then writes the activity and marks the plan `confirmed` atomically.

`getForUser` queries `participants array-contains uid` with a limit and no
`orderBy` — see §11.

## 10. Mock

`mockActivityRepository` mirrors it exactly: same deterministic id, same
early return, same plan re-verification, same `confirmed` side effect,
through `localStorage` behind the repository. Mock mode must not behave
differently from Firebase.

There is **no seeded activity**. The `Plan → Confirm → Activity` flow is
exercised by the tests end to end through the real services, so the feature
cannot pass on fixtures alone.

## 11. Upcoming query

```
activities where participants array-contains <uid>  limit 50
```

Status filtering and start-time ordering happen in the **service**, not the
query, which keeps this index-free (`firestore.indexes.json` stays empty) —
the same choice STEP 9 made for conversations.

The trade: it fetches a user's activities and filters client-side. At MVP
volume (a handful per user) that is cheaper than maintaining a composite
index. When a user can accumulate hundreds, add
`participants (array-contains) + status (==) + startAt (asc)` and move both
operations into the query.

Ordering is by `startAt` ascending — **soonest first, never creation order**.

## 12. Activity card

`ActivityCard` is the core unit, and the whole card is one link so it is a
single keyboard target. Reading order is deliberate:

1. **date block** (SEP / 12)
2. **sport + buddy**
3. **time range**
4. **venue**
5. **budget** — last, because it is planning context, not a price

Status is a `Badge` with a word, never colour alone. There is no Cancel,
Reschedule or Rate action, because none of those exist.

## 13. Activity detail

`/activities/:activityId` shows sport, date, time + duration, participants,
budget, venue with its address, an optional map and **Open in Maps** (reusing
STEP 11's `buildGoogleMapsUrl` — there is no second URL builder).

A missing activity and one belonging to other people render **identically**,
so a guessed id never reveals whether somebody else's activity exists.

The venue map uses the agreed venue's public coordinates — a place, not a
person — and is an enhancement: the address stands on its own if Maps is not
configured or fails.

It carries one honest line: *"You both chose this venue. Sports Buddy doesn't
reserve it."*

## 14. Chat integration

The structured plan card above the composer follows the plan's state, and once
an activity exists it becomes an activity card: the eyebrow reads **Activity
confirmed**, the venue is listed, and the action becomes **View activity**,
linking to `/activities/{planId}`. The chat header action changes with it.

Nothing is written into the message history. Plan and activity state remain
structured data; a conversation stays text.

## 15. Home

Home's "Upcoming" section now renders the soonest confirmed activity as an
`ActivityCard`, from the same sorted list the Activities page uses — no
separate query and no separate logic. With none, it keeps the existing empty
state.

No streaks, no counts, no "calories" — none of that is implemented.

## 16. Security

`match /activities/{activityId}`:

| Operation | Rule |
| --- | --- |
| read | signed in **and** `uid in resource.data.participants` |
| create | source plan exists at the same id; caller is a plan participant; **all four proposals agreed by both**; participants, connection, sport, venue and budget match the plan; `status == 'upcoming'`; `createdBy == uid`; `endAt > startAt`; exact key allowlist; timestamps `== request.time` |
| update / delete | **denied** |

So a client cannot invent an activity, attach a different venue or sport,
confirm somebody else's plan, or create one from a plan that is not fully
agreed — the rules re-derive all of it from the plan document itself.

The plan's own rules gained one permitted transition: `venue-agreed →
confirmed`, with every other field frozen and all four proposals agreed. Once
`confirmed`, **all** plan updates are denied — the plan is read-only history.

`npm run test:rules` covers it (86 tests total, 16 for activities and the
confirmed-plan lock).

## 17. Responsive

| | Activities list | Activity detail | Confirmation |
| --- | --- | --- | --- |
| Phone | 1-column cards | stacked, compact map | focused review in the planner |
| Tablet | 2-column grid | stacked, wider | review inside the planner column |
| Desktop | 3-column grid at `xl` | details ∣ venue (`grid-aside-end`) | review card, summary column folded in |

The planner's summary sidebar is deliberately dropped while the final review
is showing, because the review already contains the full `PlanSummary` —
otherwise the same information would appear twice.

## 18. Current limitations

- **No booking, availability or payment.** Confirming means the two people
  agreed to go, **not** that a court is reserved. The copy never says
  "Booked", "Reserved" or "Paid".
- **Immutable.** No reschedule, no venue change, no cancellation, no deletion.
  This is what makes correctness simple; each needs its own designed step.
- **No completion.** The Past tab is honestly empty; an activity whose start
  time has passed is **not** auto-completed, and no history is fabricated.
- **No calendar** (no ICS, no Google/Apple Calendar) — STEP 13.
- **No notifications or reminders** — STEP 14.
- **No ratings, reliability or attendance.**
- **One activity per connection** until the plan-archive step lands (§5).
- **No manual activity creation.** Activities only ever come from a completed
  Plan Together flow.
- **Live two-user Firebase verification is outstanding** — no project
  credentials exist in this environment. The rules are verified against the
  emulator; the client transaction has not run against a real project.

## 19. STEP 13: calendar

An `Activity` already carries everything a calendar entry needs — sport,
`startAt`, `endAt`, venue name, address and coordinates, budget and
participants — as stable values.

**Calendar integration should never need to read `ActivityPlan`.** The
activity is the source of truth for a confirmed event, which is exactly why
the snapshot is taken.
