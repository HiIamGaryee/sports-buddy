# Sports Buddy — Project Overview

A single reference for what Sports Buddy is, what actually works today, what
doesn't yet, and how it plans to make money. Written from the actual product
direction given during development, not a generic template — where a
decision was made, this says which one and why.

Last updated: 2026-09-14. Live app: https://sportbuddy-4d596.web.app
(Android build compiles and installs; not yet on Google Play).

---

## 1. What Sports Buddy is

Sports Buddy connects three things: **compatibility → coordination →
real-world participation → verified reliability.**

It solves two related but distinct problems:

1. **"I want to find the right person to play with."** — A 1-to-1 flow:
   discover a compatible sports partner, connect, chat, plan a session
   together (sport, time, budget, venue), confirm it, add it to a calendar.
2. **"I want to play this sport at this time and need people to join."** —
   A public flow: post an activity, other members find it and join,
   everyone shows up, attendance is verified with a QR code.

The mobile Android app (built with Capacitor) is the primary product. The
web build at the URL above exists so teammates, mentors and judges can try
the product without installing an APK — not as a separate product.

## 2. The two core loops

### Loop A — Finding a person (1-to-1)

```
Discover buddies → view profile → Connect → they connect back
  → chat → plan a session (sport/time/budget/venue) → confirm
  → add to calendar → it shows up in your history
```

This is **private** end to end. Nobody but the two people involved ever
sees the plan or the confirmed session. Compatibility between two people is
computed from their profiles (shared sports, skill level, availability,
area, budget) — a deterministic score, never AI-guessed, never stored (it
depends on who's asking, so it's recalculated every time, not saved to the
database).

### Loop B — Finding an activity (public, group)

```
Anyone creates a public group activity (sport, time, venue, price, max players)
  → it appears on Discover for everyone
  → people join directly (no approval step, no connection needed first)
  → organizer shows a QR code at the venue
  → each attendee scans it once to check in
  → verified attendance builds each person's Reliability Profile
```

This is intentionally simpler than Loop A: no chat, no approval workflow,
open to anyone with a normal account (there is no separate "organizer"
account type). The two loops share almost nothing in the database on
purpose — a 1-to-1 activity post and a public group activity are different
collections with different rules, so making group activities more open
never had to loosen anything about the private 1-to-1 flow.

### The growth loop (how this is meant to spread)

```
Someone creates or joins an activity → they share the link
  (in-app to a connected buddy, or the phone's share sheet to anyone)
  → an outsider taps it → sees "you've been invited to play"
  → signs up → finishes onboarding → lands straight on that activity
  → joins → later creates or shares their own
```

Every activity — 1-to-1 and group — has its own share link that works for
someone who doesn't have the app yet. This was built deliberately as the
primary acquisition mechanic instead of paid ads or a referral-code system.

## 3. What's actually built (verified, not just written)

Everything below has passing automated tests (unit tests + Firestore
security rules tests run against a real emulator) and, for anything backend,
has been deployed to the live Firebase project.

**Accounts & profile** — Email and Google sign-in, an 8-step onboarding
profile (sports, skill level, what you're looking for, availability, area,
budget, bio), editable afterward, with a visible "profile strength" meter.

**Discovery & matching** — A ranked feed of other members, scored by a
transparent formula (shared sports 35%, skill closeness 20%, availability
overlap 20%, same-area location 15%, budget overlap 10%) with filters for
sport/skill/area. Nothing here is a "distance" — the app never asks for or
stores anyone's precise location, only a general area.

