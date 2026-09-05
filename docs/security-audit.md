# Security audit (STEP 12.6)

An input-validation and injection-hardening pass over the whole application.
No product feature, route, screen or Firestore document shape changed.

This records what was audited, what was found, what changed, and — as
importantly — what is still not protected.

---

## 1. Security architecture

```
UI form            client validation, for a readable error
   ↓
Domain rule        profileRules / getMessageError / planning guards — pure
   ↓
Service            authorization + normalization + write allowlist
   ↓
Repository         explicit document construction; mappers reject malformed reads
   ↓
Firestore rules    the only layer an attacker cannot skip
```

The layers are not redundant, they answer different questions. The client
layer exists so a person is *told* what is wrong. The service layer exists
because a programmatic caller skips the form. The rules exist because an
attacker skips the app entirely and calls the Firebase SDK from a console.

**Validation and authorization stay separate.** `isValidDocumentId(id)` asks
whether a value is structurally usable; `activity.participants.includes(uid)`
asks whether this person may see it. Both run, in that order — a malformed id
is rejected before it is ever used to build a document path.

## 2. Input trust model

Everything in this list is untrusted, including the things that came from us:

| Source | Why it is untrusted |
| --- | --- |
| Form fields | the obvious case |
| Route params (`useParams`) | typed into the address bar |
| Firestore documents | written by the other participant in a pair |
| `publicProfiles` | written by any member, read by every member |
| localStorage | editable in devtools; may hold an older shape |
| Google Places responses | external service, and the field set can change |
| Auth provider `photoUrl` | a URL we did not choose |
| `import.meta.env` | shipped in the bundle, not a secret store |

"It came from Firestore so it must be safe" is the assumption this step was
written to remove: in a two-person feature, half the document is the other
person's input.

## 3. Validation strategy

No validation library was added. The project has none, the domain is small and
closed (sports, areas, skill levels are fixed datasets), and adding Zod for
this would be a dependency and a second source of truth.

Validation is instead:

- `src/lib/sanitize.ts` — text normalization (see §4).
- `src/lib/safe-url.ts` — URL protocol and host allowlists.
- `src/lib/ids.ts` — document id shape.
- `src/services/profile/profile-schema.ts` — enum membership, numbers, arrays,
  and the profile write allowlist.
- Existing per-feature rules: `profile-validation.ts`, `lib/chat.ts`,
  `lib/planning.ts`, `lib/activity.ts`, `venue-service.ts`.

Enum guards derive from the centralized datasets (`SPORTS`, `AREAS`,
`SKILL_LEVELS`, …), so adding an option makes it valid automatically and
nothing has to be kept in sync by hand.

## 4. Text handling — and what it deliberately does not do

`normalizeSingleLine` / `normalizeMultiLine` trim, collapse whitespace,
normalize line endings, and strip characters that no keyboard produces: C0/C1
control characters, zero-width characters, and bidirectional overrides
(`U+202E`, the "render it backwards" trick).

They do **not** strip `<`, `>`, `'`, `&` or anything that looks hostile.
React escapes text when it renders it, so:

- `<script>alert(1)</script>` in a bio is a string that displays literally;
- `' OR 1=1 --` in a message is a joke, because nothing interprets SQL;
- `<foo>&bar</foo>` is text, because nothing parses XML.

Filtering those would break `Let's play!`, `Court A & B` and `<3` and buy
nothing. Safety comes from *treating input as data*, not from banning words.
Chinese, Bahasa Melayu, accents and emoji pass through untouched.

Normalization also does **not truncate authored text**. An over-long name or
message is *reported*, not silently cut — truncating would have made the
"too long" error unreachable. (Truncation is used only where there is nobody
to tell: the venue search box.)

## 5. XSS

| Check | Result |
| --- | --- |
| `dangerouslySetInnerHTML` | **0 occurrences** (one code comment mentions it) |
| `innerHTML` / `outerHTML` / `insertAdjacentHTML` | 0 |
| `document.write` | 0 |
| `DOMParser` / `createContextualFragment` | 0 |
| `eval` / `new Function` / string `setTimeout` | 0 |
| `<iframe>` | 0 |

