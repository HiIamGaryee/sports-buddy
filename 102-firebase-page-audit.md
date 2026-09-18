# Firebase / Firestore Page Audit

Audit scope: route configuration, page components, hooks, services, repositories, Firebase SDK calls, environment switching, authentication guards, Firestore collections, mock fallbacks, and realtime listener cleanup.

No source code or configuration was changed during the audit. Sensitive environment values are intentionally omitted.

## Summary

| Item | Result |
| --- | --- |
| Total routed page paths | 29 |
| Unique page components | 25 |
| Firestore-connected routes | 23 |
| Firebase Auth-only route | 1 (`/auth/login`) |
| Non-database page routes | 5 (`/privacy`, `/map`, `/buddy-plus`, and the two share-entry routes) |
| Firebase-connected pages | YES |
| Missing core page-to-Firestore connections | NO confirmed cases |
| Active mock/static feature data | YES — `/profile` has sample ratings and a static recap banner |
| Broken Firebase flows | NO confirmed cases |
| TypeScript verification | PASS (`npm run typecheck`) |
| Lazy-loaded routes | NO found; routes are eagerly imported |

Overall, protected application pages use the repository switch in `src/repositories/repositories.ts`. With the current `.env.local` setting, application data repositories select Firebase implementations. The page-specific flow is generally:

```text
Page Component
  ↓
Hook / Provider
  ↓
Service
  ↓
Repository interface
  ↓
Firebase repository
  ↓
Firebase JavaScript SDK
  ↓
Firestore
```

## Page Database Map

