# Venue discovery

Answering **where should we play?** for a plan that already has a sport, a
time and a budget — without ever learning where either person actually is.

## 1. Purpose

STEP 10 got two connected members to agree what, when and how much. The last
open question is where. This step searches real venues near a fair point
between their two areas, and puts the choice through the same
propose/agree machinery as everything else.

It does **not** confirm an activity. That is STEP 12.

## 2. Privacy

The app stores an **area** per user (`subang-jaya`) and nothing else. STEP 11
does not change that.

- **No `navigator.geolocation`.** No permission is requested, ever.
- **No coordinates on `users/{uid}`** — no latitude, longitude, home point or
  last-known position. A grep guard covers this.
- **No live location, no background location, no tracking.**

### Language

| Say | Never say |
| --- | --- |
| "Searching around the midpoint of Subang Jaya and Petaling Jaya." | "Searching between your live locations." |
| "2.1 km from the search area" | "2.1 km from Gary" |
| "Suggested search area" | "Meeting point" (before a venue is agreed) |
| "Based on Subang Jaya and Petaling Jaya" | "Aina is currently here" |

## 3. Approximate area centres

`AreaDefinition` in `src/constants/areas.ts` gained a `center`: the **public
approximate centroid** of the area — the same thing a map label points at.

```ts
{ id: 'subang-jaya', name: 'Subang Jaya', region: 'west-klang-valley',
  center: { lat: 3.0568, lng: 101.5851 } }
```

It describes a place, not a person: it is not anyone's home, it does not move,
and it is identical for every user who picked that area. Its only job is to
seed a venue search.

## 4. Planning midpoint

`venueService.getSearchArea(areaA, areaB)` returns a `PlanningSearchArea`:

```
center       = calculateMidpoint(centreOfAreaA, centreOfAreaB)
radiusMeters = deriveVenueSearchRadius(centreOfAreaA, centreOfAreaB)
areaIds      = the areas it came from, for honest on-screen wording
```

It is **transient** — computed for a search and never persisted, never stored
against a user, and never described as anybody's location.

`null` when either person has no area, in which case the planner says so
rather than guessing.

### Geo utilities (`src/lib/geo.ts`, pure)

| Function | Notes |
| --- | --- |
| `isValidCoordinate` | lat −90..90, lng −180..180, finite |
| `calculateMidpoint` | plain average; correct at Klang Valley scale |
| `calculateHaversineDistance` | great-circle metres |
| `deriveVenueSearchRadius` | 5 km base, widening with area spread, clamped 3–12 km |
| `formatDistance` | "800 m" / "2.1 km" |
| `buildGoogleMapsUrl` | the one place a maps link is constructed |

The search radius is deliberately **not** the profile's `radiusKm`: that is a
preference about which *people* to see, not a statement about geography.

## 5. Venue model

`Venue` (`src/types/venue.ts`) is a small subset of what a provider returns —
id, name, address, location, maps uri, rating, rating count, primary type,
price level, business status. The raw response never reaches state or storage.

## 6. `VenueSelection` snapshot

What a plan persists once a venue is proposed:

```ts
VenueSelection { placeId, name, address, location, googleMapsUri }
```

Ratings, categories and price bands are **deliberately dropped**: they go
stale, and they are not part of what the two people agreed.

Snapshotting at all is the point — the plan still shows its venue if the
provider is unavailable later, re-ranks its results, or the place changes.

## 7. `VenueRepository`

```
UI → useVenueSearch → venueService → venueRepository → Google Places | Mock
```

Two methods, both actually used: `searchVenues(params)` and
`getVenueById(placeId)`. No component calls a provider.

## 8. Google implementation

`googleVenueRepository` uses the **Places API (New)** over REST
(`places:searchText`), which supports CORS from a browser — so no SDK is
loaded just to search.

- a narrow `X-Goog-FieldMask` (10 fields) is both a cost control and the
  reason nothing extra can leak into the app
- `maxResultCount` caps the response
- `locationBias` (a circle around the midpoint) biases rather than hard-filters
- `mapGooglePlaceToVenue()` is the only mapping boundary; a place with no id,
  name or valid coordinates is dropped rather than shown

The **Maps JavaScript API** is separate and loaded only when a map renders
(`src/services/google/maps-loader.ts` — one cached promise, one script tag).

## 9. Mock implementation

`mockVenueRepository` serves 12 real Klang Valley venues
(`mock-venues.ts`) at approximate public coordinates, tagged with the sports
they suit, filtered by sport and query and ordered by distance from the search
centre — the same contract the Google repository fulfils.

No photos and no prices: Places does not reliably return court pricing, and
inventing it would be worse than omitting it.

## 10. Sport → search terms

`SPORT_VENUE_SEARCH` (`src/constants/venues.ts`) maps every `SportId` to
search terms and a display label. No `switch` in a component, and no competing
sport identifiers.

Sports without a commercial venue map to the public spaces people actually
use — running → `running track`, `park`, `stadium`. There is no route
planning.

## 11. Search radius and limits

| Constant | Value |
| --- | --- |
| `VENUE_SEARCH_RADIUS_METERS` | 5 000 |
| `MIN_/MAX_VENUE_SEARCH_RADIUS_METERS` | 3 000 / 12 000 |
| `VENUE_RESULT_LIMIT` | 16 (applied in the request **and** after ranking) |
| `VENUE_SEARCH_DEBOUNCE_MS` | 400 |
| `MIN_VENUE_QUERY_LENGTH` | 3 |

Ranking is transparent: sport relevance (the query), then distance from the
search centre. No recommendation engine, no AI.

