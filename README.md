# Sports Buddy

Mobile-first sports social app. React + TypeScript + Vite + Tailwind v4 +
shadcn/ui, packaged for mobile with Capacitor, Firebase planned as backend.

## Commands

```bash
npm run dev        # web dev server
npm run build      # typecheck + production build
npm run typecheck  # tsc only
npm run lint       # oxlint
npm test           # vitest (matching engine + discover filters)
npm run cap:sync   # build + cap sync (native shell)
```

## Setup

```bash
cp .env.example .env   # VITE_DATA_SOURCE=mock works with no credentials
npm install
npm run dev
```

The app runs against mock repositories by default. To use a real backend set
`VITE_DATA_SOURCE=firebase` and fill the Firebase keys — see
`docs/firebase.md`.

## Docs

- `CLAUDE.md` — architecture, conventions and rules. Read before coding.
- `theme.md` — design system, tokens, typography, accessibility.
- `docs/firebase.md` — Firebase project setup and mode switching.
- `docs/data-model.md` — the `users/{uid}` document and privacy boundary.
- `docs/discover.md` — the discovery pipeline and public projection.
- `docs/matching.md` — the compatibility engine: weights, formulas, limits.

Current status: **STEP 7 — Compatibility + Matching Engine** (auth,
onboarding, profile, preferences, browsing other members and ranked
compatibility; connecting and chat come later).
