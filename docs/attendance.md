# QR check-in + verified attendance + Reliability Profile

```
Organizer's device                     Attendee's device
  "Show check-in code"                   "Scan check-in code"
  → attendanceService.getCheckInCode     → @capacitor/camera takePhoto()
  → groupActivities/{id}/checkIn/current → jsQR decodes the photo
  → qrcode-generator renders it offline  → attendanceService.checkInFromScan
                                          → attendanceRecords/{id}__{userId}
Anyone's Profile page
  → attendanceService.getReliability → ReliabilityCard ("N Verified Sessions", "M% Show-up Rate")
```

## QR check-in on 1-to-1 activities (added 2026-09-24)

Check-in is no longer group-only. A 1-to-1 activity post carries its own code
at `activityPosts/{postId}/checkIn/current`, readable and writable only by the
post's AUTHOR, exactly like a group activity's.

Both kinds reduce to one shape, `CheckInSubject`
(`src/types/attendance.ts`), built by `toCheckInSubject()` for a group
activity and `toCheckInSubjectFromPost()` for a post. Everything downstream —
`getCheckInWindow`, `isCheckInOpen`, `canCheckIn` — takes a subject, so there
is ONE rule, not two near-copies.

- `attendanceRecords/{activityId}__{userId}` is unchanged and shared. Its rules
  resolve the source document by checking `groupActivities` first and falling
  back to `activityPosts`, and read the host as `organizerId` or `authorId`.
- A 1-to-1 check-in only opens once somebody actually **took the spot**: a post
  nobody joined was never a session to show up for.
- A post has no end time, so its window is the assumed 2 hours plus the
  30-minute grace (`CHECK_IN_GRACE_MINUTES`).
- The Reliability Profile now counts started 1-to-1 activities with a joiner
  alongside started group activities.
- The stored field is still named `organizerId` in the code document for both
  kinds: it means "the host", and renaming it would migrate every existing
  group activity's code.
- Covered by 8 new emulator rules tests (224 total).


## "Past is not completed" still holds

`CLAUDE.md` STEP 13 established, for `Activity`, that an ended time means
only that — never that anyone attended. **That principle is not reversed
here.** `GroupActivity` and `Activity` still say nothing about attendance.
An `AttendanceRecord` is a SEPARATE, additive fact ("this device scanned
this activity's code"), never a status written onto the activity itself,
and its absence is never read as "did not attend" — a member with no
internet signal at the venue, or who simply forgot to scan, has no record,
not a negative one. See `src/types/attendance.ts`.

## Why one photo, not a live camera stream

QR scanning here is **one photo, decoded once** — `@capacitor/camera`'s
`takePhoto()` (already-installed, previously-unused dependency) captures a
single frame, and `jsqr` (a small, dependency-free pure-JS decoder) reads it
off an offscreen canvas. This was chosen over a live `getUserMedia` video
loop because it needs no custom camera UI, works identically through
`@capacitor/camera`'s existing web/native split (the browser build already
falls back to a plain file input), and needed no new native Capacitor
plugin — only one new Android manifest permission
(`android.permission.CAMERA`, plus the `android.hardware.camera` optional
feature so the app still installs on a device with no camera at all).

## Anti-forgery: the QR is a rotating secret, not just the activity id

`groupActivities/{activityId}` is fully public-readable (see
`docs/group-activities.md`), so the activity id alone cannot be the check-in
secret — anyone who joined already knows it. Instead:

- `groupActivities/{activityId}/checkIn/current` holds a random `code`
  (`generateCheckInCode`, `crypto.getRandomValues`), readable and writable
  ONLY by the activity's organizer (`firestore.rules`).
- The QR encodes `sportsbuddy:checkin:<activityId>:<code>` — deliberately
  not a real URL, so a generic scanner app just shows plain text.
- `attendanceRecords`' `create` rule verifies the submitted `code` against
  the CURRENT code via a privileged cross-document `get()` — the attendee
  never reads the `checkIn` document directly (their read would be denied by
  its own organizer-only `allow get`); the rules check it on their behalf.
- **Regenerate code** replaces it, immediately invalidating a leaked or
  screenshotted QR.

## Rules invariants (`firestore.rules`)

- `checkIn/current`: organizer-only get/create/update; no `list`; no
  `delete` (it is always replaced, never removed).
- `attendanceRecords/{activityId}__{userId}`: `create` only by the named
  `userId` (never on someone else's behalf), only if they are a joined
  participant or the organizer, only once `startAt <= request.time`, and
  only with the current code. `update` and `delete` are always denied — a
  check-in is immutable, a fact about the past. `get`/`list` are scoped to
  the attendee themselves or the activity's organizer.
- 15 new emulator tests (`describe` blocks `'QR check-in codes'` and
  `'attendance records'`).

## Reliability Profile

`calculateReliability()` (`src/lib/attendance.ts`) is pure: given the ids of
a member's own STARTED activities (hosted or joined — an upcoming one is not
yet something to show up for) and their own attendance records, it returns
`verifiedSessions` and `showUpRatePercent`. **`null`, not `0%`, when nothing
has started yet** — 0 divided by 0 is not a rate.

Shown on `/profile` via `ReliabilityCard`, in evidence-based language only:
"11 Verified Sessions", "92% Show-up Rate" — never an absolute claim like
"Never flakes". Basic stats are free for everyone, per the Shipaton spec;
deeper trend analytics stay a Buddy+ idea for later (`docs/monetization.md`).

## Deliberately absent (this pass)

- A live-scanning camera view (continuous decode loop) — one photo is
  enough for a lightweight MVP and avoids a second native camera surface.
- A "reliability filter" on Discover, or writing a reliability score into
  `publicProfiles` — a real privacy/architecture decision (a derived stat
  becoming part of the public projection) deliberately left for a
  dedicated pass rather than rushed in here. `canUseReliabilityFilter` in
  `src/lib/capabilities.ts` exists as a capability gate but is not wired to
  any UI yet.
- Attendance history / "who came" list surfaced anywhere but the rules
  (`listByActivity` exists in the repository/service for a future organizer
  attendee-list view, but no page renders it yet).
- Monthly recap and sharing it — that is Section 9 of the Shipaton scope,
  a separate pass.
