# Player A — Platform & Monetization progress

Tracks the checklist in `Sports-Buddy-Shipaton-Task-Split.pdf` (Player A:
Firebase → Android build → RevenueCat + Billing → Play Console). The PDF
itself isn't editable in place, so this file is the running "done" record —
update it as each remaining item closes.

Owner: Lynn662312 (Player A). Last updated: 2026-09-13 (Google sign-in COOP
bug fixed; two-user click-through still pending).

## Phase 1 — Firebase + Android scaffolding (days 1–4)

- [x] Create a Firebase project — using existing `sportbuddy-4d596`
- [x] Register a Web app, copy the `firebaseConfig` values — `sports-buddy-web`,
      app id `1:975714013425:web:58879b4bad0b33a0671950`
- [x] Enable Email/Password sign-in
- [x] Enable the Google sign-in provider, add dev domains under Authorized
      domains — `localhost` authorized via `firebase.json` → `auth.authorizedDomains`
- [x] Create the Firestore database — production mode, `asia-southeast1`
- [x] Deploy the existing security rules — `firestore.rules` + `firestore.indexes.json`
      deployed via `firebase deploy --only firestore:rules,firestore:indexes`
- [x] Switch the app to live Firebase — `.env` has `VITE_DATA_SOURCE=firebase`
      and the real Firebase keys
