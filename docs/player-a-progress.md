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
| 2 — Monetization + RevenueCat | **Code done. Dashboard done (verified 2026-09-19).** The only thing left is running the Android app once and completing a Test Store purchase. |
| 3 — Build pipeline, crash tracking, push | Not started. Optional, not blocked, not urgent. |
| 4 — Play Console submission | **Deferred on purpose — after October.** Not part of the Shipaton deadline. |
| 5 — Buffer | Deferred with Phase 4. |

### How much is left, and will it fit before the deadline?

**You are at the end of Phase 2 — roughly 90% of Player A's scope is done.**
Everything that had to be *built* is built; what remains is verification plus
a short cleanup list.

Assuming the Shipaton deadline is end of September, you have ~11 days, and
the remaining work is **about 1.5–2 days of focused effort.** It fits
comfortably, with real buffer. In priority order:

| Work | Estimate | Why now |
| --- | --- | --- |
| Run the Android app + complete one Test Store purchase | 1–2 h (mostly first-build wait) | **Do this first.** It's the last unproven claim in the whole submission. |
| Swap the Profile recap banner onto the real Firestore data | 1 h | Fake data on a demo screen is the worst thing a judge can spot. |
| Fix or remove Home's "Recommended for you" fake cards | 1 h | Same reason. |
| Publish a RevenueCat paywall (optional) | 30 m | Nicer screenshots; the fallback already works. |
| Device pass: group activities, paywall, recap share card | 2–3 h | Nothing has ever been tapped by a human. |
| QR check-in on a real phone | 1 h | Needs two accounts + a real camera. |
| Native Google sign-in | 2–4 h | **Skippable** — email/password works natively today. |
| In-app account deletion | 3–5 h | Play Store requirement, **not** a Shipaton one — safe to defer. |

**Verdict: yes, you'll settle before the deadline**, as long as the Android
run happens in the next day or two rather than in the final week. The two
genuinely optional items (native Google sign-in, account deletion) are both
Play-Store concerns and both belong in the post-October window with Phase 4.

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

### 2026-09-19 — RevenueCat dashboard VERIFIED (read directly via the API)

Your dashboard was inspected directly through the RevenueCat MCP connector,
not guessed at. **Your product/offering setup is correct. You did it right.**

| Thing | State |
| --- | --- |
| Project | `SportBuddy` (`projdfef7781`) ✅ |
| App | "Test Store" (`app8334581361`, type `test_store`) ✅ |
| Entitlement | `sportbuddy_pro` — **active**, matches the code exactly ✅ |
| Products | `monthly` (P1M), `yearly` (P1Y), `lifetime` (non-consumable) — all 3 **attached to `sportbuddy_pro`** ✅ |
| Offering | `default` — **`is_current: true`** ✅ |
| Packages | `$rc_monthly`, `$rc_annual`, `$rc_lifetime`, each with its product ✅ |
| Prices | USD 9.99 / 79.99 / 99.99 set ✅ (no MYR prices — fine, USD is used as the fallback) |
| API key | `test_gzvexnGG…` matches `.env` exactly ✅ |

**So the dashboard is NOT the problem.** Two leftovers worth knowing about,
neither of them breaking:

- A second, **inactive** entitlement `buddy_plus` ("plus") exists with zero
  products — left over from the id mix-up. Harmless; archive it when you're
  tidying up so nobody re-introduces the old name.
- A paywall named "Untitled Paywall" exists but is **unpublished and
  attached to no offering** (`offering_id: null`, `published_at: null`).
  That's why `presentPaywall()` returns `not-presented` and the app shows
  its own fallback package list instead.

#### 🔴 THE ACTUAL BLOCKER — the app has never once contacted RevenueCat

`list-customers` on the project returns **an empty list. Zero customers.**
If `Purchases.configure()` had run even a single time — on any device, for
any account, purchase or no purchase — a customer record would exist.

That means you have only ever opened the **web** build (the Firebase Hosting
demo, or `npm run dev`). `repositories.ts` picks the purchases repository by
PLATFORM, and in a browser it always returns `webPurchasesRepository`, which
deliberately never talks to RevenueCat and never fakes a purchase. So the
Buddy+ button on the web can't do anything — **by design, not by bug.**

**You are not blocked on anything you have to fix. You just have to run the
actual Android app.** See the emulator instructions below. Once you do, a
customer with your Firebase uid will appear in the RevenueCat dashboard —
that alone is proof the SDK connected, before you even try buying.

