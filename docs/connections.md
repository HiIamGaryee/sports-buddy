# Connections

How two Sports Buddy members choose each other.

## 1. Terminology

Sports Buddy is not dating-first, and the wording is part of the product.

| Use | Never |
| --- | --- |
| Connect / Connect back | Like, Swipe right |
| Connected | It's a match |
| Request sent | Pending crush |
| Wants to connect | Wants to date you |
| You found a sports buddy. | It's a match! |

The success line is **"You found a sports buddy."** with
**"You and Aina both want to connect."** underneath. Compatibility answers
*how well would these two play together*; connection answers *have both
people chosen each other*. They are separate systems and separate words.

## 2. Connection states

One canonical union (`src/types/connection.ts`), used everywhere:

| `ConnectionState` | Meaning | Action shown |
| --- | --- | --- |
| `none` | no document | **Connect** (+ subtle "Not now") |
| `pending-outgoing` | only you have asked | **Request sent** (disabled) + Cancel request |
| `pending-incoming` | only they have asked | **Connect back** |
| `connected` | both have asked | **Connected** status — not a button |

`ConnectionState` is **derived, never stored**. Firestore holds only
`ConnectionStatus` (`pending | connected`); the same `pending` document is
`pending-outgoing` to the requester and `pending-incoming` to the other
person, so a stored perspective would be wrong for one of them.

## 3. Firestore schema

`connections/{connectionId}` — one document per pair, no exceptions.

```jsonc
{
  "id": "aina__gary",              // equals the document id
  "participants": ["aina", "gary"], // exactly two, sorted, immutable
  "requestedBy": ["gary"],          // 1 → pending, 2 → connected
  "status": "pending",              // pending | connected
  "createdAt": "<serverTimestamp>",
  "updatedAt": "<serverTimestamp>",
  "connectedAt": null               // set only on the mutual transition
}
```

Once Aina connects back:

```jsonc
{
  "participants": ["aina", "gary"],
  "requestedBy": ["aina", "gary"],
  "status": "connected",
  "connectedAt": "<serverTimestamp>"
}
```

Ids and relationship metadata only. **No profile fields are copied in** (they
already exist in `users/{uid}` and `publicProfiles/{uid}`), and **no
compatibility score or matching reason is stored** — those are derived per
viewer (see `docs/matching.md`).

Timestamps are Firebase server timestamps: a relationship event must not
depend on a client clock. The domain object exposes them as ISO strings;
`Timestamp` never leaves `src/repositories/connection/`.

## 4. The deterministic pair id

`createConnectionId(a, b)` (`src/lib/connection.ts`) sorts the two ids and
joins them:

```
createConnectionId('gary', 'aina') === createConnectionId('aina', 'gary')
                                   === 'aina__gary'
```

This is what makes one relationship one document. Without it, A→B and B→A
would be two half-relationships that could disagree.

The separator is `__`, **not** `_`: mock ids contain single underscores, so
`a_b` + `c` and `a` + `b_c` would collide on the same id. There is a unit
test for exactly that.

The security rules recompute the same id and reject any document whose id
does not match its participants, so the client cannot invent a location.

## 5. The Connect transaction

`connect()` is one **Firestore transaction**, because both people can press
Connect in the same second:

```
transaction:
  read connections/{pairId}
  if missing            → create { requestedBy: [me], status: 'pending' }
  else if I already asked → return unchanged        (idempotent)
  else                  → requestedBy += me
                          status = both asked ? 'connected' : 'pending'
                          connectedAt = both asked ? serverTimestamp() : null
commit
```

A read-then-write without a transaction could let two simultaneous Connects
overwrite each other and leave the pair `pending` forever, or create two
documents. The transaction makes the outcome `connected`.

**Idempotency** matters as much as atomicity: a double tap, a retry or a
re-render must never add the same requester twice or create a second
document. The repository returns the existing document untouched, and there
are unit tests for a triple Connect.

## 6. Mutual connection transition

The second `connect()` is what flips `status` to `connected` and stamps
`connectedAt`. Nothing else may: the rules only accept `connected` when both
participants appear in `requestedBy`.