- [ ] Run the two-user verification scripts (`docs/firebase.md` §9b connections,
      §9c chat) — this is more than "an account exists in Firebase": it means
      TWO different accounts complete onboarding, appear in each other's
      Discover feed, connect with each other, and exchange live chat messages
      — proving the realtime Firestore listeners work end to end, not just
      Auth + a single write. Not yet run against the live project.
      **Blocker found and fixed 2026-09-13:** live Google sign-in was being
      silently reported as user-cancelled (`auth/popup-closed-by-user`) even
      on success — a known Chrome/`firebase-js-sdk` COOP interaction, not an
      app bug. Fixed via `Cross-Origin-Opener-Policy: same-origin-allow-popups`
      on the Vite dev/preview servers (`vite.config.ts`); see
      `docs/firebase.md` "Known gotcha" note under §9c. A temporary debug log
      added while diagnosing this was removed from `auth-service.ts`. 421
      unit tests still pass. The actual two-user click-through (§9b/§9c) still
      needs a human running two sessions against the live project — that part
      was not automated (no headless browser in this environment, and driving
      it via a script would mean writing real test data into the live
      Firestore project, which wasn't authorized). Runbook, unchanged:
      1. `npm run dev`, sign in as one account in a normal window and a
         second account in an incognito window (or a second browser/profile)
         — email/password is simplest; Google sign-in should now succeed too.
      2. Complete onboarding for both if not already done, and confirm both
         have Discovery on.
      3. Follow `docs/firebase.md` §9b (Connect / Connect back / mutual
         dialog), then §9c (live message exchange, 20+ message pagination,
         and the third-account isolation check).
      4. Tick this item once both pass.
      **Second, more serious blocker found and fixed 2026-09-13:** a real
      two-user click-through (accounts "leo" and "lynn") reproduced a `403
      permission-denied` on the very first Connect — `firestore.rules`
      denied reading a `connections/{id}` document that did not exist yet,
      because `connect()`'s transaction always reads the pair's document
      FIRST to decide create-vs-update, and the old rule
      (`resource.data.participants`) throws when `resource` is `null`. This
      broke **every first-ever Connect between any two accounts** in the
      live project — not a Leo/Lynn-specific issue. The same pattern also
      existed for `activityPlans` (`ensureActivePlan`) and `activities`
      (`createFromPlan`), so "Plan a session" and "Confirm activity" would
      have hit the identical wall on their first use. Fixed in
      `firestore.rules` with a new `uidInPairId()` helper that authorizes the
      read from the document id itself (which already encodes both
      participants) when the document doesn't exist yet, falling back to the
      real `participants` check once it does. Full rationale:
      `docs/connections.md` §9. Added 9 new regression tests to
      `tests/firestore-rules.test.ts` covering exactly this gap (read on a
      brand-new connection/plan/activity: allowed to a real participant,
      denied to a stranger and to a signed-out caller).
      **Deployed live 2026-09-13** via `firebase deploy --only
      firestore:rules` against `sportbuddy-4d596` — dry-run and real deploy
      both compiled and released successfully, **and confirmed locally**:
      JDK 21 installed via `winget install EclipseAdoptium.Temurin.21.JDK`
      on this Windows/ASUS machine, then `npm run test:rules` passed **106/106**
      (97 original + 9 new regression tests). Leo pressing Connect on Lynn
      now returns 200 and "Request sent" — confirmed live.

      **Third issue found and fixed 2026-09-13 (same live test):** Leo's
      Connect succeeded, but Lynn's "Wants to connect" section stayed empty.
      Root cause was different from the rules bug — Lynn had active Discover
      filters, and `use-discover.ts` was building the incoming-requests
      section from the SAME filter-narrowed candidate list as the ranked
      feed, so a filter that excluded Leo hid his request entirely, not just
      his card. Fixed: incoming requests are now ranked/joined from the full
      candidate set (`NO_DISCOVER_FILTERS` in
      `src/lib/discover-filters.ts`), independent of the viewer's active
      filters — a pending request should never be invisible just because a
      filter was left on. Updated `docs/discover.md`, `CLAUDE.md` (STEP 8).
      421 unit tests still pass. Not yet re-verified live after this specific
      fix — retry the Leo/Lynn flow once more (filters no longer need
      resetting for the request to appear).

      **Fourth issue found and fixed 2026-09-13 — this one was MY OWN
      regression from the first fix, and the most serious of the four:**
      after connecting, refreshing the browser reset the UI back to plain
      "Connect" / "Not now" for BOTH accounts, as if the connection never
      happened. Root cause: `ConnectionProvider`'s realtime subscription
      reads via a `list` QUERY (`participants array-contains uid` + `limit`),
      never a single-document `get`. My first `firestore.rules` fix combined
      `allow get, list:` under one line with an `exists()` branch — Firestore
      cannot safely evaluate a `list` query per-document once `exists()` is
      mixed into the same rule, so the ENTIRE subscription silently came back
      permission-denied for both participants on every fresh page load, while
      a plain `getDoc()` on the same document kept succeeding the whole time
      (which is why it looked like state resetting, not an access error).
      **This is exactly why `npm run test:rules` passing 106/106 didn't catch
      it** — every existing test used `getDoc`, none exercised an actual
      `list`/query read. Fixed by splitting `get` and `list` into two
      separate `allow` statements in all three affected matches
      (`connections`, `activityPlans`, `activities`) — `list` never needs the
      `exists()` branch, because a query can only ever match a document that
      already exists. Added 3 new regression tests that call the exact query
      shape the app uses. **Deployed live** (dry-run + real deploy both
      compiled and released). Confirmed the connections part of this fix
      worked live: state now survives a refresh.

      **Fifth issue found and fixed 2026-09-13 (same live test, same root
      cause class):** connections stayed fixed, but Messages then showed "We
      couldn't load these messages." Diagnosed with a temporary DEV-only log
      of just the error *code* (never the message — added and removed same
      session) — confirmed `permission-denied`, and confirmed via the
      Firebase Console that the underlying connection really was `status:
      'connected'` (ruling out "not actually connected yet"). Root cause:
      the EXACT same `list`-query-plus-external-`get()` failure as the
      connections bug, independently present in `conversations` AND
      `messages` — both share `connectedParticipant()` (a `get()` into the
      `connections` collection) for both `get` and `list`, and both
      `subscribeToConversations` and `subscribeToRecentMessages` are `list`
      queries, never `getDoc`. This one was **never touched by anything I
      changed today** — it's a genuine STEP 9 gap that simply had never been
      exercised against live Firestore before now (explicitly noted as
      outstanding since STEP 9/12). Fixed the same way: `list` no longer
      calls `get()`/`exists()` anywhere.
      - `conversations`: `list` now checks `resource.data.participants`
        directly (already stored on every conversation document).
      - `messages`: had no relationship data of its own, so `participants`
        is now denormalized onto every message at send time, used only for
        `list` authorization — never a domain field, never shown in the UI.
        Old messages sent before this fix lack the field and will quietly
        not appear in a fresh `list` (excluded, not an error) — an
        acceptable one-time cost for pre-fix test messages; resend after
        this deploy.
      Threaded through `types/chat.ts`, `chat-service.ts`,
      `firebase-chat-repository.ts`. Added 6 new regression tests exercising
      the actual query shapes (`orderBy`/`array-contains`/`limit`) both
      collections use. 421 unit tests still pass. **Deployed live.**
      Full rationale and a general warning for any future collection:
      `docs/chat.md` §12.

**Windows note for `npm run test:rules` (resolved):** needed JDK 21+ on
`PATH`. On this plain Windows/ASUS machine (no macOS, no Homebrew):
`winget install EclipseAdoptium.Temurin.21.JDK`, then open a **new**
terminal so PATH refreshes, confirm with `java -version`. Already done and
working on this machine.
- [x] `npx cap add android` — native project generated
- [x] Set app icon + generate a release keystore, wire signing config in Gradle
      — keystore at `android/sports-buddy-release.keystore` (gitignored),
      passwords in `android/keystore.properties` (gitignored) — **back this up
      outside the repo, losing it blocks all future Play Store updates**.
      App icon is still the Capacitor default — real icon is Player B's Phase 3
      asset, wire it in when it exists.
- [x] `npm run cap:sync` and confirm the app boots — confirmed via a debug APK
      install, and a **signed release build** (both APK and AAB) now builds
      cleanly: `android/app/build/outputs/apk/release/app-release.apk` and
      `.../bundle/release/app-release.aab`. Verified with `apksigner verify`
      — signer CN=Sports Buddy, SHA-1
      `64:1a:2f:87:88:62:08:3c:93:73:c1:43:5a:f9:20:41:e3:07:22:77`. Keep that
      SHA-1 handy — it's what you'd register if a native Google Sign-in
      plugin or Play App Signing setup ever asks for a signing fingerprint.

**Phase 1 status: 9 of 10 done.** Only the two-user live verification remains,
and it needs a human clicking through two real sessions — not something to
automate away.

### Environment note: local dev machine, not project config

Two separate local build failures this session (a missing bundler native
binding, then a Gradle "not a regular file" error) both traced back to
OneDrive Files On-Demand dehydrating build output mid-build on the machine
this was built on. Not a project or code issue — pinning the build folders to
stay fully local resolved it; the repo has since moved outside any
cloud-synced folder entirely to remove the recurrence risk.

## Phase 2 — Monetization + RevenueCat (days 5–10)

- [ ] Decide what's actually paid (coordinate with Player B)
- [ ] Create a RevenueCat account + project
- [ ] Create the subscription/product in Google Play Console
- [ ] Install RevenueCat's Capacitor plugin, initialize the SDK
- [ ] Build the purchase flow / paywall
- [ ] Complete one sandbox purchase (Play license tester account)
- [ ] Add a Restore Purchases control
- [ ] Write a short Terms of Service page

Not started.

## Phase 3 — Build pipeline, crash tracking, push (days 8–12)

- [ ] Claim Codemagic perk, configure signed AAB build workflow
- [ ] Claim Sentry perk, wire basic error tracking
- [ ] Optional — OneSignal push notifications

Not started. Note: a local signed build already works on this machine
(Android Studio + SDK were already installed), so Codemagic is a nice-to-have
for CI, not a blocker the way the PDF assumed.

## Phase 4 — Play Console submission (days 13–17)

- [ ] Google Play Console developer account ($25)
- [ ] Create the app listing, upload the signed AAB
- [ ] Fill the Data Safety form
- [ ] Complete the content rating questionnaire
- [ ] Enroll in Play App Signing
- [ ] Release to Closed/Internal testing, confirm install
- [ ] Promote to Production
- [ ] Complete one real purchase post-launch

Not started — blocked on Phase 2 (needs a product to sell) and Player B's
Phase 3 (store assets, privacy policy).

## Phase 5 — Buffer (days 18–19)

- [ ] Confirm the listing is publicly installable
- [ ] Hand Player B the live Play Store link + RevenueCat project link

Not started.
