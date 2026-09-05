# Data model

One document per user. Nothing else is persisted yet.

Six collections exist, with six different audiences:

| Shape | Where | Who may see it |
| --- | --- | --- |
| `SportsProfile` (`users/{uid}`) | Firestore / mock store | **PRIVATE** — the owner only |
| `DiscoveryProfile` (`publicProfiles/{uid}`) | Firestore / mock store | any signed-in member |
| `Connection` (`connections/{pairId}`) | Firestore / mock store | **the two participants only** |
| `Conversation` + `messages` (`conversations/{connectionId}`) | Firestore / mock store | **the two participants, and only while connected** |
| `ActivityPlan` (`activityPlans/{connectionId}__active`) | Firestore / mock store | **the two participants, and only while connected** |
| `Activity` (`activities/{planId}`) | Firestore / mock store | **the two participants** |

## `users/{uid}` — PRIVATE profile

`uid` is the Firebase Auth user id. The document is created empty-ish at
first sign-in (STEP 3) and filled in when onboarding completes (STEP 4).

```jsonc
{
  // account fields, mirrored from auth on creation
  "id": "abc123",
  "email": "gary@example.com",
  "displayName": "Gary Tan",
  "photoUrl": null,               // Google photo when available, else null

  // sports profile, written by onboarding
  "bio": "Weekend badminton, weekday gym.",
  "sports": [
    { "sportId": "badminton", "skillLevel": "intermediate" },
    { "sportId": "climbing", "skillLevel": "beginner" }
  ],
  "intents": ["casual", "training"],
  "preferredIntensity": "moderate",
  "availability": [
    { "day": "saturday", "periods": ["afternoon", "evening"] },
    { "day": "sunday", "periods": ["morning"] }
  ],
  "area": "subang-jaya",
  "radiusKm": 10,
  "budget": { "min": 20, "max": 40 },

  "onboardingCompleted": true,

  // preferences (STEP 5) — never part of a discovery projection
  "preferences": {
    "discovery": {
      "preferredSports": ["badminton", "climbing"],
      "preferredSkillLevels": ["beginner", "casual", "intermediate", "advanced"],
      "preferredIntents": ["casual", "training"],
      "maxDistanceKm": 10,
      "requireAvailabilityOverlap": false
    },
    "privacy": { "discoverable": true },
    "notifications": {
      "newConnection": true,
      "messages": true,
      "activityReminders": true,
      "activityChanges": true
    }
  },

  "createdAt": "<serverTimestamp>",
  "updatedAt": "<serverTimestamp>"
}
```

Domain types live in `src/types/user.ts` (`UserRecord`, `SportsProfile`) and
`src/types/sports-profile.ts` (everything below).

| Field | Type | Notes |
| --- | --- | --- |
| `sports[].sportId` | `SportId` | Stable id from `src/constants/sports.ts`; 1–5 entries |
| `sports[].skillLevel` | `SkillLevel` | `beginner \| casual \| intermediate \| advanced`, **per sport** |
| `intents` | `SportsIntent[]` | `casual \| training \| competitive \| social`, at least one |
| `preferredIntensity` | `ActivityIntensity` | `relaxed \| moderate \| high` — how they play, not how good they are |
| `availability[].day` | `WeekDay` | lowercase English day id |
| `availability[].periods` | `DayPeriod[]` | `morning \| afternoon \| evening`; empty days are dropped on save |
| `area` | `AreaId` | slug from `src/constants/areas.ts` (e.g. `subang-jaya`); each area also declares an approximate `AreaRegion` used by matching, never a distance |
| `radiusKm` | `number` | one of 5, 10, 15, 20, 30 |
| `budget` | `{ min, max }` | MYR per activity; `max: null` means open ended (RM60+) |
| `bio` | `string` | optional, ≤ 160 characters |
| `onboardingCompleted` | `boolean` | drives routing (see CLAUDE.md §3) |

Skill and intensity are separate concepts on purpose: an advanced player can
still want relaxed sessions, and matching later needs both.

## `UserPreferences` (STEP 5)

Types live in `src/types/preferences.ts`. Defaults and normalization live in
`src/lib/preferences.ts` — nowhere else.

### `DiscoveryPreferences` — who I want to SEE

