# Sports Buddy

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android-119EFF?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![RevenueCat](https://img.shields.io/badge/RevenueCat-Buddy%2B-F25A5A)](https://www.revenuecat.com/)

**Find your people. Go play.**

Sports Buddy is a mobile-first app for finding compatible sports partners and
turning introductions into real sessions. Members can discover people by sport,
skill, availability, area, and budget; connect and chat; agree on a plan; join
public activities; and verify attendance with an on-site QR check-in.

Built for the **RevenueCat Shipaton 2026 — Next Gen Award**. The Android app is
the primary product, while the responsive web build lets reviewers try the core
experience without installing an APK.

- Demo video: _coming soon_ <!-- TODO (manual): replace with the public YouTube/Vimeo link -->
- Live web demo: <https://sportbuddy-4d596.web.app>
- Android APK: [download `app-debug.apk`](https://github.com/HiIamGaryee/sports-buddy/releases/latest/download/app-debug.apk)
  (latest [GitHub Release](https://github.com/HiIamGaryee/sports-buddy/releases/latest))
- License: [MIT](LICENSE)

## Screenshots

<!--
  TODO (manual): add product prototype screenshots here before submission.
  Suggested shots, saved under docs/screenshots/ and referenced like:
    ![Discover](docs/screenshots/discover.png)
  - Onboarding
  - Discover: buddy card with compatibility score and matching reasons
  - Group activity: create and share
  - Chat: private invite
  - Activities: planned / created / past
  - QR check-in and the profile reliability card
  - Buddy+ paywall (RevenueCat), Free vs Buddy+
  - Monthly recap share card
-->

_Screenshots coming soon._

## Why Sports Buddy

Finding someone who plays the same sport is only the first step. The harder
problem is finding someone compatible, agreeing on the details, and knowing
whether people actually show up. Sports Buddy connects that full journey:

```text
compatibility -> connection -> coordination -> participation -> verified reliability
```

It supports two product loops:

1. **Find a buddy:** discover a compatible person, connect, chat, plan a private
   one-to-one session, confirm it, and export it to a calendar.
2. **Find an activity:** create or discover a public activity, join it, share it,
   and scan the organizer's QR code at the venue to verify attendance.

Sports Buddy is initially focused on **Selangor, Malaysia**. Members match by
general area rather than precise GPS location, which keeps local discovery useful
without exposing an exact home or live location. The data model can support more
Malaysian states as the community grows.

## What works today

- Email/password authentication, web Google sign-in, and eight-step onboarding.
- Editable profiles covering sports, skill, availability, area, budget, and intent.
- Explainable compatibility ranking instead of an opaque or AI-generated score.
- Connection requests, mutual connections, unfriend, block, and report flows.
- Real-time one-to-one chat with unread indicators and message history.
- Collaborative planning for sport, time, budget, and venue.
- Confirmed upcoming/past activities and `.ics` calendar export.
- Public activities with create, edit, discover, join, leave, remove, and share.
- Time-limited QR attendance check-in and evidence-based reliability statistics.
- Monthly activity recap rendered as a shareable image.
- OpenStreetMap venue search and maps, with optional Google Maps support.
- Responsive phone/desktop layouts, light/dark themes, and an Android build.
- Buddy+ subscription state, paywall, restore, and customer management through
  RevenueCat's official Capacitor SDK.

## Buddy+ and RevenueCat

Sports Buddy has one premium tier: **Buddy+**. The free experience keeps the
network useful—discovering people, connecting, chatting, planning, and recaps
remain available—while Buddy+ removes limits on active public activities and
unlocks premium discovery controls.

RevenueCat is the source of truth for the `sportbuddy_pro` entitlement. The app
configures RevenueCat with the signed-in Firebase user ID, listens for customer
information changes, displays RevenueCat's native paywall, and supports purchase
restoration. Store-backed builds can also open RevenueCat Customer Center for
subscription management. No `premium: true` value is stored in Firestore.

RevenueCat SDK transactions are intentionally available only in the native
Android build and are demonstrated with RevenueCat Test Store during development.
The browser uses a clearly separated local stand-in so reviewers can inspect
Buddy+ without creating a transaction. See
[docs/monetization.md](docs/monetization.md) for the architecture and dashboard
configuration.

| Capability | Free | Buddy+ |
| --- | --- | --- |
| Discover, connect, chat, and plan one-to-one sessions | Unlimited | Unlimited |
| Join active public activities | Up to 3 | Unlimited |
| Host active public activities | Up to 2 | Unlimited |
| Reliability statistics and monthly recap | Included | Included |
| Premium discovery controls | — | Included |

### Try Buddy+

No special account is needed. Register a new account, then:

**Android app:** install the [APK](https://github.com/HiIamGaryee/sports-buddy/releases/latest/download/app-debug.apk),
tap **Upgrade to Buddy+** and complete the purchase. It's a RevenueCat Test
Store purchase, so no real payment is charged.

**Web demo:** on the [live web demo](https://sportbuddy-4d596.web.app), open the
upgrade screen and redeem one of these reusable referral codes. Every account
may redeem each code once, so they never run out:

- `BUDDY-CEM2-W8MY`
- `BUDDY-GMVY-6V5W`
- `BUDDY-8CSJ-HP5C`
- `BUDDY-9MMD-EYQL`

Like the one-time codes, they only unlock Buddy+ in that browser and are not
RevenueCat purchases.

## Tech stack

| Layer | Technology |
| --- | --- |
| UI | React 19, TypeScript 6, Vite 8 |
| Styling | Tailwind CSS 4, shadcn/ui, Radix UI, Lucide |
| Routing | React Router 7 |
| Android | Capacitor 8, minimum Android 7.0 / API 24 |
| Backend | Firebase Authentication and Cloud Firestore |
| Subscriptions | RevenueCat Capacitor SDK and RevenueCat UI |
| Maps and venues | OpenStreetMap, Nominatim, Overpass, Leaflet |
| Optional maps | Google Maps JavaScript API |
| QR | `qrcode-generator`, `jsQR`, Capacitor Camera |
| Testing | Vitest, Firebase Emulator Suite, Firestore Rules Unit Testing |
| Hosting | Firebase Hosting |

## Architecture

The UI does not access Firebase or RevenueCat directly. Feature code calls a
service, services depend on repository interfaces, and the repository selected
at runtime talks to either the real provider or the local mock implementation.

```text
React pages and components
        |
hooks and providers
        |
domain services and validation
        |
repository interfaces
        |
        +-- Firebase repositories (live data)
        +-- mock repositories (local development)
        +-- RevenueCat repository (native Android)
        +-- web subscription stand-in (browser only)
```

Firestore security rules independently enforce access to private profiles,
connections, conversations, plans, and attendance data. Approximate area is
used for matching; the app does not request or store precise GPS coordinates.

## Quick start (no cloud accounts required)

### Prerequisites

- Node.js 22 (`.nvmrc`; Node 18 or newer is required)
- npm

### Install and run

```bash
git clone <your-fork-or-repository-url>
cd sports-buddy
npm install
```

Copy `.env.example` to `.env`:

```bash
# macOS/Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Keep `VITE_DATA_SOURCE=mock`, then start the app:

```bash
npm run dev
```

Vite prints the local URL, normally <http://localhost:5173>. Mock mode stores
development data in the browser and needs no Firebase, maps, or RevenueCat
credentials.

## Environment configuration

All client configuration belongs in `.env`, which is gitignored. Start with
[`.env.example`](.env.example).

| Variable | When it is needed |
| --- | --- |
| `VITE_DATA_SOURCE` | `mock` for local data or `firebase` for the live backend |
| `VITE_FIREBASE_API_KEY` | Firebase mode |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase mode |
| `VITE_FIREBASE_PROJECT_ID` | Firebase mode |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase mode |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase mode |
| `VITE_FIREBASE_APP_ID` | Firebase mode |
| `VITE_VENUE_SOURCE` | `openstreetmap`, `google`, or `mock` |
| `VITE_GOOGLE_MAPS_API_KEY` | Only when the venue source is `google` |
| `VITE_PUBLIC_APP_URL` | Share-link origin used by the native app |
| `VITE_REVENUECAT_ANDROID_API_KEY` | Native RevenueCat Test Store or Android SDK key |

`VITE_*` values are bundled into the client and must never contain server
secrets. Firebase web configuration and RevenueCat public SDK keys identify an
app; Firestore rules and provider-side configuration protect the data.

### Firebase mode

1. Create a Firebase web app and enable Email/Password authentication.
2. Copy its public web configuration into `.env`.
3. Set `VITE_DATA_SOURCE=firebase`.
4. Deploy the repository's Firestore rules and indexes.
5. Restart the Vite server.

The full walkthrough is in [docs/firebase.md](docs/firebase.md). Do not commit
real test-user passwords, service-account files, or other private credentials.

### Venue providers

OpenStreetMap is the default and does not require an API key:

```dotenv
VITE_VENUE_SOURCE=openstreetmap
```

For Google Maps, set `VITE_VENUE_SOURCE=google` and provide a browser-restricted
`VITE_GOOGLE_MAPS_API_KEY`. More detail is in [docs/venues.md](docs/venues.md).

## Run on Android

In addition to Node.js, Android builds require:

- JDK 17 or newer
- Android Studio and Android SDK Platform 36
- A local `android/local.properties` containing your Android SDK path

The native project is committed in `android/`; do not regenerate it.

```bash
npm install
npm run cap:sync
npm run android:open
```

Android Studio can then run the app on an emulator or connected device. For a
real RevenueCat Test Store purchase, configure `sportbuddy_pro` as documented in
[docs/monetization.md](docs/monetization.md), set
`VITE_REVENUECAT_ANDROID_API_KEY`, sync again, and test on Android.

Build directly from the command line:

```bash
# macOS/Linux
./android/gradlew -p android assembleDebug
./android/gradlew -p android bundleRelease

# Windows PowerShell
.\android\gradlew.bat -p android assembleDebug
.\android\gradlew.bat -p android bundleRelease
```

Outputs:

- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release AAB: `android/app/build/outputs/bundle/release/app-release.aab`

### Build a signed release AAB

Release signing is read from two local, gitignored files:

- `android/sports-buddy-release.keystore`
- `android/keystore.properties`

The properties file uses this shape:

```properties
storeFile=sports-buddy-release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=sports-buddy
keyPassword=YOUR_KEY_PASSWORD
```

Never commit either file or expose the passwords. With the release keystore and
properties present, build the current web app, sync it into Capacitor, and create
the signed bundle:

```powershell
# Windows PowerShell
npm.cmd run cap:sync
.\android\gradlew.bat -p android clean bundleRelease
```

Verify the resulting bundle signature and optionally record its checksum:

```powershell
jarsigner -verify -verbose -certs android/app/build/outputs/bundle/release/app-release.aab
Get-FileHash android/app/build/outputs/bundle/release/app-release.aab -Algorithm SHA256
```

Back up the keystore and its passwords securely. Future updates must be signed
with the same key.

## Quality checks

```bash
npm run typecheck   # TypeScript validation
npm run lint        # oxlint
npm test            # unit and component tests
npm run test:rules  # Firestore rules against the Firebase emulator
npm run build       # typecheck plus production bundle
```

`npm run test:rules` requires Java and the Firebase Emulator Suite. The project
tests matching, planning, chat, activities, QR attendance, recap calculations,
subscription capabilities, repositories, and Firestore authorization rules.

## Project structure

```text
src/
  components/       shared UI and layout
  constants/        product identifiers and limits
  features/         feature pages, hooks, and components
  hooks/            cross-feature React hooks
  lib/              pure domain logic
  providers/        authentication, profile, safety, and subscription state
  repositories/     Firebase, RevenueCat, and mock data adapters
  services/         use cases and validation
  types/            domain types
android/             committed Capacitor Android project
docs/                product and technical documentation
tests/               Firestore security-rules tests
```

## License

Released under the [MIT License](LICENSE). You may use, modify, and redistribute
the code, including commercially, provided that the license and copyright notice
are retained.
