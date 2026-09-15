# Firebase setup

Sports Buddy runs in two modes. `VITE_DATA_SOURCE=mock` (the default) needs no
Firebase project at all; `VITE_DATA_SOURCE=firebase` talks to a real one.

## 1. Create the Firebase project

1. Open the [Firebase console](https://console.firebase.google.com) → **Add project**.
2. Name it (e.g. `sports-buddy`). Analytics can stay off — it is not used yet.

## 2. Register a Web app

1. Project overview → **Add app** → Web (`</>`).
2. Nickname `sports-buddy-web`. Skip Firebase Hosting.
3. Copy the `firebaseConfig` values shown after registration.

## 3. Fill the environment file

```bash
cp .env.example .env
```

```dotenv
VITE_DATA_SOURCE=firebase

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<project>
VITE_FIREBASE_STORAGE_BUCKET=<project>.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

`.env` is gitignored. Never commit real values, and never paste them into
documentation. `apiKey`, `authDomain`, `projectId` and `appId` are required —
the app throws a readable error if any are missing while in firebase mode.

## 4. Enable Email/Password authentication

Authentication → **Get started** → Sign-in method → Email/Password → Enable.
Leave "Email link (passwordless sign-in)" off.

## 5. Enable the Google provider

Sign-in method → Google → Enable, pick a support email, save.
Add every domain you develop on (`localhost` is pre-authorised) under
Authentication → Settings → **Authorized domains**.

## 6. Create the Firestore database

Firestore Database → **Create database** → production mode → pick a region
close to your users (e.g. `asia-southeast1`). Four collections are used:
`users` (private), `publicProfiles` (discovery-safe projections),
`connections` (relationship state) and `conversations` with its `messages`
subcollection (chat).

## 7. Deploy the security rules

```bash
npm i -g firebase-tools    # once
firebase login
firebase use --add         # select the project
firebase deploy --only firestore:rules
```

`firestore.rules` covers three collections and closes everything else:

| Path | Rule |
| --- | --- |
| `users/{uid}` | owner reads/creates/updates their own only; delete disabled |
| `publicProfiles/{uid}` | any signed-in member reads; only the owner writes |
| `connections/{pairId}` | only the two participants read; writes are pinned to the legal transitions (`docs/connections.md` §9) |
| `conversations/{connectionId}` | every access reads the connection and requires `status == 'connected'`; ids and participants frozen (`docs/chat.md` §12) |
| `conversations/{id}/messages/{messageId}` | same check; create-only, sender must be the caller, content non-empty and ≤ 1000 chars |

`firestore.indexes.json` is intentionally empty. The queries used are
`publicProfiles orderBy updatedAt`, `publicProfiles where documentId() in […]`,
`connections where participants array-contains <uid>`,
`conversations where participants array-contains <uid>` (no `orderBy` — the
list is sorted client-side) and `messages orderBy createdAt` inside a
subcollection. None of them needs a composite index.

## 8. Switching modes

| Mode | `.env` | Behaviour |
| --- | --- | --- |
| Mock | `VITE_DATA_SOURCE=mock` | localStorage-backed auth, no credentials needed |
| Firebase | `VITE_DATA_SOURCE=firebase` | real Firebase Auth + Firestore |

Vite inlines env vars at build time, so restart `npm run dev` after changing
them.

## 9. Local development

```bash
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
```

Mock credentials for development are listed in `CLAUDE.md` (§21).

## 9a. Security rules tests (emulator)

```bash
npm run test:rules
```

This starts the Firestore emulator (`firebase.json` → `emulators.firestore`,
port 8080), runs `tests/firestore-rules.test.ts` (43 tests: connections and chat) against
the real `firestore.rules`, and shuts the emulator down. It uses the project id
`demo-sports-buddy`, so **no credentials and no real project are involved**.

Requirements:

- **JDK 21 or newer** — firebase-tools refuses older runtimes. On macOS:
  `brew install --cask temurin@21`, then point `JAVA_HOME` at it, e.g.
  `export JAVA_HOME=$(/usr/libexec/java_home -v 21)`.
- The first run downloads the emulator jar (cached afterwards).

`npm test` never needs the emulator: `vite.config.ts` limits the default
Vitest run to `src/**/*.test.ts`, and the rules tests live in their own
`vitest.rules.config.ts`.

## 9b. Two-user connection verification

The connection flow needs two accounts, so it cannot be verified from a
single session:

1. Sign in as user A in one browser profile, user B in another (or an
   incognito window).
2. A opens Discover and presses **Connect** on B.
3. B's Discover should show B in a **"Wants to connect"** section, with a
   **Connect back** button — no refresh needed, because connections use a
   scoped realtime subscription.
4. B presses **Connect back**. Both sessions should show **Connected**, and
   the session that completed the transition shows the "You found a sports
   buddy." dialog.
5. Reload both. State stays `Connected`, and the dialog does **not** reopen.

Both accounts must have completed onboarding and be discoverable, otherwise
they will not appear in each other's feed.

## 9c. Two-user chat verification

Chat needs the same two accounts, already connected:

1. A opens Messages → the connected buddy → sends "Hello".
2. B, with the same conversation open, should see it **without refreshing**
   (the conversation screen holds a scoped listener on the newest 20
   messages), and B's Messages list should show the new preview.
3. B replies. A sees it live.
4. Send more than 20 messages, reload, and check that only the newest 20 load
   and **Load earlier messages** fetches the rest without duplicates and
   without jumping the scroll position.
5. Sign in as a third account that is not connected to either and open
   `/messages/<their conversation id>`: it must show the generic
   "This conversation is unavailable." and read nothing.

### Known gotcha: Google sign-in silently reported as cancelled

A successful Google popup sign-in can be misreported as
`auth/popup-closed-by-user` (so `signInWithGoogle()` quietly resolves
`null`, per `isCancelledAuthError`) on Chrome versions that default
`Cross-Origin-Opener-Policy` to `same-origin`, which breaks the SDK's
`window.closed` popup-tracking. This is a known `firebase-js-sdk` /
Chrome interaction, not an app bug. `vite.config.ts` sets
`Cross-Origin-Opener-Policy: same-origin-allow-popups` on both the dev and
preview servers, which fixes it locally. It does **not** need to be set
anywhere else yet, since no hosting is configured (§10) — revisit this the
moment Firebase Hosting or another static host is added.

## 10. Security notes

- The web `apiKey` is public by design — Firestore rules are the real
  boundary. Keep them tight.
- Firebase Authentication owns its own session (IndexedDB, falling back to
  localStorage). The app never stores or reads Firebase tokens.
- Google sign-in currently uses the **web popup** flow. Inside a Capacitor
  WebView that flow is unreliable; a native Google auth plugin will be added
  in the dedicated native phase. Email/password works everywhere.
- No Cloud Functions, Storage or Hosting are configured — Auth + Firestore
  keep the MVP on the free tier.
# Immutable gender

Email registration passes canonical Gender through `authService` into the
private profile create. Google authentication never infers Gender; a missing
value is normalized to `null` and collected through onboarding or the minimal
legacy completion screen. `users/{uid}.gender` and
`publicProfiles/{uid}.gender` are protected by Firestore rules: missing/null
may transition once to `male` or `female`, and an existing value must remain
unchanged.
