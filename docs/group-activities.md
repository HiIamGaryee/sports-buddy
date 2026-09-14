# Public group activities

A separate feature from `ActivityPost` (`docs` for that lives in the
Discover activity posts section of `CLAUDE.md`). Where an `ActivityPost` is
a 1v1 invitation with one spot, a `GroupActivity` is a PUBLIC, multi-person
meetup: "Saturday Badminton Meetup, 8 players, RM10–20". The focus is the
ACTIVITY, not one person, and there is no group chat in this pass —
coordination happens on the activity's own detail page.

```
Create/edit form → groupActivityService → groupActivityRepository → groupActivities/{activityId}
Discover page ← useGroupActivities() (one batch + ONE batched publicProfiles read)
Activities page ← useMyGroupActivities() (hosted + joined, planned/past)
```

## Why a separate collection

The user explicitly chose "build a separate `GroupActivity` collection" over
extending `ActivityPost`'s `capacity` field, to keep the 1v1 flow (with its
`joinPolicy`/`visibility`/invite machinery) untouched and give group
activities their own simpler shape: always public, always open-join (no
approval step), a real `title` + `description`, an optional end time, a
preferred skill level, and `maxParticipants` from 2–30
(`src/constants/group-activities.ts`).

## Domain

- `src/types/group-activity.ts` — `GroupActivity`, `GroupActivityDraft`,
  `CreateGroupActivityInput`, `SkillPreference` (`SkillLevel | 'any'`),
  `GroupActivityViewerState` (`organizer | joined | full | can-join | past`).
- `src/lib/group-activity.ts` is pure — validation
  (`getGroupActivityError`), `toCreateGroupActivityInput`,
  `getGroupActivityViewerState`, and the join transitions (`applyJoinGroupActivity`,
  `applyLeaveGroupActivity`, `applyRemoveParticipant`) — the same
  "one pure function, called inside a transaction" pattern as
  `src/lib/activity-post.ts`. `now` is always injected.
- `src/repositories/group-activity/*` — contract, document mapper (rejects a
  malformed activity — nothing about another member's write is trusted),
  Firebase and mock implementations. `join`/`leave`/`removeParticipant` are
  Firestore transactions reading the LIVE document, so two people joining
  the last spot at once cannot both take it.
- `src/services/group-activity/group-activity-service.ts` — validation,
  and the free/Buddy+ limit check (see `docs/monetization.md` — an HONEST,
  documented client-side-only limitation) BEFORE every create/join.

## Security rules (`firestore.rules`, `match /groupActivities/{activityId}`)

Always public: `get` and `list` require only `request.auth != null` — there
is no private tier here (`activityPosts` still has one, for invites and
link-only posts). `create` requires `organizerId == request.auth.uid` and
the full set of validated choices; a new activity starts with
`participantIds == []`. `update` allows exactly one of:

- the organizer editing everything except identity, `createdAt` and
  `participantIds` (`isOrganizerEdit`);
- a member adding ONLY themselves to `participantIds`, while there is a
  free spot and it has not started (`isJoiningGroupActivity`);
- a member removing ONLY themselves, even once it has started
  (`isLeavingGroupActivity`);
- the organizer removing exactly one OTHER participant — a no-show or a
  change of plan (`isOrganizerRemoving`).

`delete` is organizer-only. 20 emulator rules tests cover this (`describe`
blocks `'group activities'` and `'joining group activities'` in
`tests/firestore-rules.test.ts`), on top of the 170 pre-existing tests.

## Sharing

Reuses the STEP-14-ish share infrastructure built for `ActivityPost`
(`src/lib/share.ts`, `src/services/share/share-service.ts`), generalized to
carry a `kind: 'post' | 'group'` rather than assuming a post:

- A group activity's share link is `<origin>/group-activity/<activityId>`
  (`buildGroupActivityShareUrl`), distinct from an `ActivityPost`'s
  `<origin>/activity/<postId>`.
- `parseSharedActivityUrl()` returns `{ kind, id } | null`, and
  `src/routes/return-path.ts` stores `{ kind, id }` (not a bare string) in
  `sessionStorage`, so an outsider who signs up through a group-activity
  link lands on THAT activity, not a post.
- `ShareGroupActivityActions` (Share link / Send to a buddy) and
  `SharedActivityPage` (`kind="group"`) mirror the `ActivityPost` versions.
- A group-activity link inside a chat message renders as an in-app **View
  activity** link (`MessageBubble`, via `splitActivityLinks`'s `linkKind`),
  same as a post link — never a raw clickable URL to anywhere else.

## Deliberately absent (this pass)

- Group chat — coordination is the activity's own detail page only.
- QR check-in / verified attendance / a Reliability Profile — a separate,
  larger feature; not built in this pass.
- A "featured" or sponsored listing — documented as a future business idea
  only, per the Shipaton scope guidance.
- Payment, booking or a deposit of any kind — this is a meetup, not a
  reservation system.
- A composite Firestore index — `listUpcoming` ranges and orders on the same
  field (`startAt`), and `listByOrganizer`/`listJoinedBy` are single-field
  equality/array-contains queries, so none is needed.
