# Responsive audit (STEP 9.5)

Every route and shared component in the app, inspected at phone, tablet and
desktop widths in both themes.

**Verification note.** No headless browser is installed in this environment,
so this audit is a code-level inspection of every route plus the compiled CSS
(utility output, breakpoint ranges, overflow constraints) — not a screenshot
pass. Where a behaviour needs a real device (mobile keyboard inside a
Capacitor WebView, tablet landscape rotation) it is called out as outstanding
rather than claimed.

## Philosophy

| | Breakpoint | Shape |
| --- | --- | --- |
| Phone | `< md` (<768px) | single column, bottom navigation, native feel |
| Tablet | `md` (768–1023px) | navigation rail, 2-column grids, master–detail messages |
| Desktop | `lg` (≥1024px) | sidebar, wider grids, side panels, higher density |

All three share the same routes, services, repositories, hooks and state.
Only presentation adapts. No page was duplicated per breakpoint.

## Test matrix

Layouts were reasoned through at 390, 430, 768, 820, 1024, 1280 and 1440px
against the compiled breakpoint ranges. STEP 10's planner route was added to
the same matrix. Dark is the primary theme; every
change uses semantic tokens, so light follows automatically (no
breakpoint-specific colour exists anywhere).

## Routes

| Route | Mobile | Tablet | Desktop | Issues found | Changes made | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `/auth/login` | single column, `max-w-narrow`, brand above form | same column, wider gutters | brand panel ∣ form split | phone card floating in empty space at 1440px; form column locked to `max-w-content` | `AuthLayout` rebuilt as a split; form pinned to `max-w-narrow`; gradient brand mark | PASS |
| `/auth/register` | as above | as above | as above | same | shares `AuthLayout` | PASS |
| `/onboarding` | sticky header + step + sticky CTA | same, wider column | step title/progress in a fixed left column, content + CTA beside it | 8-step flow in a 480px strip with huge desktop margins; sport grid stuck at 2 columns | `OnboardingLayout` → `lg:grid-aside-start`; CTA becomes inline `lg:w-auto`; `SportSelector` 2 → 3 → 4 columns | PASS |
| `/home` | single column | single column, wider | quick-action card ∣ upcoming, 2 columns | tall single column wasting desktop width; stacked full-width CTAs | `size="wide"`; `lg:grid-cols-2`; CTAs go side by side from `sm` | PASS |
| `/discover` | 1-column feed, bottom filter sheet | 2-column grid, filter sheet | persistent filter sidebar + 2–3 column grid | oversized vertical cards in one column at 1440px; desktop forced through a bottom sheet; skeleton was a single mobile column | `size="wide"`; `CARD_GRID` 1/2/3; `DiscoverFilterPanel` from `lg`; sheet gets `lg:hidden`; skeleton follows the grid; cards `h-full` + `mt-auto` actions | PASS |
| `/discover/:userId` | single column + sticky bottom CTA | same, wider | profile ∣ compatibility + connect card | one very wide column; a full-width sticky bar under a desktop page | `size="wide"`; `lg:grid-aside-end`; sticky bar becomes a card in the side column at `lg`, and `md:bottom-0` where there is no bottom nav | PASS |
| `/activities` | tabs + empty state | wider | wider, tabs at natural width | full-width phone tab bar stretched across the page | `size="wide"`; `TabsList` `w-full sm:w-auto` | PASS |
| `/messages` | conversation list | list ∣ "select a buddy" detail | same, wider detail | behaved like a phone at every width | `MessagesLayout` master–detail; `ConversationEmptyPage` for the detail pane | PASS |
| `/messages/:conversationId` | full-screen chat, no bottom nav | list ∣ conversation | list ∣ conversation, wider | chat locked to phone width on a MacBook; route lived outside `AppShell`, so desktop had no navigation | route moved inside `AppShell` under `MessagesLayout`; `ChatLayout` fills the pane (`md:h-full`), back button `md:hidden`, messages in a centred `max-w-default` column; bubbles capped `md:max-w-[70%] lg:max-w-md` | PASS |
| `/messages/:conversationId/plan` | focused step flow: progress, one step, summary at the end | wider step content, 2-column time and budget steps | planner ∣ sticky live summary (`grid-aside-end`) | new in STEP 10 | `size="wide"`; `lg:grid-aside-end` with a sticky `PlanSummary`; sport grid 1/2/3; time and budget steps split into suggestions ∣ editor at `lg`; sits beside the app sidebar rather than inside the chat pane | PASS |
| `/messages/:conversationId/plan` (venue step) | search + map preview (240px) above a single-column venue list | same, wider cards | list ∣ sticky map, full page width (the plan summary drops below rather than making a third cramped column) | new in STEP 11 | venue step is `lg:grid-cols-[1fr_1.1fr]`; the page drops its `grid-aside-end` aside while the venue step is active; map is `h-60` on a phone and `lg:h-[28rem]` sticky | PASS |
| `/activities` | 1-column activity cards, full-width tabs | 2-column grid, tabs at natural width | 3-column grid at `xl` | rebuilt in STEP 12 (was an empty placeholder) | `size="wide"`; `md:grid-cols-2 xl:grid-cols-3`; card skeletons follow the grid; Past tab honestly empty | PASS |
| `/activities/:activityId` | stacked details then venue, compact map | same, wider | details ∣ venue (`grid-aside-end`) | new in STEP 12 | `size="wide"`; `lg:grid-aside-end`; map `h-48`, optional and non-blocking | PASS |
| `/messages/:conversationId/plan` (final review) | focused review card with the full summary and a sticky-free Confirm CTA | same, wider | review card at full column width; the summary sidebar folds away so the same information is not shown twice | new in STEP 12 | review renders `PlanSummary` inline and the aside column is dropped while it shows | PASS |
| `/profile` | stacked sections | 2-column detail sections | hero/actions ∣ 2-column details, sticky left | full-width cards in one long column | `size="wide"`; `lg:grid-aside-start` with a sticky left column; details `md:grid-cols-2`; Discovery spans both | PASS |
| `/profile/edit` | single column, sticky save bar | readable column, actions in header | same | phone-width form; sticky bottom bar under a tall desktop window | `EditLayout` `max-w-default`, actions move to the header from `md`; playing style + budget pair at `md` | PASS |
| `/settings` | grouped list | grouped list, wider | section nav ∣ content | one very long vertical mobile list on desktop | `size="wide"`; `lg:grid-nav-start` with a sticky anchor nav; sections carry ids; Sign Out stops being full width from `sm` | PASS |
| `/settings/discovery` | single column, sticky save | readable column, header actions | same | inherited the phone-only `EditLayout` | fixed via `EditLayout` | PASS |
| `/` `/auth` `*` | redirects | redirects | redirects | none | none | PASS |

