# Sports Buddy — Design System

Single reference for the visual language. Raw values live in exactly one
file: `src/styles/theme.css`. Everything else consumes semantic tokens.

## 1. Brand personality

Energetic but premium. Dark, confident surfaces with one loud fluorescent
lime accent, sport orange for momentum, and a restrained warm gold for
"premium" moments. Typography does the shouting; borders stay quiet. The app
should feel like gear you want to be seen with, not a form you have to fill.

## 2. Design inspiration

- **Apple** — spacing, hierarchy, restrained borders, large touch targets,
  soft rounded surfaces, subtle depth.
- **Strava** — activity energy, metric-forward cards, unmistakable primary
  CTA.
- **Premium VIP dark** — near-black base, fluorescent lime accent, warm gold
  detail, high contrast.

Inspiration only — no cloned layouts, no borrowed iconography.

## 3. Light theme palette

| Role | Value |
| --- | --- |
| background | `#F6F7F8` |
| surface | `#FFFFFF` |
| card | `#FFFFFF` |
| foreground | `#15171A` |
| primary | `#46700D` (accessible deep lime) |
| secondary | `#FC5A1A` |
| accent | `#7A5B00` |
| muted | `#ECEEF1` / text `#5B6270` |
| border | `#E2E5EA` |
| success / warning / destructive | `#167C4A` / `#B45309` / `#CC2A2E` |

## 4. Dark theme palette (primary identity)

| Role | Value |
| --- | --- |
| background | `#0B0C10` |
| surface | `#111318` |
| card | `#17191F` |
| foreground | `#F7F8FA` |
| primary | `#C4FF3D` |
| secondary | `#FC5A1A` |
| accent | `#E7C768` |
| muted | `#1E212A` / text `#9BA1AE` |
| border | `#262A34` |
| success / warning / destructive | `#3FD37A` / `#FFB020` / `#FF5A5F` |

## 5. Semantic tokens

Components use the Tailwind utility, never the value.

| Token | Purpose | Dark | Light |
| --- | --- | --- | --- |
| `--background` | app canvas | `#0B0C10` | `#F6F7F8` |
| `--foreground` | primary text | `#F7F8FA` | `#15171A` |
| `--surface` | elevated section behind cards | `#111318` | `#FFFFFF` |
| `--surface-foreground` | text on surface | `#F7F8FA` | `#15171A` |
| `--card` | card background | `#17191F` | `#FFFFFF` |
| `--card-foreground` | text on card | `#F7F8FA` | `#15171A` |
| `--popover` | menus, dialogs, sheets | `#17191F` | `#FFFFFF` |
| `--popover-foreground` | text in popovers | `#F7F8FA` | `#15171A` |
| `--primary` | main CTA, brand accent | `#C4FF3D` | `#46700D` |
| `--primary-foreground` | text on primary | `#0B0C10` | `#FFFFFF` |
| `--secondary` | sport orange CTA | `#FC5A1A` | `#FC5A1A` |
| `--secondary-foreground` | text on secondary | `#0B0C10` | `#15171A` |
| `--accent` | premium gold detail | `#E7C768` | `#7A5B00` |
| `--accent-foreground` | text on accent | `#0B0C10` | `#FFFFFF` |
| `--muted` | quiet fills, footers | `#1E212A` | `#ECEEF1` |
| `--muted-foreground` | secondary text | `#9BA1AE` | `#5B6270` |
| `--border` | hairlines, card edges | `#262A34` | `#E2E5EA` |
| `--input` | field borders | `#2C313C` | `#DDE1E7` |
| `--ring` | focus ring | `#C4FF3D` | `#46700D` |
| `--success` | confirmed activity | `#3FD37A` | `#167C4A` |
| `--success-foreground` | text on success | `#06130C` | `#FFFFFF` |
| `--warning` | pending / attention | `#FFB020` | `#B45309` |
| `--warning-foreground` | text on warning | `#1A1200` | `#FFFFFF` |
| `--destructive` | cancel, delete | `#FF5A5F` | `#CC2A2E` |
| `--destructive-foreground` | text on destructive | `#17191F` | `#FFFFFF` |

Non-color tokens (theme independent):

| Token | Value | Utility |
| --- | --- | --- |
| `--radius` | `1rem` | base for `rounded-lg` |
| `--safe-area-*` | `env(safe-area-inset-*)` | `pt-safe-top`, `pb-safe-bottom`, `pl-safe-left`, `pr-safe-right` |
| `--bottom-navigation-height` | `4.25rem` | `h-bottom-nav`, `pb-bottom-nav` |
| `--bottom-navigation-space` | nav height + bottom safe area | `pb-bottom-nav-space` |
| `--content-max-width` | `30rem` | `max-w-content` (legacy phone column) |
| `--content-narrow` | `26rem` | `max-w-narrow` |
| `--content-default` | `44rem` | `max-w-default` |
| `--content-wide` | `72rem` | `max-w-wide` |
| `--conversation-list-width` | `21rem` | `max-w-conversations`, `w-conversations` |
| `--navigation-rail-width` | `5rem` | `w-rail` |
| `--desktop-sidebar-width` | `15rem` | `w-sidebar` |
| `--aside-column-width` | `21rem` | `grid-aside-start`, `grid-aside-end` |
| `--nav-column-width` | `14rem` | `grid-nav-start`, `w-nav-column` |
| `--tablet-page-padding` | `1.75rem` | `px-gutter` at `md` |
| `--desktop-page-padding` | `2.5rem` | `px-gutter` at `lg` |
| `--mobile-page-padding` | `1.25rem` | `px-page` |
| `--elevation-sm/md/lg/floating` | per theme | `shadow-sm/md/lg/floating` |

## 6. Typography system

System-first stack — no bundled/proprietary fonts:
`-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`.

