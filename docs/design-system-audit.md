# Design system audit (STEP 12.5)

The brief for STEP 12.5 was "do not assume the current styling is clean —
actually audit it." This is what the audit found, what was changed, and the
things that were deliberately left alone.

No product behaviour, route, type, service, repository or Firestore document
changed in this step. No dependency was added.

## 1. What the audit found

The headline concerns in the brief turned out to be mostly clean already:

| Checked | Result |
| --- | --- |
| Inline `style={{…}}` | 2 occurrences, both legitimate runtime widths (`profile-completeness-card.tsx`, `onboarding-progress.tsx`) |
| Hardcoded hex / rgb / hsl in components | none |
| Raw `bg-gradient-to-*` in components | none |
| Arbitrary colour values (`bg-[#…]`) | none |
| Arbitrary values generally | 5 real ones, all non-colour (`translate-x-[calc(100%-2px)]`, `transition-[width]`, `scale-[0.98]`, `ring-[3px]`, `max-h-[85dvh]`) |

The real problems were one level up — not raw values, but **the same idea
written out by hand in several places, and drifting**:

| Duplicated pattern | Copies | What had drifted |
| --- | --- | --- |
| `label + control` form row | 8 | two gaps (`gap-1.5`, `gap-2`), two error paragraphs, one hand-written "(optional)" |
| Sticky bottom action bar | 3 | `bg-background/85` vs `/90`, different paddings, safe-area written out each time |
| Navigation item | 3 | the bar tinted only text, the rail and sidebar tinted background; three focus rings |
| Section heading | 5 | two "uppercase label" treatments and two heading sizes for two kinds of section |
| Inner tile (`rounded-xl bg-muted/50`) | 9 | three radii, three paddings |
| Error + "Try again" block | 4 | two button sizes, two layouts, one missing `role="alert"` |
| `EmptyState` + a button underneath | 3 | recovery control rendered *outside* the panel it belonged to |
| Selection chip / card "selected" state | 6 | `bg-primary/5`, `/10`, `/12`, `/15` — four tints for one idea |
| Interaction transition | 9 | `transition-colors`, `transition-all`, `transition-shadow`, all on Tailwind's default 150ms |

Two genuine defects fell out of the audit rather than being looked for:

- **Dark-mode modals had no scrim.** `bg-black/10` over a `#0b0c10`
  background is invisible, so dialogs and sheets did not separate from the
  page behind them.
- **No `prefers-reduced-motion` handling existed anywhere**, while the app
  ships page transitions, a zoom-in success dialog and scale-on-press
  feedback.

## 2. Changes