| Field | Type | Default |
| --- | --- | --- |
| `preferredSports` | `SportId[]` | the sports on the profile |
| `preferredSkillLevels` | `SkillLevel[]` | all four levels |
| `preferredIntents` | `SportsIntent[]` | the profile's intents |
| `maxDistanceKm` | `number` | the profile's `radiusKm` (else 10) — stored only; it **cannot be enforced** while there are no coordinates |
| `requireAvailabilityOverlap` | `boolean` | `false` |

This is deliberately separate from the profile: the profile says *who I am*,
these say *who I want to see*. Defaults are derived from the profile by
`createDefaultUserPreferences()` when onboarding completes, so nothing is
configured twice.

### `PrivacyPreferences`

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `discoverable` | `boolean` | `true` | when `false`, the profile must never appear in Discover |

`discoverable` is always an explicit boolean — never "undefined means true".

### `NotificationPreferences`

`newConnection`, `messages`, `activityReminders`, `activityChanges` — all
default `true`. **Values only:** no FCM or OneSignal delivery exists yet, and
the Settings screen says so in plain language.

### Older documents

`normalizeUserPreferences(raw, profile)` fills in anything missing when a
document is read, so STEP 3/4 users keep working with no migration and no
database reset. Normalization happens on read; the filled-in values are
persisted the next time the user saves.

## `publicProfiles/{uid}` — DISCOVERY-SAFE projection

The only collection another member can read. It stores exactly the
`DiscoveryProfile` type (`src/types/discovery-profile.ts`), produced only by
`toDiscoveryProfile()` (`src/lib/discovery-profile.ts`).

```jsonc
{
  "userId": "abc123",
  "displayName": "Gary Tan",
  "photoUrl": null,
  "bio": "Weekend badminton, weekday gym.",
  "sports": [{ "sportId": "badminton", "skillLevel": "advanced" }],
  "intents": ["casual", "training"],
  "preferredIntensity": "moderate",
  "availability": [{ "day": "saturday", "periods": ["afternoon", "evening"] }],
  "area": "subang-jaya",
  "budget": { "min": 20, "max": 40 },
  "profileCompleteness": 100,
  "discoverable": true,
  "updatedAt": "<serverTimestamp>"
}
```

### Allowed public fields

`userId`, `displayName`, `photoUrl`, `bio`, `sports`, `intents`,
`preferredIntensity`, `availability`, `area`, `budget`,
`profileCompleteness`, `discoverable`, `updatedAt`.

### Never copied into the projection

`email`, auth provider or any auth metadata, `preferences` (discovery
filters, privacy, notifications), `radiusKm`, `createdAt`,
`onboardingCompleted`, and anything added to `users/{uid}` in future. The
mapper picks each field explicitly and never spreads the private profile, so
a new private field cannot leak by accident.

`radiusKm` is deliberately private: how far *you* will travel is a filter for
your own feed, not something other members need.

### Synchronization

`profileService` keeps the projection in step with the private document —
created on onboarding completion, rewritten on profile edit, **deleted** when
`preferences.privacy.discoverable` becomes false, recreated when it becomes
true, and repaired on load if missing (so STEP 3–5 users need no migration).
UI never writes both documents. Details: `docs/discover.md`.

## `connections/{connectionId}` — RELATIONSHIP state

One document per pair, readable only by its two participants. The id is the
deterministic pair id `createConnectionId(a, b)` — the two user ids sorted and
joined with `__` — so one relationship can never become two half
relationships. Types live in `src/types/connection.ts`.

