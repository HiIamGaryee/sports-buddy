# Monetization — RevenueCat + Buddy+ (Shipaton)

The one paid tier: **Buddy+**. RevenueCat is the entitlement source of truth
— nothing in Firestore ever stores `premium: true`.

## Architecture

```
UI (paywall, gated features, Settings "Manage subscription")
  ↓ useSubscription()
SubscriptionProvider        one React source of truth, one scoped listener
  ↓
purchasesService            uid validation, user-safe errors
  ↓
purchasesRepository         chosen by PLATFORM in repositories.ts
  ↓
@revenuecat/purchases-capacitor (entitlements/purchases)
@revenuecat/purchases-capacitor-ui (hosted Paywall + Customer Center)
  |  web stand-in (browser)
```

**The entitlement identifier is `sportbuddy_pro`** (`BUDDY_PLUS_ENTITLEMENT_ID`
in `src/constants/entitlements.ts`) — it must match the entitlement's exact
id in the RevenueCat dashboard, not the app's own display name ("Buddy+").
Mixing these up (an earlier pass used `buddy_plus` as a placeholder before a
real dashboard project existed) means every purchase silently "succeeds" at
the store level but never unlocks anything in the app — nothing throws, the
entitlement id in `CustomerInfo` just never matches.

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
  `isBuddyPlus`, `offering`, `purchase()`, `redeemCode()`, `restore()`.
- `src/lib/capabilities.ts` — the ONLY place a feature checks entitlement:
  `isBuddyPlus`, `canJoinAnotherGroupActivity`, `canHostAnotherGroupActivity`,
  `canUseAdvancedDiscoverFilters`, `canUseReliabilityFilter`,
  `canUseAdvancedAnalytics`. Pure, no Firebase/React/RevenueCat — every
  `if (premium)` in the app goes through one of these, never a raw
  `state === 'buddy_plus'`. `'unknown'`, `'loading'` and `'error'` all fail
  CLOSED (treated as free), so a feature never flashes on before the real
  state is known and a RevenueCat outage never silently grants Buddy+.
- `src/features/premium/pages/paywall-page.tsx` — `/buddy-plus`. The primary
  path is `presentPaywall()` (`RevenueCatUI.presentPaywallIfNeeded`), the
  RevenueCat-hosted Paywall UI designed in the dashboard (Tools → Paywalls),
  the officially recommended way to sell an entitlement. Its outcome is
  `'purchased' | 'restored' | 'cancelled' | 'not-presented' | 'error'`
  (`PaywallOutcome`, mapped from `PAYWALL_RESULT` at the repository boundary
  — the enum itself never leaves `native-purchases-repository.ts`).
  `'not-presented'` reveals a FALLBACK: this page's own package list built
  from `offering` — used on the web stand-in (no native Paywall exists
  there) and whenever no Paywall has been designed yet for the current
  offering. Prices and billing periods there are always RevenueCat's own
  localized store strings; nothing here hardcodes a price.
- Once entitled, the same page (and a "Manage subscription" row in Settings)
  offers `presentCustomerCenter()` — the RevenueCat-hosted Customer Center
  (cancel, change plan, see receipts), native only.
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

- `getOffering()` returns `null` — the paywall does not invent prices or a
  broken package list.
- `purchasePackage()` / `restorePurchases()` throw a coded, user-safe error.
- No store purchase is faked on the web. The browser has a deliberately
  separate demo path: the seeded `super-tai@gmail.com` account starts with
  Buddy+, and the paywall accepts ten one-time local demo codes. Redemptions
  are stored in browser localStorage and are not production entitlements.
- `getEntitlements()` returns Buddy+ only for that seeded account or a local
  code redemption; all other web accounts read as `free`.

## RevenueCat Test Store — manual dashboard setup

RevenueCat needs a real project and a Test Store product before a purchase
can be demonstrated. This cannot be done from this codebase — do it once in
the [RevenueCat dashboard](https://app.revenuecat.com):

1. Create (or open) the RevenueCat project for Sports Buddy.
2. **Enable Test Store** for the project (Project settings → Test Store).
   No Google Play Console or App Store Connect setup is required for this.
3. Create the entitlement **`sportbuddy_pro`** (must match
   `BUDDY_PLUS_ENTITLEMENT_ID` in `src/constants/entitlements.ts` exactly —
   this is the id that has to match, not the tier's display name).
4. Create Test Store products — e.g. `monthly`, `yearly`, `lifetime` — and
   attach each to the `sportbuddy_pro` entitlement via an **Offering** (the
   default/"current" offering — `getOffering()` reads
   `Purchases.getOfferings().current`; any package on it shows up on the
   fallback list automatically, no code change per product).
5. Optional but recommended: design a **Paywall** (Tools → Paywalls,
   attached to the same offering) so `presentPaywall()` shows RevenueCat's
   own hosted UI instead of the plain fallback list.
6. Copy the **Test Store API key** (Project settings → API keys → the Test
   Store app) into `VITE_REVENUECAT_ANDROID_API_KEY` in `.env`, and rebuild
   the Android app (`npm run cap:sync`, then `npm run android:apk`).
7. **Sandbox testing access** (Project settings → Sandbox testing access)
   must be **"Anybody"**, or your specific App User ID (= your Firebase
   uid — Firebase Console → Authentication → your account → "User UID"
   column) must be on the allowlist if you chose "Allowed App User IDs
   only." Left on that setting with an empty list, EVERY test purchase
   silently fails to grant an entitlement — this is the single most common
   reason "the purchase doesn't unlock anything" during testing.
8. Later, for a real Play Store release: create a separate **Android** app +
   API key in the same project once billing is wired to Google Play, and
   swap the value of `VITE_REVENUECAT_ANDROID_API_KEY` — no code changes.

### Demonstrating a purchase

Free account → Settings → Buddy+ (or `/buddy-plus`) → **Get Buddy+** → the
RevenueCat Paywall (or the fallback list) → choose a package → RevenueCat
records a real (non-production) transaction → `CustomerInfo.entitlements`
includes `sportbuddy_pro` → `useSubscription()` updates via its live
listener → gated features unlock immediately, with no app restart.

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

## Account deletion still needs to call RevenueCat too (not built yet)

Account deletion itself is not built (see `docs/project-overview.md`). When
it is, it must also call RevenueCat's [Delete customer
API](https://www.revenuecat.com/docs/api-v1#tag/customers/operation/delete-customer)
(or at minimum, stop worrying about the local subscriber — RevenueCat does
not need an explicit "delete" to stop charging someone whose store
subscription they cancel themselves) for the deleted uid, so a re-signup
with the same email does not inherit a stranger's old entitlement history.
`purchasesRepository.reset()` (called on sign-out) only logs the SDK out of
the current session; it does not delete anything server-side.

## What is deliberately absent

- Multiple subscription tiers — Buddy+ is the only one.
- A server-verified purchase webhook / Cloud Function reconciling
  entitlement into Firestore — RevenueCat's own `CustomerInfo` is read
  directly, live, every time.
- A real RevenueCat WEB purchase flow (Stripe/RevenueCat Billing) — out of
  scope for this Shipaton pass; the web build uses only the documented local
  demo account and redeem codes.
