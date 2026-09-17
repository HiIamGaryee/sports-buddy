import { describe, expect, it } from 'vitest'

import { AREAS } from '@/constants/areas'
import { SPORTS } from '@/constants/sports'
import {
  applyApprove,
  applyDecline,
  applyJoin,
  applyLeave,
  compareActivityPosts,
  getPostViewerState,
  getActivityPostError,
  isUpcomingPost,
  toCreateActivityPostInput,
  toDraftFromPost,
  toLocalDateTimeInZone,
} from '@/lib/activity-post'
import type { ActivityPost, ActivityPostDraft } from '@/types/activity-post'

const ZONE = 'Asia/Kuala_Lumpur'
// Fixed "now": 2026-09-14 10:00 in Kuala Lumpur (UTC+8).
const NOW = new Date('2026-09-14T02:00:00.000Z')

const draft = (overrides: Partial<ActivityPostDraft> = {}): ActivityPostDraft => ({
  sportId: SPORTS[0].id,
  localDateTime: '2026-09-15T17:00',
  timeZone: ZONE,
  areaId: AREAS[0].id,
  venueName: 'KL Sports City',
  budget: { min: 10, max: 20 },
  joinPolicy: 'open',
  visibility: 'public',
  invitedId: null,
  ...overrides,
})

describe('getActivityPostError', () => {
  it('accepts a complete upcoming post', () => {
    expect(getActivityPostError(draft(), NOW)).toBeNull()
  })

  it('accepts an open-ended budget', () => {
    expect(getActivityPostError(draft({ budget: { min: 60, max: null } }), NOW)).toBeNull()
  })

  it('rejects a sport or area outside the datasets', () => {
    expect(getActivityPostError(draft({ sportId: 'quidditch' as never }), NOW)).toBe(
      'Choose a sport.',
    )
    expect(getActivityPostError(draft({ areaId: 'atlantis' as never }), NOW)).toBe(
      'Choose the area you are playing in.',
    )
  })

  it('rejects a time in the past, or a malformed one', () => {
    expect(getActivityPostError(draft({ localDateTime: '2026-09-13T17:00' }), NOW)).toBe(
      'Choose a time in the future.',
    )
    expect(getActivityPostError(draft({ localDateTime: 'tomorrow' }), NOW)).toBe(
      'Choose when you are playing.',
    )
  })

  it('rejects a time more than 90 days ahead', () => {
    expect(getActivityPostError(draft({ localDateTime: '2027-01-01T17:00' }), NOW)).toMatch(
      /within the next 90 days/,
    )
  })

  it('rejects impossible budgets', () => {
    expect(getActivityPostError(draft({ budget: { min: 40, max: 20 } }), NOW)).toBe(
      'Choose a budget per person.',
    )
    expect(getActivityPostError(draft({ budget: { min: Number.NaN, max: 20 } }), NOW)).toBe(
      'Choose a budget per person.',
    )
    expect(getActivityPostError(draft({ budget: null }), NOW)).toBe(
      'Choose a budget per person.',
    )
  })

  it('reports a long venue name instead of truncating it', () => {
    expect(getActivityPostError(draft({ venueName: 'a'.repeat(81) }), NOW)).toMatch(
      /under 80 characters/,
    )
    expect(getActivityPostError(draft({ venueName: '   ' }), NOW)).toBe('Add the venue name.')
  })

  it('keeps every language and punctuation in a venue name', () => {
    expect(getActivityPostError(draft({ venueName: "Court A & B — 羽毛球馆" }), NOW)).toBeNull()
  })
})

describe('toCreateActivityPostInput', () => {
  it('resolves the local time in the author zone to a real instant', () => {
    const input = toCreateActivityPostInput('author_1', draft(), NOW)
    // 17:00 in Kuala Lumpur is 09:00 UTC.
    expect(input?.startAt).toBe('2026-09-15T09:00:00.000Z')
    expect(input?.venueName).toBe('KL Sports City')
  })

  it('returns null for an invalid draft, so nothing can be written', () => {
    expect(toCreateActivityPostInput('author_1', draft({ sportId: null }), NOW)).toBeNull()
  })

  it('writes only the known fields', () => {
    const withExtra = { ...draft(), isAdmin: true } as ActivityPostDraft
    const input = toCreateActivityPostInput('author_1', withExtra, NOW)
    expect(Object.keys(input ?? {}).sort()).toEqual(
      ['areaId', 'authorId', 'budget', 'invitedId', 'joinPolicy', 'sportId', 'startAt', 'timeZone', 'venueName', 'visibility'].sort(),
    )
  })
})

