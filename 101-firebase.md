# Firebase Audit

## Current Firebase Connection Type

The project uses the Firebase JavaScript Client SDK directly from the React/Vite frontend.

The local development environment sets `VITE_DATA_SOURCE=firebase`, so the Firebase repository implementations are selected. Test mode sets `VITE_DATA_SOURCE=mock`.

```text
React
  ↓
Firebase JavaScript SDK
  ↓
Firebase Auth / Cloud Firestore
```

## Firebase Packages Used

- `firebase@12.18.0` — runtime client SDK.
  - `firebase/app`
  - `firebase/auth`
  - `firebase/firestore`
- `@firebase/rules-unit-testing@5.0.2` — Firestore security-rules tests.
- `firebase-tools@15.29.0` — Firebase CLI and Firestore emulator commands.
- `firebase-admin` — not installed and not used.

The lockfile contains transitive `@firebase/*` modules bundled through `firebase`, but the application does not directly import Firebase Storage, Realtime Database, Functions, Messaging, Analytics, or Remote Config modules.

## Firebase Config File Locations

- `src/config/env.ts` — reads the `VITE_FIREBASE_*` variables.
- `src/services/firebase/config.ts` — exposes the Firebase config and validates required fields.
- `src/services/firebase/client.ts` — the only application initialization path.
- `firebase.json` — Firestore rules/indexes, Hosting, Auth, and emulator configuration.
- `.firebaserc` — Firebase CLI project selection.
- `firestore.indexes.json` — Firestore indexes.
- `firestore.rules` — Firestore security rules.
- `scripts/seed-firebase.mjs` — standalone Firebase client-SDK seed script.

Firebase initialization is lazy:

```text
src/config/env.ts
  ↓
src/services/firebase/config.ts
  ↓
src/services/firebase/client.ts
  ↓
initializeApp()
  ↓
initializeAuth() / getFirestore()
```

## Environment Variables Used

The following variables are read in `src/config/env.ts`:

- `VITE_DATA_SOURCE`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Environment findings:

- `.env.local` contains all six Firebase configuration variables with populated values. Values are intentionally not shown.
- `.env.local` sets `VITE_DATA_SOURCE=firebase`.
- `.env.example` defines the Firebase variable names with empty placeholders.
- `.env.test` uses mock mode and does not contain Firebase configuration values.
- `.env` and `.env.production` were not found.
- The variable naming matches Vite because the code reads `import.meta.env.VITE_*`.

## Authentication

Firebase Authentication is used through the client SDK.

- Email/password registration.
- Email/password sign-in.
- Google popup sign-in.
- Sign-out.
- Auth-state subscription.
- IndexedDB and browser-local persistence.

Primary files:

- `src/repositories/auth/firebase-auth-repository.ts`
- `src/services/auth/auth-service.ts`
- `src/providers/auth-provider.tsx`

## Database

Cloud Firestore is used through the client SDK.

The Firebase repositories use Firestore reads, writes, queries, transactions, batch writes, and realtime `onSnapshot` listeners for:

- `users`
- `publicProfiles`
- `connections`
- `blocks`
- `reports`
- `conversations/{connectionId}/messages`
- `activityPlans`
- `activities`
- `activityPosts`
- `groupActivities`
- `groupActivities/{activityId}/checkIn`
- `attendanceRecords`

## Storage Usage

No Firebase Storage usage was found.

The web config includes `VITE_FIREBASE_STORAGE_BUCKET`, but there is no `getStorage()` call, no `firebase/storage` import, and no `storage.rules` file.

## Frontend and Backend Connection

The frontend connects directly to Firebase through the JavaScript SDK.

There is no Express API, custom backend service, backend package manifest, or frontend `/api` call found in the project.

The project does contain unrelated direct HTTP calls to Google Places and OpenStreetMap services.

## Firebase Admin SDK

The Firebase Admin SDK is not used.

- `firebase-admin` is not installed.
- No `admin.initializeApp()` call exists.
- No `cert()` or service-account configuration exists.
- No service-account JSON, private key, or Admin credential file was found.

The tracked `scripts/seed-firebase.mjs` script uses the Firebase client SDK from Node for seeding; it is not an Admin SDK backend.