The UI reacts to the **transition**, not the state.
`findNewMutualConnection(before, after)` compares the previous snapshot with
the new one; `before === null` (an app open) always returns `null`, so an
already-connected pair never re-triggers the success dialog on refresh. That
function is pure and unit tested.

## 7. Perspective

```ts
getConnectionState(connection, currentUserId)
```

| Document | Viewer | Result |
| --- | --- | --- |
| missing | anyone | `none` |
| `requestedBy: ['gary']` | gary | `pending-outgoing` |
| `requestedBy: ['gary']` | aina | `pending-incoming` |
| `status: 'connected'` | either | `connected` |
| any | a non-participant | `none` |

`getOtherParticipantId()` returns `null` for a non-participant or a malformed
pair, and `getConnectionState()` degrades to `none` rather than throwing — a
single bad document can never break a feed.

## 8. Cancelling

A **pending outgoing** request can be cancelled by its sender, which deletes
the document. Storage stays simple: no tombstones, no `cancelled` status.

Three things are deliberately impossible:

- **Cancelling an incoming request.** It is the other person's intent, not
  yours. Your options are Connect back or leave it. Block and report belong
  to the later safety step.
- **Cancelling a connected relationship.** Disconnecting touches chat,
  activity history and safety semantics, so it needs its own designed step.
  In STEP 8 connected relationships stay connected.
- **Cancelling someone else's request.** Enforced in the transaction *and* in
  the rules.

## 9. Security rules

`firestore.rules`, `match /connections/{connectionId}`. The invariants:

| Operation | Rule |
| --- | --- |
| read (`list`) | signed in **and** `uid in resource.data.participants` — unchanged, no `exists()` involved |
| read (`get`) | signed in, `uid` is one of the two ids the connection id encodes (`uidInPairId`), **and** the document doesn't exist yet OR `uid in resource.data.participants` |
| create | caller is a participant, exactly two distinct participants, id matches the pair, `requestedBy == [uid]`, `status == 'pending'`, `connectedAt == null`, timestamps `== request.time` |
| update | participants, `id` and `createdAt` unchanged; current status is `pending`; caller was **not** already in `requestedBy`; `newRequestedBy.removeAll(old) == [uid]` and nothing was removed; `connected` only when both participants asked, and `connectedAt` only then |
| delete | current status is `pending` **and** `requestedBy == [uid]` |

`allow update: if request.auth.uid in resource.data.participants` alone would
be far too permissive — it would let the first requester forge the second
person's Connect. The `removeAll(...) == [uid]` check is what pins a write to
*exactly* the caller adding *themselves*.

A `hasOnly`/`hasAll` key check rejects any extra field, so a client cannot
smuggle a score, a profile copy or a chat id into the document.

Self-connection is blocked by `participants[0] != participants[1]`, on top of
the service check.

**`get` and `list` are two separate `allow` statements, deliberately.**
`ConnectionProvider`'s realtime subscription reads via `list` — the query
`participants array-contains uid` + `limit` — and its rule stays the plain
`uid in resource.data.participants`, because **security rules are not
filters**: a `list` rule that reads document data is only legal when the
query itself carries the matching constraint, which this one does
(`array-contains uid` pins exactly the field the rule reads). The
"doesn't exist yet" `exists()` branch applies to `get` ONLY, since a
single-document transactional read is the only place it is needed.

The first version of this fix combined them under one `allow get, list:`
line, and that briefly broke the live project a second way: with `exists()`
mixed into the rule, Firestore could no longer prove the query safe and
refused the whole subscription with `permission-denied` on every fresh
subscribe (i.e. every page refresh), while `getDoc` against the very same
document kept succeeding — which is what made it look like "the connection
resets to none on refresh" rather than an access error.

The full explanation of this Firestore behaviour, including the two legal
shapes a `list` rule may take and two dead ends that were tried and
reverted, is in **`docs/chat.md` §12** — read it before touching any `list`
rule anywhere in this project. `tests/firestore-rules.test.ts`'s "listing
connections via the realtime subscription query" block exists specifically
because every other test in the file uses `getDoc`, which would never have
caught this.