```jsonc
{
  "id": "aina__gary",               // always equals the document id
  "participants": ["aina", "gary"], // exactly two, sorted, immutable
  "requestedBy": ["gary"],          // 1 → pending, 2 → connected
  "status": "pending",              // pending | connected
  "createdAt": "<serverTimestamp>",
  "updatedAt": "<serverTimestamp>",
  "connectedAt": null               // set only on the mutual transition
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | equals the document id; the rules verify it matches the participants |
| `participants` | `[string, string]` | exactly two distinct user ids, sorted; can never change |
| `requestedBy` | `string[]` | who has asked; only ever the caller may add themselves |
| `status` | `'pending' \| 'connected'` | `connected` only once both participants appear in `requestedBy` |
| `createdAt` | server timestamp | when the first request was sent |
| `updatedAt` | server timestamp | every write sets it to `request.time` |
| `connectedAt` | server timestamp \| `null` | stamped on the mutual transition, otherwise `null` |

Timestamps are Firebase server timestamps — a relationship event must not
depend on a client clock. The domain object exposes ISO strings; Firestore
`Timestamp` never leaves `src/repositories/connection/`.

### Never stored in a connection

- **No profile data.** Not a name, an email, a sport, an area or a photo url.
  Profiles already exist in `users/{uid}` and `publicProfiles/{uid}`;
  duplicating them here would create a second, stale copy outside the privacy
  boundary.
- **No `compatibilityScore`.** It is viewer-dependent and derived (below).
- **No `matchingReasons`.** Same reason.
- **No perspective.** `pending-outgoing` describes a *viewer*, not the
  relationship, so only `pending` / `connected` is persisted and
  `ConnectionState` is derived by `getConnectionState()`.
- **No chat or conversation id.** Chat does not exist yet (STEP 9).

The security rules enforce an exact key allowlist, so a client cannot add any
of the above. Full walkthrough: `docs/connections.md`.

## `conversations/{connectionId}` — CHAT channel

The conversation id **is** the connection id (`createConnectionId(a, b)`), so
authorization is a single lookup at `connections/{conversationId}` and no
second pair-id system exists. Types live in `src/types/chat.ts`.

A conversation is only valid while its connection is `connected`: the
security rules read the connection document on **every** access, so a pending
or missing connection means no read and no write, whoever asks.

Documents are created **lazily** — the first time a connected pair opens the
chat, not when they connect. Buddies who never chat cost nothing.

```jsonc
{
  "id": "aina__gary",                // equals the document id
  "connectionId": "aina__gary",      // and the connection
  "participants": ["aina", "gary"],  // exactly the connection's, immutable
  "lastMessageText": "Saturday evening works.",
  "lastMessageSenderId": "aina",
  "lastMessageAt": "<serverTimestamp>",
  "createdAt": "<serverTimestamp>",
  "updatedAt": "<serverTimestamp>"
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | equals the document id; frozen after create |
| `connectionId` | `string` | equals the document id; frozen after create |
| `participants` | `[string, string]` | must equal the connection's participants; can never change |
| `lastMessageText` | `string \| null` | denormalized preview for the Messages list; `null` until the first message |
| `lastMessageSenderId` | `string \| null` | the rules require it to equal the writer's uid |
| `lastMessageAt` | server timestamp \| `null` | drives conversation ordering |
| `createdAt` | server timestamp | set once |
| `updatedAt` | server timestamp | `request.time` on every write |

### `conversations/{connectionId}/messages/{messageId}` — IMMUTABLE text

```jsonc
{
  "id": "hT3k...",                // equals the document id
  "conversationId": "aina__gary",
  "senderId": "gary",
  "content": "Badminton Saturday?",
  "createdAt": "<serverTimestamp>"
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Firestore-generated, pre-allocated so it can be written into the document |
| `conversationId` | `string` | must match the parent |
| `senderId` | `string` | must equal `request.auth.uid` — nobody can post as another user |
| `content` | `string` | trimmed, non-empty after trimming, ≤ 1000 characters |
| `createdAt` | server timestamp | `null` in the domain only while a local write resolves |

Messages are **create-only**: update and delete are denied for both
participants. The message and the conversation preview are written as one
atomic batch, so the list can never disagree with the history.

### Never stored in a conversation or message

- **No profile data** — no display name, email, photo url, sports or bio.
  Chat resolves display data from `publicProfiles/{uid}` at render time;
  a copy here would be a second, stale one outside the privacy boundary.
- **No compatibility score or matching reasons** (derived per viewer).
- **No unread, read or seen markers**, no typing state, no presence — none of
  those are implemented, and the rules' key allowlist rejects any extra
  field.

Full walkthrough: `docs/chat.md`.

## `activityPlans/{planId}` — the shared session plan

One **active** plan per connection, at the deterministic id
`{connectionId}__active`, so authorization is a single lookup at
`connections/{connectionId}` and two people tapping "Plan a session" at once
share one draft. The id is derived from the connection but is not equal to it,
leaving room for archived plans at other ids once a history step exists.

A plan is only valid while its connection is `connected`: the rules read the
connection document on **every** access. Types live in `src/types/planning.ts`.

```jsonc
{
  "id": "aina__gary__active",
  "connectionId": "aina__gary",
  "participants": ["aina", "gary"],
  "status": "draft",
  "sportProposal": {
    "value": "badminton",
    "proposedBy": "gary",
    "acceptedBy": ["gary", "aina"],
    "version": 1,
    "updatedAt": "<serverTimestamp>"
  },
  "timeProposal": {
    "value": {
      "date": "2026-09-12",
      "startTime": "17:00",
      "endTime": "19:00",
      "timeZone": "Asia/Kuala_Lumpur"
    },
    "proposedBy": "aina",
    "acceptedBy": ["aina"],
    "version": 2,
    "updatedAt": "<serverTimestamp>"
  },
  "budgetProposal": {
    "value": { "min": 20, "max": 40 },
    "proposedBy": "gary",
    "acceptedBy": ["gary"],
    "version": 1,
    "updatedAt": "<serverTimestamp>"
  },
  "venueProposal": {
    "value": {
      "placeId": "ChIJ...",
      "name": "Petaling Jaya Racquet Club",
      "address": "Jalan 13/6, Seksyen 13, Petaling Jaya",
      "location": { "lat": 3.1096, "lng": 101.6371 },
      "googleMapsUri": "https://maps.google.com/?cid=..."
    },
    "proposedBy": "gary",
    "acceptedBy": ["gary"],
    "version": 1,
    "updatedAt": "<serverTimestamp>"
  },
  "createdBy": "gary",
  "createdAt": "<serverTimestamp>",
  "updatedAt": "<serverTimestamp>"
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | equals the document id; frozen after create |
| `connectionId` | `string` | the STEP 8 pair id; frozen after create |
| `participants` | `[string, string]` | must equal the connection's; can never change |
| `status` | `'draft' \| 'ready' \| 'venue-agreed' \| 'confirmed'` | derived from agreement and recomputed by the rules: `ready` = "ready for a venue", `venue-agreed` = all four agreed. `confirmed` is the one status set by hand — it records that an `Activity` was created — and it is **terminal**: a confirmed plan is read-only history and every further update is denied |
| `sportProposal` | `Proposal<SportId>` | only a sport both people list |
| `timeProposal` | `Proposal<PlannedTime>` | a real future date + local times + IANA zone |
| `budgetProposal` | `Proposal<BudgetPreference>` | per person, for this session |
| `venueProposal` | `Proposal<VenueSelection>` | STEP 11. **Optional on read**: plans written before it have no such field, and the mapper, the mock normalizer and the security rules all treat it as an empty proposal |
| `createdBy` | `string` | frozen after create |
| `createdAt` / `updatedAt` | server timestamp | `updatedAt` is `request.time` on every write |

### `Proposal<T>`

| Field | Type | Notes |
| --- | --- | --- |
| `value` | `T \| null` | `null` while `version` is 0 |
| `proposedBy` | `string` | who suggested it |
| `acceptedBy` | `string[]` | a user may only ever add or remove **their own** id |
| `version` | `number` | `0` = untouched; a new proposal bumps it and resets `acceptedBy` to the proposer |
| `updatedAt` | server timestamp \| `null` | informational |

`version` is what makes a stale acceptance impossible: an accept names the
version it saw, and the transaction refuses if it has moved on.

### `VenueSelection` — the agreed venue snapshot

The minimal, stable record of the place two people settled on:

| Field | Type | Notes |
| --- | --- | --- |
| `placeId` | `string` | provider place id, enough to reopen the place later |
| `name` | `string` | non-empty; validated before it is written |
| `address` | `string` | formatted address as the provider gave it |
| `location` | `{ lat, lng }` | validated in range; never a user's position |
| `googleMapsUri` | `string \| null` | provider link, or one built from the place |

It is snapshotted so the plan still shows its venue if the provider is
unavailable later, re-ranks, or the place changes.

**Raw provider responses are never persisted.** Ratings, review counts,
categories, price bands, photos and opening hours are deliberately excluded:
they go stale, and they are not part of what the two people agreed. There is
also **no `venues` collection** — discovery results are transient, and
duplicating a places catalogue into Firestore would only create stale records
to synchronise.

### Never stored in a plan

- **No profile data** — no display name, email, photo url, sports, area or
  bio. Those live in `publicProfiles/{uid}`.
- **No compatibility score or matching reasons** (derived per viewer).
- **No user coordinates.** A plan holds a VENUE's coordinates — a place on a
  map — and never a participant's. `users/{uid}` still stores an area id and
  nothing more.
- **No chat messages.** Plan state is structured data; a conversation stays
  text. Nothing writes "Gary selected badminton" into the message history.

The rules enforce an exact key allowlist, so none of the above can be
smuggled in. Full walkthrough: `docs/planning.md`.

## `activities/{activityId}` — the confirmed event

The activity's id **is** its source plan's id, so one plan produces at most
one activity and every rule check is a single lookup at
`activityPlans/{activityId}`. The connection id is deliberately not used: a
pair will eventually have many activities. Types live in
`src/types/activity.ts`.

`ActivityPlan` is *how* two people agreed; `Activity` is *what they agreed to
do* — a stable snapshot taken at confirmation, and **immutable** afterwards.

```jsonc
{
  "id": "aina__gary__active",
  "sourcePlanId": "aina__gary__active",
  "connectionId": "aina__gary",
  "participants": ["aina", "gary"],
  "sportId": "badminton",
  "startAt": "<Timestamp>",
  "endAt": "<Timestamp>",
  "budget": {
    "min": 20,
    "max": 40,
    "currency": "MYR",
    "unit": "per-person"
  },
  "venue": {
    "placeId": "ChIJ...",
    "name": "Petaling Jaya Racquet Club",
    "address": "Jalan 13/6, Seksyen 13, Petaling Jaya",
    "location": { "lat": 3.1096, "lng": 101.6371 },
    "googleMapsUri": "https://maps.google.com/?cid=..."
  },
  "status": "upcoming",
  "createdBy": "gary",
  "createdAt": "<serverTimestamp>",
  "updatedAt": "<serverTimestamp>"
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `id` / `sourcePlanId` | `string` | both equal the document id; the plan it came from |
| `connectionId` | `string` | the STEP 8 pair id |
| `participants` | `[string, string]` | must equal the source plan's |
| `sportId` | `SportId` | must equal the plan's agreed sport |
| `startAt` / `endAt` | timestamp | real instants, resolved once at confirmation from the plan's local date, local time and IANA zone — never a display string |
| `budget` | `{ min, max, currency: 'MYR', unit: 'per-person' }` | structured money; `max: null` is open ended. A budget the two agreed, **not** a venue quote |
| `venue` | `VenueSelection` | the STEP 11 snapshot, carried straight over — no second Places request |
| `status` | `'upcoming' \| 'completed' \| 'cancelled'` | only `upcoming` is implemented; the others exist in the type so a later step needs no type change |
| `createdBy` | `string` | whichever participant pressed Confirm |
| `createdAt` / `updatedAt` | server timestamp | set once; the document never changes |

### Never stored in an activity

- **No proposal history** — no `acceptedBy`, `proposedBy` or `version`. That
  is the plan's job.
- **No profile data** — no name, email, photo url, bio or sports. Participant
  ids only; display data is resolved from `publicProfiles` at render time.
- **No compatibility score** (derived per viewer).
- **No raw provider data.** The venue is the same trimmed snapshot STEP 11
  validated.

The rules enforce an exact key allowlist and re-derive the sport, venue,
budget and participants **from the plan document itself**, so none of the
above can be smuggled in and no field can be invented.

**Immutable:** update and delete are denied. Reschedule, cancellation and
completion are later steps. Full walkthrough: `docs/activities.md`.

## `CompatibilityResult` — DERIVED, never persisted

Compatibility (`src/types/matching.ts`) is **runtime-derived data with no
Firestore representation**. It is computed from a `MatchingSubject` (the
viewer's own profile) plus a candidate's `DiscoveryProfile`, both of which are
already in memory.

There is deliberately **no**:

- `compatibilityScore` field on `users/{uid}` or `publicProfiles/{uid}`
- `matches/{id}` collection
- stored matching reasons or factor breakdown

A score depends on **who is looking** — the same candidate is 80% to one
member and 21% to another — so any stored value would be wrong for everyone
but one viewer. `DiscoveryProfile` is therefore unchanged by STEP 7: no new
field was needed, and the allowlist above is still the complete public shape.

Engine details, weights and formulas: `docs/matching.md`.

## Identifiers vs labels

Only stable ids are persisted (`badminton`, `training`, `subang-jaya`). Human
labels live in the constants files and are resolved for display by
`src/lib/profile-format.ts`. Never store a display string.

## Location privacy

Location is **approximate only** — an area slug plus a travel radius. No
coordinates, no addresses, no device GPS, and no Maps integration exist in the
codebase. Onboarding tells the user this in plain language.

## Not collected

No phone number, national id, relationship status, orientation, dating
preferences, weight or health data. Profile photo upload is not implemented
(and would need Firebase Storage): the Google photo URL is used when present,
otherwise initials.

## Profile completeness

`getProfileCompleteness()` (`src/lib/profile-completeness.ts`) is the only
place strength is calculated. The nine required onboarding fields share 90
points; the optional bio is the last 10. Required-complete therefore reads
90%, and 100% only with a bio. It also returns what is missing plus a single
plain-language hint. Nothing about it is hardcoded per screen.

## Future: Discover must not read this document

`users/{uid}` is private to its owner, and `firestore.rules` enforces that.
When Discover is built it must **not** be opened up for public reads. The
intended shape is a deliberate projection — e.g. `publicProfiles/{uid}`
holding only `DiscoveryProfile` fields, written from the private document and
gated on `preferences.privacy.discoverable`. That collection does not exist
yet and should not be added before the Discover step designs it.

---

## Validation constraints (STEP 12.6)

Enforced in the domain (`src/services/profile/profile-schema.ts`,
`src/lib/*`), again in the services, and again in `firestore.rules` — because
a client can be skipped entirely. Full rationale: `docs/security-audit.md`.

| Field | Constraint |
| --- | --- |
| `displayName` | 2–40 characters after normalization; control, zero-width and bidi characters stripped |
| `bio` | ≤ 160 characters; same normalization |
| `sports` | 1–5 entries; `sportId` must exist in `SPORTS`; `skillLevel` in `SKILL_LEVELS`; no duplicate sport |
| `intents` | ≥ 1, no duplicates, each in `SPORTS_INTENTS` |
| `preferredIntensity` | in `ACTIVITY_INTENSITIES`, or `null` |
| `availability` | ≤ 7 rows, one per day; each `day` in `WEEK_DAYS`, each period in `DAY_PERIODS`, no duplicates |
| `area` | must exist in `AREAS` |
| `radiusKm` | one of `RADIUS_OPTIONS` |
| `budget` | finite `min` ≥ 0; `max` either `null` or finite and ≥ `min`; both ≤ 10 000 MYR |
| message `content` | non-empty after trim, ≤ 1000 characters, plain text |
| `VenueSelection.placeId` | a valid document id — no `/`, no `..`, ≤ 200 chars |
| `VenueSelection.name` / `address` | ≤ 300 characters |
| `VenueSelection.googleMapsUri` | `null`, or https on a Google Maps host |
| coordinates | finite; lat −90…90, lng −180…180 |
| `Proposal.version` | non-negative integer, checked inside the transaction |
| participants | exactly two distinct user ids, immutable after creation |
| every document id | no `/`, not `.`/`..`, not `__reserved__`, ≤ 200 characters |

### Key allowlists

`users/{uid}` and `publicProfiles/{uid}` declare their complete key set in
`firestore.rules` (`keys().hasOnly(...)`). A field not on the list is
rejected by the server, so no client can attach a privileged property, and a
private field cannot leak into the public projection by accident.

### Immutability

- `activities/{planId}` — no update or delete path exists, in the repository
  or the rules.
- Messages — create-only.
- Connection `participants`, `createdAt` and plan identity fields — frozen
  after creation.
- A `confirmed` plan — read-only.

---

## Activity state (STEP 13)

Two different questions, deliberately not one field:

| | Question | Where it lives |
| --- | --- | --- |
| `Activity.status` | Did the two people agree to go? | PERSISTED, always `'confirmed'` |
| `ActivityTemporalState` | Where is it on the timeline? | DERIVED from `endAt` + now, never stored |

### Why temporal state is not persisted

Storing `past` would require something to write it when time passed — a
scheduled job, a Cloud Function, or a client update — and the value would be
stale between runs. Deriving it from `endAt` is always correct, needs no
infrastructure, and lets the security rules refuse a temporal status
outright.

`firestore.rules` requires `status == 'confirmed'` on create and denies every
update, so no client can backdate its own history or fake a state.

### Legacy normalization

STEP 12 persisted `status: 'upcoming'`. Those documents are untouched;
`normalizeActivityStatus()` maps `upcoming`, `completed`, `cancelled` — and
anything unrecognised — to `confirmed` when a document is read. No migration
and no manual deletion is required.

`completed` and `cancelled` are no longer declared as states the app can
hold: nothing produces them, and a declared state nothing produces invites
code that pretends it exists.

### Indexes

The two composite indexes on `activities` (see `docs/activities.md`) are the
only ones in `firestore.indexes.json`. Every other query in the app remains
index-free by design.