| Page | Route | Feature | Needs Database | Actual flow / result |
| --- | --- | --- | --- | --- |
| Privacy policy | `/privacy` | Static legal content | NO | `PrivacyPolicyPage`; no Firebase call |
| Login | `/auth/login` | Authentication | NO — Auth only | `LoginPage` → `useAuth` → `AuthProvider` → `authService` → Firebase Auth repository; no page-level Firestore query |
| Register | `/auth/register` | Account and initial profile | YES | `RegisterPage` → `useAuth` → `authService.signUp` → Firebase Auth → `profileRepository.createIfMissing` → `users` |
| Onboarding | `/onboarding` | Profile onboarding | YES | `OnboardingPage` → `useProfile` → `ProfileProvider` → `profileService.completeOnboarding` → `profileRepository` / `publicProfileRepository` → `users` / `publicProfiles` |
| Home | `/home` | Upcoming activities and posts | YES | `HomePage` → `useUpcomingActivities` / `useMyActivityPosts` → activity/post services → Firebase repositories → `activities`, `activityPosts`, `publicProfiles` |
| Map | `/map` | Venue search/map | NO — external venue API | `MapPage` → `useVenueMapSearch` → OpenStreetMap/Nominatim/Overpass; no Firestore call |
| Discover | `/discover` | People, activity posts, group activities | YES | `DiscoverPage` → discover/activity-post/group-activity hooks → services → Firebase repositories → `publicProfiles`, `activityPosts`, `groupActivities`; global connections and safety listeners also run |
| Post activity | `/discover/post-activity` | Create activity post | YES | `PostActivityPage` → form actions → `activityPostService.create` → activity-post repository → `activityPosts` |
| Edit activity post | `/discover/post-activity/:postId` | Update activity post | YES | `PostActivityPage` → `activityPostService.getById/update` → activity-post repository → `activityPosts` |
| Invite to activity | `/discover/post-activity/invite/:userId` | Create post and invite | YES | `PostActivityPage` → `publicProfiles` lookup → create `activityPosts` → `chatService.sendFromElsewhere` → `conversations` / `messages` |
| Activity post detail | `/discover/activity/:postId` | View/respond to post | YES | `ActivityPostPage` → `activityPostService.getById` → `activityPosts`; author lookup via `publicProfiles` |
| New group activity | `/discover/group-activities/new` | Create group activity | YES | `GroupActivityFormPage` → `groupActivityService.create` → group-activity repository → `groupActivities` |
| Edit group activity | `/discover/group-activities/:activityId/edit` | Update group activity | YES | `GroupActivityFormPage` → `groupActivityService.getById/update` → group-activity repository → `groupActivities` |
| Group activity detail | `/discover/group-activities/:activityId` | View/join/manage group activity | YES | `GroupActivityDetailPage` → `groupActivityService.getById` → `groupActivities`; participant lookup via `publicProfiles`; check-in actions use attendance service |
| Buddy profile | `/discover/:userId` | Public profile and connection | YES | `BuddyProfilePage` → `discoverService.getCandidate` → `publicProfiles`; connection actions → `connections` |
| Activities | `/activities` | Personal activities, posts, group activities | YES | `ActivitiesPage` → activity/post/group hooks → repositories → `activities`, `activityPosts`, `groupActivities`; profile batches use `publicProfiles` |
| Activity detail | `/activities/:activityId` | Participant activity detail | YES | `ActivityDetailPage` → `useActivity` → `activityService.getForParticipant` → `activities`; buddy lookup → `publicProfiles` |
| Empty messages state | `/messages` | Conversation list shell | YES | `MessagesLayout` → `MessagesListPane` → `useConversations` → `ConversationsProvider` / chat repository → `conversations`; global safety listener also runs |
| Conversation | `/messages/:conversationId` | Messages | YES | `ConversationPage` → `useConversation` → `chatService` → `conversations/{id}/messages` realtime listener; header profiles use `publicProfiles` |
| Activity plan | `/messages/:conversationId/plan` | Plan and confirm activity | YES | `PlanPage` → `useActivityPlan` → activity-plan repository → `activityPlans`; confirmation transaction writes `activities` and updates `activityPlans` |
| Profile | `/profile` | Current user profile | YES | `ProfilePage` → `useProfile` → `ProfileProvider` → `profileService` → `users` / `publicProfiles`; active ratings and recap banner are mock/static, documented below |
| Edit profile | `/profile/edit` | Profile editing | YES | `EditProfilePage` → `useProfile` → `profileService.updateProfile` → `users` / `publicProfiles` |
| Complete gender | `/complete-profile` | Required profile field | YES | `CompleteGenderPage` → `ProfileProvider.completeGender` → `profileService` → `users` / `publicProfiles` |
| Settings | `/settings` | Preferences and sign-out | YES | `SettingsPage` → `useProfile` / `usePreferenceUpdate` → `profileService.updatePreferences` → `users` / `publicProfiles`; FAQ content is static |
| Discovery settings | `/settings/discovery` | Discovery preferences and match count | YES | `DiscoverySettingsPage` → `useDiscoveryMatchCount` → discover service → `publicProfiles`; save → profile service → `users` / `publicProfiles` |
| Premium paywall | `/buddy-plus` | Subscription purchase | NO — purchase service | `PaywallPage` → `useSubscription` → RevenueCat/native or web stand-in; no page-specific Firestore call |
| Monthly recap | `/recap` | Activity and attendance recap | YES | `MonthlyRecapPage` → `useMonthlyRecap` → recap service → `activities`, `groupActivities`, `attendanceRecords`; profile context also reads `users` / `publicProfiles` |
| Shared activity entry | `/activity/:postId` | Authenticated share redirect | NO — redirect only | `SharedActivityPage` validates route state and redirects to login/onboarding/detail; it does not load Firestore itself |
| Shared group activity entry | `/group-activity/:activityId` | Authenticated share redirect | NO — redirect only | `SharedActivityPage` validates route state and redirects to login/onboarding/detail; it does not load Firestore itself |

All protected routes are wrapped by `ProtectedRoute`, which provides connection, conversation, and subscription context. `AuthProvider`, `ProfileProvider`, and `SafetyProvider` are mounted at the application level. Therefore, pages marked `NO` above can still inherit global auth/profile/safety reads; `NO` means no page-specific Firestore feature was found.

