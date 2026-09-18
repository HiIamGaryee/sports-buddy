# Player A — Platform & Monetization progress

Tracks the checklist in `Sports-Buddy-Shipaton-Task-Split.pdf` (Player A:
Firebase → Android build → RevenueCat + Billing → Play Console), plus
everything else built alongside it. For the product/business picture (what
Sports Buddy is, monetization, business model), see `docs/project-overview.md`
— this file is your own personal task tracker.

Owner: Lynn662312 (Player A). Last updated: 2026-09-18.

**Google Play Store publishing is intentionally deferred until after the
Shipaton judging period ends — planned for after October, not before.**
Nothing in Phase 4/5 below is a blocker for the Shipaton submission itself.

## Where things stand

| Phase | Status |
| --- | --- |
| 1 — Firebase + Android | **Done.** One optional retest below, everything else verified live. |
| 2 — Monetization + RevenueCat | **Code done, not demoed yet.** Blocked on you doing the one-time RevenueCat dashboard setup (§ below) — no more code needed for this. |
| 3 — Build pipeline, crash tracking, push | Not started. Not blocked, not urgent. |
| 4 — Play Console submission | **Deferred on purpose — after October.** Not part of the Shipaton deadline. |
| 5 — Buffer | Deferred with Phase 4. |

---

## ✅ Done — checklist

### Firebase + Android foundation

- [x] Firebase project (`sportbuddy-4d596`), web app registered
- [x] Email/Password + Google sign-in enabled
- [x] Firestore live (production mode, `asia-southeast1`), rules + indexes deployed
- [x] App running against live Firebase (not mock mode)
- [x] Two-user live verification: connect, mutual match dialog, live chat both
      ways, an unconnected third account correctly blocked from reading
- [x] Android project added, release keystore + signing configured (gitignored)
- [x] Signed release APK **and** AAB build successfully
- [x] `android/gradlew assembleDebug` verified again after every major native
      change (RevenueCat plugin, camera permission) — still builds

### Core 1-to-1 flow

- [x] Discover, matching/compatibility score, filters
- [x] Connect / mutual connect / Unconnect (with confirmation)
- [x] Realtime chat: unread dot, pagination ("Load earlier messages"), full
      free message history
- [x] Block + Report, with an Unblock list in Settings
- [x] Plan Together → Confirm → downloadable calendar file
- [x] Activity posts (1-to-1 public invite): open/approval join policy,
      public/link-only visibility, private invite-from-chat, edit, share link

### Public group activities (new feature, beyond the original PDF scope)

- [x] Create/edit a multi-player public activity (title, description, time,
      venue, price range, skill preference, max players)
- [x] Discover section, join/leave, organizer can remove a no-show
- [x] Shareable link (`/group-activity/:id`), works for someone with no
      account yet
- [x] Free plan limits: 3 joined + 2 hosted at once; Buddy+ removes both

### QR check-in + Reliability Profile (new feature)

- [x no try yet] Organizer shows a QR at the venue; each player scans it once (one
      photo, via the camera you already had installed — no new native plugin)
- [x no try yet] Rotating secret code, regenerable any time a screenshot leaks
- [x no try] Reliability card on Profile: "N Verified Sessions", "M% Show-up Rate"

### Monthly recap (new feature)

- [x need test after qr] "Your September: Badminton ×3, Climbing ×2 — N verified sessions, M%
      show-up rate", computed live, free for everyone
- [x need design the share card] Shareable as an actual branded image card (Sports Buddy name on it),
      not just a text link
- [x] Month-by-month navigation from your Profile page

### RevenueCat + Buddy+ (code side)

- [x] `@revenuecat/purchases-capacitor` integrated (native Android only —
      the web build never fakes a purchase)
- [x] Buddy+ entitlement read live from RevenueCat, never a database flag
- [x] Paywall screen (`/buddy-plus`), linked from Settings
- [x] `presentPaywall()` — the official RevenueCat-hosted Paywall UI
      (`@revenuecat/purchases-capacitor-ui`), the modern recommended way to
      sell the entitlement. **Fully implemented in code — nothing left to
      build here.** It falls back automatically to the hand-built package
      list on the same page if no Paywall has been *designed* in the
      dashboard yet (that design step is optional and dashboard-only, see
      below).
