# Firebase handoff — STEP 14.5B

## Current backend state

**STATUS B — FIREBASE CODE READY — environment/configuration missing.** The repository selector uses `VITE_DATA_SOURCE` in one place (`src/repositories/repositories.ts`), defaulting to `mock`. No local `.env`, `.env.local`, `.env.development`, or `.env.production` file is present in this workspace; `.env.example` intentionally selects mock and leaves every Firebase value empty.

## SDK and initialization

`firebase` is installed at `^12.18.0`. `src/services/firebase/client.ts` is the sole initializer: it lazily creates Firebase App, Auth (IndexedDB/local persistence), and Firestore. `src/services/firebase/config.ts` refuses Firebase mode unless API key, auth domain, project id, and app id are present. The optional storage bucket and messaging sender id are read but not required by the current client.

## Auth and Firestore

Firebase auth repositories support email/password registration and login, browser Google popup login, logout, and `onAuthStateChanged` restoration. Google auth is web-only: there is no Capacitor native Google provider, so native reauthentication must be designed separately for account deletion.

Firebase repositories exist for private `users/{uid}`, discovery-safe `publicProfiles/{uid}`, connections, conversations and messages, activity plans, activities, blocks, and reports. Profile onboarding writes `users/{uid}` and maintains `publicProfiles/{uid}` through the service when Firebase mode is selected. Block and report repositories also have Firebase implementations, but none has live-project verification in this workspace.

## Rules and emulator

`firestore.rules` has matches for users, publicProfiles, connections, conversations/messages, activityPlans, activities, blocks, and reports. Rules are configured through `firebase.json`; `firestore.indexes.json` contains two activity indexes. `npm run test:rules` and `tests/firestore-rules.test.ts` are configured for the Firestore emulator, with 11 rule-test describe groups. The current environment cannot run them because Firebase CLI requires JDK 21 or later.

## Mock/Firebase switching

Use `VITE_DATA_SOURCE=mock` for local development without Firebase. Use `VITE_DATA_SOURCE=firebase` only after providing the required local Firebase web config. Do not commit `.env`; `.gitignore` excludes it while retaining `.env.example`.

## Required Player A actions

1. Create or select the intended Firebase project; do not use a placeholder project.
2. Register the web app and place its values locally in `.env`.
3. Set `VITE_DATA_SOURCE=firebase` and provide API key, auth domain, project id, and app id; also provide storage bucket and messaging sender id from the web config.
4. Enable Email/Password Authentication and Google Authentication if Google login is required.
5. Create Firestore and configure authorized web domains for authentication.
6. Apply the existing Firestore rules and indexes, then run the emulator suite using JDK 21+.
7. Verify sign-up, sign-in, profile projection, connection, chat, planning, activity, block, and report flows against two real test users.
8. Return verified Firebase access/state to Player B for STEP 15B deletion and reauthentication work.

## Required Player B actions after connection

Verify repository calls against the selected project, run all rules tests with JDK 21+, add account-deletion repository/service operations, and implement provider-specific reauthentication. Do not assume browser popup Google reauthentication works in Capacitor.

## STEP 15B gate

Not ready. Firebase Auth and Firestore must be configured and verified first. The profile repository currently has no owner-delete operation, Firebase Auth has no delete-user/reauthentication operation, and no live Firebase flow has been verified.