## Shared components

| Component | Issues found | Changes made | Status |
| --- | --- | --- | --- |
| `AppShell` | whole app constrained to `max-w-content`; bottom nav on desktop; `sm:border-x` phone frame | three navigation variants by breakpoint; content column scrolls from `md`; one `useMatch` to drop the bottom bar on mobile chat | PASS |
| `AppHeader` | 390px toolbar at every width; no alignment with page width | `size` prop, `md:text-display`, `px-gutter`, taller from `md` | PASS |
| `PageContainer` | one phone width for every page; fixed `px-page` | `size` variants, `px-gutter`, `md:gap-8`, mobile-only bottom-nav clearance | PASS |
| `BottomNavigation` | centred on `max-w-content`, rendered at all widths | full width, `md:hidden`, not rendered above `md` | PASS |
| `NavigationRail` | did not exist | new, tablet only, same nav config | PASS |
| `DesktopSidebar` | did not exist | new, desktop only, same nav config + Settings + gradient brand | PASS |
| `AuthLayout` | phone column only | split layout from `lg` | PASS |
| `EditLayout` | sticky bottom bar at all widths | header actions from `md`, `max-w-default` | PASS |
| `ChatLayout` | own `h-dvh` screen with a phone-width column | fills its pane, centred message column, `md:hidden` back button | PASS |
| `OnboardingLayout` | phone proportions only | left column at `lg` | PASS |
| `BuddyCard` | grew tall in a grid; no desktop affordance | `h-full`, `mt-auto` actions, `hover:shadow-hover` | PASS |
| `ConversationListItem` | no selected state (needed for master–detail); no hover | `isSelected` + `aria-current`, `md:rounded-xl`, hover tint | PASS |
| `MessageBubble` | `max-w-[80%]` stretched across a desktop pane | capped at `md:max-w-[70%] lg:max-w-md` | PASS |
| `MessageComposer` | none — 16px base size and safe area already correct | none | PASS |
| `ChatLayout` (STEP 10) | no room for a planning entry point | `action` slot in the header, `banner` slot above the composer; header title flexes so the action never squashes it | PASS |
| `PlanProgress` | new | three equal-width steps, tick + label (never colour alone), tappable to revisit a step | PASS |
| `PlanSummary` | new | stacked rows; becomes a sticky side panel at `lg` | PASS |
| `SportStep` | new | 1 / 2 / 3 column grid reusing `SelectableCard` | PASS |
| `TimeStep` | new | stacked on a phone; suggestions ∣ exact date/time editor from `lg` | PASS |
| `BudgetStep` | new | stacked on a phone; shared-budget context ∣ preset grid from `lg` | PASS |
| `PlanChatCard` | new | single compact row at every width, truncating the decisions line; becomes the confirmed-activity row after STEP 12 | PASS |
| `ActivityCard` (STEP 12) | new | date block + details in one row; whole card is a single link and keyboard target; fits 1/2/3-column grids | PASS |
| `ActivityStatusBadge` | new | word, not colour alone | PASS |
| `VenueStep` (STEP 11) | new | search + honest area copy above; list and map stack on a phone, split from `lg` with the list first in source order | PASS |
| `VenueCard` | new | full-width row; name/address button, rating and distance metadata wrap, actions wrap on a narrow phone | PASS |
| `VenueMap` | new | `h-60` phone preview, `lg:h-[28rem]` sticky panel; renders **nothing** if Maps fails, leaving the list intact | PASS |
| `MessagesListPane` | was a whole page | pane-aware: scrolls internally, card frame dropped from `md` | PASS |
| `DiscoverFilterSheet` | was the only filter presentation | fields extracted; sheet is now `< lg` only | PASS |
| `DiscoverFilterFields` | did not exist | new — the single filter implementation | PASS |
| `DiscoverFilterPanel` | did not exist | new — persistent desktop filters | PASS |
| `EmptyState` | fixed padding, no width control | `className`, `md:py-14` | PASS |
| `ActiveFilterChips` | shown even where the filter panel is visible | `className`, hidden at `lg` | PASS |
| `ProfileSection` | no layout control for a grid | `className` | PASS |
| `SettingsSection` | no anchor target | `id` + `scroll-mt` | PASS |
| `SportSelector` | 2 columns at every width | 2 / 3 / 4 | PASS |
| `AppSplash` | flat brand bar | gradient bar | PASS |
| `Button` | flat primary read as plain | `default` variant uses `bg-primary-gradient` | PASS |
| `Card` | flat, no desktop affordance | `shadow-hover` token available; applied on buddy cards | PASS |