(Sandbox testing access is still worth setting to "Anybody" before you test,
since it can't be read through the API and would silently block the grant.)

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

#### Android Studio — yes, it's the right tool, and why it's so slow

Android Studio (Panda, or whichever version you have) gives you a real
Android device on your PC — the full app, real touch, real camera
permissions, real RevenueCat purchases. It is exactly what you want for
"mobile view test and function", and it is far more accurate than resizing
a desktop browser window.

**The slowness is normal, and it's mostly one-time.** What's slow:

- The **first** Gradle build downloads the whole Android toolchain and can
  take 5–15 minutes. Later builds are 30–90 seconds.
- **Cold-booting an emulator** takes 1–3 minutes.
- The whole loop (`npm run build` → `cap sync` → Gradle → install) is
  ~2–4 minutes per change even when warm.

How to make it much less painful:

- **Leave the emulator running.** Never close it between tests — reinstalling
  into a live emulator is quick; cold-booting one is not.
- **Use a real phone over USB instead.** Enable Developer options → USB
  debugging, plug it in, pick it as the run target. It's usually *faster*
  than the emulator, and it's the only way to test QR check-in anyway.
- **Don't rebuild the native app for UI-only changes.** For layout/styling
  work, `npm run dev` in a browser with the phone-size device toolbar
  (F12 → device toolbar → 390px) is seconds, not minutes. Only rebuild in
  Android Studio when you need something native: purchases, camera,
  permissions, real Google sign-in.
- Give the AVD more RAM and make sure hardware acceleration (WHPX/Hyper-V)
  is on — a software-rendered emulator is painfully slow.

Rule of thumb: **browser for looks, Android Studio for native behaviour.**

#### 🔴 Google sign-in inside the Android app is BROKEN (known, expected)

The error you hit —

> Unable to process request due to missing initial state… sessionStorage is
> inaccessible… signInWithRedirect in a storage-partitioned browser
> environment

— is not a bug in your code and not something a config tweak fixes. It is
the documented consequence of using Firebase's **web** Google sign-in
(`signInWithPopup`, `firebase-auth-repository.ts:47`) inside a Capacitor
WebView. The WebView partitions storage, so Firebase can't hand the session
back to the page after Google redirects. This exact caveat was written down
in `CLAUDE.md` §13 before it ever happened.

**The fix is a native Google auth plugin**, and only the repository layer
changes (`firebase-auth-repository.signInWithGoogle`) — nothing above it
moves. It needs:

1. A plugin — `@capacitor-firebase/authentication` (recommended, it plugs
   straight into the Firebase Auth you already use) or
   `@codetrix-studio/capacitor-google-auth`.
2. A **Google Cloud OAuth client of type Android**, created with your app's
   package name (`com.sportsbuddy.app`) and the **SHA-1** of your signing
   keystore (`keytool -list -v -keystore android/sports-buddy-release.keystore`
   — and the debug keystore's SHA-1 too, if you want it working in debug
   builds).
3. That SHA-1 registered on the Firebase Android app.

Estimated 2–4 hours including the Google Cloud console fiddling.

**Until then: use email/password in the Android app.** It is fully portable,
already works natively, and is enough for every Shipaton demo — Google
sign-in still works fine on the web build. Do not let this block your
RevenueCat testing; just register a test account with an email and password.

### Hardcoded / fake data still shipping to real users (2026-09-19 audit)

Two real screens still render static JSON instead of the member's own data.
Both violate the project's own rule ("never render static or JSON demo
people or activities in a signed-in screen") and both would be embarrassing
in a demo, because the data is visibly not yours:

1. **Home → "Recommended for you"**
   (`features/home/components/recommendation-swiper.tsx` →
   `src/data/recommendations.json`) — three invented venue cards with
   invented locations, auto-rotating every 5 seconds. Shown to every signed-in
   member on the Home page. Either wire it to real group activities /
   activity posts, or remove the section.
2. **Profile → Monthly recap banner**
   (`features/recap/components/monthly-recap-banner.tsx` →
   `use-monthly-recap-demo.ts` → `monthly-recap-service.ts` →
   `src/data/last-month-exercise.json`) — the recap on your Profile page is
   computed from a **static fixture**, not your actual sessions. The REAL
   Firestore-backed implementation already exists at
   `features/recap/use-monthly-recap.ts` and is simply not the one the banner
   imports. **This is a one-line-ish swap** and the single highest-value
   cleanup on this list.

Everything else that looked like a hardcode is legitimate and should be left
alone: `general.json` (UI copy), `faq-list.json` (FAQ content),
`sport-list.json` (the sports dataset), and the three hex fallbacks in
`venue-map.tsx` (the Google Maps API needs colour strings and cannot accept a
CSS class — it reads the live theme tokens first and only falls back).

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