## Firebase REST API

No direct Firebase REST API usage was found.

There are no calls to Firestore REST, Identity Toolkit, Secure Token, or Firebase Realtime Database HTTP endpoints.

## Firebase Security Rules Found

Found:

- `firestore.rules`
- `firestore.indexes.json`

Not found:

- `storage.rules`
- `database.rules.json`

The Firestore rules require authentication and apply collection-specific ownership, participation, and field validation checks. The catch-all rule denies all unmatched reads and writes. No unrestricted rule such as `allow read, write: if true` was found.

Production deployment state for these rules is UNCONFIRMED.

## Security Issues or Risks Found

- A hardcoded seed-account password exists in the tracked `scripts/seed-firebase.mjs` file and is also printed by that script. The credential value is intentionally omitted from this document.
- No Firebase Admin credentials, service-account private keys, or private keys in `VITE_*` variables were found.
- The Firebase Web API key is client configuration and was not treated as an Admin secret.
- `.env.local` is ignored and was not tracked by Git.
- `firebase.json` lists `localhost` as an authorized domain. Whether production domains are configured separately in the Firebase Console is UNCONFIRMED.

## Important Files

- `package.json`
- `package-lock.json`
- `.env.local`
- `.env.example`
- `.env.test`
- `.firebaserc`
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `src/config/env.ts`
- `src/vite-env.d.ts`
- `src/services/firebase/config.ts`
- `src/services/firebase/client.ts`
- `src/repositories/repositories.ts`
- `src/repositories/auth/firebase-auth-repository.ts`
- `src/repositories/profile/firebase-profile-repository.ts`
- `src/repositories/public-profile/firebase-public-profile-repository.ts`
- `src/repositories/discover/firebase-discover-repository.ts`
- `src/repositories/connection/firebase-connection-repository.ts`
- `src/repositories/block/firebase-block-repository.ts`
- `src/repositories/report/firebase-report-repository.ts`
- `src/repositories/chat/firebase-chat-repository.ts`
- `src/repositories/activity-plan/firebase-activity-plan-repository.ts`
- `src/repositories/activity/firebase-activity-repository.ts`
- `src/repositories/activity-post/firebase-activity-post-repository.ts`
- `src/repositories/group-activity/firebase-group-activity-repository.ts`
- `src/repositories/attendance/firebase-attendance-repository.ts`
- `scripts/seed-firebase.mjs`
- `tests/firestore-rules.test.ts`

## Current Status

| Item | Status | Finding |
|---|---|---|
| Firebase package installed | YES | `firebase@12.18.0` is installed. |
| Firebase initialized in code | YES | `initializeApp()` is in `src/services/firebase/client.ts`. |
| Local environment selects Firebase | YES | `.env.local` sets `VITE_DATA_SOURCE=firebase`. |
| Successful live Firebase connection verified | UNCONFIRMED | Static inspection did not execute a live sign-in or database request. |
| Firebase Client SDK used | YES | Auth and Firestore use the modular client SDK. |
| Firebase Admin SDK used | NO | No package or Admin initialization found. |
| Firebase REST API used | NO | No direct Firebase REST endpoints found. |
| Authentication used | YES | Email/password and Google popup authentication. |
| Cloud Firestore used | YES | Multiple Firebase repositories access Firestore. |
| Firebase Storage used | NO | No Storage SDK usage or Storage rules found. |
| Realtime Database used | NO | No Realtime Database SDK usage or rules found. |
| Cloud Functions used | NO | No Functions source, import, or Firebase Functions config found. |
| Firebase Messaging used | NO | No Messaging SDK or service worker usage found. |
| Frontend connects directly to Firebase | YES | React selects Firebase repositories and calls the client SDK directly. |
| Custom backend API in front of Firebase | NO | No Express or custom backend API found. |
| Firestore security rules found | YES | `firestore.rules` is configured in `firebase.json`. |
| Firestore rules appear unrestricted | NO | Rules contain authenticated, collection-specific checks and a deny-by-default catch-all. |
| Security risk found | YES | Hardcoded seed credential in `scripts/seed-firebase.mjs`. |
| Production Firebase configuration verified | UNCONFIRMED | No `.env.production` file exists in the repository. |