Chat messages, bios, display names, venue names and addresses all render as
React text nodes (`{message.content}`). No stored-XSS path exists through
them, and hostile payloads are covered by tests that assert they survive as
*text*.

**Dynamic classes and styles** were checked: the two inline `style` uses are
computed progress widths (numbers), and every template-literal `className`
interpolates a developer-controlled value from a const array. No user value
becomes a class or a style.

## 6. URL safety — the one real vulnerability found

**Finding (High, fixed).** `VenueSelection.googleMapsUri` was accepted as any
non-empty string, stored in the shared `activityPlans` document, and rendered
straight into an `href` behind an "Open in Maps" button.

That document is written by **either participant**. A user calling the SDK
directly could propose a venue whose `googleMapsUri` was
`javascript:…`, and the other person would be shown a clickable control for
it — a stored XSS / phishing vector across a trust boundary.

Fixed in four places, deliberately overlapping:

1. `mapGooglePlaceToVenue` drops a URI that is not a trusted Google host.
2. `venueService.mapsUrl` ignores an untrusted URI and builds its own link
   from the validated place id and coordinates.
3. `venueService.isValidSelection` refuses to persist one.
4. `SafeExternalLink` renders **nothing** for a URL that is not http(s).

`isTrustedMapsUrl` requires https *and* a Google host, because an
attacker-controlled https link is still phishing once it is labelled
"Open in Maps".

**Avatar images.** `photoUrl` reaches `<img src>` from an auth provider or
another member's projection. `AvatarImage` now drops anything that is not
https and falls through to initials. The guard is in the shared primitive
rather than at the five call sites, so a new avatar cannot forget it.

The URL allowlist works on the parsed protocol, never on string matching, and
refuses any URL containing whitespace or control characters — which is how
`java\nscript:` gets past naive checks.

`target="_blank"` links now always carry `rel="noopener noreferrer"` because
there is one component that renders them.

## 7. Firestore / NoSQL

Firestore is not MongoDB; there is no query-object injection. The real risks
are paths and unconstrained writes.

| Check | Result |
| --- | --- |
| Collection names derived from user input | **none** — all six are module constants |
| Field names, operators, or `orderBy` from user input | **none** |
| `limit` from user input | **none** — all are constants |
| Cursors exposed to the UI | none; the chat cursor never leaves the repository |
| Document ids from route params | **were unvalidated — now checked** |

Route ids now pass `isValidDocumentId` / `isValidPairId` before reaching
`doc()`: no `/`, no `.`/`..`, no `__reserved__`, no control characters, length
bounded. An invalid id resolves exactly like a missing one, so a guessed or
malformed id reveals nothing.

## 8. SQL injection

**Not applicable — no SQL surface exists.** The audit searched dependencies
and source for `sequelize`, `typeorm`, `prisma`, `mysql`, `pg`, `postgres`,
`sqlite`, `knex`, `$queryRaw`, `.raw(`, and SQL keywords. Nothing found; the
only datastores are Firestore and localStorage.

SQL-looking strings in user content are therefore harmless text, and are
tested as such. **If SQL is ever introduced**, parameterized queries are
mandatory and string concatenation is forbidden — recorded in `CLAUDE.md`.

## 8.5 ICS / calendar output (STEP 13)

Calendar export added a THIRD output context with its own escaping rules.
React escaping protects HTML and does nothing here: a venue name that renders
harmlessly on screen can still terminate a property line inside a `.ics` file.

| Control | Where |
| --- | --- |
| Text escaping (backslash, `;`, `,`, newlines) | `escapeIcsText`, `src/lib/ics.ts` |
| Control characters stripped, values bounded at 512 chars | same |
| Property NAMES written only by the module | `property()` — no `input + ':'` exists anywhere |
| Line folding at 75 **octets** (UTF-8 bytes, not characters) | `foldLine` |
| CRLF line endings throughout | `buildIcsCalendar` |

