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
- [ ] Free: Discover filters locked → Buddy+: Discover → **More filters** →
      **Filters** opens the sheet and narrows the list (retest on the new build)
- [ ] Settings → Buddy+ shows "Your plan: Buddy+" + **Manage or cancel
      subscription**. On the Test Store the Customer Center may not open; the
      honest fallback message is expected, not a bug
- [ ] Restore purchases (Settings or paywall). Note: Buddy+ is tied to your
      account uid, so after a reinstall you should already be Buddy+ without
      restoring

### C. Make the repo public + add a license — 15 min

The repo is `github.com/HiIamGaryee/sports-buddy`, so **Gary (the repo
owner) must do the visibility step**.

Already checked: no `.env`, keystore or other secret has ever been committed,
so making it public is safe.

- [ ] Add a `LICENSE` file at the repo root (MIT is the simple choice) and push to `main`
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

- [ ] App icon 1024×1024 — **already exists**: `resources/icon-only.png`
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

**QR check-in:** only test it if you have two phones and spare time. If not,
leave it out of the video.

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
