# Player A — Shipaton submission checklist

Owner: Lynn662312 (Player A). Last updated: 2026-09-22.

**Deadline: Wed 30 Sep 2026, 11:45 PM PDT (= Thu 1 Oct, 2:45 PM Malaysia time).**
Aim to submit on **29 Sep** so there is a day of buffer.

The old long version of this file (history, RevenueCat debugging notes, Play
Store plan) is in git history at commit `35358a8` if you ever need it.

---

## 1. Which track we are entering, and why

We are entering the **Next Gen Award (student track)**.

The normal track requires the app to be **publicly live on Google Play / App
Store / Galaxy Store by 30 Sep**, and testing tracks do not count. A new
personal Google Play account must first run a closed test with **12 testers
for 14 days in a row** — starting today (22 Sep) that ends 6 Oct, after the
deadline. So the normal track is not possible for us.

The Next Gen track needs **no store listing and no paid developer account**.
It needs:

- a demo video (under 2 minutes, public on YouTube or Vimeo, app running on a device)
- a **public, open-source GitHub repo with a LICENSE file**
- a student / academic email on Devpost

Next Gen is judged on: idea clarity and originality, real progress toward a
working app, **thoughtful RevenueCat integration**, technical choices and
presentation quality. We already have plenty of all four — we do not need to
build anything new.