| Level | Utility | Size / line-height / weight | Use |
| --- | --- | --- | --- |
| display | `text-display` | 34px / 1.05 / 700 | screen hero title |
| heading-1 | `text-heading-1` | 28px / 1.15 / 700 | page title |
| heading-2 | `text-heading-2` | 22px / 1.2 / 600 | section title |
| heading-3 | `text-heading-3` | 18px / 1.3 / 600 | card title |
| title | `text-title` | 16px / 1.35 / 600 | list item title |
| body | `text-body` | 15px / 1.5 / 400 | default text |
| body-small | `text-body-small` | 13px / 1.45 / 400 | supporting text |
| label | `text-label` | 13px / 1.2 / 600 | form labels, tabs |
| caption | `text-caption` | 11px / 1.25 / 600, +0.06em | eyebrows, meta (pair with `uppercase`) |
| metric | `text-metric` | 26px / 1 / 700 | numbers, stats |

Negative tracking on the large levels keeps headlines tight; captions get
positive tracking so uppercase stays readable.

Adding a level means two edits: the `--text-*` tokens in
`src/styles/theme.css` **and** the `font-size` class group in
`src/lib/utils.ts`, so `cn()` stops treating it as a text colour.

## 7. Radius scale

| Token | Value | Typical use |
| --- | --- | --- |
| `rounded-xs` | 6px | chips, tiny controls |
| `rounded-sm` | 10px | small buttons |
| `rounded-md` | 12.8px | inputs, menu items |
| `rounded-lg` | 16px | buttons, popovers |
| `rounded-xl` | 20px | large CTA, swatches |
| `rounded-2xl` | 24px | cards, sheets |
| `rounded-full` | pill | avatars, badges |

## 8. Spacing philosophy

4px base grid (`--spacing: 0.25rem`). Practical rhythm:

- Page horizontal padding: `px-page` (20px). Never ad-hoc.
- Between page sections: `gap-6` (24px).
- Inside a card: `--card-spacing` = 20px (`gap-4` between blocks).
- Related text pair: `gap-1`. Icon + label: `gap-2`.
- Generous first: when unsure, more space, fewer lines.

## 9. Shadows

Depth is subtle and theme-aware — dark mode uses deeper, softer black;
light mode uses low-alpha slate.

| Utility | Use |
| --- | --- |
| `shadow-sm` | resting cards |
| `shadow-md` | menus, dropdowns |
| `shadow-lg` | dialogs, sheets |
| `shadow-floating` | bottom navigation / floating bars (upward cast) |

## 10. Cards

`bg-card` + `border border-border` + `rounded-2xl` + `shadow-sm`, 20px
padding, `CardTitle` at `text-heading-3`, `CardDescription` at
`text-body-small text-muted-foreground`. Footers use `bg-muted/40` with a top
border. No colored card backgrounds except a deliberate primary/secondary
promo surface.

## 11. Buttons

| Variant | Look | Use |
| --- | --- | --- |
| `default` | solid primary | the one main action per screen |
| `secondary` | solid sport orange | energetic secondary action |
| `outline` | bordered, transparent | neutral action |
| `ghost` | text only | tertiary / toolbar |
| `destructive` | solid red | cancel, leave, delete |
| `link` | underlined primary | inline navigation |

Sizes: `default` 44px, `lg` 52px full-width CTA, `sm` 36px, `xs` 28px, icon
`size-11` (`icon-sm` 36px, `icon-lg` 48px). One primary CTA per screen.

## 12. Inputs

`Input`/`Textarea` use `border-input`, `bg-background`/`bg-transparent`,
`rounded-md`, focus shows `ring-ring/50`. Labels use `text-label`, helper
text `text-body-small text-muted-foreground`, errors `text-destructive`.
Font size must stay ≥16px on iOS to avoid zoom-on-focus.

## 13. App shell & navigation

### Mobile app shell

`AppShell` is the frame every screen lives in — **see §19 for its
breakpoint-aware navigation, which supersedes the phone-only description
below.** Historically it was a `max-w-content` column centred on
`bg-background`, with horizontal safe-area padding and `sm:border-x`
frame edges on larger screens, and the fixed bottom navigation. Pages add
`AppHeader` + `PageContainer`; they never rebuild the outer layout.

### Bottom navigation

| Aspect | Rule |
| --- | --- |
| Height | `h-bottom-nav` (68px) plus `pb-safe-bottom` |
| Width | full width below `md`; from `md` the rail/sidebar sits beside it (§19) |
| Background | `bg-surface/85` + `backdrop-blur-xl` |
| Border | `border-t border-border` only — no side borders, no floating pill |
| Elevation | `shadow-floating` (upward cast) |
| Icons | `size-6`, stroke icons from lucide; label always present |
| Labels | `text-caption`, secondary to the icon, never icon-only |
| Active | `text-primary` on icon + label, icon `scale-110` |
| Inactive | `text-muted-foreground` |
| Touch target | full tab height (68px) × one fifth of the column |
| Motion | colour transition only |

Active state is `aria-current="page"` from `NavLink`, so it is announced to
assistive tech and styled with `aria-[current=page]:`. Non-exact matching
means `/messages/user123` keeps Messages active.

### Header

`AppHeader` is sticky, `bg-background/85` + `backdrop-blur-xl`, with a
`border-b border-border` (or `transparent` mode for hero screens).

- Title: `text-heading-1`, truncates.
- Subtitle: optional, `text-body-small text-muted-foreground`.
- Back: optional ghost icon button (`size-icon-sm`, `aria-label="Go back"`)
  before the title, wired to `useNavigate(-1)`.
- Action: optional single control on the trailing edge.
- Spacing: `px-page`, `pt-safe-top`, min 56px content row.

### Page layout

| Aspect | Rule |
| --- | --- |
| Horizontal padding | `px-page` (20px) |
| Top spacing | `pt-5` under the header |
| Section spacing | `gap-6` between sections, `gap-3` inside a section |
| Bottom clearance | `pb-bottom-nav-space` — never less |
| Scrolling | the page body scrolls; no nested scroll containers |

### Mobile content width

Primary target 390–430px. Below that the column simply narrows — no
horizontal scrolling anywhere. At `sm` and above the app stays
`max-w-content` (480px), centred, with frame edges. **Superseded in STEP 9.5
(§19):** the shell now uses the full width with a rail or sidebar, and pages
pick a semantic content width.

### Motion

- Page enter: ~200ms, fade plus a 4px rise, `ease-out`, CSS only
  (`tw-animate-css` utilities). No animation library.