## 12. Map and list

The **list is the primary surface at every width.** The map is an
enhancement:

- it renders only when a key is configured and there are results
- if it fails to load it renders nothing at all, and the list is untouched
- every venue on the map is selectable from the list, so nothing is
  map-only for keyboard or screen-reader users

Selection is two-way: tapping a marker highlights its card, tapping a card
pans the map to it.

Marker colours are read from the live theme tokens
(`getComputedStyle(...).getPropertyValue('--primary')`), because the Maps API
needs real colour strings and cannot take a class — no hex is hardcoded.

## 13. Propose and agree

Venue reuses the STEP 10 `Proposal<T>` machinery exactly — there is no second
agreement mechanism:

- proposing accepts implicitly (`acceptedBy: [proposer]`, `version + 1`)
- the other person's **Agree** completes it
- changing the venue resets agreement to the new proposer and bumps the
  version, so nobody is shown as having agreed to a venue that has changed
- an accept names the version it saw; a stale one is refused

One extra rule of its own: a venue can only be proposed once sport, time and
budget are agreed, because the search depends on the agreed sport.

## 14. Plan integration

`ActivityPlan` gained `venueProposal: Proposal<VenueSelection>` and one new
status:

| Status | Meaning |
| --- | --- |
| `draft` | sport / time / budget not all agreed |
| `ready` | those three agreed, **ready for a venue** |
| `venue-agreed` | all four agreed; STEP 12 can confirm it |

**Migration:** `ready` kept its STEP 10 name deliberately (option A), so no
data is rewritten. Plans written before this step have no `venueProposal`
field at all: the Firestore mapper and `normalizeActivityPlan()` fill in an
empty proposal on read, and the security rules treat the field as optional via
`data.get('venueProposal', <empty>)`. There is an emulator test for exactly
that case.

Status is **derived** by `derivePlanStatus()` and recomputed independently by
the rules — it is never set by hand.

## 15. Security

The plan's existing rules were extended, not replaced:

- `venueProposal` obeys the same "unchanged, replaced by its proposer, or the
  caller adding only themselves" rule as every other proposal, so **one
  participant can never agree on the other's behalf**
- a venue change is only legal when sport, time and budget are already agreed
- `status == 'venue-agreed'` is only accepted when the venue proposal is
  agreed by **both** participants — it cannot be claimed
- `participants`, `connectionId`, `id`, `createdBy` and `createdAt` stay
  frozen; delete stays denied

The application also validates a snapshot before it is written
(`venueService.isValidSelection`): a place id, a non-empty name and
coordinates in range, or nothing is persisted.

**No venue collection exists.** Google results are transient; duplicating a
places catalogue into Firestore would only create stale records to
synchronise.

`npm run test:rules` covers venue proposals (70 tests total, 8 for venue).

## 16. Google configuration

```dotenv
VITE_VENUE_SOURCE=mock          # mock | google
VITE_GOOGLE_MAPS_API_KEY=
```

`VITE_VENUE_SOURCE` is **independent of `VITE_DATA_SOURCE`**, so Firebase plus
mock venues is a normal development setup and Google billing is never a
prerequisite for working on anything else. The provider is selected once, in
`repositories.ts`; no component branches on it.

Enable in Google Cloud: **Places API (New)** and **Maps JavaScript API**.

## 17. API key restrictions

A Maps browser key is public by design — it is restricted, not hidden. For
production:

- **Application restriction:** HTTP referrers, limited to your domains
- **API restriction:** only Places API (New) and Maps JavaScript API
- **Quotas:** a daily cap per API, so a mistake cannot become a bill
- **Billing alerts** on the project

The key is read only in `src/config/env.ts`, never interpolated into a message
and never logged. A missing key produces `maps/not-configured`, which is shown
as a developer setup message in development and a plain "venues unavailable"
state in production. It never crashes the app, and mock mode is unaffected.

## 18. Cost controls

- a search runs when the venue step **opens**, when the user **pauses typing**
  (400 ms, 3 characters minimum), or on **retry** — never on render, hover,
  marker click or map pan
- **no automatic search on map movement**
- identical searches are served from a small in-memory cache scoped to the
  screen; nothing persistent
- a narrow field mask and a 16-result cap on every request
- the Maps JavaScript API loads only when a map actually renders, once
- no Places call is made until the plan is `ready`, so an unfinished plan
  costs nothing

## 19. Current limitations

- **No booking, availability or payment.** A place appearing in results says
  nothing about whether a court is free. Nothing shows "Available" or
  "Booked".
- **No pricing.** The plan's budget is a *target the two people agreed*, not a
  venue quote. A provider price *band* may be shown, never converted to
  ringgit.
- **No travel time, ETA or directions.** No Routes API. Distance is only ever
  from the search area.
- **No custom/manual venue entry** — selections are provider-backed, so venue
  data stays consistent.
- **No confirmed activity, calendar or notifications** — STEPS 12–14.
- **Live Google verification is outstanding.** No API key exists in this
  environment: the Places request shape, the Maps script load and marker
  rendering are implemented and typed but have **not** been run against Google.
- **Live two-user Firebase verification is outstanding**, as in STEP 10.

## 20. STEP 12: confirming the activity

A `venue-agreed` plan already carries everything an activity needs —
`connectionId`, `participants`, the agreed `sportId`, `PlannedTime`,
`BudgetPreference` and the `VenueSelection` snapshot.

STEP 12 can create the confirmed activity from the plan alone, with **no
further Places call**, which is exactly why the snapshot is stored.
