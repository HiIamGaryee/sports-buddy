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
close to your users (e.g. `asia-southeast1`). Only the `users` collection is
used in this step.

## 7. Deploy the security rules

```bash
npm i -g firebase-tools    # once
firebase login
firebase use --add         # select the project
firebase deploy --only firestore:rules
```

`firestore.rules` allows a signed-in user to read, create and update **only**
`users/{their-own-uid}`; deletes are disabled and every other path is closed.
`firestore.indexes.json` is intentionally empty — indexes come with the query
model in later steps.

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
Firebase emulators are not wired up; add them only if a step needs them.

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