## Verified Database Flows

### Authentication and profile

```text
Login/Register
  ↓
useAuth / AuthProvider
  ↓
authService
  ↓
firebase-auth-repository
  ↓
Firebase Auth
```

Registration and Google sign-in then create a missing profile through `profileRepository`, writing `users`. `ProfileProvider` loads the authenticated user profile from `users` and the public profile from `publicProfiles`.

### Activities and posts

```text
Activities / Discover / Home pages
  ↓
useActivities, useActivityPosts, useUpcomingActivities
  ↓
activityService / activityPostService
  ↓
Firebase activity repositories
  ↓
activities / activityPosts / publicProfiles
```

### Group activities and attendance

```text
Discover / Activities / Group detail
  ↓
group-activity hooks and GroupActivityCard
  ↓
groupActivityService / attendanceService
  ↓
Firebase repositories
  ↓
groupActivities / checkIn / attendanceRecords
```

`CheckInQrDialog` and `ScanCheckInButton` are rendered by `GroupActivityCard` on the discover, activities, and group-detail surfaces.

### Chat and planning

```text
Messages / Plan pages
  ↓
useConversations / useConversation / useActivityPlan
  ↓
chatService / activityPlanService
  ↓
Firebase repositories
  ↓
conversations / messages / activityPlans
```

`useConversation` and `useActivityPlan` authorize access using the current user and connection state before subscribing or writing.

## Firestore Collections

| Collection / path | Used by | CRUD / access observed |
| --- | --- | --- |
| `users` | Registration, onboarding, profile, settings | Create, read, update |
| `publicProfiles` | Profile, discover, activities, chat, settings | Create, read, update, delete where supported |
| `connections` | Connection provider, discover, buddy profile, activity flows | Realtime read, create/update/delete |
| `blocks` | Safety provider, discover, activity, chat | Realtime read, create/delete |
| `reports` | Safety/report actions | Create |
| `conversations` | Messages, invite flow, conversation provider | Read, create/update, realtime read |
| `conversations/{conversationId}/messages` | Conversation page and invite flow | Create, realtime read |
| `activityPlans` | Plan page and confirmation | Create, read/update, realtime read |
| `activities` | Home, activities, activity detail, plan confirmation, recap | Create, read, update where supported |
| `activityPosts` | Home, discover, post forms, activities, post detail | Create, read, update, delete |
| `groupActivities` | Discover, group forms/detail, activities, recap | Create, read, update, delete |
| `groupActivities/{activityId}/checkIn` | Group activity check-in QR flow | Read/write current check-in code |
| `attendanceRecords` | Check-in flow and monthly recap | Create, read/list |

No page was found requesting a collection name that is absent from the repository layer. Collection names are centralized in the corresponding repository files.

## Firebase Environment Mode

| Check | Finding |
| --- | --- |
| `VITE_DATA_SOURCE=firebase` | YES in `.env.local`; value not reproduced here |
| Mock data source enabled for current local mode | NO; `src/config/env.ts` maps the current value to Firebase |
| Production mode confirmed | UNCONFIRMED; no `.env.production` file was found |
| Test mode | Mock by design in `.env.test` |
| Example mode | Mock by default in `.env.example` |
| Venue source | Mock in `.env.local` via `VITE_VENUE_SOURCE=mock`; this affects venue search only, not core Firebase data |

Switching logic is in `src/config/env.ts` and `src/repositories/repositories.ts`. The repository factory imports both Firebase and mock repositories, then selects Firebase when `env.dataSource === 'firebase'`. This is a runtime repository switch, not a page-specific bypass.

## Authentication Dependency

Protected page access follows:

```text
AuthProvider
  ↓
Current Firebase user
  ↓
ProfileProvider / ProtectedRoute
  ↓
userId-gated Firestore hooks and repositories
```

Findings:

- `AuthProvider` subscribes to Firebase Auth and returns the unsubscribe function.
- `ProtectedRoute` waits for auth/profile loading and redirects unauthenticated users.
- User-dependent hooks generally check `userId` before querying and expose loading/error state.
- `useConversation` and `useActivityPlan` additionally require an authorized conversation/connection before subscribing.
- No unauthenticated Firestore request was confirmed in the reviewed page flows.
- `ProfileProvider` catches profile-load errors and returns `profile: null` without exposing an error state. This can look like a missing profile and trigger onboarding routing.

## Realtime Listener Audit

Firebase `onSnapshot()` is used by:

| Listener | File | Cleanup result |
| --- | --- | --- |
| Blocks | `src/repositories/block/firebase-block-repository.ts` | YES; safety provider returns cleanup |
| Connections | `src/repositories/connection/firebase-connection-repository.ts` | YES; connection provider calls unsubscribe |
| Conversations | `src/repositories/chat/firebase-chat-repository.ts` | YES; conversations provider calls unsubscribe |
| Messages | `src/repositories/chat/firebase-chat-repository.ts` | YES; `use-conversation` calls unsubscribe |
| Activity plan | `src/repositories/activity-plan/firebase-activity-plan-repository.ts` | YES; `use-activity-plan` calls unsubscribe |
| Auth state | `src/repositories/auth/firebase-auth-repository.ts` | YES; `AuthProvider` returns unsubscribe |

No listener leak was confirmed. Effects use cleanup and, where applicable, an active flag to ignore late results.

## Problems Found

### HIGH — Mock login credentials are statically bundled in Firebase mode

| Field | Finding |
| --- | --- |
| Page | `/auth/login` |
| File | `src/features/auth/pages/login-page.tsx:17,31-34` |
| Problem | `MOCK_LOGIN_DEFAULTS` is statically imported from the mock auth repository. The values are only used when `env.dataSource === 'mock'`, but the static import can still ship the mock credentials in the frontend bundle while Firebase mode is active. |
| Suggested fix | Keep mock credentials outside the production bundle, or load mock-only code through a development/test-only boundary. |

### MEDIUM — Profile contains active non-Firestore sample data

| Field | Finding |
| --- | --- |
| Page | `/profile` |
| Files | `src/features/profile/pages/profile-page.tsx:228`, `src/features/ratings/components/reliability-card.tsx`, `src/features/ratings/mock-ratings.ts`; `src/features/recap/components/monthly-recap-banner.tsx`, `src/features/recap/use-monthly-recap-demo.ts`, `src/data/last-month-exercise.json` |
| Problem | The profile itself uses Firestore, but the visible Track Record card uses a demo ratings source and the visible monthly recap banner uses static JSON. These sections are not persisted through Firestore. |
| Suggested fix | Replace the active demo components with Firestore-backed attendance/recap data, or label and gate them explicitly as development-only. |

### MEDIUM — Home can display an empty state when a Firestore read fails

| Field | Finding |
| --- | --- |
| Page | `/home` |
| File | `src/pages/home-page.tsx:27-42,77-100` |
| Problem | The activity hooks expose errors, but the page primarily branches on loading and empty results. A failed activity/post read can therefore look like “no activities” rather than an error. |
| Suggested fix | Render the hook error state with retry guidance instead of treating failed reads as empty data. |

### LOW — Profile-load errors are swallowed

| Field | Finding |
| --- | --- |
| Area | Global profile loading; affects protected routes |
| File | `src/providers/profile-provider.tsx:39-46` |
| Problem | Profile read failures set the profile to null and do not expose an error/retry state. Routing may interpret the result as incomplete onboarding. |
| Suggested fix | Preserve and surface the error separately from a genuinely missing profile. |

### LOW — Safety listener errors are not exposed to the UI

| Field | Finding |
| --- | --- |
| Area | Global block/safety state |
| File | `src/providers/safety-provider.tsx` |
| Problem | A failed block listener clears loading but does not expose an error. The UI may behave as if there are no blocked users. |
| Suggested fix | Keep a safety error state and fail closed for safety-sensitive actions. |