## Overflow and text

- No `max-w-content` remains in `src/`; no `100vh`, `h-screen` or
  `min-h-screen` anywhere (`h-dvh` / `min-h-dvh` only).
- Long names and previews use `truncate` with `min-w-0` parents; bios use
  `line-clamp-2`; message content uses `wrap-anywhere whitespace-pre-wrap` so
  a long URL cannot push a page sideways.
- Filter chips wrap into the available width in both the sheet and the panel;
  nothing is clipped or horizontally scrolled.
- Grid columns use `minmax(0, 1fr)` so a long child cannot blow out a track.

## Hardcoded values removed

- `max-w-content` on `AppShell`, `AuthLayout`, `OnboardingLayout`,
  `EditLayout`, `ChatLayout`, `BottomNavigation`.
- `sm:border-x` phone frame edges on four layouts.
- `px-page` as a page gutter → `px-gutter` (kept only as internal padding on
  `EmptyState` and `AppSplash`).
- Four one-off `grid-cols-[…]` values → `grid-aside-start` /
  `grid-aside-end` / `grid-nav-start`.
- `w-64` on the filter panel → `w-nav-column`.

No `#hex`, `rgb()`, `hsl()` or hand-rolled gradient exists in any component;
no component reads `window.innerWidth` or attaches a resize listener; no
custom `@media` outside `theme.css`.