- Interactive feedback: colour/opacity transitions only, ≤150ms.
- No tab-to-tab sliding, no parallax, no decorative animation. If motion is
  noticeable as motion, it is too much.

## 14. Auth screens (STEP 3)

### Auth layout

`AuthLayout` (**updated in §19**: a brand panel + form split from `lg`) uses
`max-w-narrow` for the form, `px-gutter`, safe-area
insets and `sm:border-x` frame as the app — but **no bottom navigation**. A
small brand mark (2.5px lime dot + `text-label`) sits at the top; the form is
vertically centred in the remaining space.

Heading uses `text-display`, supporting copy `text-body text-muted-foreground`.
Lime appears on exactly one element per screen: the primary CTA.

### Form fields

`AuthField` wraps every input: `text-label` label, the control, then an
optional `text-body-small text-destructive` message with `role="alert"`.
Fields stack with `gap-5`; label-to-control is `gap-1.5`.

Inputs are the shadcn `Input` (44px tall, `border-input`, `rounded-lg`,
`ring-ring/50` focus, 16px text on mobile so iOS does not zoom) and always
carry the right `type`, `autoComplete` and `inputMode`.

### Password field

`PasswordInput` = `Input` with `pr-12` plus a ghost `icon-sm` button pinned
to the trailing edge. It toggles `Eye`/`EyeOff`, exposes
`aria-label="Show password" / "Hide password"` and `aria-pressed`, and never
uses a masking placeholder (the label carries the meaning).

### Authentication CTA

`<Button size="lg">` — full width, 52px, `bg-primary`. One per screen.
While submitting it stays in place and only its label changes
("Signing in…", "Creating account…") with the button disabled.

### Provider button

`GoogleSignInButton` is a full-width `variant="outline"` `size="lg"` button
with text only — no third-party logo asset, no extra icon library, so it
inherits the theme in both modes. It sits under an `AuthDivider`
(`h-px bg-border` rules either side of an `or` in `text-caption`).

### Error message

`AuthAlert`: `rounded-lg border border-destructive/40 bg-destructive/10`,
`px-4 py-3`, `text-body-small text-destructive`, `role="alert"`. It renders
above the fields and only ever shows a mapped human message — never a raw
provider error code.

### Loading / splash state

`AppSplash` while the session resolves: `bg-background`, app name in
`text-heading-2`, a 64×4px `bg-primary` pulse bar, and one muted line. It
keeps route transitions from flashing and stays deliberately plain.

## 15. Onboarding & profile patterns (STEP 4)

### Onboarding layout

`OnboardingLayout` is the third shell (alongside `AppShell` and
`AuthLayout`) — safe-area insets and
`sm:border-x`, but **no bottom navigation**:

- Sticky header: back button (`icon-sm` ghost, omitted on step 1), progress,
  then `text-heading-1` title + `text-body-small` subtitle, on
  `bg-background/85` + `backdrop-blur-xl` with a `border-b`.
- Scrolling content: `px-page`, `gap-4`, page-enter transition.
- Sticky footer CTA on `bg-background/90` + blur with a `border-t`, padded
  with `pb-safe-bottom` so it never sits under the home indicator.

### Progress indicator

A 4px `bg-muted` track with a `bg-primary` fill that animates its width
(200ms, `ease-out`), plus a `text-caption` "3 / 8" counter. It carries
`role="progressbar"` with real `aria-valuenow`/`min`/`max`. Restrained on
purpose — no XP bars.

### Selectable card

`SelectableCard` — the tactile choice surface for sports, intents and
intensity.

| State | Treatment |
| --- | --- |
| Unselected | `border-border bg-card`, icon in `bg-muted text-muted-foreground` |
| Hover | `border-input` |
| Selected | `border-primary bg-primary/10`, icon in `bg-primary text-primary-foreground`, `Check` in `text-primary` |
| Disabled | `opacity-40` (used when the 5-sport cap is reached) |
| Press | `active:scale-[0.98]` |

Selection is never colour-only: the check icon and `aria-pressed` both carry
it. `compact` stacks icon over label for the 2-column sport grid.

### Selection chip

`SelectionChip` — 44px pill for skills, day periods, radius and budget.
Unselected `border-border bg-card text-muted-foreground`; selected
`border-primary bg-primary text-primary-foreground`. `single` switches ARIA
from `aria-pressed` to `role="radio"` + `aria-checked` inside a
`role="radiogroup"` wrapper.

### Skill selector

One card per selected sport: sport name, a `text-caption text-warning`
"NOT SET" flag while empty, and a 2×2 grid of single-select chips labelled by
the `role="radiogroup"` `aria-label`. Skill is per sport, never global.

### Availability selector

Seven day rows (`rounded-2xl border-border bg-card`), each a `text-label`
short day name plus three equal-width AM / PM / Eve chips. Full day names are
`sr-only`. Compact enough for 390px while keeping 44px targets.

### Sticky mobile CTA

`<Button size="lg">` full width in the sticky footer. Disabled until the step
validates, with the reason above it in `text-body-small text-muted-foreground`
(a hint, not an error); real failures use `text-destructive` with
`role="alert"`. Saving swaps the label to "Saving…" and keeps it disabled.

### Profile preview card

`ProfileSummary` inside a `Card` — the shared read-only profile view used by
the onboarding preview and the Profile page. Avatar (photo or initials),
name, `area · within N km`, optional bio, then `text-caption uppercase`
section labels over: sports rows (`bg-muted/50` pill rows, skill in
`text-primary`), intent badges with one `secondary` intensity badge,
availability badges, and the budget in `text-metric`.

Colour discipline: lime marks the primary CTA and the selected state; sport
orange appears once, on the intensity badge. Nothing else competes.

## 16. Profile & settings patterns (STEP 5)

### Profile hero

`ProfileHero` opens the page with no card around it: 80px avatar (photo or
initials), `text-heading-1` name, `area · within N km` in
`text-body-small text-muted-foreground`, an optional `Badge` reading
"Ready to play" (shown only when the profile is discoverable and ≥90%
complete), then the bio in `text-body`. Never an email, follower count, or
online status.