### LOW — Discovery match-count failures become zero candidates

| Field | Finding |
| --- | --- |
| Page | `/settings/discovery` |
| File | `src/features/settings/use-discovery-match-count.ts:35-37` |
| Problem | Candidate-loading failure is caught and replaced with an empty candidate list, which can make the match count appear to be zero. |
| Suggested fix | Expose the failure separately from a legitimate zero-match result. |

No confirmed wrong repository import, missing Firebase call, unauthenticated Firestore request, or listener cleanup defect was found in the audited core flows.

## Recommended Fix Order

1. Prevent mock login credentials from entering Firebase-mode production bundles.
2. Replace or explicitly gate the mock ratings and static recap sections on `/profile`.
3. Add visible error/retry handling for Home activity reads.
4. Separate profile-load and safety-listener failures from valid empty states.
5. Add an explicit production environment verification step for `VITE_DATA_SOURCE=firebase`.

## Important Files

### Routing and page entry points

- `src/routes/app-router.tsx`
- `src/routes/routes.ts`
- `src/routes/protected-route.tsx`
- `src/routes/use-route-state.ts`
- `src/pages/home-page.tsx`
- `src/pages/privacy-policy-page.tsx`
- `src/features/*/pages/*.tsx`

### Firebase configuration and switching

- `src/config/env.ts`
- `src/services/firebase/config.ts`
- `src/services/firebase/client.ts`
- `src/repositories/repositories.ts`
- `.env.local` (values intentionally not disclosed)
- `.env.example`
- `.env.test`

### Providers and authentication

- `src/App.tsx`
- `src/providers/auth-provider.tsx`
- `src/providers/profile-provider.tsx`
- `src/providers/safety-provider.tsx`
- `src/providers/connection-provider.tsx`
- `src/providers/conversations-provider.tsx`
- `src/repositories/auth/firebase-auth-repository.ts`
- `src/services/auth/auth-service.ts`

### Firebase repository layer

- `src/repositories/profile/firebase-profile-repository.ts`
- `src/repositories/public-profile/public-profile-repository.ts`
- `src/repositories/connection/firebase-connection-repository.ts`
- `src/repositories/block/firebase-block-repository.ts`
- `src/repositories/report/firebase-report-repository.ts`
- `src/repositories/chat/firebase-chat-repository.ts`
- `src/repositories/activity-plan/firebase-activity-plan-repository.ts`
- `src/repositories/activity/firebase-activity-repository.ts`
- `src/repositories/activity-post/firebase-activity-post-repository.ts`
- `src/repositories/group-activity/firebase-group-activity-repository.ts`
- `src/repositories/attendance/firebase-attendance-repository.ts`

### Relevant hooks and services

- `src/features/activities/use-activities.ts`
- `src/features/activities/use-activity.ts`
- `src/features/discover/use-discover.ts`
- `src/features/discover/use-activity-posts.ts`
- `src/features/group-activities/use-group-activities.ts`
- `src/features/chat/use-conversation.ts`
- `src/features/planning/use-activity-plan.ts`
- `src/features/recap/use-monthly-recap.ts`
- `src/services/attendance/attendance-service.ts`
- `src/services/recap/recap-service.ts`

## Current Status

| Check | Status |
| --- | --- |
| Every configured route inventoried | YES |
| Every Firestore-connected route traced to a repository | YES |
| Current local data source is Firebase | YES |
| Firebase Auth dependency verified | YES |
| Firestore collection references mapped | YES |
| Protected-page user gating verified | YES |
| Realtime listeners unsubscribe | YES |
| All visible page data is Firestore-backed | NO — `/profile` contains active demo/static sections |
| Firebase production environment confirmed | UNCONFIRMED |
| Firebase REST API used | NO found |
| Firebase Admin SDK used | NO found |
| Confirmed broken core Firestore flow | NO |