**Why the "doesn't exist yet" branch exists.** `connect()`'s transaction
always reads the pair's document first, to decide whether to create it
pending or promote it to connected. Before this branch existed, that first
read on a pair's very first Connect was denied outright — `resource` is
`null` for a document that doesn't exist, so `resource.data.participants`
threw inside the rule and Firestore treated the error as a denial. That
silently broke every first-ever Connect between two accounts in a live
project (mock mode has no rules, so it never surfaced there, and the
emulator suite never caught it either — every test seeds the document before
reading it). `uidInPairId()` (`firestore.rules`, top-level SHARED section)
decides admission from the id string itself — `a__b` already names both
participants — so the transaction's existence check can succeed without ever
trusting a stranger to read someone else's pair.

### Rule tests

`npm run test:rules` starts the Firestore emulator and runs
`tests/firestore-rules.test.ts` (20 tests) against the real rules:

- unauthenticated read denied; unrelated-user read denied; participant read allowed
- create allowed for your own request; denied when claiming someone else asked,
  for a self-connection, for a mismatched document id, for a non-participant,
  and for a document that arrives already `connected`
- connect-back allowed for the second participant; denied when the first
  requester forges it, when a request is removed, when participants change,
  when `connected` is set without both requests, and for an outsider
- delete allowed for the sole requester; denied for the recipient, and for a
  connected relationship (which also cannot be edited)

Requires **JDK 21+** (a firebase-tools requirement). The emulator config lives
in `firebase.json`; the tests use the `demo-sports-buddy` project id, so no
credentials are involved. `npm test` never needs the emulator — the split is
in `vite.config.ts` (`src/**/*.test.ts`) and `vitest.rules.config.ts`.

Deploy the rules with `firebase deploy --only firestore:rules`.

### Indexes

`connections where participants array-contains <uid>` plus a `limit` needs no
composite index, so `firestore.indexes.json` stays empty. No speculative
indexes were added.

## 10. Realtime strategy

Connections are the **only** realtime data in the app, and the subscription is
scoped to one user:

```
connections where participants array-contains currentUserId  limit 200
```

This is the one place realtime earns its cost: Gary sends a request, Aina
connects back, and Gary's screen becomes **Connected** — with the success
dialog — without a manual refresh. Anything else would need polling to feel
correct.

Read implications: one `onSnapshot` per signed-in session, plus one document
read per change to the user's own relationships. There is no listener on
`publicProfiles` — Discover candidate retrieval stays a one-time read plus the
manual refresh button (`docs/discover.md`). There is **no global
`connections` listener**, and the rules make one impossible.

The subscription is mounted by `ConnectionProvider` inside `ProtectedRoute`,
so it never runs on the login, register or onboarding screens.

## 11. Architecture

```
UI (BuddyCard / candidate profile / success dialog)
  ↓ useConnections()
ConnectionProvider          one React source of truth, one subscription
  ↓
connectionService           self-connect guard, user-safe error mapping
  ↓
connectionRepository        chosen once in repositories.ts
  ↓
Firebase (transaction + onSnapshot)   |   Mock (localStorage + listeners)
```

- `src/lib/connection.ts` — pure: pair id, perspective, map building,
  transition detection. No Firebase, no storage, no React.
