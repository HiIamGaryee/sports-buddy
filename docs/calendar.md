# Calendar (STEP 13)

Putting a confirmed activity into the user's own calendar.

## 1. What this is for

Confirming a session tells the other person you are going. It does not put
the session anywhere you will actually look on the day. This step closes that
gap, and nothing more: one activity, one calendar entry, exported by the
person who asked for it.

## 2. The activity is the source of truth

`calendarService` never reads the source `ActivityPlan`. Everything a
calendar entry needs — sport, start, end, budget, venue — was snapshotted
onto the `Activity` at confirmation (STEP 12), so an export costs **no
reads**, makes **no Places request**, and works **offline** from data already
on screen.

The plan is how two people agreed. The activity is what they agreed to. The
calendar entry is one person's private copy of it.

## 3. Architecture

```
AddToCalendar (UI)
   ↓  no platform branching, ever
calendarService          validate → map → pick provider → result
   ↓
CalendarProvider         addEvent(CalendarEventData)
   ↓
IcsCalendarProvider      build .ics, hand it to the browser
```

The UI calls `addActivity` and reads `result.method`. It contains no
`Capacitor.isNativePlatform()` check and no ICS knowledge; `selectProvider()`
is the single function that decides.

## 4. `CalendarEventData`

```ts
{ uid, title, startAt, endAt, location, description, url? }
```

Deliberately NOT an `Activity`. A provider has no business seeing participant
ids, the connection id or the source plan id, and a small model is what makes
it obvious that none of them can reach an exported file.

| Field | Source | Notes |
| --- | --- | --- |
| `title` | sport label + buddy display name | never ids |
| `location` | the agreed venue name + address | never anybody's area or home |
| `description` | sport, duration, budget, a disclaimer | plain text only |
| `url` | the venue's `openStreetMapUrl` | only when `isTrustedOpenStreetMapUrl` passes |

## 5. Native provider status

**Not implemented.** The project has `@capacitor/core` and `@capacitor/cli`
and no calendar plugin. Installing an unmaintained one to satisfy a checkbox
would be worse than the ICS flow, which already works on every platform
including inside a Capacitor WebView, with no permission prompt at all.

Direct native-calendar insertion is deferred until a supported provider is
chosen. When it is, `selectProvider()` is the one function that changes and
`CalendarDeliveryMethod` already carries `'native'`, so the success copy
switches with it.

**Native device verification: NOT RUN** — there is no native provider to run.

## 6. Stable UID

`buildCalendarUid(activityId)` → `<128-bit digest>@sportsbuddy.app`.

Two properties matter:

- **Stable.** The same activity always produces the same UID, so a calendar
  client has the chance to recognise a re-import as the same event. A random
  UID per click would guarantee duplicates.
- **Opaque.** The activity id is `{userA}__{userB}__active`, so a raw UID
  would carry both participants' account ids into a file the user can forward
  to anyone. The digest (FNV-1a over four offsets) keeps stability and
  carries no identifiers. It is not a security primitive — nothing trusts a
  UID — it exists so the file leaks nothing.

The UID is never derived from the title: a title contains a display name, so
the event's identity would change when somebody renames themselves.

## 7. Timezones: UTC in the file, local on screen

ICS timestamps are written as `YYYYMMDDTHHMMSSZ` in UTC.

An instant is unambiguous, and every calendar client renders it in the
reader's own zone. The alternative — emitting a `VTIMEZONE` component — is a
large amount of standards surface for no user-visible gain.

The UI is unaffected: `activity-format.ts` still formats every date and time
through `Intl` in the reader's own locale and zone. **Display strings are
never reused in the file, and ICS strings are never shown to anyone.**

## 8. ICS escaping — a separate context

React escaping protects HTML rendering and does **nothing** here. A venue
name that is harmless on screen can still terminate a property line inside a
calendar file.

`escapeIcsText` (RFC 5545 §3.3.11) handles, in this order:

| Input | Becomes | Why the order matters |
| --- | --- | --- |
| `\` | `\\` | first, or the backslashes added below get escaped again |
| `;` | `\;` | |
| `,` | `\,` | |
| `\r\n`, `\r`, `\n` | `\n` (literal) | every line-ending form collapses to one |

Control characters are removed outright, and values are bounded at 512
characters before folding.

## 9. CRLF injection

The attack this exists for. A venue name of:

```
Court A\r\nATTENDEE:mailto:attacker@example.com
```

must not create an `ATTENDEE` property. Two defences, both required:

1. **Every line break becomes a literal `\n` inside the value**, so it can
   never terminate the property and start a new line.
2. **Property NAMES are only ever written by `lib/ics.ts`.** There is no code
   path where user input becomes a property name — no `input + ':'` anywhere.

Tested from both ends: through `buildIcsCalendar` directly, and through
`calendarService` with a hostile buddy display name.

Line folding follows RFC 5545 §3.1 at 75 **octets** — measured in UTF-8
bytes, because an emoji in a venue name is four octets and a character count
would silently emit an over-long line.

## 10. Safe filename

`buildIcsFilename(label, startAt)` → `sports-buddy-badminton-2026-09-12.ics`.

Everything outside `a–z0–9` becomes a separator, which covers `/`, `\`, `..`,
control characters, quotes, spaces and every Unicode script at once — an
explicit blocklist would not. The prefix and the `.ics` extension are
literals, so a label that slugs away to nothing still yields a valid name.
The MIME type (`text/calendar;charset=utf-8`) is likewise developer-set.

## 11. Permissions

None are requested. The ICS flow needs no calendar access, and nothing asks
for contacts, location, camera or microphone.

If a native provider is added later, it must request calendar access **only
when the user taps Add to Calendar** — never at startup — and
`CalendarFailureReason` already carries `'permission-denied'`, whose message
points at the file fallback.

## 12. Platform behaviour and honest copy

| Platform | What happens | What the UI says |
| --- | --- | --- |
| Any browser | a `.ics` file downloads | "Calendar file downloaded. Open it to add the activity." |
| Capacitor WebView | same | same |
| Native provider (not built) | event written to the device calendar | "Activity added to your calendar." |

The distinction is `result.method`, not a guess. The app never claims an
event was added when the user still has to import a file.

The download anchor is **appended to the document** before `click()`. A
detached anchor is silently ignored by Firefox and by headless Chrome — this
was caught in browser verification, not in review. The object URL is revoked
on the next tick; revoking synchronously can cancel the download before the
browser has read the blob.

## 13. No shared calendar state

Nothing is written to Firestore. `Activity` gained **no** `calendarAdded`
flag and **no** `calendarAddedBy` array, because whether Gary put a session in
his calendar is not a fact about the session — Aina may not have, and the
same person may use two devices.

No device-local flag either. Re-exporting is free and harmless, and a
remembered "already added" state would only ever be wrong somewhere.

## 14. Known limitations

1. **No two-way sync.** The file is a copy taken at export time. If an
   activity ever changes, the calendar entry will not follow. Confirmed
   activities are immutable today, so this cannot currently go stale — but it
   becomes real the moment reschedule exists.
2. **Duplicate imports are possible.** A stable UID gives calendar clients
   the *chance* to recognise a re-import; behaviour varies by application and
   nothing here can promise deduplication.
3. **No calendar event deletion or update.** Sports Buddy has no handle on
   what the calendar app did with the file.
4. **No Google/Outlook/iCloud account integration.** No OAuth, no calendar
   APIs. ICS is portable and needs no account.
5. **ICS validity is verified structurally, not by import.** The generated
   file is checked byte for byte — CRLF, folding at ≤75 octets, escaping,
   property allowlist — and a real file was produced through the browser
   download path. It has **not** been imported into Apple Calendar, Google
   Calendar or Outlook, so no compatibility claim is made for them.

## 15. STEP 14 handoff

`Activity` now carries stable `startAt`, `endAt`, `participants`, `sportId`
and `venue`, which is everything a reminder would need ("Activity tomorrow at
5 PM"). Notification scheduling is **not** implemented here and must not be
inferred from the calendar work: an exported `.ics` may carry a `VALARM` one
day, but that is the calendar app's reminder, not Sports Buddy's.