### Profile section

`ProfileSection` — a `text-caption uppercase text-muted-foreground` label
over content, separated by `gap-6` from its neighbours. Sections rely on
whitespace and hierarchy; only genuinely card-like content (sport rows, the
discovery summary) gets a surface. Do not wrap every section in a rectangle.

### Profile completeness

`ProfileCompletenessCard` — a small card with "Profile strength", the derived
percentage in `text-label text-primary`, a 6px `bg-muted` track with a
`bg-primary` fill that animates its width, and one plain hint line. It has
`role="progressbar"` with real values. No XP, levels or streaks.

### Selected state, revisited

Two selection treatments, so a fully-selected group never becomes a wall of
lime:

| Control | Unselected | Selected |
| --- | --- | --- |
| `SelectableCard` | `border-border bg-card` | `border-primary bg-primary/10` + primary icon chip + `Check` |
| `SelectionChip`, single (radio) | `border-border bg-card text-muted-foreground` | `border-primary bg-primary text-primary-foreground` |
| `SelectionChip`, multi (checkbox) | same | `border-primary bg-primary/15 text-primary` |

Solid lime therefore marks *the one chosen value*; tinted lime marks *each of
several*. Both carry `aria-pressed`/`aria-checked` and, on cards, an icon —
never colour alone.

### Edit layout & sticky save

`EditLayout` is the shared full-screen form shell for `/profile/edit` and
`/settings/discovery`: sticky blurred header with a back/cancel button and
`text-heading-2` title, content at `px-page` with `gap-8` between sections,
then a sticky footer on `bg-background/90` + `backdrop-blur-xl` with a
`border-t` and `pb-safe-bottom`.

The footer holds one hint/error line plus `Cancel` (`flex-1`, outline) and the
save button (`flex-[2]`, primary). Blocking validation shows as
`text-body-small text-muted-foreground` (a hint), real failures as
`text-destructive` with `role="alert"`. The label carries the state:
"Save changes" → "Saving…" → "Saved".

### Edit section

`EditSection` — `text-heading-3` title with an optional
`text-body-small text-muted-foreground` description, then the field. Sections
are plain: no accordions, no nested cards.

### Settings section & rows

`SettingsSection` — `text-caption uppercase` label above one `Card` whose
`CardContent` stacks rows with `gap-4` and `Separator` between them. Link rows
end in a `ChevronRight` in `text-muted-foreground`.

`PreferenceToggle` — label (`text-title`, a real `<label htmlFor>`) plus
description on the left, shadcn `Switch` on the right. The description states
the current consequence ("Other Sports Buddy users can find your profile."),
so the state is never colour-only.

### Profile preview

`ProfileSummary` accepts `DiscoveryProfile` **only** and is shown in a
`Dialog` (`max-h-[85dvh] overflow-y-auto`) titled "Profile preview" with the
line "Only these details are ever shared with other users." Sport rows use
`bg-muted/50` pills with the skill in `text-primary`; the intensity badge is
the single `secondary` (sport orange) accent on the card; budget uses
`text-metric` with a muted `/ activity` suffix.

## 17. Discover patterns (STEP 6–7)

### Buddy card

`BuddyCard` is the feed unit, and it accepts a `RankedBuddy` — the
`DiscoveryProfile` projection plus derived compatibility — so a private field
cannot reach it. Reading order top to bottom: identity + score, reasons,
sports, intent, availability, bio, then the action.

| Block | Treatment |
| --- | --- |
| Identity | 56px avatar (photo or initials), `text-title` name, area in `text-body-small text-muted-foreground` |
| Score | right of the identity row: `text-metric` number with a `text-body-small text-muted-foreground` `%`, band in `text-caption text-primary uppercase` |
| Reasons | up to three rows, `size-4 text-primary` `Check` icon + `text-body-small` |
| Sports | up to three rows; **shared** sports first on `bg-primary/10`, the rest on `bg-muted/50`; sport in `text-body`, skill in `text-label text-primary`, then "+N more sports" |
| Intent | `outline` badges plus exactly one `secondary` (orange) intensity badge |
| Availability | `text-caption uppercase` "Usually free" over two slot badges, overflow as a `ghost` "+N" badge |
| Bio | `line-clamp-2 text-body text-muted-foreground` |
| Footer | budget in `text-body-small text-muted-foreground`, `View Profile` as an outline `sm` button |

Lime appears on skill values, the score band, the reason ticks and the shared
sport tint; orange only on the intensity badge. No distance and no Connect.

### Compatibility score

`CompatibilityScore` is the only place a score is rendered. Two sizes:
`text-metric` on a card, `text-display` on the candidate profile
(`size="lg"`), always right-aligned with the band label beneath it.

**Never colour-coded by band.** There is no green/amber/red scale: the number
and its wording carry the meaning in every theme, and nobody is painted red.
The number carries `aria-label="80 percent compatible"`, so the score never
depends on colour or on reading a bare figure.

### Compatibility label

Bands come from `COMPATIBILITY_LABELS` — Excellent fit / Great fit / Good fit
/ Possible fit / Low fit — rendered in `text-caption text-primary uppercase`.
Wording describes the *pair*, never the person: no "bad match", no "poor".

### Matching reason

`MatchingReasons` is a `ul` of at most three rows: a `size-4 shrink-0
text-primary` `Check` above the text baseline (`mt-0.5`), then
`text-body-small text-card-foreground`. Concrete beats abstract — "Both free
Saturday evening", not "Availability compatible".

### Compatibility breakdown

`CompatibilityBreakdown` is one `bg-muted/50 rounded-xl` row per factor:
factor name in `text-title`, its one-line detail in `text-body-small
text-muted-foreground`, and on the right a qualitative `text-label
text-primary` word over the weighted points in `text-caption
text-muted-foreground`. A `Total` row closes it with a `text-caption
uppercase` label. Qualitative first, arithmetic second — explainable, not an
audit.

### Candidate profile