describe('ordering and visibility', () => {
  const post = (id: string, startAt: string): ActivityPost => ({
    id,
    authorId: 'a',
    sportId: SPORTS[0].id,
    startAt,
    timeZone: ZONE,
    areaId: AREAS[0].id,
    venueName: 'Court',
    budget: { min: 0, max: null },
    joinPolicy: 'open',
    visibility: 'public',
    invitedId: null,
    capacity: 1,
    joinedIds: [],
    pendingIds: [],
    createdAt: null,
    updatedAt: null,
  })

  it('hides a post once it has started', () => {
    expect(isUpcomingPost(post('p', '2026-09-14T03:00:00.000Z'), NOW)).toBe(true)
    expect(isUpcomingPost(post('p', '2026-09-14T01:00:00.000Z'), NOW)).toBe(false)
  })

  it('sorts soonest first with a stable tie-break', () => {
    const sorted = [
      post('b', '2026-09-16T00:00:00.000Z'),
      post('c', '2026-09-15T00:00:00.000Z'),
      post('a', '2026-09-15T00:00:00.000Z'),
    ].sort(compareActivityPosts)
    expect(sorted.map(({ id }) => id)).toEqual(['a', 'c', 'b'])
  })
})

describe('editing a post', () => {
  it('shows the time as the author posted it, in their zone', () => {
    // 09:00 UTC is 17:00 in Kuala Lumpur.
    expect(toLocalDateTimeInZone('2026-09-15T09:00:00.000Z', ZONE)).toBe(
      '2026-09-15T17:00',
    )
  })

  it('round-trips a post through the edit form unchanged', () => {
    const input = toCreateActivityPostInput('author_1', draft(), NOW)
    if (!input) throw new Error('expected a valid input')
    const post: ActivityPost = {
      ...input,
      id: 'p1',
      capacity: 1,
      joinedIds: [],
      pendingIds: [],
      createdAt: null,
      updatedAt: null,
    }
    expect(toDraftFromPost(post)).toEqual(draft())
  })

  it('returns null for a malformed instant or zone', () => {
    expect(toLocalDateTimeInZone('not a date', ZONE)).toBeNull()
    expect(toLocalDateTimeInZone('2026-09-15T09:00:00.000Z', 'Not/AZone')).toBeNull()
  })
})

describe('joining a 1v1 post', () => {
  const ALEX = 'alex'
  const BEN = 'ben'
  const AUTHOR = 'author'
  const base = (overrides: Partial<ActivityPost> = {}): ActivityPost => ({
    id: 'p',
    authorId: AUTHOR,
    sportId: SPORTS[0].id,
    startAt: '2026-09-15T09:00:00.000Z',
    timeZone: ZONE,
    areaId: AREAS[0].id,
    venueName: 'Court',
    budget: { min: 10, max: 20 },
    joinPolicy: 'open',
    visibility: 'public',
    invitedId: null,
    capacity: 1,
    joinedIds: [],
    pendingIds: [],
    createdAt: null,
    updatedAt: null,
    ...overrides,
  })

  it('gives the spot straight away on an open post, then shows Full', () => {
    const next = applyJoin(base(), ALEX, NOW)
    expect(next).toEqual({ ok: true, unchanged: false, joinedIds: [ALEX], pendingIds: [] })
    const full = base({ joinedIds: [ALEX] })
    expect(getPostViewerState(full, BEN, NOW)).toBe('full')
    expect(applyJoin(full, BEN, NOW)).toEqual({ ok: false, reason: 'full' })
  })

  it('files a request on an approval post instead of taking the spot', () => {
    const post = base({ joinPolicy: 'approval' })
    expect(getPostViewerState(post, ALEX, NOW)).toBe('can-request')
    expect(applyJoin(post, ALEX, NOW)).toEqual({
      ok: true,
      unchanged: false,
      joinedIds: [],
      pendingIds: [ALEX],
    })
  })

  it('lets the author approve one request, and refuses a second once full', () => {
    const post = base({ joinPolicy: 'approval', pendingIds: [ALEX, BEN] })
    expect(applyApprove(post, AUTHOR, ALEX)).toEqual({
      ok: true,
      unchanged: false,
      joinedIds: [ALEX],
      pendingIds: [BEN],
    })
    const full = base({ joinPolicy: 'approval', joinedIds: [ALEX], pendingIds: [BEN] })
    expect(applyApprove(full, AUTHOR, BEN)).toEqual({ ok: false, reason: 'full' })
    expect(applyApprove(post, ALEX, BEN)).toEqual({ ok: false, reason: 'not-author' })
  })

  it('refuses joining your own post or one that has started', () => {
    expect(applyJoin(base(), AUTHOR, NOW)).toEqual({ ok: false, reason: 'own-post' })
    const started = base({ startAt: '2026-09-14T01:00:00.000Z' })
    expect(applyJoin(started, ALEX, NOW)).toEqual({ ok: false, reason: 'started' })
  })

  it('is idempotent: joining twice or leaving twice changes nothing', () => {
    const joined = base({ joinedIds: [ALEX] })
    expect(applyJoin(joined, ALEX, NOW)).toMatchObject({ ok: true, unchanged: true })
    expect(applyLeave(base(), ALEX)).toMatchObject({ ok: true, unchanged: true })
  })

  it('frees the spot when the joiner leaves or the author removes them', () => {
    const joined = base({ joinedIds: [ALEX] })
    expect(applyLeave(joined, ALEX)).toMatchObject({ ok: true, joinedIds: [] })
    expect(applyDecline(joined, AUTHOR, ALEX)).toMatchObject({ ok: true, joinedIds: [] })
  })

  it('keeps someone who is in the activity "joined" even after it starts', () => {
    const started = base({ startAt: '2026-09-14T01:00:00.000Z', joinedIds: [ALEX] })
    expect(getPostViewerState(started, ALEX, NOW)).toBe('joined')
    expect(getPostViewerState(started, BEN, NOW)).toBe('past')
  })
})

