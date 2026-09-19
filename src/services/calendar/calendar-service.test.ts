import { describe, expect, it } from 'vitest'

import { buildIcsCalendar } from '@/lib/ics'
import {
  buildCalendarUid,
  calendarService,
} from '@/services/calendar/calendar-service'
import type { Activity } from '@/types/activity'

const NOW = new Date('2026-09-10T00:00:00.000Z')

const activity = (overrides: Partial<Activity> = {}): Activity => ({
  id: 'gary__aina__active',
  sourcePlanId: 'gary__aina__active',
  connectionId: 'gary__aina',
  participants: ['aina', 'gary'],
  sportId: 'badminton',
  startAt: '2026-09-12T09:00:00.000Z',
  endAt: '2026-09-12T11:00:00.000Z',
  budget: { min: 20, max: 40, currency: 'MYR', unit: 'per-person' },
  venue: {
    placeId: 'place_1',
    name: 'Subang Racquet Centre',
    address: 'Jalan SS15/4, Subang Jaya',
    location: { lat: 3.0722, lng: 101.5859 },
    openStreetMapUrl: 'https://www.openstreetmap.org/?mlat=3.1&mlon=101.6#map=17/3.1/101.6',
  },
  status: 'confirmed',
  createdBy: 'gary',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  ...overrides,
})

describe('toEventData', () => {
  it('titles the event with the sport and the buddy, never ids', () => {
    const event = calendarService.toEventData(activity(), 'Aina')
    expect(event?.title).toBe('Badminton with Aina')
    expect(event?.title).not.toContain('gary')
    expect(event?.title).not.toContain('aina')
  })

  it('falls back to the sport alone when there is no buddy name', () => {
    expect(calendarService.toEventData(activity(), '')?.title).toBe('Badminton')
  })

  it('maps the agreed start and end instants', () => {
    const event = calendarService.toEventData(activity(), 'Aina')
    expect(event?.startAt.toISOString()).toBe('2026-09-12T09:00:00.000Z')
    expect(event?.endAt.toISOString()).toBe('2026-09-12T11:00:00.000Z')
  })

  it('locates the event at the agreed venue, not anybody area', () => {
    const event = calendarService.toEventData(activity(), 'Aina')
    expect(event?.location).toBe(
      'Subang Racquet Centre, Jalan SS15/4, Subang Jaya',
    )
  })

  it('uses the venue name alone when there is no address', () => {
    const withoutAddress = activity()
    withoutAddress.venue = { ...withoutAddress.venue, address: '' }
    expect(calendarService.toEventData(withoutAddress, 'Aina')?.location).toBe(
      'Subang Racquet Centre',
    )
  })

  it('produces a stable uid for the same activity', () => {
    const first = calendarService.toEventData(activity(), 'Aina')
    const second = calendarService.toEventData(activity(), 'Aina')
    expect(first?.uid).toBe(second?.uid)
    expect(first?.uid).toBe(buildCalendarUid('gary__aina__active'))
  })

  it('gives different activities different uids', () => {
    const other = calendarService.toEventData(
      activity({ id: 'gary__mei__active' }),
      'Mei',
    )
    expect(other?.uid).not.toBe(
      calendarService.toEventData(activity(), 'Aina')?.uid,
    )
  })

  it('does not change the uid when the buddy renames themselves', () => {
    // A uid derived from the title would change the identity of the event.
    expect(calendarService.toEventData(activity(), 'Aina')?.uid).toBe(
      calendarService.toEventData(activity(), 'Someone Else')?.uid,
    )
  })

  it('carries a trusted maps link and drops an untrusted one', () => {
    expect(calendarService.toEventData(activity(), 'Aina')?.url).toBe(
      'https://www.openstreetmap.org/?mlat=3.1&mlon=101.6#map=17/3.1/101.6',
    )

    const hostile = activity()
    hostile.venue = {
      ...hostile.venue,
      openStreetMapUrl: 'javascript:alert(1)',
    }
    expect(calendarService.toEventData(hostile, 'Aina')?.url).toBeUndefined()

    const phishing = activity()
    phishing.venue = {
      ...phishing.venue,
      openStreetMapUrl: 'https://openstreetmap.org.evil.test/x',
    }
    expect(calendarService.toEventData(phishing, 'Aina')?.url).toBeUndefined()
  })

  it('rejects an activity whose times are unusable', () => {
    expect(
      calendarService.toEventData(activity({ startAt: 'nonsense' }), 'Aina'),
    ).toBeNull()
    expect(
      calendarService.toEventData(activity({ endAt: 'nonsense' }), 'Aina'),
    ).toBeNull()
  })

  it('rejects an activity that ends before or when it starts', () => {
    expect(
      calendarService.toEventData(
        activity({ endAt: '2026-09-12T09:00:00.000Z' }),
        'Aina',
      ),
    ).toBeNull()
    expect(
      calendarService.toEventData(
        activity({ endAt: '2026-09-12T08:00:00.000Z' }),
        'Aina',
      ),
    ).toBeNull()
  })

  it('rejects an unknown sport and a malformed id', () => {
    expect(
      calendarService.toEventData(
        activity({ sportId: 'quidditch' as Activity['sportId'] }),
        'Aina',
      ),
    ).toBeNull()
    expect(
      calendarService.toEventData(activity({ id: '../../admin' }), 'Aina'),
    ).toBeNull()
  })

  it('rejects an activity with no venue name', () => {
    const nameless = activity()
    nameless.venue = { ...nameless.venue, name: '   ' }
    expect(calendarService.toEventData(nameless, 'Aina')).toBeNull()
  })
})