**CRLF injection.** A venue name of
`Court A\r\nATTENDEE:mailto:attacker@example.com` must not create an
`ATTENDEE` property. Two independent defences: every line-ending form
collapses to a literal escape inside the value, and no code path lets user
input become a property name. Tested through `buildIcsCalendar` directly and
through `calendarService` with a hostile buddy display name.

**URL.** The optional `URL` property carries the venue's `googleMapsUri` only
when `isTrustedMapsUrl` passes — the same STEP 12.6 allowlist that guards the
"Open in Maps" link. A `javascript:` or look-alike-host URI is dropped.

**Filename.** `buildIcsFilename` slugs everything outside `a-z0-9` to a
separator, removing path separators, `..`, control characters and quotes in
one rule rather than an escapable blocklist. The prefix, the extension and
the MIME type (`text/calendar;charset=utf-8`) are developer literals.

**No HTML description.** `X-ALT-DESC;FMTTYPE=text/html` is deliberately never
emitted: one escaping context instead of two.

**Privacy.** The UID is an opaque digest, not the activity id — the id is
`{userA}__{userB}__active`, so a raw UID would carry both participants'
account ids into a file the user can forward. Providers receive
`CalendarEventData`, never an `Activity`, so participant ids, the connection
id and the source plan id are structurally unable to reach a file.

**No shared state.** Nothing about calendar export is written to Firestore —
no `calendarAdded` flag, no `calendarAddedBy` array. Whether one person
exported a session is not a fact about the session.

## 9. XML / XXE

**Not applicable — no XML parsing surface exists.** No `DOMParser`,
`XMLSerializer`, `parseFromString`, `xml2js`, `fast-xml-parser`, `xmldom`,
`sax` or `libxml`, and no XML content types. XML-looking strings are plain
text, and a DTD/XXE payload is covered by a test asserting it stays text.

If XML parsing is ever added, DTDs and external entities must be disabled.

Note for later: **ICS calendar files are not XML.** STEP 13 will need its own
field escaping; do not reach for an XML sanitizer.

## 10. JSON, storage and prototype pollution

`readStore` was `JSON.parse(raw) as T` — an unchecked assertion over data the
user can edit. It now:

- takes an optional type guard and returns the fallback when it fails;
- strips `__proto__`, `constructor` and `prototype` **as object keys** with a
  `JSON.parse` reviver, so they cannot survive a later spread or merge;
- offers `readStoreArray`, which drops corrupted entries rather than the whole
  key — one bad record cannot wipe unrelated storage;
- offers `readStoreRecord`, which repairs a store object field by field
  against its defaults.

`readStoreRecord` was added after a live check found a genuine crash: a
hand-edited `mock-chat` key holding an array where a store object belongs took
the Messages screen down with `Cannot read properties of undefined (reading
'includes')`. Corrupt storage should cost the user their mock data, not the
page.

The mock profile repository now validates each stored record on read.

`Object.assign`, `lodash.merge` and deep-merge helpers: **none in the
codebase.** Spreads are of typed, locally constructed objects.

## 11. Mass assignment

**Finding (Medium, fixed).** `profileService` spread the caller's object
(`{ ...input }`) into `setDoc`, and the `users/{uid}` rule had no key
allowlist — so any extra property would have been persisted.

- `toSafeProfileInput` rebuilds the object field by field.
- `firebaseProfileRepository.saveProfile` lists the document's fields
  explicitly instead of spreading.
- `firestore.rules` now enforces `keys().hasOnly(...)` on `users/{uid}` and
  `publicProfiles/{uid}`.

`toDiscoveryProfile()` was re-audited: it already picks fields explicitly and
never spreads, and no STEP 10–12 field had leaked into it. The rules now state
the same allowlist independently, so an `email` or `radiusKm` written into a
public projection is rejected by the server, not merely absent by convention.

## 12. Firestore rules

Re-verified against the emulator; **95 tests pass** (86 before, +9).

Added in this step:

- `users/{uid}` — exact key allowlist; display name ≤ 40, bio ≤ 160, sports ≤ 5.
- `publicProfiles/{uid}` — exact `DiscoveryProfile` allowlist; same size caps.