| Route / component | Issue | Old pattern | New pattern | Theme tokens used | Responsive status | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `styles/theme.css` | no surface hierarchy between `background` and `card` | `bg-muted/50`, `bg-card/60` improvised per site | `--surface-subtle` / `--surface-raised` / `--surface-overlay` | new | n/a | Done |
| `styles/theme.css` | one border weight only | `hover:border-input` as a stand-in | `--border-strong` | new | n/a | Done |
| `styles/theme.css` | no motion system | per-site `transition-colors` (150ms) | `--motion-fast/base/slow`, `--motion-ease`, `@utility transition-ui`, `@utility pressable` | new | n/a | Done |
| `styles/theme.css` | tinted "selected" surfaces hand-mixed | `bg-primary/5…/15` | `@utility bg-primary-gradient-soft` | `--primary-gradient-*` | n/a | Done |
| `index.css` | no reduced-motion floor | none | global `prefers-reduced-motion` block; `h1/h2/h3` get `font-heading text-balance` once | — | all | Done |
| `lib/utils.ts` | custom utilities invisible to `tailwind-merge` | only `font-size` registered | `bg-color`, `transition`, `px`, `mx` groups registered too | — | n/a | Done |
| `ui/card.tsx` | one look; four surfaces re-wrote it outside the file | `rounded-2xl border border-border bg-card` copied | `variant`: `default` / `subtle` / `elevated` / `interactive` / `selected` | `card`, `border`, `border-strong`, `surface-subtle`, `surface-raised`, `shadow-hover` | unchanged | Done |
| `ui/choice-chip.tsx` (new) | 6 selection treatments | `SelectionChip` + 5 hand-rolled buttons | one CVA component; `selection` switches checkbox↔radio semantics | `primary`, `border-strong`, `card` | unchanged | Done |
| `ui/status-pill.tsx` (new) | 5 status treatments | `Badge`, tinted `<p>`, bare spans | one component, 5 semantic tones, label always carries the meaning | `primary`, `secondary`, `warning`, `destructive`, `surface-subtle` | unchanged | Done |
| `ui/dialog.tsx`, `ui/sheet.tsx` | invisible dark-mode scrim | `bg-black/10` in both themes | `bg-scrim`, defined per theme | `--scrim` | unchanged | Fixed |
| `common/form-field.tsx` (new) | 8 hand-written form rows | `div > label.text-label > control` | one component with `optional`, `error`, `hint` | — | unchanged | Done |
| `common/section-header.tsx` | 5 section headings | 5 local heading blocks | one component, `level="page" \| "group"` | `foreground`, `muted-foreground` | unchanged | Done |
| `common/detail-tile.tsx` (new) | duplicated read-only fact row | 2 private copies + 7 loose tiles | one component; `as="dl"` keeps the activity detail a description list | `surface-subtle`, `primary` | unchanged | Done |
| `common/empty-state.tsx` | recovery button rendered outside the panel | `<div><EmptyState/><Button/></div>` ×3 | `action` slot; optional `role="alert"` | `surface`, `surface-subtle` | unchanged | Done |
| `common/error-state.tsx` (new) | 4 different failure blocks | ad-hoc per page | one component; `onRetry` optional so a config error offers no false retry | — | unchanged | Done |
| `layout/nav-item.tsx` (new) | 3 navigation item copies | 3 className strings (219–275 chars) | one CVA component, `shape="bar" \| "rail" \| "sidebar"` | `primary`, `surface-subtle`, `muted-foreground` | phone / tablet / desktop unchanged | Done |
| `layout/sticky-action-bar.tsx` (new) | 3 sticky bar copies | 3 chrome strings, 2 translucencies | one component; `offset` and `bleed` are layout facts, responsive escape stays with the caller | `surface-overlay`, `border` | phone / tablet / desktop unchanged | Done |
| `layout/app-header.tsx`, `chat-layout.tsx`, `edit-layout.tsx`, `onboarding-layout.tsx`, `bottom-navigation.tsx` | 3 chrome translucencies | `bg-background/85`, `/90`, `bg-surface/85` | `bg-surface-overlay` | `--surface-overlay` | unchanged | Done |
| `settings/settings-row.tsx` (new) | link row and toggle row didn't line up | two copies of the label/description block | one row, `htmlFor` decides `<label>` vs `<span>` | `card-foreground`, `muted-foreground` | unchanged | Done |
| Settings → Discovery row | no hover affordance on a navigational row | none | `transition-ui hover:bg-surface-subtle` | `surface-subtle` | unchanged | Done |
| Discover, Activities, Chat, Venue | 4 error blocks | see above | `ErrorState` | — | unchanged | Done |
| Discover, Activities | empty state + detached button | wrapper `div` | `EmptyState action=` | — | unchanged | Done |
| Buddy card, Activity card, Venue card, Plan step, Time suggestion, Selectable card | inconsistent hover/press | `transition-shadow` / `transition-colors`, some with no press feedback | `Card variant="interactive"`, `transition-ui`, `pressable` | `border-strong`, `shadow-hover` | unchanged | Done |
| Home | hand-rolled pill | inline `rounded-full bg-primary/12 …` | `StatusPill` | — | unchanged | Done |
| Activity status | colour-only distinction between states | `Badge` with `default`/`outline` | `StatusPill` with a per-state icon and tone | — | unchanged | Done |
| Plan summary | status and per-row agreement styled two ways | `Badge` + bare uppercase span | `StatusPill` + `DetailTile` | `surface-subtle` | unchanged | Done |

## 3. Deliberately not changed

- **The two inline styles.** `width: ${percent}%` is a runtime value; the
  brief's own rule allows exactly this.
- **`venue-map.tsx`'s hex fallbacks.** The Maps JS API cannot read a CSS
  custom property, so the map reads the computed token and needs a literal
  fallback if the read fails. It is the one documented exception.
- **Typography token names.** The brief suggested `page-title` /
  `section-title` / `card-title`. The existing `text-display` …
  `text-caption` scale is already semantic, is registered with
  `tailwind-merge`, and is used in roughly 400 places; renaming it would be
  a large diff that changes nothing a reader can see. The mapping from
  intent to token is documented in `theme.md` instead.
- **`bg-muted` in `Skeleton`, and `hover:bg-muted` in the shadcn `ghost`
  variants.** A shimmer placeholder and a ghost hover are not tiles; `muted`
  is the right token for both.
- **`ProposalStatus`'s sentences.** They were a candidate for `StatusPill`,
  but "You suggested Badminton. Waiting for Aisyah." carries more than a
  pill can, and the brief's own rule is that status must never be colour
  alone.
- **`Badge`.** It stays the component for *content* labels (sports, intents,
  availability). `StatusPill` is for *state*. Collapsing them would have
  made one component with two unrelated jobs.

## 4. Verification

- `tsc -b --noEmit` — clean.
- `oxlint src` — 5 warnings, all pre-existing `only-export-components`
  notices on files that export a CVA variant object next to a component
  (`button`, `badge`, `tabs`, `card`, `discover-filters`).
- `vite build` — succeeds.
- `vitest run` — 12 files, 270 tests passing.
- Every `bg-*` / `text-*` / `border-*` / `shadow-*` / `ring-*` class used in
  `src/**/*.tsx` was checked against the built stylesheet; none is dropped.