## Data and performance

Presentation only. No repository, service, hook or subscription was changed,
and no query was added or duplicated by a breakpoint. Layout changes are CSS,
so nothing re-fetches when a window is resized.

One deliberate trade: `MessagesListPane` stays mounted while a conversation is
open, so on a phone the conversations subscription and the single batched
profile query stay active behind the chat. That keeps going back instant and
avoids tearing down and recreating the subscription on every navigation.

## Accessibility

- Touch targets stay ≥44px on mobile; desktop tightens rhythm, not hit areas.
- Every navigation variant is a `<nav aria-label="Main">` with `NavLink`
  `aria-current="page"`; the settings nav is `<nav aria-label="Settings
  sections">`; the selected conversation row carries `aria-current`.
- Focus rings (`focus-visible:ring-ring/50`) are intact on every new
  interactive element, including sidebar, rail and settings anchors.
- Nothing essential is hover-only — hover adds elevation and tint, never
  meaning or access.
- Chat keyboard behaviour (Enter sends, Shift+Enter newline) is untouched.
- DOM order still matches reading order in every two-column layout: the
  primary content precedes the aside in source on the candidate profile, and
  the nav precedes content in settings.

## Outstanding

- **Visual/device QA.** Screenshot verification at each width, and mobile
  keyboard behaviour inside a real Capacitor WebView, still need a device or a
  headless browser.
- **Tablet landscape** (1024×1366 portrait vs landscape) resolves to the `lg`
  desktop layout at ≥1024px width, which is intended, but has not been seen on
  hardware.

---

## Activities and calendar (STEP 13)

Verified with a headless browser in mock mode at every listed width, dark and
light, with seeded activity history. **No horizontal overflow and no console
errors at any width.**

### `/activities` — Upcoming and Past

| Width | Navigation | Card grid | Notes |
| --- | --- | --- | --- |
| 390 | bottom bar | 1 column | tabs full-width, safe-area clearance intact |
| 430 | bottom bar | 1 column | |
| 768 | rail | 1 column | the rail plus gutters leave < 2 card widths; `grid-cards` decides from space, not a breakpoint |
| 820 | rail | 2 columns | |
| 1024 | sidebar | 2 columns | |
| 1280 | sidebar | 2 columns | |
| 1440 | sidebar | 3 columns | |

Both tabs share one body component, so loading, error, empty and "Load more"
states cannot drift apart between them. Column counts come from `grid-cards`
(`auto-fill`, 20rem floor) rather than per-breakpoint classes, which is why
768 correctly stays at one column instead of squeezing two.

Past history renders month groups (`SEPTEMBER 2026`, `AUGUST 2026`, …) with
the same grid inside each group, so grouping costs no separate responsive
treatment.

### `/activities/:activityId`

| Width | Layout |
| --- | --- |
| < 1024 | single column: details, venue, then the calendar card |
| ≥ 1024 | `grid-aside-end` — details and venue in the main column, the calendar card in the sticky aside |

The calendar card is **absent** for a past activity at every width, so no
layout has to accommodate a disabled control.

### Calendar interaction

The `Add to Calendar` CTA is a `size="lg"` primary button (44px+ target,
primary gradient) inside its own card. The result line is `role="status"` on
success and `role="alert"` on failure, so it is announced rather than only
seen. The accessible name is "Add to Calendar, downloads a calendar file" —
the visible text plus the one fact a sighted user gets from the surrounding
copy.

Temporal status is always TEXT (`Upcoming`, `Past`, `Happening now`) with an
icon, never colour alone.
