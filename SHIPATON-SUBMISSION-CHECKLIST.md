# Sports Buddy - Shipaton Next Gen Submission Checklist

Last verified: 24 September 2026

Official deadline: **30 September 2026, 11:45 PM Pacific Time**  
Malaysia deadline: **1 October 2026, 2:45 PM MYT**

Target: finish and submit by **29 September 2026**.

## Current status

- Devpost registration: complete
- Next Gen academic email: verified on the connected Devpost account
- Sports Buddy Devpost project: created as a submission draft
- Devpost submission: not submitted
- Current working branch: `mobile-test`
- Public GitHub repository: not public yet (the unauthenticated GitHub API currently returns 404)

## 1. Already complete

- [x] Register for RevenueCat Shipaton 2026 on Devpost.
- [x] Use a qualifying Taylor's University academic email on Devpost.
- [x] Build Sports Buddy as an Android app using Capacitor.
- [x] Connect the app to the live Firebase backend.
- [x] Integrate the RevenueCat Capacitor SDK.
- [x] Configure the `sportbuddy_pro` entitlement and Buddy+ offering.
- [x] Complete a RevenueCat Test Store purchase on Android.
- [x] Confirm that the purchase unlocks Buddy+ and creates a RevenueCat customer.
- [x] Use RevenueCat Test Store/sandbox for the Android demonstration; a live Google Play transaction is not required for the Next Gen Award.
- [x] Make the Buddy+ paywall describe only benefits that really work.
- [x] Test the free and Buddy+ sport limits.
- [x] Test the free and Buddy+ group-activity limits.
- [x] Test the Buddy+ Discover filters on the updated build.
- [x] Test the subscription-management screen and its Test Store fallback.
- [x] Add Restore Purchases controls to Settings and the paywall.
- [x] Build a signed release AAB successfully.
- [x] Pass the production web build.
- [x] Pass all 558 unit tests.
- [x] Pass all 224 Firestore security-rule tests.
- [x] Pass lint with warnings only.
- [x] Publish the web demo at <https://sportbuddy-4d596.web.app> (HTTP 200 verified).
- [x] Prepare a 1024 x 1024 icon at `resources/icon-only.png`.
- [x] Record the RevenueCat project ID: `projdfef7781`.
- [x] Add an MIT `LICENSE` file to the repository root.

## 2. Repository tasks - do these before making it public

- [x] Commit the Activities-page rebuild and mobile layout work on `mobile-test`.
- [x] Commit the new `LICENSE` and this submission checklist.
- [x] Remove `.claude/settings.local.json` from the working tree; do not publish personal tool settings.
- [x] Remove the generated `tmp/pdfs/shipaton-audit/` PNG files from the branch. They are audit artifacts, not project assets.
- [ ] Review the 13 commits currently ahead of `main` on `mobile-test`.
- [ ] Merge `mobile-test` into `main` after the current work is committed and reviewed.
- [ ] Push the final `main` branch to GitHub.
- [x] Update the README opening to describe the live Firebase backend accurately.
- [x] Update the README with the current feature list, Buddy+ behavior, Android setup, test commands, and demo link.
- [x] Remove the live Firebase tester password from the README.
- [ ] Rotate the removed live Firebase tester password before the repository becomes public.
- [x] Keep only the mock Buddy+ account in the README and label it as local test data.
- [x] Document the working Windows Gradle commands. The npm Android scripts still use the Unix-style `android/gradlew` path.
- [ ] Ask the GitHub repository owner to change the repository visibility to **Public**.
- [done] Confirm that GitHub detects `LICENSE` as an MIT license and displays it near the top of the repository.
- [ ] Clone the public repository into a clean folder and follow the README once, proving that a judge can run it.

## 3. Final Android verification

- [x] Confirm the **Manage or cancel Buddy+** fallback is honest in Test Store. RevenueCat Customer Center is store-backed and unavailable for Test Store purchases, so no additional Customer Center test is required for Shipaton.
- [ ] Rebuild the signed release AAB after the final code and branch merge; the earlier successful AAB predates the latest check-in and layout changes.
- [ ] Install the final build on an Android phone or emulator after all branch changes are merged.
- [done] Recheck the latest mobile-layout changes on the phone: no sideways scrolling on Discover, Buddy+, or Activities; the bottom bar stays fixed; and the Group/1-to-1 switches show the correct events.
- [done] Complete one final smoke test:
  - sign in with email/password
  - finish/open the profile
  - discover a buddy
  - connect and open chat
  - create a plan and choose a venue
  - confirm an activity
  - create or join a group activity
  - open Buddy+ and show the RevenueCat purchase/entitlement