Re-tested and unchanged:

| Invariant | Status |
| --- | --- |
| Connection participants immutable; requester cannot impersonate | pass |
| `connected` requires both participants to have asked | pass |
| Conversation/message access requires a `connected` connection | pass |
| `senderId == request.auth.uid`; message content ≤ 1000, non-empty | pass |
| Messages are create-only; update and delete denied | pass |
| Plan acceptance: a caller may add **only themselves** to `acceptedBy` | pass |
| `ready` / `venue-agreed` recomputed by the rules, never claimed | pass |
| Activity creation re-derives sport, venue, budget and participants from the plan | pass |
| Activity update and delete denied outright | pass |
| Confirmed plan is read-only | pass |

## 13. Auth and access boundaries

Route guards (`ProtectedRoute`, `GuestRoute`, `OnboardingRoute`) are UX, not
security — they hide screens, they do not protect data. The data protection is
the rules, which was re-tested above.

Verified by direct-URL reasoning and existing tests: `/messages/<random>`,
`/activities/<random>` and `/plan/<random>` resolve identically to a missing
record for anyone not in the pair, so a guessed id leaks neither content nor
existence.

## 14. External API validation

Google Places responses go through `mapGooglePlaceToVenue`, which reads a
declared shape rather than casting, validates coordinate ranges
(`-90..90`, `-180..180`, finite), rejects a place with no id or name, and now
drops an untrusted maps URI. A raw place object never reaches state or storage.

Venue search input is normalized and capped at 120 characters, and the sport
id is checked against `SPORTS` before it selects provider search terms.

Cost controls (unchanged, re-confirmed): 400 ms debounce, 3-character
minimum, result cap of 16 in the request and again after ranking, an in-memory
cache, and no search on render, hover, marker click or map pan.

## 15. Secrets and environment

| Check | Result |
| --- | --- |
| `console.log` / `console.error` in `src/` | **none at all** |
| Passwords logged, stored or persisted | none |
| `SECRET` / `PRIVATE_KEY` / `SERVICE_ACCOUNT` in source | none |
| `.env` committed | no — only `.env.example`, with empty values |

`VITE_*` values are **compiled into the client bundle and are not secret.**
The Firebase web config is public by design. The Google Maps browser key is
public by design and must be protected by restriction, not by hiding:
HTTP referrer restrictions, API restrictions (Maps JavaScript API + Places API
(New) only), and daily quotas. Never put a server credential in a `VITE_`
variable.

Error messages were reviewed: services map failures to fixed user-safe strings
(`AuthError`, `ChatError`, `PlanningError`, `VenueError`, `ActivityError`) and
never surface a Firestore code, a document path or a stack trace.

## 16. Dependencies

```
npm audit               13 moderate
npm audit --omit=dev     0 vulnerabilities
```

**Nothing vulnerable ships to the browser.** All 13 advisories are transitive
dependencies of two dev-only tools — `firebase-tools` (the rules emulator) and
`@capacitor/cli` — reaching `uuid`, `qs`, `re2` and `stream-json`.

`npm audit fix --force` was **not** run: it would force major upgrades of the
emulator and Capacitor tooling to fix issues that never reach production. To
be revisited when those tools publish compatible releases.

## 17. Security headers / CSP

**Not applied — there is no hosting configuration to apply them to.**
`firebase.json` configures Firestore rules and the emulator only; there is no
`hosting` block, `vercel.json` or `netlify.toml`. Inventing one for a platform
that is not in use would be configuration nobody deploys.

Recommended when hosting is set up, to be tested against Maps and Firebase
before shipping:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://maps.googleapis.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://*.googleapis.com https://*.gstatic.com
          https://*.googleusercontent.com;
  connect-src 'self' https://*.googleapis.com https://*.firebaseio.com
              wss://*.firebaseio.com https://places.googleapis.com;
  frame-ancestors 'none';
  base-uri 'self';
  object-src 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

`geolocation=()` matches the product decision: STEP 11 deliberately uses area
centroids and never calls `navigator.geolocation`. Re-check before native
packaging, in case a Capacitor plugin needs a permission.

