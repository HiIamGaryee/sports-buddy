# Player A — Platform & Monetization progress

Tracks the checklist in `Sports-Buddy-Shipaton-Task-Split.pdf` (Player A:
Firebase → Android build → RevenueCat + Billing → Play Console). The PDF isn't
editable, so this file is the running record. Update it as items close.

Owner: Lynn662312 (Player A). Last updated: 2026-09-13.

## Where things stand

| Phase | Status |
| --- | --- |
| 1 — Firebase + Android | **9 of 10.** Last item needs one retest (see "To do → Right now"). |
| 2 — Monetization + RevenueCat | Not started. Mostly blocked on deciding what's paid with Player B. |
| 3 — Build pipeline, crash tracking, push | Not started. Not blocked. |
| 4 — Play Console submission | Not started. Needs Phase 2 + Player B's store assets. |
| 5 — Buffer | Not started. |

---

## To do

### Right now

1. **Retest "Load earlier messages."** Leo/Lynn chat with 25+ messages → hard
   refresh → scroll to the top → the button should appear and load older
   messages without duplicates. When it passes, tick the last Phase 1 item.
2. **Run `npm run test:rules`.** Not re-run since the last rule changes
   (it was 106/106 before the list-query tests were added). All must pass.
3. **Merge `deploy` with `main` — together with Player B, not in one click.**
   As of 2026-09-13, `main` is 16 commits / 195 files ahead (Player B's map,
   safety, home page, policy dialog work). A dry-run merge conflicts in
   `firestore.rules`, `package.json`, `package-lock.json` and
   `use-discover.ts`, and more once today's chat/nav work is included. Three
   things need a decision, not just a conflict fix:
   - **Capacitor version.** `deploy` is on **Capacitor 8** (what `CLAUDE.md`
     says, and what the signed APK/AAB was built with). `main` moved to
     **Capacitor 6** and added plugins (camera, haptics, keyboard,
     preferences, status-bar, app, filesystem, assets). Pick one with Player
     B; the `android/` project must match it.
   - **`firestore.rules`.** The rules LIVE in Firebase right now are the
     `deploy` version (all the fixes below). `main` adds blocks, reports and
     `pairIsUnblocked()` but still has the old, broken read rules. The merge
     must keep both, pass `npm run test:rules`, be retested live, and only
     then be deployed. **Until then, nobody should run
     `firebase deploy --only firestore:rules` from `main`** — it would put
     every bug below back.
   - **`@revenuecat/purchases-js`** was added to `package.json` on `deploy`
     but isn't imported anywhere. It is RevenueCat's **web** billing SDK; an
     Android app selling through Google Play needs
     `@revenuecat/purchases-capacitor` instead. Left out of the 2026-09-13
     commit on purpose.
   Safe order: merge `origin/main` INTO `deploy` locally → resolve → typecheck,
   `npm test`, `npm run test:rules` → retest the two-user flow → deploy the
   merged rules → open a PR to `main` for Player B to review.
4. **Back up the release keystore** (`android/sports-buddy-release.keystore` +
   `android/keystore.properties`) somewhere outside the repo. Losing it blocks
   all future Play Store updates.

### Next — not blocked, start any time

5. **Google Play Console developer account ($25).** Listed under Phase 4, but
   Phase 2 can't create a subscription product without it, and identity
   verification can take several days. Start early.
6. **RevenueCat account + project.** Free, needs no pricing decision.
7. **Terms of Service — check with Player B first.** `main` has a commit
   "add tnc" and a new `PolicyDialog` in Settings, so this may already be
   done. Confirm after the merge before writing another one.
8. **Sentry error tracking.** Every live bug today was only visible because
   DevTools happened to be open.
9. **Decide with Player B what's paid.** Unblocks the rest of Phase 2.
   Already decided: message history stays **free**. Ideas that add value
   rather than take it away: more Discover filters, more than 5 sports on a
   profile, more than one active plan per buddy, activity reminders.

### Before Play Store release (Phase 4 blockers)

- **In-app account deletion.** Google Play requires apps that let people
  create an account to also let them delete it, in the app and via a web
  link. Not built yet (`CLAUDE.md`'s STEP 5 notes explain why it was deferred: it must
  also clean up `users/{uid}`, `publicProfiles`, connections and messages).
- **Google sign-in inside the Android app.** The current web popup flow is
  unreliable in a Capacitor WebView. Needs a native Google auth plugin, or
  launch with email/password only. The signing SHA-1 below is what that
  plugin will ask for.
- **Real app icon** from Player B (still the Capacitor default).
- **Privacy policy** from Player B.

### Later

- **Move unread state to Firestore** when building notifications. Today the
  "last read" marker is saved in the browser only, so two devices keep
  separate unread state. The move changes `src/lib/chat-read-state.ts` plus
  new rules and rules tests (`docs/chat.md` §16).
- **Push notifications** (OneSignal/FCM, Phase 3 optional).
- **Codemagic CI.** Optional — signed builds already work on this machine.

---

## Done

### Phase 1 — Firebase + Android scaffolding

- [x] Firebase project — existing `sportbuddy-4d596`
- [x] Web app registered — `sports-buddy-web`, app id
      `1:975714013425:web:58879b4bad0b33a0671950`
