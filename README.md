# Sports Buddy

Mobile-first sports social app. React + TypeScript + Vite + Tailwind v4 +
shadcn/ui, packaged for mobile with Capacitor, Firebase planned as backend.

## Commands

```bash
npm run dev        # web dev server
npm run build      # typecheck + production build
npm run cap:sync   # build + cap sync (copy web build into the native shell)
npm run android:apk # build + sync + debug APK
npm run android:aab   # Release AAB for Google Play
```

## Setup

```bash
cp .env.example .env   # VITE_DATA_SOURCE=mock works with no credentials
npm install
npm run dev
```

The app runs against mock repositories by default — no credentials, nothing to
sign up for.

## Google Maps setup

1. Create or select a Google Cloud project.
2. Enable Maps JavaScript API and Places API (New).
3. Create a browser API key.
4. Add `VITE_GOOGLE_MAPS_API_KEY=` to `.env`.
5. Restart the Vite server.

Restrict the key by website/application and enable only the required Google
APIs before production use.

### Environment variables

All of them live in `.env` (gitignored); `.env.example` is the template.
They are read only in `src/config/env.ts`.

| Variable | Required when | Where to get it |
| --- | --- | --- |
| `VITE_DATA_SOURCE` | always (`mock` \| `firebase`, defaults to `mock`) | pick it yourself |
| `VITE_FIREBASE_API_KEY` | `VITE_DATA_SOURCE=firebase` | Firebase console → Project settings → General → Your apps → Web app → SDK setup and configuration → Config |
| `VITE_FIREBASE_AUTH_DOMAIN` | same | same config block |
| `VITE_FIREBASE_PROJECT_ID` | same | same config block |
| `VITE_FIREBASE_STORAGE_BUCKET` | same | same config block |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | same | same config block |
| `VITE_FIREBASE_APP_ID` | same | same config block |
| `VITE_VENUE_SOURCE` | always (`mock` \| `google`, defaults to `mock`) | pick it yourself — independent of `VITE_DATA_SOURCE` |
| `VITE_GOOGLE_MAPS_API_KEY` | `VITE_VENUE_SOURCE=google` | Google Cloud console → APIs & Services → Credentials → Create credentials → API key, then enable **Maps JavaScript API** + **Places API (New)** |

`VITE_*` values are compiled into the browser bundle and are **not secret** —
never put a server credential there. Restrict the Maps key by HTTP referrer and
API, and set a daily quota. Setup walkthroughs: `docs/firebase.md`,
`docs/venues.md`.

## Android app (Capacitor)

The native shell lives in `android/` and **is committed** — `versionCode` and
native config are shared, so nobody has to regenerate it. `ios/` is not
generated yet.

### One-time setup

| Need | Version | Notes |
| --- | --- | --- |
| Node | **18+**, 22 pinned | `@capacitor/cli` 6 requires `>=18`; `.nvmrc` pins 22, so `nvm use` |
| JDK | **17+** | required by AGP 8.13; Capacitor compiles to Java 17. `brew install --cask temurin@17`, or Android Studio's bundled JDK |
| Android SDK | compile/target **36**, min **24** | install Android Studio, then Platform 36 + Build Tools. min 24 = Android 7.0 |
| Gradle | 8.14.3 | comes from the committed wrapper — do not install it yourself |

```bash
npm install
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties   # macOS
```

`android/local.properties` is machine-specific and gitignored — every teammate
writes their own once.

### Update the APP (the usual loop)


| Artifact | Command | Path |
| --- | --- | --- |
| Debug APK | `npm run android:apk` | `android/app/build/outputs/apk/debug/app-debug.apk` |
| Release AAB | `npm run android:aab` | `android/app/build/outputs/bundle/release/app-release.aab` |

## Store listing copy

### Short description

Find local sports buddies, start a chat, and plan your next game together.

### Full description

Sports Buddy makes it easier to find people to play with. Discover fellow
players who enjoy the same sports, connect when the timing feels right, and
turn a “we should play sometime” into an actual plan.

Whether you are looking for a new badminton partner, a casual tennis rally, a
running buddy, or a group for your next game, Sports Buddy helps you meet
people who share your interests and availability.

With Sports Buddy, you can:

- Create a profile with the sports you play, your skill levels, availability,
  and general area.
- Discover compatible players and activity opportunities nearby.
- Connect and chat with people before making plans.
- Organise a sports session with a time, venue, and the people you want to
  play with.
- Manage your profile, notifications, and discovery preferences in one place.

Privacy comes first. Sports Buddy uses only the approximate area you choose to
share to help make local connections relevant. We never collect GPS or precise
location data, and your email address is not shown to other users.

Find your people. Play more often.
