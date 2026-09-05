# Plan Together

Two connected members deciding **what**, **when**, **how much** and (since
STEP 11) **where** — together, in structured state rather than by re-reading a
chat thread.

```
Sport → Time → Budget → Venue → ready for activity confirmation
```

Confirming the activity itself is STEP 12. Venue specifics live in
`docs/venues.md`.

## 1. Purpose

Chat already works. What it does badly is converging:

> "What do you want to play?" · "When are you free?" · "What's your budget?"
> · "Okay… so what are we actually doing?"

Plan Together is a structured layer **above** chat, not a replacement for it.
Chat stays free-form text; the plan holds the decisions.

## 2. Entry points

**Chat is the primary entry point**, because planning happens after a
conversation:

- the conversation header carries a **Plan a session** action (label becomes
  **Plan** once one exists)
- an active plan appears as a compact card pinned above the composer, showing
  what has been decided and linking to **Continue** / **View plan**

That is deliberately all. No planning button on Discover, on the candidate
profile, or in the connection success dialog — one obvious route in, not five.

## 3. Authorization

A plan needs the same permission chat needs: `connection.status ===
'connected'`, and the caller must be a participant.

| Connection state | Planning |
| --- | --- |
| `none` / `pending-outgoing` / `pending-incoming` | no |
| `connected` | yes |

Enforced in three places, and the third is the one that counts:

1. **UI** — the action only renders in a connected conversation, and
   `/messages/:conversationId/plan` shows "This plan is unavailable."
   otherwise.
2. **Service** — every guarded call takes a `Connection`, never a bare id, so
   `createPlan('some-random-user')` does not exist. `canPlanTogether()` calls
   STEP 8's `getConnectionState()` rather than re-deriving the rule.
3. **Firestore rules** — every read and write reads
   `connections/{connectionId}` and requires `status == 'connected'`.

## 4. One active plan per connection

There is **one** active plan per connection at a time. Resume it if it exists,
create it if it does not.

The lookup is a deterministic document id, not a query:

```
activityPlans/{connectionId}__active
```

`ensureActivePlan()` is a **Firestore transaction on that exact document**, so
both people tapping "Plan a session" in the same second produce one draft, not
two competing ones. No composite index, no query, no pointer field added to
the STEP 8 connection document (whose rules stay untouched).

The plan id is *derived from* the connection id but is not equal to it, which
leaves room for archived plans at other ids (`{connectionId}__<something>`)
once a history step exists.

**Current limitation:** until that archive step, a connection can only address
one plan. Finishing a session and starting a fresh one is STEP 12+ work.

## 5. Plan schema

`activityPlans/{planId}` — see `docs/data-model.md` for the field table.

```jsonc
{
  "id": "aina__gary__active",
  "connectionId": "aina__gary",
  "participants": ["aina", "gary"],
  "status": "draft",              // draft | ready | venue-agreed
  "sportProposal":  { /* Proposal<SportId> */ },
  "timeProposal":   { /* Proposal<PlannedTime> */ },
  "budgetProposal": { /* Proposal<BudgetPreference> */ },
  "venueProposal":  { /* Proposal<VenueSelection> — STEP 11 */ },
  "createdBy": "gary",
  "createdAt": "<serverTimestamp>",
  "updatedAt": "<serverTimestamp>"
}
```

No display name, photo, email, sports list, area or bio is copied in — those
live in `publicProfiles/{uid}`. No compatibility score either: it is derived
per viewer (`docs/matching.md`). Ids and decisions only.

**Venue** (STEP 11) is a fourth proposal using exactly this machinery. It is
**optional on read**: plans written before STEP 11 have no such field, and the
Firestore mapper, `normalizeActivityPlan()` and the security rules all treat
it as an empty proposal — no migration, no reset.

## 6. Proposal model

Everything collaborative uses one shape:

```ts
Proposal<T> {
  value: T | null
  proposedBy: string
  acceptedBy: string[]
  version: number
  updatedAt: string | null
}
```

`version: 0` means "nothing proposed yet", so all three proposals exist from
the moment a plan does and the rules never have to reason about absent fields.

## 7. Acceptance model

- **Proposing accepts implicitly.** Gary proposing badminton leaves
  `acceptedBy: ['gary']`.
- **Agreed means both.** `isProposalAgreed()` requires every participant in
  `acceptedBy` at the proposal's current version.
