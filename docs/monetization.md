# Monetization — RevenueCat + Buddy+ (Shipaton)

The one paid tier: **Buddy+**. RevenueCat is the entitlement source of truth
— nothing in Firestore ever stores `premium: true`.

## Architecture

```
UI (paywall, gated features)
  ↓ useSubscription()
SubscriptionProvider        one React source of truth, one scoped listener
  ↓
purchasesService            uid validation, user-safe errors
  ↓
purchasesRepository         chosen by PLATFORM in repositories.ts
  ↓
@revenuecat/purchases-capacitor (native Android)  |  web stand-in (browser)
```

- `src/types/subscription.ts` — `SubscriptionState`
  (`unknown | loading | free | buddy_plus | error`), `SubscriptionOffering`,
  `SubscriptionPackage`. No RevenueCat SDK type ever leaves the repository
  layer — same rule as Firebase.
- `src/repositories/purchases/*` — `PurchasesRepository` contract,
  `purchases-mapper.ts` (the one place a raw `PurchasesOffering` /
  `CustomerInfo` becomes our own type), `native-purchases-repository.ts`
  (`@revenuecat/purchases-capacitor`), `web-purchases-repository.ts` (the
  browser stand-in — see below).
- `src/services/purchases/purchases-service.ts` — validates the uid,
  derives `SubscriptionState` from the active entitlement ids, maps every
  RevenueCat error code to a user-safe sentence
  (`purchases-error.ts`, mirrors `auth-error.ts`).
- `src/providers/subscription-provider.tsx` + `subscription-context.ts` —
  mounted in `ProtectedRoute` (beside `ConnectionProvider` /
  `ConversationsProvider`), so no purchases call ever runs on the login,
  register or onboarding screens. `useSubscription()` exposes `state`,
  `isBuddyPlus`, `offering`, `purchase()`, `restore()`.
- `src/lib/capabilities.ts` — the ONLY place a feature checks entitlement:
  `isBuddyPlus`, `canJoinAnotherGroupActivity`, `canHostAnotherGroupActivity`,
  `canUseAdvancedDiscoverFilters`, `canUseReliabilityFilter`,
  `canUseAdvancedAnalytics`. Pure, no Firebase/React/RevenueCat — every
  `if (premium)` in the app goes through one of these, never a raw
  `state === 'buddy_plus'`. `'unknown'`, `'loading'` and `'error'` all fail
  CLOSED (treated as free), so a feature never flashes on before the real
  state is known and a RevenueCat outage never silently grants Buddy+.
- `src/features/premium/pages/paywall-page.tsx` — `/buddy-plus`. Prices and
  billing periods are always RevenueCat's own localized store strings;
  nothing here hardcodes a price.
- `src/constants/entitlements.ts` — `BUDDY_PLUS_ENTITLEMENT_ID`,
  `FREE_MAX_JOINED_GROUP_ACTIVITIES` (3), `FREE_MAX_HOSTED_GROUP_ACTIVITIES`
  (2). Centralized, same as every other limit in this app.

## Identity mapping

`purchasesService.configure(uid)` calls `Purchases.configure({ apiKey,
appUserID: uid })` with the SIGNED-IN Sports Buddy uid, so the entitlement
travels with the account, not the device. On sign-out (`userId` becomes
`null`), the provider's effect cleanup calls `purchasesRepository.reset()`
(`Purchases.logOut()`), so a second account on the same device never
inherits the first one's entitlement state.

## Native vs. web (Shipaton requirement)

`repositories.ts` picks the purchases repository by **platform**, not by
`env.dataSource`:

```ts
export const purchasesRepository = Capacitor.isNativePlatform()
  ? nativePurchasesRepository
  : webPurchasesRepository
```

A real purchase can only happen inside the Capacitor Android app. The
browser build (Firebase Hosting demo, `npm run dev`, a future Vercel deploy)
always gets `webPurchasesRepository`:

- `getOffering()` returns `null` — the paywall shows "Buddy+ purchases are
  only available in the Sports Buddy Android app" rather than inventing
  prices or a broken package list.
- `purchasePackage()` / `restorePurchases()` throw a coded, user-safe error.
  **No purchase is ever faked on the web** — there is no "pretend Buddy+"
  toggle anywhere in this codebase.
- `getEntitlements()` returns `{ activeEntitlementIds: [] }`, so the web
  build always reads as `free`.

## RevenueCat Test Store — manual dashboard setup

RevenueCat needs a real project and a Test Store product before a purchase
can be demonstrated. This cannot be done from this codebase — do it once in
the [RevenueCat dashboard](https://app.revenuecat.com):

1. Create (or open) the RevenueCat project for Sports Buddy.
2. **Enable Test Store** for the project (Project settings → Test Store).
   No Google Play Console or App Store Connect setup is required for this.
3. Create the entitlement **`buddy_plus`** (must match
   `BUDDY_PLUS_ENTITLEMENT_ID` in `src/constants/entitlements.ts` exactly).
4. Create a Test Store product (e.g. a monthly subscription) and attach it
   to the `buddy_plus` entitlement via an **Offering** (the default/"current"
   offering — `getOffering()` reads `Purchases.getOfferings().current`).
5. Copy the **Test Store API key** (Project settings → API keys → the Test
   Store app) into `VITE_REVENUECAT_ANDROID_API_KEY` in `.env`, and rebuild
   the Android app (`npm run cap:sync`, then `npm run android:apk`).
6. Later, for a real Play Store release: create a separate **Android** app +
   API key in the same project once billing is wired to Google Play, and
   swap the value of `VITE_REVENUECAT_ANDROID_API_KEY` — no code changes.

### Demonstrating a purchase

Free account → Settings → Buddy+ (or `/buddy-plus`) → choose the Test Store
package → RevenueCat records a real (non-production) transaction →
`CustomerInfo.entitlements` includes `buddy_plus` → `useSubscription()`
updates via its live listener → gated features unlock immediately, with no
app restart.

## Free/Buddy+ capability enforcement — an HONEST LIMITATION

`groupActivityService.create()` and `.join()` count the caller's own live
documents (`listMine` / `listJoined`, filtered to upcoming) and compare
against `FREE_MAX_HOSTED_GROUP_ACTIVITIES` / `FREE_MAX_JOINED_GROUP_ACTIVITIES`
via `src/lib/capabilities.ts` BEFORE writing.

This is a **client-side check only**. `firestore.rules` cannot enforce it: a
`create` (or a `participantIds` update) rule has no way to count a member's
OTHER documents without a maintained counter field this project does not
have (adding one would need a Cloud Function to keep it consistent, which is
out of scope for this pass). A modified client calling the Firestore SDK
directly could still exceed the free limits.

This is the same trust level as `MAX_PENDING_JOIN_REQUESTS` in
`src/constants/activity-posts.ts`, which is likewise a service-level-only
constant today. It is recorded here, honestly, rather than silently assumed
to be secure — see `docs/security-audit.md` for the project's broader stance
on this kind of gap.

## What is deliberately absent

- Multiple subscription tiers — Buddy+ is the only one.
- A server-verified purchase webhook / Cloud Function reconciling
  entitlement into Firestore — RevenueCat's own `CustomerInfo` is read
  directly, live, every time.
- A real RevenueCat WEB purchase flow (Stripe/RevenueCat Billing) — out of
  scope for this Shipaton pass; the web build only ever shows the paywall
  and explains that purchasing needs the Android app, per the constraint
  above.
- Any fake/local "premium" toggle for testing convenience — testing Buddy+
  must always go through a real Test Store transaction.