Sources: [Official rules](https://revenuecat-shipaton-2026.devpost.com/rules) ·
[How to submit](https://www.revenuecat.com/blog/engineering/how-to-submit-your-app-for-shipaton) ·
[FAQ](https://www.shipaton.com/faq)

**Scope is locked. No new features.** Only the tasks below.

---

## 2. The only tasks left (in order)

### A. Get onto `main` — 5 min

This branch (`create-acc-feature`) only differs from `main` by this doc file.
The code is already in `main`, and `main` merges cleanly. `main` also already
fixed the two fake-data screens (Profile recap banner, Home recommendations).

```bash
git checkout main
git pull origin main
git merge create-acc-feature      # brings in this doc only
git push origin main
```

From now on, **test and record from `main`**.

- [ ] Branch merged, on `main`, pulled latest

### B. Run the Android app + one Buddy+ test purchase — 1–2 h

This is the proof of "RevenueCat integration" for the judges. Only the Android
app talks to RevenueCat — the web build never does (by design).

Before starting, in the **RevenueCat dashboard → Project settings → Sandbox
testing access**, set it to **"Anybody"** (otherwise the purchase "succeeds"
but never unlocks Buddy+).

Make sure `.env` has `VITE_DATA_SOURCE=firebase` and the RevenueCat key, then:

```bash
npm install
npm run build
npx cap sync android
npx cap open android        # opens Android Studio
```

In Android Studio: pick a device (a phone plugged in with USB debugging on,
or Device Manager → an emulator) → press the green ▶ Run. A normal debug run
is fine; no release signing needed.

In the app:

1. Sign in with **email + password** (Google sign-in does not work inside the
   Android app — known, not fixing it).
2. Settings → Buddy+ → **Get Buddy+** → pick a plan → Buddy+ should unlock
   within a few seconds.
3. Check the RevenueCat dashboard → Customers: your account should now appear.

- [done] App runs on phone/emulator
- [done-using teststore/entitlement id] Test Store purchase unlocks Buddy+
- [done] Customer visible in RevenueCat dashboard

If no plans show up → the offering is missing. If it buys but nothing unlocks →
sandbox access (above). First Gradle build is slow (5–15 min); keep the
emulator open between runs.

### B2. Make the Buddy+ paywall honest — 1 h (code, on `main`)

Checked on `main` (2026-09-22). The paywall (`paywall-page.tsx`,
`PLAN_FEATURES`) lists 7 Buddy+ benefits, but only some really change
anything after purchase. A judge who buys Buddy+ will look for each one.

| Paywall promise | Real after purchase? |
| --- | --- |
| Up to N sports on profile | ✅ Yes (`getMaxProfileSports`, edit profile) |
| Group activities unlimited (free: 3 joined / 2 hosted) | ✅ Yes (`group-activity-service.ts`) |
| Advanced buddy filters | ⚠️ Partly — Buddy+ unlocks the normal filter sheet (sport, skill, intent, area, availability). The 6 listed tools (date, popularity, venues, time of day, group size, budget) **do not exist**; they just turn from 🔒 to ✅ |
| Multiple active plans per buddy | ❌ No — still one plan per buddy (`{connectionId}__active`) |
| Activity reminders | ❌ No — no notifications exist at all |
| Reliability-based discovery | ❌ No — `canUseReliabilityFilter` is never used |
| Advanced recap trends | ❌ No — recap is the same for everyone (`canUseAdvancedAnalytics` never used) |

**Done 2026-09-23** (commit "Make Buddy+ honest"). What changed:

- `/buddy-plus` is now a **Free vs Buddy+ comparison table** — every row shows
  ✓ / 🔒 for both plans, and only real benefits are listed (sports on profile,
  group activities hosted/joined, advanced Discover filters). The four fake
  rows are gone.
- Both the paywall and Settings say **"Your plan: Free / Buddy+"**, and both
  offer **Manage or cancel subscription** and **Restore purchases**. If the
  Customer Center is unavailable (the Test Store has none), the app says where
  a real subscription is cancelled instead of showing an error.
- **Creating a group activity now checks the free host limit up front** — a
  member at the cap sees "You're hosting the maximum for a free plan" with a
  Buddy+ link, instead of filling in five steps and being refused at save.
- **Google sign-in is hidden inside the Android app** (the Firebase web popup
  cannot complete in a WebView) — email/password only there.
- Premium filter copy now names the filters that really unlock (sport, skill,
  intent, area, shared availability).

`tsc`, oxlint, 551 unit tests and `npm run build` all pass.

- [x] Paywall list trimmed to real benefits
- [x] Premium filter toolkit copy matches the real filters
- [x] Current plan visible, cancel + restore available
- [x] Host limit shown before the form, not after

### B3. Free → Buddy+ test on the phone (do right after B)

On a **free** account first, check each limit shows, then buy, then check it
lifts — no app restart:

- [done] Free: can't add more sports than the free limit → Buddy+: can
- [done] Free: 4th group activity join / 3rd host is refused with an upgrade prompt → Buddy+: allowed
- [done] Free: Discover filters locked → Buddy+: Discover → **More filters** →
      **Filters** opens the sheet and narrows the list (retest on the new build)
- [done] Settings → Buddy+ shows "Your plan: Buddy+" + **Manage or cancel
      subscription**. On the Test Store the Customer Center may not open; the
      honest fallback message is expected, not a bug
- [ ] Restore purchases (Settings or paywall). Note: Buddy+ is tied to your
      account uid, so after a reinstall you should already be Buddy+ without
      restoring

### B4. Mobile pass — done 2026-09-23 (branch `mobile-test`, not pushed)

- **Sideways scrolling fixed.** `html, body` now use `overflow-x: clip`, so no
  single wide element can drag the page — and with it the fixed bottom
  navigation — to the right. The real culprit on Discover was the three-way
  view toggle: its labels ("Sports buddies / Open activities / Group
  activities") do not wrap and were wider than a 390px phone. They are now
  **Buddies / 1-to-1 / Groups**, and the row wraps.
- **Post an activity now asks 1-to-1 or Group first**, so creating a group
  activity no longer means knowing to switch Discover's view.
- **Activities rebuilt as a Luma-style list**: one row per event, title first,
  date and time under it, month/day block on the left, sorted by time. Each of
  **Planned / Created / Past** has a **Group | 1-to-1** switch, so the six
  stacked sections are gone. A 1-to-1 post reads as "1-to-1 badminton".
- **Joined people link to their profile** on both card types.
- **Buddy+ billing options** now explain how monthly / yearly / lifetime
  differ (no hardcoded prices — those still come from RevenueCat).

"Sessions you confirmed" (the old heading) meant: a session where you and one
buddy agreed the sport, time, budget and venue in Plan Together and one of you
pressed Confirm — or a 1-to-1 post whose single spot got taken. It does NOT
mean anything was booked or paid. That heading is gone; those now appear in the
list with a **Confirmed** pill.

- [done] Rebuild and retest on the phone: no sideways scroll on Discover,
      Buddy+ and Activities; bottom bar stays put; the Group/1-to-1 switches
      show the right events

### B5. Clarity pass — done 2026-09-23 (branch `mobile-test`, not pushed)

- **Every row of the Buddy+ comparison table now explains itself.** A bare
  "2" never said what was being counted or when the slot frees up again.
- **A 1-to-1 activity is named after the sport and the person** — "Badminton
  with Aina" — the same way a confirmed session is named. Until somebody has
  the spot there is no name to use, so it shows the sport alone.
- **Profile's Edit and Preview buttons now carry their words**, not just an
  icon.
- `tsc`, oxlint, 551 tests and the build pass.

Also picked up in this commit (you had added them): the root `LICENSE` (MIT)
and `SHIPATON-SUBMISSION-CHECKLIST.md`.

- [ ] Retest on the phone after `npm run build && npx cap sync android`

### B7. QR + layout + repo pass — done 2026-09-24 (branch `mobile-test`)

- **Scanning should work now.** The decoder was handed the whole
  multi-megapixel photo in one go, which mostly fails. It now retries the same
  photo at several sizes plus a centre crop, attempts inverted codes, takes the
  photo at full quality, and the organiser's QR is bigger, pixel-crisp and uses
  the highest error correction.
- **Check-in window**: open from the start time until **30 minutes after the
  end** (or after an assumed 2 hours when no end time was given). Before this
  there was no upper bound, so yesterday's session could still be "verified"
  from home. Enforced in the pure rule, the UI and `firestore.rules`.
- **🔴 `firestore.rules` changed — it must be deployed** before the live app
  enforces the new window: `firebase deploy --only firestore:rules`
- Discover's **refresh button can no longer be pushed off-screen** by the
  title; **Manage or cancel Buddy+** fits its words on a phone.
- Repo: `.claude/settings.local.json` and `/tmp` are gitignored,
  `tmp/pdfs/shipaton-audit/` untracked and deleted, and the **README now leads
  with the MIT licence badge, the demo link and the downloadable icon assets**
  (`resources/icon-only.png` is the 1024×1024 one).
- 555 unit tests, **216** emulator rules tests (3 new for the window), build OK.

### B8. What "restore purchases" means

Buddy+ is tied to your **account** (RevenueCat is configured with your Firebase
uid as its App User ID), so signing in on a new device should already return
your Buddy+ without touching anything. **Restore** is the store-side fallback:
it asks the store "what has this Google account bought?" and re-applies the
entitlement. It matters for someone who paid, reinstalled, and did not get
their subscription back.

To test it: buy Buddy+ → uninstall the app → reinstall → sign in. You should
already be Buddy+. If not, Settings → **Restore purchases**. On the RevenueCat
**Test Store** this can be a no-op, which is expected and not a bug. It is
**not required** for the Shipaton submission.

### B9. QR check-in on 1-to-1 activities — done 2026-09-24

Check-in is no longer group-only.

- A 1-to-1 post has its own code at `activityPosts/{postId}/checkIn/current`,
  readable only by the post's author. The author sees **Show check-in code**;
  whoever took the spot sees **Scan check-in code**.
- Both kinds now share ONE rule through `CheckInSubject`, so the window and the
  involvement check cannot drift apart. A 1-to-1 has no end time, so its window
  is the assumed 2 hours plus the 30-minute grace.
- A 1-to-1 only opens for check-in once somebody actually took the spot.
- The Reliability Profile now counts 1-to-1 sessions too.
- 8 new emulator rules tests (**224** total), 555 unit tests, build OK.
- Full detail: `docs/attendance.md`.

**🔴 Deploy the rules before testing this on the phone:**
`firebase deploy --only firestore:rules`

### B6. Still NOT done in the app — the honest list

**Nothing here blocks the submission.** Judged on "meaningful progress toward a
working app", the app is well past that bar. This is the gap list so nobody
claims something that is not there.

| Missing | Why it is acceptable now |
| --- | --- |
| Push notifications (the notification toggles save a preference but nothing is ever delivered) | No FCM/OneSignal account; out of scope |
| In-app account deletion | A Play Store requirement, not a Shipaton one |
| Native Google sign-in in the Android app | Hidden there; email/password works |
| Reliability as a Discover filter | Needs a decision on putting a score in `publicProfiles` |
| Advanced recap trends / analytics | Claim removed from the paywall, so nothing is oversold |
| Sentry, Codemagic CI, Vercel, Android App Links | All optional extras |

Still to *verify* by hand:

- [ ] QR check-in with a real camera — see §3b
- [ ] Restore purchases after a reinstall (optional, see B8)

### C. Make the repo public + add a license — 15 min

The repo is `github.com/HiIamGaryee/sports-buddy`, so **Gary (the repo
owner) must do the visibility step**.

Already checked: no `.env`, keystore or other secret has ever been committed,
so making it public is safe.

- [x] `LICENSE` (MIT) at the repo root, and the README leads with the licence
      badge plus the downloadable icon assets
- [ ] Repo owner: GitHub → Settings → General → Danger Zone → **Change visibility → Public**
- [ ] README top section says what the app is and how to run it (short is fine)

### D. Record the demo video — 2–3 h

Rules: **under 2 minutes**, shows the app **working on a device**, public
YouTube/Vimeo link, no copyrighted music.

Suggested script (~1:50), recorded on the Android phone/emulator:

| Time | Show |
| --- | --- |
| 0:00–0:10 | Problem: hard to find a sports partner at your level, time and budget |
| 0:10–0:35 | Discover → compatibility score + reasons → Connect |
| 0:35–0:55 | Chat → Plan Together (sport, time, budget, venue) → Confirm → add to calendar |
| 0:55–1:15 | Group activities: create / join, share link |
| 1:15–1:40 | **Buddy+ paywall → Test Store purchase → limits removed** (RevenueCat — the key part) |
| 1:40–1:50 | Recap on Profile + closing line |

- [ ] Video recorded, under 2:00
- [ ] Uploaded to YouTube as **Public** (or Unlisted only if the form accepts it — Public is safest)

### E. Assets — 30 min

- [x] App icon 1024×1024 — `resources/icon-only.png`, linked from the README
      so anyone can download it
- [ ] At least one screenshot **1179×2556, no device frame** — take phone
      screenshots, then resize/pad to exactly 1179×2556

### F. Fill in Devpost — 1 h

At <https://revenuecat-shipaton-2026.devpost.com/>:

- [ ] Register with a **student/academic email**; add teammates to the project
- [ ] Choose the **Next Gen Award**
- [ ] Project name + tagline + description (main features, how Buddy+ works)
- [ ] RevenueCat project ID: **`projdfef7781`**
- [ ] GitHub repo link (public) + YouTube link
- [ ] Icon + screenshot uploaded
- [ ] Optional: web demo link <https://sportbuddy-4d596.web.app>
- [ ] **Submit** (you can still edit until the deadline)

---

## 3. Deliberately NOT doing (out of scope — do not start these)

Say "not in this submission" if anyone asks.

- Google Play / any store listing (not required for Next Gen)
- Native Google sign-in on Android (email/password works)
- In-app account deletion (a Play Store requirement, not a Shipaton one)
- Push notifications, Sentry, Codemagic, Vercel, Android App Links
- Building the missing Buddy+ features (date/popularity/venue filters,
  multiple plans, reminders, reliability filter, advanced recap) — we remove
  the claims instead (task B2)
- Designing a RevenueCat hosted paywall (the built-in fallback list works)

---

## 3b. How to test QR check-in (verified attendance)

You do **not** need two phones. The QR is generated offline in the page, so
the organiser's code can be shown on a **laptop browser** while the phone app
scans it.

What the rules require, so the test has to respect it:

- the activity must have **already started** (`startAt` in the past),
- the scanner must be **joined** to it (or be the organiser),
- the code scanned must be the **current** one (it can be regenerated), and
- each person can check in **once** — the record is immutable.

The controls live on the **group activity detail page** (open the activity
from Discover or Activities, not from the list row's own buttons).

**Setup (about 15 min):**

1. Two accounts: A (organiser) and B (the one checking in). Sign in as A in a
   **laptop browser** (the web demo or `npm run dev`), and as B in the
   **Android app** on your phone.
2. As A, create a group activity starting in about 2 minutes, at any venue.
3. As B, open it (Discover → Groups, or the share link) and **Join**.
4. Wait for the start time to pass. Refresh both.
5. As A, open the activity → **Show check-in code**. A QR appears on the
   laptop screen.
6. As B on the phone, open the same activity → **Scan check-in code** → allow
   the camera → take ONE photo of the laptop screen, framing the QR.
7. B should now read as checked in. Open B's **Profile** → the reliability
   card shows "1 Verified Session" and a show-up rate.

**Things worth showing in the demo video:** tap **Regenerate code** as A, then
try scanning the OLD photo as B — it is refused, because the code rotates. That
is the anti-screenshot protection, and it demonstrates the feature is real.

**If the scan fails:** the photo needs the whole QR in frame and reasonably
sharp; screen glare is the usual cause. Raise the laptop's brightness, or open
the QR full-screen. "We couldn't read a code in that photo" means decoding
failed, not that check-in was rejected.

**Emulator note:** an emulator's fake camera shows a synthetic scene, so it
cannot photograph a real QR. Use a physical phone for the scanning side.

---

## 4. What is already done (for the Devpost description)

- Live Firebase backend (Auth + Firestore, security rules tested) — checked with real users
- Discover + rule-based compatibility score, Connect, realtime chat, Block/Report
- Plan Together → confirmed activity → calendar (.ics) file
- 1-to-1 activity posts and public group activities with share links
- QR check-in → Reliability profile; monthly recap
- **RevenueCat Buddy+**: Capacitor SDK, entitlement `sportbuddy_pro`,
  3 packages (monthly / yearly / lifetime) in the `default` offering,
  RevenueCat-hosted Paywall + Customer Center, Restore Purchases, free-plan
  limits (3 joined / 2 hosted group activities) removed by Buddy+
- Android app builds (debug + signed release APK/AAB)
- Web demo: <https://sportbuddy-4d596.web.app>
- 500+ unit tests, 200+ Firestore rules tests

---

## Reference

- **Back up the release keystore** (`android/sports-buddy-release.keystore` +
  `android/keystore.properties`) outside the repo — needed for any future
  Play Store release.
- After any `firestore.rules` change: `firebase deploy --only firestore:rules`.
- Play Store publishing (after the Shipaton): needs 12 testers × 14 days closed
  test first on a new personal account — start it early when the time comes.