- [x] Email/Password sign-in enabled
- [x] Google sign-in enabled; `localhost` authorized
- [x] Firestore created — production mode, `asia-southeast1`
- [x] Security rules + indexes deployed (`firebase deploy --only firestore:rules,firestore:indexes`)
- [x] App switched to live Firebase (`.env`: `VITE_DATA_SOURCE=firebase`)
- [x] Two-user live verification (`docs/firebase.md` §9b, §9c), run with
      accounts "leo" and "lynn":
  - [x] Connect → Connect back → mutual "You found a sports buddy" dialog
  - [x] Connection state survives a page refresh
  - [x] Live messages both ways, no refresh needed
  - [x] Third, unconnected account sees "This conversation is unavailable."
        and reads nothing
  - [x] 20+ messages: "Load earlier messages" works — **fixed, retest pending**
- [x] `npx cap add android`
- [x] Release keystore + Gradle signing config (keystore and passwords are
      gitignored)
- [x] App boots from a debug APK, and a **signed release APK + AAB** build:
      `android/app/build/outputs/apk/release/app-release.apk` and
      `.../bundle/release/app-release.aab`. Signer CN=Sports Buddy, SHA-1
      `64:1a:2f:87:88:62:08:3c:93:73:c1:43:5a:f9:20:41:e3:07:22:77`.

### Bugs found and fixed during live testing (2026-09-13)

None of these showed up in mock mode or the emulator tests; they only
appeared against the real Firebase project.

| # | What you saw | Cause | Fix | Details |
| --- | --- | --- | --- | --- |
| 1 | Google sign-in silently did nothing | Chrome's popup security header made a successful sign-in look cancelled | `Cross-Origin-Opener-Policy: same-origin-allow-popups` in `vite.config.ts` | `docs/firebase.md` §9c |
| 2 | First-ever Connect failed ("couldn't send your connection request") | Rules refused reading a connection that didn't exist yet | `uidInPairId()` lets the two people named in the id check it first; same fix for plans and activities | `docs/connections.md` §9 |
| 3 | Refresh reset "Connected" back to "Connect" | My fix for #2 broke the realtime connections query | `get` and `list` rules split apart | `docs/connections.md` §9 |
| 4 | Incoming connect request invisible | Discover filters also hid the "Wants to connect" section | Incoming requests ignore filters (`NO_DISCOVER_FILTERS`) | `docs/discover.md` |
| 5 | Had to re-tick "New sports friends" to see people | Editing your profile didn't update your discovery intent filter | Intent filter now mirrors profile intents on every save | `src/lib/preferences.ts` |
| 6 | Messages list: "We couldn't load these messages" | Conversations query rule didn't match the query | Rule checks `participants`, matching the query's `where` | `docs/chat.md` §12 |
| 7 | Opening a chat: "We couldn't load these messages" | Messages query has no `where`, so a data-based rule can't pass | Rule authorizes from the conversation id alone | `docs/chat.md` §12 |
| 8 | No "Load earlier messages" button | A bug that React's development mode exposes (state updater ran twice) | Moved the check out of the updater | `use-conversation.ts` |

**The lesson for this project:** Firestore security rules are not filters.
A rule for a query must be provable from the query itself, and the emulator
tests only proved single-document reads. `tests/firestore-rules.test.ts` now
issues the exact queries the app issues. Read `docs/chat.md` §12 before
changing any rule.

Two wrong turns, recorded so they aren't repeated: adding a `participants`
field to every message (reverted — it couldn't work), and deleting the
Leo/Lynn test messages (unnecessary; only test data was lost).

### Also shipped

- **Unread dot** on conversation rows and the Messages tab. Tested and
  working. Saved per device for now (see "Later").
- **Decision:** full message history is free.

---

## Phase checklists (from the PDF)

### Phase 2 — Monetization + RevenueCat (days 5–10)

- [ ] Decide what's actually paid (with Player B)
- [almost] Create a RevenueCat account + project
- [ ] Create the subscription/product in Google Play Console (needs the Play
      Console account first)
- [ ] Install RevenueCat's Capacitor plugin, initialize the SDK
- [ ] Build the purchase flow / paywall
- [ ] Complete one sandbox purchase (Play license tester account)
- [ ] Add a Restore Purchases control
- [ ] Write a short Terms of Service page

### Phase 3 — Build pipeline, crash tracking, push (days 8–12)

- [ ] Claim Codemagic perk, configure signed AAB build workflow (optional)
- [ ] Claim Sentry perk, wire basic error tracking
- [ ] Optional — OneSignal push notifications

### Phase 4 — Play Console submission (days 13–17)

- [ ] Google Play Console developer account ($25) — do this early
- [ ] In-app account deletion (Play policy requirement)
- [ ] Google sign-in working in the Android app, or email/password only
- [ ] Create the app listing, upload the signed AAB
- [ ] Fill the Data Safety form
- [ ] Complete the content rating questionnaire
- [ ] Enroll in Play App Signing
- [ ] Release to Closed/Internal testing, confirm install
- [ ] Promote to Production
- [ ] Complete one real purchase post-launch

### Phase 5 — Buffer (days 18–19)

- [ ] Confirm the listing is publicly installable
- [ ] Hand Player B the live Play Store link + RevenueCat project link

---

## Reference notes

**`npm run test:rules` on Windows** needs JDK 21+ on `PATH`. Installed on this
machine with `winget install EclipseAdoptium.Temurin.21.JDK` (open a new
terminal afterwards, check with `java -version`).

**Local build failures** (missing bundler binding, Gradle "not a regular
file") were caused by OneDrive Files On-Demand removing build output
mid-build. The repo now lives outside any cloud-synced folder.

**Firebase CLI** is logged in on this machine with access to
`sportbuddy-4d596`; `.firebaserc` defaults to it. Deploy rules with
`firebase deploy --only firestore:rules` (add `--dry-run` to check first).