`/discover/:userId` reuses `AppHeader` (back + candidate name + "Sports Buddy
profile"), then a compatibility card — `text-caption uppercase`
"Compatibility" eyebrow, `text-heading-3` "Why you could play well together",
the large score, the reasons, a `Separator`, and the breakdown — above the
same `ProfileSummary` card the owner sees in their own preview, so both
surfaces stay provably identical in scope. The connect CTA closes the page
(§18).

## 18. Connection patterns (STEP 8)

All four connection states come from one component,
`ConnectAction` — there is never a second set of labels to drift.

### Connect CTA

The primary action is a plain `Button`: `default` variant, `size="default"`
on a buddy card and `size="lg"` in the candidate profile's sticky bar. Two
labels, one per direction: **Connect** and **Connect back**. While the write
is in flight the label becomes **Connecting…** and the button is disabled —
that busy flag is the double-tap guard, not a spinner.

Every state carries a real accessible name, never colour or icon alone:
"Connect with Aina", "Connect back with Aina", "Connection request sent to
Aina", "Cancel connection request to Aina", "Connected with Aina".

### Pending connection (outgoing)

**Request sent** as a disabled `outline` button — visibly inert, so nobody
taps it twice — with **Cancel request** beneath it as a `ghost` `sm` button.
Muted, not shouty: a sent request is a waiting state, not an achievement.
Errors appear under the action as `role="alert" text-body-small
text-destructive`.

### Incoming connection

The signal is typographic, not a colour wash: one
`text-body-small text-primary` line — "Aina wants to connect." — above the
matching reasons, and a primary **Connect back** button. On Discover these
cards are lifted into a `SectionHeader` section titled **"Wants to connect"**
above the ranked feed. The card is never re-tinted or outlined in neon.

### Connected state

Not a button — a status row, so there is nothing to tap and no dead control:
`h-11 rounded-lg` (`h-13 rounded-xl` at `lg`), `border border-border
bg-muted/50`, a `size-4 text-primary` `UserCheck`, then **Connected** in
`text-label`. On a buddy card the shared sports keep their `bg-primary/10`
tint, so a connected buddy still reads as a good match.

### Session dismiss

**Not now** is a `ghost` `sm` button beside the Connect action, shown only in
the `none` state. Quiet on purpose — dismissing a sports buddy for now should
not feel like rejecting a dating profile.

### Sticky connect bar

The candidate profile's CTA is `sticky bottom-bottom-nav-space z-20`, in
normal flow as the last child of `PageContainer`, with `-mx-page px-page
py-3`, `border-t border-border` and `bg-background/90 backdrop-blur-xl`. It
sits **above** the fixed `BottomNavigation`, which already owns the bottom
safe-area inset, so no notch offset is hardcoded and the bar never fights the
tab bar. Being in flow means it also never permanently covers content.

### Connection success dialog

A centred `Dialog` (`showCloseButton={false}`, `gap-5 p-5`), read top to
bottom: a `size-16 rounded-full bg-primary/15` circle holding a `size-8
text-primary` `UserCheck`, then `text-heading-2` **"You found a sports
buddy."**, then `text-body text-muted-foreground` "You and Aina both want to
connect.", then the shared sport as a `rounded-full bg-muted px-3 py-1.5
text-label` pill. Footer: **Done** (`outline`) and **View profile**, equal
width.

Motion is `animate-in duration-300 ease-out zoom-in-75` on the icon on top of
the dialog's own fade + `zoom-in-95` — about 200–300ms. **No confetti, no
hearts, no full-screen match effect.** Apple restraint, sports energy.

### Connection colour discipline

No new tokens were added. `primary` (lime) marks the positive states,
`muted` the neutral ones, `destructive` only real errors. Connection state is
never expressed by colour alone — there is always a label or an accessible
name — and no state is painted red, because a pending request is not a
failure.

### Filter trigger and active chips

The trigger is a `sm` outline button labelled "Filter" with the active count
in `text-label text-primary` beside it — a number, not a coloured dot.
Applied filters are echoed under the header as read-only `outline` badges via
`ActiveFilterChips`, so the feed never silently hides people.

### Filter sheet

A bottom `Sheet` (`max-h-[85dvh] overflow-y-auto pb-safe-bottom`) with one
`text-caption uppercase` group label per filter and multi-select
`SelectionChip`s (tinted, per §16), plus a `Switch` row for matching
availability. Its description states that changes are session-only. Footer:
`Reset` (`flex-1`, outline) and `Apply filters` (`flex-[2]`, primary) — the
same weighting as the edit screens.

### Discover loading and empty states

Loading shows three card skeletons that mirror the buddy card silhouette
(avatar + two rows + a chip), never a full-screen spinner.

Three distinct empty states, all `EmptyState` with the `Users` icon:

| Situation | Copy | Action |
| --- | --- | --- |
| Filters exclude everyone | "No sports buddies found." | Reset filters |
| Nobody is discoverable yet | "It's quiet here for now." | none |
| Load failed | "We couldn't load sports buddies." + "Something went wrong on our side, not yours." | Try again |

Never blame the user, and never surface a provider error string.

## 19. Responsive design system (STEP 9.5)

**Mobile-first is not mobile-only.** Three intentional experiences share every
route, service and piece of state; only presentation adapts.

### Breakpoints

Standard Tailwind only — no custom media queries anywhere in the app.

| Name | Width | Experience |
| --- | --- | --- |
| (base) | < 640px | phone |
| `sm` | ≥ 640px | large phone / small tablet — grids start to split |
| `md` | ≥ 768px | tablet: navigation rail, master–detail messages |
| `lg` | ≥ 1024px | desktop: sidebar, side panels, persistent filters |
| `xl` | ≥ 1280px | large desktop: a third grid column where cards stay readable |

Layout is CSS. No component reads `window.innerWidth` or attaches a resize
listener; `matchMedia` appears once, in the theme provider, for
`prefers-color-scheme`.

### Navigation by breakpoint

| Width | Component | Treatment |
| --- | --- | --- |
| `< md` | `BottomNavigation` | fixed, full width, `bg-surface/85` + `backdrop-blur-xl`, `pb-safe-bottom`, `h-bottom-nav` |
| `md` | `NavigationRail` | `w-rail` (80px), left, icon over `text-caption`, active = `bg-primary/10 text-primary` |
| `lg` | `DesktopSidebar` | `w-sidebar` (240px), brand mark on `text-primary-gradient`, five destinations, Settings pinned to the bottom |

All three render from the same `mainNavigation` config, and only one exists in
the DOM at a time. Active state is `aria-current="page"` from `NavLink`, so
nested routes keep their parent tab lit.

### Page container sizes

`PageContainer` and `AppHeader` share one `size`, so a heading and its body
always align on one left edge.

| `size` | Width | Pages |
| --- | --- | --- |
| `narrow` | 26rem | auth forms |
| `default` | 44rem | edit flows, chat column, reading widths |
| `wide` | 72rem | home, discover, profile, settings, activities |
| `full` | — | panes that own their width (messages workspace) |

### Responsive gutters

One utility, `px-gutter`: 20px on a phone, 28px from `md`, 40px from `lg`.
`bleed-gutter` cancels it for an element that must span its full column (the
mobile sticky connect bar). Never a per-page `px-[…]`.

### Card grids

Grids are per-component, not global.

| Surface | Phone | `sm` | `md` | `xl` |
| --- | --- | --- | --- | --- |
| Discover buddies | 1 | 2 | 2 | 3 |
| Sport selector | 2 | 2 | 3 | 4 |
| Profile detail sections | 1 | 1 | 2 | 2 |
| Home | 1 | 1 | 1 | 2 (from `lg`) |

`BuddyCard` gets `h-full` so a grid row aligns, and `mt-auto` on its action
row so buttons line up regardless of bio length.

### Two-column desktop shapes

Three utilities cover every desktop split, so no page writes `grid-cols-[…]`:

| Utility | Shape | Used by |
| --- | --- | --- |
| `grid-aside-start` | 21rem ∣ content | profile, onboarding (`lg`) |
| `grid-aside-end` | content ∣ 21rem | candidate profile (`lg`) |
| `grid-nav-start` | 14rem ∣ content | settings (`lg`) |

A sticky column must be the **grid or flex item itself** — a sticky child of a
non-stretching item has no room to travel.

### Responsive overlays

| Surface | `< lg` | `lg` |
| --- | --- | --- |
| Discover filters | bottom `Sheet` with explicit Apply | persistent sidebar, applies on change |
| Profile preview | centred `Dialog` | centred `Dialog` |

A bottom sheet on a 1440px screen is a phone habit. Both filter presentations
render the same `DiscoverFilterFields` over the same state — one
implementation, two shells.

### Responsive forms

Single column by default. Fields pair into two columns only where they are
genuinely related and similarly sized (playing style + budget in profile
editing) — never to manufacture a second column. Text-heavy fields stay inside
`max-w-default` so line length stays readable.

`EditLayout` keeps the sticky save bar on a phone and moves Cancel/Save into
the header from `md`.

### Responsive typography

Only page-level hierarchy scales: `AppHeader` goes `text-heading-1` →
`md:text-display`, the onboarding step title `text-heading-1` →
`lg:text-display`, and the chat header `text-title` → `md:text-heading-3`.
Body copy never scales — it is already at its readable size.

### Desktop density and affordance

Desktop keeps 44px touch targets but tightens vertical rhythm
(`pb-bottom-nav-space` becomes `md:pb-10`). Hover states exist on buddy cards
(`hover:shadow-hover`), navigation items, conversation rows and settings
links; nothing essential is hover-only.

## 20. Primary gradient (STEP 9.5)

The flat primary read as plain. The fix is one restrained linear gradient,
defined **only** in `src/styles/theme.css`.

| Token | Light | Dark |
| --- | --- | --- |
| `--primary-gradient-start` | `#4E7B0D` | `#D8FF66` |
| `--primary-gradient-end` | `#3A5C0A` | `#A9EA2F` |

Both are lime → deeper/warmer green-yellow, inside the existing brand. No
purple, blue, pink or rainbow.

### Utilities

| Class | Use |
| --- | --- |
| `bg-primary-gradient` | primary CTA surfaces, brand dot |
| `text-primary-gradient` | the Sports Buddy wordmark only |

`linear-gradient(135deg, start, end)`. A component never writes
`bg-gradient-to-r from-[…] to-[…]`.

### Where it is used

- the shadcn `Button` `default` variant — so **every** primary CTA (Sign In,
  Create Account, Complete Profile, Connect, Connect back, Save changes, Send,
  Apply filters) is upgraded in one place
- the brand mark in `DesktopSidebar` and `AuthLayout` (dot + wordmark)
- the splash pulse bar

### Where it is deliberately NOT used

Badges, selection chips, switches, the theme radio, message bubbles, shared
sport tints, progress bars, compatibility scores, navigation active states,
card backgrounds, borders and ordinary headings all stay **flat** `primary`.
A gradient is an accent, not wallpaper.

### Contrast

Both ends must keep `--primary-foreground` legible, not just one. Light: the
lighter end is the tight case at ≈5.2:1 against white. Dark: both ends are
light lime, so near-black text stays >13:1. Hover is `opacity-90` — no glow,
no animated gradient.

## 21. Chat patterns (STEP 9)

### Chat screen shell

`ChatLayout` is a full-screen column: a compact header, a `min-h-0 flex-1
overflow-y-auto` message region, and a composer. It uses **`h-dvh`, never
`100vh`**, so a mobile keyboard shrinks the message area instead of pushing
the composer off-screen — which also matters inside a Capacitor WebView.

The route sits outside `AppShell`, so there is no bottom navigation and the
composer owns the bottom safe area (`pb-safe-bottom`). Same reasoning as the
edit screens, and a deliberate difference from `/discover/:userId`, which
stays inside the shell.

### Chat header

`pt-safe-top pb-3`, `border-b border-border`, `bg-background/85
backdrop-blur-xl`: a ghost `icon-sm` back button (returning to `/messages`,
not browser history), a 36px avatar, and the buddy's name in `text-title`.
Compact on purpose — vertical room belongs to the conversation. **No presence
and no "last seen"**, because neither exists.

### Conversation list item

A full-row `Link`: 44px avatar, name in `text-title`, then the preview.
A thread shows `text-body-small text-muted-foreground` (prefixed "You: " when
it is your own message); a connected buddy with no thread shows **"Start a
conversation"** in `text-primary`. Right side: the time in `text-caption
text-muted-foreground` and a `size-4` chevron. Rows sit in a bordered `Card`
separated by `Separator`. **No unread dot, no "seen", no typing.**

### Message bubbles

| Side | Treatment |
| --- | --- |
| Own | `bg-primary text-primary-foreground`, `rounded-2xl` with `rounded-br-md` |
| Buddy | `bg-card text-card-foreground border border-border`, `rounded-2xl` with `rounded-bl-md` |

Both `max-w-[80%] min-w-0`, content in `text-body whitespace-pre-wrap
wrap-anywhere` so line breaks survive and a long URL can never push the page
sideways. Lime marks *your* voice — no second custom lime, and no
WhatsApp/iMessage impression.

### Message timestamp

`text-caption`, bottom-right inside the bubble: `text-primary-foreground/70`
on your own, `text-muted-foreground` on theirs. A message whose server
timestamp has not resolved reads **"Sending…"** rather than an empty gap.

### Date separator

A centred `text-caption uppercase text-muted-foreground` label between two
`h-px bg-border` rules — "Today", "Yesterday" or "Sep 4", above the first
message of each day.

### Message composer

A row of `Textarea` + circular `size="icon"` send button. The textarea is
`min-h-11 max-h-32 resize-none rounded-2xl` and keeps the shared component's
**16px base size**, which is what stops iOS auto-zooming on focus. It has an
`sr-only` label, and the send button an explicit `aria-label`.

Send is disabled while empty, over the limit, or in flight. The character
counter appears **only** from 900 characters, turning `text-destructive` past
the limit. A send error renders above the row as `role="alert"
text-body-small text-destructive`, and the draft stays put.

### Chat empty state

Centred in the message region: `text-title` "Start the conversation." over
`text-body-small text-muted-foreground` "You connected over sport. Time to
plan something." The composer stays available, and nothing is ever sent
automatically.

### Load earlier control

A `ghost` `sm` button centred at the top of the thread — "Load earlier
messages", "Loading…" while fetching — shown only while more history exists.
An explicit tap, never infinite scroll.

### New message indicator

When a message arrives while the reader is up in the history, a `sm`
`sticky bottom-0` pill with an `ArrowDown` icon reading **"New message"**
appears instead of yanking the view down. Tapping it scrolls to the newest.

## 22. Planner patterns (STEP 10)

### Planner layout

`/messages/:conversationId/plan` is a `size="wide"` page inside `AppShell`,
not a chat pane: the planner needs the whole content column. From `lg` it is
`grid-aside-end` — steps on the left, the live `PlanSummary` sticky on the
right. Below that, summary follows the steps in flow.

### Planner progress

Three equal-width buttons in an `<ol aria-label="Plan steps">`. Agreed steps
show a `size-4 text-primary` `Check`, unagreed show their number; the active
one is `border-primary bg-primary/10 text-primary` with `aria-current="step"`.
Each carries an `sr-only` "— agreed" / "— not agreed yet", so the state never
depends on the tick's colour. Tapping revisits a step. **No XP, no streaks, no
gamified bar.**

### Proposal card

`ProposalStatus` renders one of three sentences, each with its own icon:

| State | Treatment |
| --- | --- |
| Agreed | `Check` + `text-body-small text-primary` — "You both agreed on Badminton." |
| Waiting | `Clock` + `text-body-small text-muted-foreground` — "You suggested … Waiting for Aina." |
| Needs you | `UserCheck` in a `rounded-2xl border-border bg-muted/50 p-4` card, with a primary Agree button |

The Agree button names what is being agreed (`Agree to Sat, Sep 12 · 5:00–7:00 PM`)
and repeats it in `aria-label`, so it is never a bare "Agree".

### Live plan summary

`PlanSummary` is `bg-muted/50 rounded-xl` rows — icon, `text-caption uppercase`
label, `text-title` value — with an `Agreed` / `Pending` marker in
`text-caption uppercase`. An undecided row reads "Not decided yet" in
`text-muted-foreground`. A `Draft` / `Ready` badge sits in the header.

The **venue row is always present and always empty** in this step: shown
honestly as undecided rather than hidden, and ready for STEP 11 to fill in.

### Ready state

A `border-primary/30` card with a single `bg-primary-gradient` pill reading
**Plan ready** in `text-caption uppercase text-primary-foreground` — the one
gradient on the page besides the primary buttons. Copy states plainly that
venue selection is next and nothing is booked; the CTA returns to chat rather
than being a dead "Continue to venue".

### Plan card in chat

A single `rounded-xl border-border bg-muted/50` row pinned above the composer
via `ChatLayout`'s `banner` slot: `CalendarCheck` in `text-primary`, an
eyebrow ("Session plan · draft"), the decisions truncated to one line, and an
outline **Continue** / **View plan** button.

### Gradient discipline, unchanged

The planner adds gradient in exactly two places: primary CTA buttons (via the
`Button` `default` variant, §20) and the "Plan ready" pill. Sport cards,
selection chips, progress steps, summary rows and agreement states all stay
**flat** `primary`. A gradient is still an accent.

## 23. Venue patterns (STEP 11)

### Venue step layout

The venue browser needs the whole page, so while it is the active step the
planner drops its `grid-aside-end` summary column and the plan summary moves
below. Inside the step, list and map are stacked on a phone and
`lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]` from `lg`.

**The list is the primary surface at every width.** The map is an
enhancement: it is `order-1` above the list on a phone (a preview), `order-2`
beside it on desktop, and it renders **nothing at all** if Maps fails to load.

### Map container

`rounded-2xl border border-border overflow-hidden`, `h-60` on a phone and
`lg:h-[28rem] lg:sticky lg:top-6` on desktop — a responsive height, never a
fixed `h-[600px]` at every breakpoint. Loading shows an `animate-pulse
bg-muted` panel with "Loading map…", never a blank white box.

Marker colours come from live theme tokens read at runtime
(`--primary` selected, `--muted-foreground` unselected, `--background` for the
stroke), because the Maps API takes colour strings and cannot take a class.
That is the one place a colour is read rather than applied — no hex is written
in a component.

### Venue card

`rounded-2xl border bg-card p-4`. The name and address are a single button
(so the whole identity block is one keyboard target), then metadata in
`text-body-small text-muted-foreground` — rating with a `size-3.5 text-primary`
star, and distance with a `MapPin`. Actions are a primary **Suggest venue**
and an outline **Open in Maps**.

**No price, no availability, no travel time** — none of those are real data.

### Selected venue state

`border-primary bg-primary/5` plus a `text-caption text-primary uppercase`
"Selected" label and `aria-pressed`, so selection is never colour alone.
Unselected cards get `hover:shadow-hover` as a desktop affordance.

### Venue proposal state

Reuses §22's `ProposalStatus` unchanged — "You suggested … Waiting for Aina",
"Aina suggested …" with an Agree button naming the venue. Venue introduced no
new agreement UI.

### Gradient discipline, unchanged

The venue step adds gradient in **no** new place. Primary CTAs pick it up from
the `Button` `default` variant (§20) and the "Plan complete" pill is the same
one §22 already documented. Venue cards, markers, selected states and rating
stars are all flat `primary`.

## 24. Activity patterns (STEP 12)

### Activity card

The core confirmed-activity unit, and the **whole card is one `Link`** so it
is a single keyboard target with one accessible name.

Left: a `size-14 rounded-xl bg-muted` date block — `text-caption uppercase`
month over a `text-heading-3` day. Right, in deliberate reading order: sport +
buddy in `text-title` with the status badge, the time range in `text-body`,
the venue with a `size-3.5` `MapPin` in `text-body-small text-muted-foreground`,
and the budget last in `text-caption` — it is planning context, not a price.

`hover:shadow-hover` is the desktop affordance. **No gradient** — a card is
not a CTA.

### Activity status

A `Badge`: `default` for Upcoming, `outline` otherwise. Always a **word**,
never colour alone, and never "Booked", "Reserved" or "Paid" — Sports Buddy
reserves nothing.

### Activity detail

`size="wide"` with `lg:grid-aside-end`: the event details card on the left,
the venue card beside it. Details are a `<dl>` of `bg-muted/50 rounded-xl`
rows — `size-4 text-primary` icon, `text-caption uppercase` term,
`text-title` value.

The venue card carries the name, address, an optional `h-48` `VenueMap`
(enhancement only — the address stands alone), an outline **Open in Maps**,
and one honest line: *"You both chose this venue. Sports Buddy doesn't reserve
it."*

### Confirmation review

At `venue-agreed` the planner shows a `border-primary/30` card: a
`text-caption uppercase` "Final review" eyebrow, a `text-heading-3`
"Everything is agreed.", the full `PlanSummary` inline, the honest
non-reservation line, and a `size="lg"` **Confirm activity** CTA with a
`CalendarCheck` icon.

The planner's summary sidebar is deliberately **dropped** while this shows —
the review already contains it, and duplicating it would be noise.

### Confirmed plan state

Once confirmed the planner is read-only: the step progress and every proposal
control disappear, replaced by a `border-primary/30` card with a
`bg-primary-gradient` **Activity confirmed** pill (with a `Check`), a line
explaining the plan is now history, and **View activity** / **Back to chat**.

### Gradient discipline, unchanged

STEP 12 adds gradient in exactly two places: the **Confirm activity** CTA
(via the `Button` `default` variant, §20) and the **Activity confirmed** pill.
Activity cards, date blocks, status badges, detail rows and the venue card are
all flat. A gradient still marks the single highest-value action, not the
content around it.

## 25. Mobile safe-area rules

- `index.html` sets `viewport-fit=cover`; insets come from
  `env(safe-area-inset-*)`.
- `AppShell` applies `pl-safe-left pr-safe-right`; `AppHeader` applies
  `pt-safe-top`; `BottomNavigation` applies `pb-safe-bottom`;
  `PageContainer` applies `pb-bottom-nav-space` (nav + bottom inset).
- Any other fixed/sticky element must add the matching safe inset itself.
- Never hardcode 44px/34px notch values.

## 26. Accessibility / contrast rules

- Body text ≥ 4.5:1, large text ≥ 3:1. Verified pairs: dark
  `--muted-foreground` on background ≈ 7.5:1; light ≈ 5.7:1; light `--primary`
  with white text ≈ 5.9:1; dark `--primary` with `#0B0C10` text ≈ 16.5:1.
