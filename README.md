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

The app runs against mock repositories by default. To use a real backend set
`VITE_DATA_SOURCE=firebase` and fill the Firebase keys — see
`docs/firebase.md`.

## Android app (Capacitor)

The native shell lives in `android/` and **is committed** — `versionCode` and
native config are shared, so nobody has to regenerate it. `ios/` is not
generated yet.

### One-time setup

| Need | Version | Notes |
| --- | --- | --- |
| Node | **22+** | hard requirement in the Capacitor CLI — `nvm use` reads `.nvmrc` |
| JDK | **21** | `brew install --cask temurin@21`, or Android Studio's bundled JDK |
| Android SDK | API 36 | install Android Studio, then Platform 36 + Build Tools |

```bash
npm install
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties   # macOS
```

`android/local.properties` is machine-specific and gitignored — every teammate
writes their own once.

### Update the APK (the usual loop)

```bash
nvm use            # .nvmrc pins 22 — the Capacitor CLI is fatal below it
npm run android:apk
```

`[fatal] The Capacitor CLI requires NodeJS >=22.0.0` means you skipped
`nvm use`. Node 22 is only the build tool; the app itself has no Node runtime.

That is `build → cap sync → assembleDebug`. The APK lands at:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Install it on a plugged-in phone with `adb install -r <path>`, or drag it onto
an emulator. Anything you changed in `src/` needs this command again — the
native shell serves the **built** `dist/`, never the dev server.

To work inside Android Studio instead: `npm run cap:sync && npm run android:open`.

### Bump the version before you share a build

`android/app/build.gradle` → `defaultConfig`:

```gradle
versionCode 2        // integer, +1 every build you hand out
versionName "1.0.1"  // what humans see
```

Play Store rejects a `versionCode` it has already seen, so bump it or the
upload fails.

### Release build

```bash
npm run android:apk:release
```

Output is **unsigned** (`app-release-unsigned.apk`) until a signing config
exists. Create a keystore once, keep it out of git (`*.jks` / `*.keystore` are
ignored), share it through a password manager — never a commit — and add a
`signingConfigs` block reading the credentials from `~/.gradle/gradle.properties`.
Losing the keystore means never updating the listing again.

### App icon and splash screen

Both are generated from one file: `src/assets/logo.png`.

`scripts/make-app-assets.py` pads it into the five square sources in
`resources/` — launcher icon, adaptive foreground/background, and light + dark
splash on the app's own `--background` colours — and `@capacitor/assets` fans
those out to every Android density.

```bash
npm run cap:assets        # resources/ -> android/app/src/main/res
npm run cap:assets:logo   # new logo.png -> resources/ -> android (needs: pip3 install pillow)
```

`resources/` is committed, so only whoever changes the logo needs Pillow. Commit
`android/app/src/main/res` afterwards, and never hand-edit anything in there.

The splash is the plain Android launch theme (`@drawable/splash`, with
`drawable-night/` for dark mode) — no `@capacitor/splash-screen` plugin, so
there is nothing to configure or hide from JavaScript.

## Docs

- `CLAUDE.md` — architecture, conventions and rules. Read before coding.
- `theme.md` — design system, tokens, typography, accessibility.
- `docs/firebase.md` — Firebase project setup and mode switching.
- `docs/data-model.md` — the `users/{uid}` document and privacy boundary.
- `docs/discover.md` — the discovery pipeline and public projection.
- `docs/matching.md` — the compatibility engine: weights, formulas, limits.
- `docs/connections.md` — Connect, mutual connections, rules, realtime.
- `docs/chat.md` — conversations, messages, pagination, chat security.
- `docs/planning.md` — Plan Together: proposals, agreement, readiness.
- `docs/venues.md` — venue discovery, area centres, Google config, privacy.
- `docs/activities.md` — confirming a plan into an activity, and its card.
- `docs/calendar.md` — activity history, temporal state and the ICS export.
- `docs/security-audit.md` — trust boundaries, validation, injection review.
- `docs/responsive-audit.md` — route-by-route mobile / tablet / desktop audit.

Current status: **STEP 13 — Calendar + Activity History** (auth, onboarding,
profile, preferences, ranked discovery, mutual connections, text chat,
structured sport/time/budget/venue planning, confirmed activities with
upcoming/past history and ICS export, across phone, tablet and desktop
layouts, packaged as an Android app).