- `src/services/connection/connection-service.ts` — rejects self-connection,
  delegates, and converts every failure into a `ConnectionError` with a
  message safe to show ("We couldn't send your connection request. Please try
  again."). No raw Firebase code ever reaches the UI.
- `src/features/connections/components/connect-action.tsx` — the **only**
  place connection wording and button behaviour live, so Discover and the
  candidate profile cannot drift. It owns its own busy flag, which is what
  stops a double tap; `connected` renders a status, not a dead button.
- No component imports `firebase/*`, and no page calls `getDoc`/`setDoc`.

### Mock implementation

`src/repositories/connection/mock-connection-repository.ts` mirrors the
Firebase semantics exactly — same idempotency, same rejections, same
listener behaviour — through `localStorage` behind the repository. Pages never
touch storage.

On a mock account's first read it seeds one relationship of each state, so
every branch of the UI is reachable immediately:

| Candidate | Seeded state |
| --- | --- |
| Aina | `pending-incoming` — press **Connect back** to see the mutual success dialog |
| Mei | `connected` |
| Ryan | `pending-outgoing` — cancellable |
| everyone else | `none` |

Seeding is recorded per user id, so cancelling a seeded request does not
resurrect it on the next read. Relationships survive a refresh; signing out
leaves the mock relationship store intact, so signing back in restores it.

To simulate **the other person** connecting back (the passive direction),
edit the mock store in the browser console — there is deliberately no
"simulate connection" button in the UI:

```js
const key = 'sports-buddy.mock-connections'
const store = JSON.parse(localStorage.getItem(key))
const pair = store.connections.find((c) => c.participants.includes('buddy_ryan'))
pair.requestedBy = pair.participants
pair.status = 'connected'
pair.connectedAt = new Date().toISOString()
localStorage.setItem(key, JSON.stringify(store))
location.reload()
```

That verifies the connected **state**. It does not open the success dialog,
because after a reload there is no previous snapshot to transition from —
which is the intended behaviour. Use the seeded Aina request to see the
dialog.

## 12. Current limitations

- **No disconnect.** Connected is permanent in this step (see §8).
- **No block or report.** Safety functionality is its own step.
- **"Not now" is session-only.** It hides a candidate from the current
  Discover session and is deliberately not persisted — no `dismissedProfiles`
  collection exists. Refresh brings them back.
- **No notifications.** `NotificationPreferences` still stores values only;
  no FCM or OneSignal integration exists. An incoming request is surfaced
  in-app, in a "Wants to connect" section at the top of Discover.
- **No connections list screen.** Connected people stay visible in Discover,
  clearly marked, because there is nowhere else to reach them yet. STEP 9
  gives them a proper home.
- **One batch of 200** connections per user, no pagination.
- **Live two-user Firebase verification is outstanding** — no project
  credentials exist in this environment. The rules are verified against the
  emulator; the client transaction and subscription paths are implemented and
  typed but have not run against a real project. To verify: sign in as two
  accounts in two browser profiles, Connect from one, and check the other
  shows "Wants to connect" and then "Connected" without a refresh.

## 13. What a connection unlocks (STEPS 9–10)

**A connection is the permission** — to chat, and now to plan. The
relationship semantics from this step are unchanged; both features read them.

```
connected  →  chat allowed  →  planning allowed
pending    →  no chat       →  no planning
```

| Connection state | Conversation | Activity plan |
| --- | --- | --- |
| `none` | none | none |
| `pending-outgoing` | none | none |
| `pending-incoming` | none | none |
| `connected` | full | full |

A pending relationship has no conversation and no plan, cannot create either,
and cannot read or write messages or proposals — enforced in the UI, in
`chatService` / `activityPlanService` and, decisively, in the Firestore rules,
which read the connection document on every access.

That works because **`conversationId === connectionId`** and the active plan
lives at `{connectionId}__active`: the deterministic pair id from §4 is the
root of everything, so every authorization is a single lookup and no second
pair-id system exists.

```
connections/{pairId}   status == 'connected'
        ↓  permission
conversations/{pairId}                    activityPlans/{pairId}__active
        ↓
conversations/{pairId}/messages/{messageId}
```

Conversations are created **lazily** — the first time a connected pair opens
the chat, never when they connect — so connected buddies who do not talk cost
no documents.

Two things this step's model deliberately still does not do: there is no
disconnect, so a conversation or plan cannot be revoked through the UI (both
handle a missing or no-longer-connected relationship anyway), and the
connection document gained **no** chat or planning fields — STEP 10
deliberately used a deterministic plan id rather than an `activePlanId`
pointer, so these rules stayed untouched. Details: `docs/chat.md`,
`docs/planning.md`.

The mock seeds gained two more connected buddies (Jason and Chloe) so chat has
a long thread, a short one and one never messaged; the pending seeds are
unchanged.