`X-XSS-Protection` is deliberately omitted — it is obsolete and, in some
browsers, was itself a vulnerability.

## 18. Findings

| Severity | Area | Finding | Risk | Fix | Status |
| --- | --- | --- | --- | --- | --- |
| **High** | Venue / plan | `googleMapsUri` accepted as any string, stored in a shared plan and rendered into `href` | A participant could give the other a `javascript:` or phishing link behind "Open in Maps" | Trusted-host validation at the mapper, service, persistence guard and render | Fixed |
| **Medium** | Profile writes | `{ ...input }` spread into `setDoc`; no key allowlist in the rules | Arbitrary client fields persisted onto `users/{uid}` | Explicit field construction + `hasOnly` in the rules | Fixed |
| **Medium** | Profile domain | Enum fields validated for presence only | An unknown `sportId` / `areaId` reached `publicProfiles` and the matching engine | Membership checks against the centralized datasets | Fixed |
| **Medium** | Budget | No finite/range validation | `NaN` / `Infinity` / negative budgets persisted and scored | `isValidBudget` | Fixed |
| **Medium** | Storage | `JSON.parse(raw) as T` — unchecked assertion over user-editable data | Corrupt localStorage could crash a render; `__proto__` survived into spreads | Type guards, key stripping, per-entry array filtering | Fixed |
| **Medium** | Avatars | `photoUrl` rendered without protocol validation | `data:` / non-https image sources | https allowlist inside `AvatarImage` | Fixed |
| **Low** | Route params | Ids reached `doc()` unvalidated | Malformed path segments | `isValidDocumentId` / `isValidPairId` at page and service | Fixed |
| **Low** | Text input | No control-character handling | Bidi-override and zero-width abuse in names shown to others | `normalizeSingleLine` / `normalizeMultiLine` | Fixed |
| **Low** | Venue search | Unbounded query length | Oversized provider request and cache key | 120-character cap | Fixed |
| **Info** | Dependencies | 13 moderate, all dev-only | None in the shipped bundle | Documented, not force-fixed | Accepted |
| **Info** | Headers/CSP | No hosting config exists | — | Documented for deployment | Deferred |
| **Low** | Calendar UID (STEP 13) | Raw activity id as ICS UID carried both participants' account ids into an exportable file | Identifier disclosure to anyone the file is forwarded to | Opaque stable digest | Fixed |
| **Info** | ICS output (STEP 13) | A new escaping context | Property injection via a venue name or a display name | `escapeIcsText`, developer-only property names, safe filename | Controlled |
| **Info** | Rate limiting | Client-side only | Abuse and cost | Documented in §20 | Deferred |

## 19. OWASP-style mapping

Rough mapping only; this is not a formal assessment or certification.

| Category | Relevance here |
| --- | --- |
| Broken Access Control | The main surface. Handled by Firestore rules, re-tested (95 tests). Route guards are UX only. |
| Injection | No SQL, no XML, no template engine, no `eval`. XSS is the live category, and the maps-URI finding was the real instance. |
| Security Misconfiguration | Rules key allowlists added; CSP and headers deferred to a hosting config that does not exist yet. |
| Identification & Authentication | Delegated entirely to Firebase Auth. No custom auth, no custom crypto, no token handling of our own. |
| Software & Data Integrity | Write allowlists, explicit document construction, immutable activities, prototype-key stripping. |
| Logging & Monitoring | No application logging exists at all. Neither a leak nor a detection capability — see §20. |

## 20. Known limitations

Stated plainly, because a security document that only lists wins is a
liability:

1. **No rate limiting.** Loading flags and the search debounce are UX, not
   abuse protection. A scripted client can write at whatever rate Firestore
   accepts. Real protection needs Firebase App Check, server-side quotas, or
   Cloud Functions.
2. **Firebase App Check is not configured.** It is the right next hardening
   step and would block requests from outside the real app. It was not enabled
   here because it needs a real project and would break mock-mode development
   without a debug provider — a production task, not a code change.
