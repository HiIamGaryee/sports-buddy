# Data model

One document per user. Nothing else is persisted yet.

Four collections exist, with four different audiences:

| Shape | Where | Who may see it |
| --- | --- | --- |
| `SportsProfile` (`users/{uid}`) | Firestore / mock store | **PRIVATE** — the owner only |
| `DiscoveryProfile` (`publicProfiles/{uid}`) | Firestore / mock store | any signed-in member |
| `Connection` (`connections/{pairId}`) | Firestore / mock store | **the two participants only** |
| `Conversation` + `messages` (`conversations/{connectionId}`) | Firestore / mock store | **the two participants, and only while connected** |

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