describe('what a calendar event must never contain', () => {
  it('leaks no ids, no email and no private profile data', () => {
    const event = calendarService.toEventData(activity(), 'Aina')
    const serialized = JSON.stringify(event)

    for (const leak of [
      'gary',
      'aina@',
      'sourcePlanId',
      'connectionId',
      'participants',
      'email',
      'photoUrl',
      'bio',
      'preferences',
    ]) {
      expect(serialized).not.toContain(leak)
    }
  })

  it('says only what the two people agreed', () => {
    const event = calendarService.toEventData(activity(), 'Aina')
    expect(event?.description).toContain('Sports Buddy activity')
    expect(event?.description).toContain('Badminton with Aina')
    expect(event?.description).toContain('per person')
    // Honest about what confirming does and does not do.
    expect(event?.description).toContain('does not reserve')
  })

  it('cannot inject an ICS property through the buddy name', () => {
    // React-safe rendering says nothing about ICS: a different output
    // context needs a different escape, applied at serialization.
    const event = calendarService.toEventData(
      activity(),
      'Aina\r\nATTENDEE:mailto:attacker@example.com',
    )
    const ics = buildIcsCalendar(event!, NOW)

    expect(
      ics.split('\r\n').some((line) => line.startsWith('ATTENDEE')),
    ).toBe(false)
  })
})

describe('canAddToCalendar', () => {
  it('offers the action for a session that has not finished', () => {
    expect(calendarService.canAddToCalendar(activity(), NOW)).toBe(true)
  })

  it('withholds it once the session has ended', () => {
    expect(
      calendarService.canAddToCalendar(
        activity(),
        new Date('2026-09-20T00:00:00.000Z'),
      ),
    ).toBe(false)
  })
})

describe('addActivity', () => {
  it('refuses an activity that cannot produce a valid event', async () => {
    const result = await calendarService.addActivity(
      activity({ startAt: 'nonsense' }),
      'Aina',
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('invalid-activity')
      // A user-safe sentence, never a stack trace or raw ICS.
      expect(result.message).not.toMatch(/undefined|Error|BEGIN:/)
    }
  })
})