**Connections** — Send/accept a connect request, a live "you found a sports
buddy" moment when it becomes mutual, and the ability to end a connection
later (with a confirmation, so it can't happen by accident).

**Chat** — Real-time 1-to-1 messaging once connected, unread indicators,
full message history (kept free — see §5), block and report.

**Plan Together → Confirmed Activity → Calendar** — A structured
back-and-forth to agree on sport/time/budget/venue, a one-tap confirmation
once everyone's agreed, and a downloadable calendar file for the confirmed
session. Upcoming and past activities are both tracked (a session moving
into "past" only ever means its time has gone — the app never claims anyone
actually attended just because the clock passed).

**Public group activities** — Create, edit, discover, join/leave, an
organizer can remove a no-show, and every activity has a shareable link.
Free accounts can have 3 joined and 2 hosted at once; Buddy+ removes both
caps (see monetization below).

**QR check-in + Reliability Profile** — The organizer shows a QR at the
venue; each attendee scans it once with their phone camera to be verified
as attended. A rotating secret code (not just the activity's own id) means
a screenshot can't be reused, and the organizer can invalidate a leaked code
instantly. Each member's own profile shows plain, evidence-based numbers —
"11 Verified Sessions", "92% Show-up Rate" — never a personality claim like
"reliable" or "flaky".

**Monetization plumbing (Buddy+)** — A single premium tier wired end to end
through RevenueCat's official Capacitor SDK: paywall screen, entitlement
state, and the free-plan limits above actually enforced in the app. See §5
for exactly what still needs a person (not code) to finish.

**Safety** — Block and report work throughout chat, connections and
activities; blocking is invisible to the blocked person and doesn't touch
message history.

**Platform** — One React codebase runs as the Android app (via Capacitor)
and as a responsive website; dark/light theme; works from a phone screen up
to a desktop window.

## 4. What is NOT built yet

Said plainly, so nothing here is assumed to exist by accident:

- **A completed RevenueCat purchase has never actually happened.** The code
  is finished and tested, but nobody has done the one-time setup (create
  the RevenueCat project, turn on its Test Store, create the product) — see
  §5. Until that happens, tapping "buy" on the paywall can't succeed.
- **Monthly recap** ("Jia Ying's September: Climbing ×7, Badminton ×3 — 12
  verified sessions, 92% show-up rate") and sharing it externally. Not
  started.
- **A Discover filter for "prioritize reliable people."** The Reliability
  Profile exists and is real, but using it to *rank or filter* other
  members would mean publishing that score on their public profile — a
  privacy decision that was deliberately flagged rather than made silently.
- **Account deletion.** There is no way to delete a Sports Buddy account
  yet (this is a Google Play policy requirement before public release).
- **Push notifications.** Nothing pings a phone when someone connects,
  messages, or an activity is about to start.
- **A native Android calendar/QR-scanning experience beyond what's here** —
  calendar export is a downloadable file (works everywhere, needs no
  permission), not a direct "Add to Google Calendar" button; QR check-in is
  one photo, not a live continuous scanner.
- **Native Google Sign-In inside the Android app.** Google sign-in today
  uses the browser popup flow, which is unreliable inside the installed
  app's WebView; email/password already works natively.
- **A published Google Play Store listing.** The app builds and installs as
  an APK; it has not been submitted to Play Console, priced, or reviewed.
- **A dedicated Vercel deployment.** Firebase Hosting already serves the
  same build at the URL above; a second host on Vercel would be additional
  redundancy, not a missing capability.
- **Any of the explicitly out-of-scope ideas below** (§6) — none of these
  have any code.

## 5. Monetization — how Sports Buddy makes money

**One paid tier: Buddy+.** No multiple subscription levels, no à la carte
purchases, no ads.

| | Free | Buddy+ |
| --- | --- | --- |
| Browse buddies, match, chat, plan 1-to-1 activities | ✅ unlimited | ✅ unlimited |
| Join public group activities | up to **3 at once** | unlimited |
| Host public group activities | up to **2 at once** | unlimited |
| Basic history, verified stats, monthly recap | ✅ | ✅ |
| Advanced discover filters | — | ✅ (planned filters, not yet built) |
| Reliability-based discovery ranking | — | ✅ (planned, not yet built — see §4) |
| Advanced analytics (trends, comparisons) | — | ✅ (planned, not yet built) |

The free tier is intentionally generous — Sports Buddy needs a large pool of
people and activities to be useful at all, so nothing that drives that
supply (browsing, connecting, chatting, basic activity participation) is
paywalled. The limits that exist are on *how much of the paid infrastructure
you use at once* (simultaneous group activities), not on the core value.

**Why RevenueCat, and why entitlement lives there, not in the database:**
the app never writes a `premium: true` flag anywhere — a member's Buddy+
status is always read live from RevenueCat. That's what makes it trustworthy
(a modified client can't just flip a database field to unlock Buddy+) and
what makes swapping from a test setup to real Google Play billing later a
configuration change, not a rewrite.

**What still needs a person, not more code**, before any of this can be
demonstrated with a real purchase:

1. Create (or open) the RevenueCat project for Sports Buddy.
2. Turn on **Test Store** — this needs no Google Play Console or Apple
   Developer account, and no waiting for store review.
3. Create the `buddy_plus` entitlement and attach a test product to it.
4. Put the resulting API key into the app's configuration and rebuild.

Full step-by-step: `docs/monetization.md`.

## 6. Business model — beyond the subscription

The subscription above is the only thing with actual code today. These are
documented as **future ideas only**, deliberately not built now, so the
scope stays honest and the free product stays the priority:

- **Sponsored or featured venue listings** — a venue pays to appear higher
  when Sports Buddy suggests places to play.
- **Venue booking commissions** — if the app ever integrates real booking
  (it currently only ever *suggests* a venue name, never books one), a cut
  of each booking.
- **Sports club / university club subscriptions** — a paid tier for a club
  or student society to run their own activities and see attendance across
  their members.
- **Contextual sports advertising** — ads relevant to a person's actual
  sports (a badminton racket brand to badminton players), never third-party
  tracking or a data-selling model.

None of these change what's free vs. Buddy+ today; they're separate,
additional revenue lines for later, once there's a real user base to make
them worth building.

## 7. Tech stack, in one paragraph

React 19 + TypeScript, wrapped as an Android app with Capacitor (the same
codebase runs as a normal website, no separate mobile app to maintain).
Firebase (Authentication + Firestore) is the entire backend — no custom
server. RevenueCat handles subscriptions. Every security-sensitive rule
(who can read what, who can write what) is enforced twice: once in the app
for a good error message, and independently in Firestore's own security
rules, so a modified client can't bypass it by skipping the app entirely.

## 8. Honest state of testing

Everything backend (Firestore rules, the app's own logic) has automated
tests that run on every change — 502 unit tests and 205 security-rules
tests, all passing as of this document. The Android app has been confirmed
to **compile and install** with every feature described above. What has
**not** been done: clicking through the paywall, QR check-in and group
activities on a real phone with a real camera and a real purchase — those
still need a person to sit down with the device once the RevenueCat setup
in §5 is complete.

## 9. Suggested next steps, in order

1. Do the RevenueCat dashboard setup (§5) and confirm one real Test Store
   purchase end to end on a device.
2. Click through group activities + QR check-in on a real Android phone.
3. Monthly recap + sharing it (§4).
4. Account deletion (required before any Play Store submission).
5. Google Play Console submission.

---

*Everything in this document reflects what was actually decided and built
during development — where something is a plan rather than a fact, it's
labeled "not built yet" above, not implied to exist.*
