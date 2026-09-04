# Data model

One document per user. Nothing else is persisted yet.

Two shapes matter, and they are not the same thing:

| Shape | Where | Who may see it |
| --- | --- | --- |
| `SportsProfile` (`users/{uid}`) | Firestore / mock store | **PRIVATE** — the owner only |
| `DiscoveryProfile` (`publicProfiles/{uid}`) | Firestore / mock store | any signed-in member |

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
| `area` | `AreaId` | slug from `src/constants/areas.ts` (e.g. `subang-jaya`) |
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
| `maxDistanceKm` | `number` | the profile's `radiusKm` (else 10) |
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