- [x] `presentCustomerCenter()` — RevenueCat-hosted Customer Center
      ("Manage subscription" once you're on Buddy+): cancel, change plan,
      see receipts. Also fully implemented in code.
- [x] Entitlement id bug fixed (`sportbuddy_pro`, was `buddy_plus`)
- [x need test in app] Free/Buddy+ limits actually enforced in the app

### Web hosting + sharing

- [x] Web demo live at https://sportbuddy-4d596.web.app (Firebase Hosting)
- [x] Every activity (1-to-1 and group) has a share link that works for
      someone without the app — signs up, finishes onboarding, lands on it

---

## 🕒 Not done yet — checklist

### Can be picked up any time, no blocker (code only)

- [ ] In-app account deletion (a real Play Store requirement later, but
      buildable now with no external dependency) — when built, it must also
      call RevenueCat's delete-customer API for that uid, or a re-signup
      with the same email could inherit a stranger's old entitlement
      history. See `docs/monetization.md`.
- [ ] Advanced Discover filters (Buddy+) — **recommended for Player B**:
      she already built a nicer filter panel UI (`gy-person-b`) than the
      plain dropdowns on Discover today; it just needs to be re-pointed at
      the real activity posts/group activities/buddy data instead of the
      demo JSON it currently reads from. Either she builds it, or ask and
      I'll port it once she has (or already has) a design she's happy with.
- [ ] Advanced recap/analytics — trends, month comparisons (Buddy+)
- [ ] A Discover filter that prioritizes reliable buddies — **needs one
      decision from you first**: should a member's reliability score become
      part of their public profile? Flagged rather than built silently.
- [ ] Terms of Service page — check with Player B first; `main` may already
      have one (a `PolicyDialog` + a "tnc" commit existed there)
- [ ] Sentry error tracking (optional, Phase 3)
- [ ] Codemagic CI (optional — signed builds already work on this machine)

### 2026-09-15 — RevenueCat bug fixes + Paywall/Customer Center UI

Two real bugs found while debugging "can't buy Buddy+ in Settings":

1. **Entitlement id mismatch.** The code checked for `buddy_plus`; your
   actual RevenueCat dashboard entitlement is `sportbuddy_pro`. Fixed —
   `BUDDY_PLUS_ENTITLEMENT_ID` now reads `sportbuddy_pro`. This alone was
   enough to make a successful purchase never unlock anything in the app.
2. **Sandbox testing access.** You had it set to "Allowed App User IDs
   only" with nobody on the list — every test purchase silently fails to
   grant an entitlement in that state. **You still need to fix this in the
   dashboard**: either switch it to "Anybody", or add your Firebase uid
   (Firebase Console → Authentication → your account → "User UID") to the
   allowlist.

Also added, per your request: the official RevenueCat-hosted **Paywall**
(`@revenuecat/purchases-capacitor-ui`, `presentPaywall()` on the `/buddy-plus`
page) and **Customer Center** (`presentCustomerCenter()`, "Manage
subscription" once you're on Buddy+) — the modern, RevenueCat-recommended
way to sell and manage the entitlement, replacing the old hand-rolled
package list as the primary path (it's still there as an automatic fallback
on the web build, or if no Paywall is designed in the dashboard yet).
`android/gradlew assembleDebug` — **BUILD SUCCESSFUL** with both new
plugins. Full detail: `docs/monetization.md`.

### 2026-09-18 — RevenueCat dashboard setup checklist (what's still missing)

**Nothing left to code.** `presentPaywall()` and `presentCustomerCenter()`
are both fully implemented (`native-purchases-repository.ts` →
`purchases-service.ts` → `subscription-provider.tsx` → `paywall-page.tsx`).
What's left is dashboard configuration at app.revenuecat.com — a visual
setup, not something that can be written as code. Work through this in
order; each unchecked box is a real reason "buying Buddy+" won't work yet:

- [ ] **Test Store enabled** (Project settings → Test Store) — you said this
      looks done already; just confirm it's ON for this project.
- [ ] **Entitlement `sportbuddy_pro` exists** and is spelled exactly that —
      this must match `BUDDY_PLUS_ENTITLEMENT_ID` in
      `src/constants/entitlements.ts` character-for-character.
- [ ] **Three Test Store products created** — `monthly`, `yearly`,
      `lifetime` (any ids you like, the app doesn't hardcode them).
- [ ] **Each product attached to the `sportbuddy_pro` entitlement** —
      easy to forget this step per-product; a product with no entitlement
      attached will "purchase" successfully but grant nothing.
- [ ] **An Offering created, all three packages added to it, and that
      Offering marked "Current"** — `getOffering()` only ever reads the
      current offering. No current offering = the paywall shows "Buddy+
      purchases are available in the Sports Buddy Android app" with an
      empty package list, because there's nothing to sell yet.
- [ ] **Sandbox testing access** set to "Anybody", OR your Firebase uid
      (Firebase Console → Authentication → your account → "User UID") added
      to the allowlist if you kept "Allowed App User IDs only". This is the
      #1 cause of "the purchase sheet appeared and I picked a plan, but nothing
      unlocked" — left on the default empty allowlist, every test purchase
      silently fails to grant the entitlement.
- [ ] **Android app registered in the RevenueCat project**, and the API key
      you copied from it matches `VITE_REVENUECAT_ANDROID_API_KEY` in
      `.env` — confirmed present and looks correct (`test_gzvexnGG…`).
- [ ] Optional: **design a Paywall** (Tools → Paywalls, attach to the same
      Offering) for RevenueCat's nicer hosted screen — skip this for now,
      the built-in fallback list works fine for testing.

Full step-by-step, in order: `docs/monetization.md` §"RevenueCat Test Store
— manual dashboard setup".

**Tip:** if you connect the RevenueCat MCP integration in this environment
(`/mcp` in an interactive Claude Code session, then authorize RevenueCat), I
can read your actual dashboard config directly next time instead of you
having to describe it — faster to spot which of the boxes above is unchecked.

#### How to test a Buddy+ purchase — you do NOT need a real phone or Play Store

RevenueCat's **Test Store** exists specifically so this can be tested without
Google Play Console, without a signed release build, and without a physical
device:

1. `npm run build` (or just let step 2 do it via `cap sync`)
2. `npx cap sync android`
3. `npx cap open android` — opens the project in Android Studio
4. Run it on **any target**: an Android Virtual Device (Android Studio →
   Device Manager → create one if you don't have one) or a real phone over
   USB — a plain **debug** run configuration is fine, no release signing
   needed, since Test Store never talks to real Google Play Billing.
5. Sign in with your live Firebase test account → Settings → Buddy+ (or
   `/buddy-plus`) → **Get Buddy+**.
6. If the dashboard checklist above is complete, a Test Store purchase sheet
   appears (or the fallback package list, if no Paywall is designed) →
   pick a plan → it should unlock Buddy+ within a couple seconds, no app
   restart.
7. If nothing purchasable shows up at all → an Offering/product step above
   is missing. If it "purchases" but nothing unlocks → sandbox testing
   access.

This same emulator run is also how you'll eventually check group activities,
the recap share card and the paywall visually — none of those need a real
device either. **The one thing that DOES need a real phone: QR check-in**,
because it needs a working camera pointed at another screen — see the
reminder below.

### Blocked on you doing something outside the code

- [ ] **A real RevenueCat purchase.** Both bugs above are now fixed in
      code — work through the dashboard checklist above, then try again.
- [ ] **Design a Paywall in the RevenueCat dashboard** (Tools → Paywalls,
      optional) for a nicer purchase screen than the plain fallback list —
      not required, the fallback works either way.
- [ ] **Confirming everything on a real/emulated Android device** — group
      activities, the paywall, the recap share sheet. All of this has only
      been checked with automated tests so far (510+ unit tests, 205+
      Firestore rules tests, all passing), never a real screen tap. See "How
      to test a Buddy+ purchase" above — same emulator run covers all of it.
- [ ] **REMINDER: QR check-in — test later, using an actual phone.** You
      said you'll do this yourself once you have a phone in hand (needs a
      real camera pointed at a second screen/device showing the QR — an
      emulator's fake camera won't do a convincing test). Two accounts,
      create a group activity a few minutes in the future, wait for the
      start time to pass, organizer taps "Show check-in code", participant
      taps "Scan check-in code". Not blocking anything else — do it whenever
      you have the phone available.
- [ ] Native Google Sign-In inside the Android app (today's Google sign-in
      is the browser popup flow — works, but needs a Google Cloud OAuth
      client + your app's SHA-1 to go native)
- [ ] Push notifications (needs a Firebase Cloud Messaging or OneSignal
      account)
- [ ] A Vercel deployment, if you still want one (Firebase Hosting above
      already serves the same build)
- [ ] Android App Links, so a shared link opens the installed app instead of
      the website (needs `assetlinks.json` on hosting + an intent filter)

### Deferred until after the Shipaton ends (after October) — Phase 4/5

Nothing here needs to happen before the Shipaton deadline.

- [ ] Google Play Console developer account ($25)
- [ ] Create the subscription product in Google Play Console
- [ ] Real app icon + privacy policy from Player B
- [ ] Create the Play Store listing, upload the signed AAB
- [ ] Data Safety form + content rating questionnaire
- [ ] Enroll in Play App Signing
- [ ] Closed/Internal testing → Production
- [ ] One real purchase post-launch
- [ ] Hand Player B the live Play Store link + RevenueCat project link

### Optional retest (Phase 1, low priority)

- [ ] "Load earlier messages" with 25+ messages in one chat, on a live
      account — this was fixed and passed once; a lot of chat has been used
      since without issue, so this is a nice-to-confirm, not a concern.

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
**Remember to actually deploy after any `firestore.rules` change** — this
bit us once already: the rules for public group activities were written and
committed but not deployed for two sessions, so every "create activity"
attempt failed silently until the deploy caught up.

**Back up the release keystore** (`android/sports-buddy-release.keystore` +
`android/keystore.properties`) somewhere outside the repo. Losing it blocks
all future Play Store updates — this still hasn't been confirmed done.

**The lesson that shaped this whole project:** Firestore security rules are
not filters. A rule for a query must be provable from the query itself, and
this was the root cause of several early live bugs. Full writeup and the
bug table that came from it: `docs/chat.md` §12.

---

## History (condensed)

Full detail for anything below lives in its own doc — this is just a dated
index so you can find it again.

- **2026-09-13** — Live Firebase two-user verification; found and fixed 8
  live-only bugs (Google sign-in popup header, first-ever Connect, refresh
  resetting connection state, incoming requests hidden by filters, profile
  edits not syncing to discovery intents, messages/conversations rules not
  matching their queries, a StrictMode double-invoke bug). Signed release
  APK/AAB built. See the bug table this file used to carry, now in
  `docs/chat.md` §12, and `docs/connections.md` §9.
- **2026-09-14** — Merged `main` into `deploy` (blocks/reports, Capacitor 8,
  release signing restored, `@revenuecat/purchases-js` removed as the wrong
  SDK). Activity posts made real (own collection, real Discover data,
  joins, approval, edit, Unconnect). Invites-from-chat, public/link-only
  visibility, share links, and Firebase Hosting for the web demo — fixed a
  real leak where an unfiltered query could read link-only/private posts.
  See `docs/chat.md`, `docs/connections.md`, `docs/discover.md`.
- **2026-09-14 (same day, continued)** — RevenueCat + Buddy+ entitlement,
  public group activities as a new collection, QR check-in + verified
  attendance + Reliability Profile, monthly recap. See
  `docs/monetization.md`, `docs/group-activities.md`, `docs/attendance.md`.
  Also fixed the group-activity rules-not-deployed bug noted above.

---

## Phase checklists (from the PDF, for reference)

### Phase 2 — Monetization + RevenueCat

- [x] Decide what's actually paid (with Player B)
- [x] Create a RevenueCat account + project — **you still need to do this
      step yourself**, see "Blocked on you" above
- [ ] Create the subscription/product in Google Play Console — deferred
      with Phase 4 (Test Store product doesn't need this)
- [x] Install RevenueCat's Capacitor plugin, initialize the SDK
- [x] Build the purchase flow / paywall
- [ ] Complete one sandbox purchase — blocked on your dashboard setup
- [x] Add a Restore Purchases control
- [ ] Write a short Terms of Service page

### Phase 3 — Build pipeline, crash tracking, push

- [ ] Claim Codemagic perk, configure signed AAB build workflow (optional)
- [ ] Claim Sentry perk, wire basic error tracking
- [ ] Optional — OneSignal push notifications

### Phase 4 — Play Console submission (deferred until after October)

- [ ] Google Play Console developer account ($25)
- [ ] In-app account deletion (Play policy requirement)
- [ ] Google sign-in working in the Android app, or email/password only
- [ ] Create the app listing, upload the signed AAB
- [ ] Fill the Data Safety form
- [ ] Complete the content rating questionnaire
- [ ] Enroll in Play App Signing
- [ ] Release to Closed/Internal testing, confirm install
- [ ] Promote to Production
- [ ] Complete one real purchase post-launch

### Phase 5 — Buffer (deferred with Phase 4)

- [ ] Confirm the listing is publicly installable
- [ ] Hand Player B the live Play Store link + RevenueCat project link