- [ ] Confirm there are no crashes, blank screens, broken routes, or fake premium claims during the demo flow.

## 4. Required submission assets

- [x] App icon exists at exactly 1024 x 1024.
- [ ] Capture at least one app screenshot at exactly **1179 x 2556**, without a device frame.
- [ ] Preferably capture 3-5 strong screenshots for the Devpost gallery:
  - Discover and compatibility score
  - Chat or Plan Together
  - Group activity
  - Buddy+ paywall/current plan
  - Reliability profile, or monthly recap only if the demo account has past activity
- [ ] Store final screenshots in a clearly named folder such as `submission-assets/screenshots/`.
- [ ] Record an Android demo video shorter than two minutes.
- [ ] Show the working app on the device/emulator for which it was built.
- [ ] Show RevenueCat/Buddy+ clearly in the video.
- [ ] Do not use copyrighted music or third-party material without permission.
- [ ] Upload the video to YouTube or Vimeo and make it publicly viewable.
- [ ] Test the video link while signed out/private browsing.

## 5. Recommended video order (about 1 minute 50 seconds)

- [ ] 0:00-0:10 - State the problem: finding a compatible sports partner is difficult.
- [ ] 0:10-0:30 - Show Discover, compatibility score, and matching reasons.
- [ ] 0:30-0:50 - Show connection, chat, and Plan Together.
- [ ] 0:50-1:05 - Show a confirmed or group activity.
- [ ] 1:05-1:35 - Show Buddy+, RevenueCat purchase/entitlement, and a real unlocked benefit.
- [ ] 1:35-1:50 - Show the Reliability Profile and close with the product value. Use the monthly recap only if the demo account has real past activity; do not manufacture recap data solely for the video.
- [ ] Keep the strongest proof inside the first two minutes; judges may stop watching after that.

## 6. Devpost project and form

- [x] Create the Sports Buddy project on Devpost. It currently exists as a draft at <https://devpost.com/software/sportbuddy>.
- [done] Add every teammate to the Devpost project.
- [done] Select/opt into the **Next Gen Award**.
- [ ] Use `Android` as the app platform.
- [done] Add the final project title.
- [ ] Add a one-sentence tagline.
- [ ] Add an English description covering the problem, solution, working features, architecture, and Buddy+ monetization.
- [ ] Add the public GitHub repository URL in the Next Gen code-repository field.
- [done] Add the qualifying academic email in the Next Gen student-email field.
- [done] Add RevenueCat project ID `projdfef7781`.
- [ ] Upload the 1024 x 1024 app icon.
- [ ] Upload at least one 1179 x 2556 screenshot without a device frame.
- [ ] Add the public YouTube or Vimeo demo-video URL.
- [ ] Add the optional public web demo URL: <https://sportbuddy-4d596.web.app>.
- [done] If any team member is under the age of majority, complete the official parent/guardian consent form and confirm it in Devpost.
- [ ] Preview every Devpost section while signed out where possible.
- [ ] Submit before 29 September and verify that Devpost shows the project as submitted.

## 7. Final safety checks

- [ ] Confirm `.env`, Firebase private credentials, RevenueCat private keys, the Android keystore, and keystore passwords are not tracked by Git.
- [ ] Confirm the public repository contains only public RevenueCat SDK keys/configuration where required.
- [ ] Confirm the repository has no real user data or private chat content.
- [ ] Confirm all screenshots and the video use safe demo accounts and contain no personal information.
- [ ] Back up `android/sports-buddy-release.keystore` and `android/keystore.properties` outside the repository.

## 8. Non-blocking cleanup - only after the submission blockers

- [ ] Optionally tap **Restore purchases** once on the purchased account. It asks RevenueCat for an existing entitlement and does not make another purchase; automatic Buddy+ recovery after sign-in is already a valid result.
- [ ] Investigate the Vite large-bundle warning (about 527 KB gzip for the main JavaScript bundle).
- [ ] Reduce the current React lint warnings if time remains.
- [ ] Remove or relocate the old mock APK if it may confuse judges about which build is current.
- [ ] Remove unsupported `auth` configuration from `firebase.json` or document that Firebase CLI ignores it.

## Do not add before this submission

These are not required for the Next Gen Award and should not take time away from the checklist above:

- Google Play publication
- Native Google Sign-In
- Push notifications
- Account deletion
- Sentry or Codemagic
- Multiple active plans per buddy
- New reminder, reliability-filter, or advanced-recap premium features

## Final gate

Do not submit until every item in sections 2-7 that applies to the team is checked.
