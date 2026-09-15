# Player A — Platform & Monetization progress

Tracks the checklist in `Sports-Buddy-Shipaton-Task-Split.pdf` (Player A:
Firebase → Android build → RevenueCat + Billing → Play Console), plus
everything else built alongside it. For the product/business picture (what
Sports Buddy is, monetization, business model), see `docs/project-overview.md`
— this file is your own personal task tracker.

Owner: Lynn662312 (Player A). Last updated: 2026-09-14.

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

- [x] Organizer shows a QR at the venue; each player scans it once (one
      photo, via the camera you already had installed — no new native plugin)
- [x] Rotating secret code, regenerable any time a screenshot leaks
- [x] Reliability card on Profile: "N Verified Sessions", "M% Show-up Rate"

### Monthly recap (new feature)

- [x] "Your September: Badminton ×3, Climbing ×2 — N verified sessions, M%
      show-up rate", computed live, free for everyone
- [x] Shareable as an actual branded image card (Sports Buddy name on it),
      not just a text link
- [x] Month-by-month navigation from your Profile page

### RevenueCat + Buddy+ (code side)

- [x] `@revenuecat/purchases-capacitor` integrated (native Android only —
      the web build never fakes a purchase)
- [x] Buddy+ entitlement read live from RevenueCat, never a database flag
- [x] Paywall screen (`/buddy-plus`), linked from Settings
- [x] Free/Buddy+ limits actually enforced in the app

### Web hosting + sharing

- [x] Web demo live at https://sportbuddy-4d596.web.app (Firebase Hosting)
- [x] Every activity (1-to-1 and group) has a share link that works for
      someone without the app — signs up, finishes onboarding, lands on it

---

## 🕒 Not done yet — checklist

### Can be picked up any time, no blocker (code only)

- [ ] In-app account deletion (a real Play Store requirement later, but
      buildable now with no external dependency)
- [ ] Advanced Discover filters (Buddy+)
- [ ] Advanced recap/analytics — trends, month comparisons (Buddy+)
- [ ] A Discover filter that prioritizes reliable buddies — **needs one
      decision from you first**: should a member's reliability score become
      part of their public profile? Flagged rather than built silently.
- [ ] Terms of Service page — check with Player B first; `main` may already
      have one (a `PolicyDialog` + a "tnc" commit existed there)
- [ ] Sentry error tracking (optional, Phase 3)
- [ ] Codemagic CI (optional — signed builds already work on this machine)

### Blocked on you doing something outside the code

- [ ] **A real RevenueCat purchase.** Needs the one-time dashboard setup:
      create/open the RevenueCat project → enable Test Store → create the
      `buddy_plus` entitlement + a product → put the API key in `.env` as
      `VITE_REVENUECAT_ANDROID_API_KEY` → rebuild. Full steps:
      `docs/monetization.md`.
- [ ] **Confirming everything on a real/emulated Android device** — group
      activities, QR check-in with an actual camera, the paywall, the recap
      share sheet. All of this has only been checked with automated tests so
      far (510 unit tests, 205 Firestore rules tests, all passing), never a
      real screen tap.
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