3. **No abuse reporting, blocking or moderation.** A member can send any text
   to a connected buddy and there is no way to report it. Deliberately out of
   scope for this step, but it is a safety gap in a social product.
4. **No logging or monitoring.** Nothing records a failed authorization, so a
   probing attacker is invisible.
5. **Client-side validation is skippable, by design.** It exists for error
   messages. Everything that matters is re-checked in the rules — but any
   *future* rule that is not mirrored in `firestore.rules` protects nothing.
6. **Google Maps key restrictions are a console setting**, not code. They
   cannot be enforced or verified from this repository.
7. **Not verified live:** the Firebase-mode paths have never run against a
   real project (no credentials in this environment) and Places/Maps have
   never run against Google (no API key). Rules are verified against the
   emulator, which is the same rules engine, but the two-user runtime flows
   are unexercised.
8. **Account deletion is still absent.** Deleting an auth user would leave
   orphaned profile, connection, conversation and activity documents. Required
   before production, and a privacy obligation as much as a security one.

No claim is made that the application is "fully secure". It has been audited
and hardened against the input-based attack classes listed here.

## 21. Future backend requirements

If a server or API is ever added:

- Parameterized queries only; no SQL string concatenation.
- No `exec` / `spawn` with `shell: true`, and no filesystem paths built from
  user input.
- CORS restricted to trusted origins; never `*` with credentials.
- CSRF is currently near-irrelevant because Firebase Auth uses SDK tokens
  rather than cookie sessions — that changes the moment a cookie-authenticated
  endpoint exists.
- Server secrets go in server environment variables, never `VITE_*`.

## 22. Tests

**419 unit tests** and **97 emulator rules tests** (355 / 95 after STEP 12.6).

New security suites:

| File | Covers |
| --- | --- |
| `src/lib/safe-url.test.ts` | protocol allowlist, `javascript:` in several disguises, `data:`, `file:`, `vbscript:`, look-alike Google hosts, oversized URLs |
| `src/lib/sanitize.test.ts` | hostile payloads surviving as text; every language and emoji preserved; control, zero-width and bidi characters stripped; no silent truncation |
| `src/lib/ids.test.ts` | slashes, `..`, `__reserved__`, empty, oversized, padded, control characters, pair-id shape |
| `src/lib/storage.test.ts` | corrupt JSON, failed guards, `__proto__`/`constructor`/`prototype` stripping, per-entry array recovery |
| `src/services/profile/profile-schema.test.ts` | enum membership, `NaN`/`Infinity`/negative/inverted budgets, duplicate and oversized arrays, write allowlist dropping `admin`/`role`/`email` |
| `src/services/venue/venue-service.test.ts` (extended) | untrusted maps URI, path-like place id, oversized name/address |
| `tests/firestore-rules.test.ts` (extended) | profile and projection key allowlists, field size caps, private fields refused in the public projection; a client-written temporal status refused, and an activity still immutable after creation |
| `src/lib/ics.test.ts` (STEP 13) | ICS escaping in order, CRLF injection, early `END:VEVENT` termination, folding at 75 octets, safe filename, path traversal |
| `src/services/calendar/calendar-service.test.ts` (STEP 13) | stable and opaque UID, untrusted maps URL dropped, no ids/email/profile fields in an event, injection through a display name |

Payloads used as **test data only**, never executed:
`<script>alert(1)</script>`, `"><img src=x onerror=alert(1)>`,
`javascript:alert(1)`, `java\nscript:alert(1)`, `data:text/html,…`,
`' OR 1=1 --`, `"; DROP TABLE users; --`, `<foo>&bar</foo>`,
`<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>`, `${7*7}`,
`__proto__`, `../../admin`.

## 23. Verification

| Check | Result |
| --- | --- |
| `tsc -b --noEmit` | clean |
| `oxlint src tests` | 4 pre-existing `only-export-components` warnings |
| `vite build` | succeeds |
| `vitest run` | 20 files, 419 tests passing |
| `npm run test:rules` | 97 tests passing against the emulator |
| `npm audit --omit=dev` | 0 vulnerabilities |