describe('link-only posts and private invites', () => {
  const BUDDY = 'buddy'
  const STRANGER = 'stranger'
  const AUTHOR = 'author'
  const post = (overrides: Partial<ActivityPost> = {}): ActivityPost => ({
    id: 'p',
    authorId: AUTHOR,
    sportId: SPORTS[0].id,
    startAt: '2026-09-15T09:00:00.000Z',
    timeZone: ZONE,
    areaId: AREAS[0].id,
    venueName: 'Court',
    budget: { min: 10, max: 20 },
    joinPolicy: 'open',
    visibility: 'invite',
    invitedId: BUDDY,
    capacity: 1,
    joinedIds: [],
    pendingIds: [],
    createdAt: null,
    updatedAt: null,
    ...overrides,
  })

  it('accepts a link-only post like a public one', () => {
    expect(getActivityPostError(draft({ visibility: 'link' }), NOW)).toBeNull()
  })

  it('needs exactly one invitee for an invite, and none otherwise', () => {
    expect(getActivityPostError(draft({ visibility: 'invite', invitedId: BUDDY }), NOW)).toBeNull()
    expect(getActivityPostError(draft({ visibility: 'invite', invitedId: null }), NOW)).toBe(
      'Choose who to invite.',
    )
    expect(getActivityPostError(draft({ visibility: 'public', invitedId: BUDDY }), NOW)).toBe(
      'Choose who can see it.',
    )
    expect(
      getActivityPostError(draft({ visibility: 'everyone' as never }), NOW),
    ).toBe('Choose who can see it.')
  })

  it('makes an invite open to its guest, whatever policy the draft carried', () => {
    const input = toCreateActivityPostInput(
      AUTHOR,
      draft({ visibility: 'invite', invitedId: BUDDY, joinPolicy: 'approval' }),
      NOW,
    )
    expect(input?.joinPolicy).toBe('open')
    expect(input?.invitedId).toBe(BUDDY)
  })

  it('lets only the invitee accept, and accepting takes the spot', () => {
    expect(getPostViewerState(post(), BUDDY, NOW)).toBe('invited')
    expect(getPostViewerState(post(), STRANGER, NOW)).toBe('past')
    expect(applyJoin(post(), STRANGER, NOW)).toEqual({ ok: false, reason: 'not-invited' })
    expect(applyJoin(post({ joinPolicy: 'approval' }), BUDDY, NOW)).toEqual({
      ok: true,
      unchanged: false,
      joinedIds: [BUDDY],
      pendingIds: [],
    })
  })

  it('turns an accepted invite into a joined session', () => {
    expect(getPostViewerState(post({ joinedIds: [BUDDY] }), BUDDY, NOW)).toBe('joined')
  })
})