- Bright fills (lime, orange, gold, red in dark mode) always take the
  near-black `*-foreground`. Never white text on lime or orange.
- Touch targets ≥ 44×44px.
- Focus is always visible — never remove the `ring-ring` styles.
- Never encode meaning in color alone; pair with icon or text.
- `color-scheme` is set on `<html>` so native controls and scrollbars match.

## 27. Allowed usage

```tsx
<div className="bg-card text-card-foreground rounded-2xl border border-border p-page">
  <span className="text-caption text-muted-foreground uppercase">Today</span>
  <h2 className="text-heading-2 text-foreground">Badminton, 7pm</h2>
  <Button size="lg">Confirm activity</Button>
  <Badge variant="secondary">Intermediate</Badge>
</div>
```

## 28. Forbidden usage

```tsx
// raw color values
<div className="bg-[#B8FF32] text-[#111111]" />
<span style={{ color: '#FC5200' }} />

// hand-rolled gradients — use bg-primary-gradient
<div className="bg-gradient-to-r from-[#C4FF3D] to-[#A9EA2F]" />

// one-off responsive values — use the layout tokens
<div className="max-w-[428px] px-[18px] grid-cols-[19rem_1fr]" />

// palette utilities that bypass the theme
<div className="bg-zinc-900 text-lime-400" />

// hand-rolled dark mode instead of tokens
<div className="bg-white dark:bg-black" />

// hardcoded device metrics
<header className="pt-[44px]" />
```

Every one of these breaks theme switching. If a needed color has no token,
add the token to `src/styles/theme.css` (both themes) and document it here.