- **Changing a value resets agreement.** A new proposal sets
  `acceptedBy: [proposer]`, because nobody should be shown as having agreed to
  something that has since changed.
- **Both operations are idempotent.** Re-proposing an identical value is a
  no-op (so a double tap cannot knock out the other person's agreement), and
  accepting twice changes nothing.

From the viewer's side the state reads as one of: `empty`, `agreed`,
`waiting-for-them`, `needs-your-response` — each with its own icon and
sentence, never colour alone.

## 8. Proposal versioning

The problem this solves: Gary proposes badminton, Aina's screen still shows
badminton, Gary switches to climbing, Aina taps **Agree**. Without protection
Aina has just agreed to climbing without seeing it.

Every accept names the version it saw. `isAcceptStale()` compares it to the
live one and the write is refused with *"That suggestion changed while you
were looking."* — checked inside the transaction, so the race is closed on the
server, not just in the UI.

## 9. Sport

Only sports **both** people list are offered.
`getSharedSportOptions(mySports, theirSports)` returns the intersection with
each side's skill level, which is what the card shows — the reason it is a
good choice.

Proposing a sport outside that set is rejected by the service, not just hidden
by the UI.

If two connected members somehow share no sport, the step says so and points
at the profile instead of crashing. (Discover's compatibility ranking makes
this rare, not impossible.)

The matching engine has its own shared-sport helper: that one is ordered by
discovery preference for **scoring**. Different question, deliberately
separate function.

## 10. Shared availability

`getSharedAvailabilitySlots()` is STEP 9's `getSharedAvailability()` — the
same one Discover filtering and compatibility scoring use. There is no second
overlap implementation.

Profile availability is **recurring and coarse** ("Saturday evening"). That is
not a plan.

## 11. Real dates

`getUpcomingDatesForAvailability(shared, from)` walks forward from `from` day
by day and returns **actual upcoming dates** that fall on a shared day+period,
three per slot, within a 28-day horizon. Nothing is hardcoded and nothing in
the past is ever offered.

Each suggestion is seeded with a start/end from `PERIOD_TIME_WINDOWS`
(morning 08:00–12:00, afternoon 12:00–17:00, evening 17:00–21:00) and a
default 2-hour session — all editable.

**The copy is careful.** We have no access to anyone's real calendar, so the
UI says *"Based on your Sports Buddy availability"* and *"You both marked
Saturday evening"*. It never claims a calendar is free.

`getTimeRangeError()` rejects a past date, a start time already gone today, an
end at or before the start, a malformed value, and anything under
`MIN_SESSION_MINUTES` (30).

### Timezone

`PlannedTime` stores a local calendar date, local wall-clock start/end, and
the IANA zone they were chosen in (from
`Intl.DateTimeFormat().resolvedOptions().timeZone`).

Deliberately **not** a UTC instant: "Saturday 5pm" is what the two people
agreed. Nothing hardcodes UTC+8, and `YYYY-MM-DD` is parsed as a local date so
a display never shifts a day.

## 12. Budget

The suggestion comes from the two profile budgets through
`getSharedBudget()` in `src/lib/budget.ts` — **the same overlap function the
compatibility engine scores with**, extracted in this step so the two features
cannot drift apart.

- Overlapping ranges → *"You both usually spend around RM30–40 per activity."*
- No overlap → *"Your usual budgets don't overlap."* and planning continues.
  A non-overlapping pair never blocks a session.

The plan's budget is **per person, for this session**, and says so — it is
related to the profile preferences but is not the same thing, and no venue has
been priced yet. Presets come from the shared `BUDGET_OPTIONS`.

## 13. Ready, and venue-agreed

```
status === 'ready'         ⟺  sport, time and budget all agreed
status === 'venue-agreed'  ⟺  ready, AND the venue agreed too
```

`ready` kept its STEP 10 name deliberately — no data migration — and now
reads as **"ready for a venue"**. A venue can only be proposed from `ready`,
because the venue search depends on the agreed sport.

Agreed, not merely filled in. Status is recomputed inside the same transaction
as the change that caused it, and the **security rules verify it** rather than
trusting the client — a participant cannot mark a plan ready that the other
has not agreed to. Replacing an agreed value drops the plan back to `draft`.

`venue-agreed` is the end of STEP 11. It is **not** a confirmed activity:
nothing is booked, the venue has not been contacted, and there is no calendar
entry or notification. The screen says exactly that rather than offering a
dead "Confirm" button.

## 14. Realtime

One `onSnapshot` on **one document**, while a plan (or a conversation showing
the plan card) is open. There is no query over `activityPlans` and no global
listener.

That is what makes the collaboration work: Gary proposes badminton and Aina's
open planner updates without a refresh.

Combined with STEP 8's connections listener and STEP 9's two chat listeners, a
session holds at most four scoped subscriptions.

## 15. Mock

`mockActivityPlanRepository` mirrors the Firebase repository exactly — same
deterministic id, same idempotency, same stale-version rejection, same derived
status — through `localStorage` behind the repository. Mock mode must not
behave differently from Firebase.

Realtime is a listener set that re-emits on every write; no dependency was
added for it.

There is **no seeded plan and no "simulate Aina" button**. Collaboration is
exercised by the unit tests, which drive both participants through the real
service; a dev can also open the same mock account in two tabs and watch the
listener fire.

## 16. Security rules

`match /activityPlans/{planId}`:

| Operation | Rule |
| --- | --- |
| read | connected participant of `resource.data.connectionId`, and `planId == connectionId + '__active'` |
| create | plus: exact key allowlist, `id == planId`, `participants` **equal the connection's**, `createdBy == request.auth.uid`, `status == 'draft'`, all three proposals empty (`version 0`, `value null`), timestamps `== request.time` |
| update | plus: `id`, `connectionId`, `participants`, `createdBy`, `createdAt` frozen; every proposal change legal (below); `status` matches actual agreement; `updatedAt == request.time` |
| delete | denied |

A proposal may change in exactly three ways, and no other:

1. **unchanged** (`after == before`)
2. **a new proposal by the caller** — `proposedBy == request.auth.uid`,
   `value != null`, `acceptedBy == [caller]`, `version == before.version + 1`
3. **the caller accepting** — value, proposer and version unchanged, and
   `after.acceptedBy.removeAll(before.acceptedBy) == [caller]` with nothing
   removed

Rule 3 is what stops impersonation: **Gary cannot add Aina to `acceptedBy`**,
and cannot remove her either. `statusMatchesAgreement()` independently
recomputes readiness, so `ready` cannot be claimed.

`npm run test:rules` covers all of it (62 tests total, 19 for plans):
unauthenticated and unrelated reads, pending connections, outsiders, invented
participants, a mismatched plan id, a plan arriving already agreed, proposing,
agreeing, agreeing on someone else's behalf, removing their agreement,
tampering with identity fields, claiming `ready` without agreement, granting
`ready` with it, and deletion. It also exercises the **real client write
shape**, including the server timestamp nested inside a proposal map.

### Indexes

None. The deterministic document id means there is no query to index, so
`firestore.indexes.json` stays empty.

## 17. Current limitations

- **No venue, no maps, no places, no GPS** — STEP 11.
- **No confirmed activity.** `ready` is the end state; nothing is booked.
- **No calendar integration** (no ICS, no Google/Apple Calendar) — STEP 13.
- **No notifications.** A participant who is not looking at the plan is not
  told that the other person proposed something — STEP 14.
- **One active plan per connection** (§4); no plan history or archive UI.
- **No cancellation or deletion.** A plan can be re-proposed but not thrown
  away; deletion is denied by the rules.
- **Profile changes never rewrite a plan.** Availability and budget are
  suggestions at the moment of proposing; once proposed, the value belongs to
  the plan.
- **Live two-user Firebase verification is outstanding** — no project
  credentials exist in this environment. The rules are verified against the
  emulator; the client transaction and subscription paths are implemented and
  typed but have not run against a real project.

## 18. Venue (STEP 11) and the handoff to STEP 12

Venue arrived exactly as predicted: a fourth `Proposal<VenueSelection>` using
the same accept/version machinery, the same "one legal change per proposal"
rule, and `statusMatchesAgreement()` extended to four. `PlanSummary` only
needed its venue row filled in.

Its one extra rule: a venue may only be proposed from `ready`, since the
search depends on the agreed sport. Full detail: `docs/venues.md`.

A `venue-agreed` plan now carries everything a confirmed activity needs —
`connectionId`, `participants`, `sportId`, `PlannedTime`, `BudgetPreference`
and the `VenueSelection` snapshot — so STEP 12 can create one with **no
further Places call**.
