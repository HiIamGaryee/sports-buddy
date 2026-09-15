import { describe, expect, it } from 'vitest'

import { calculateMonthlyExerciseRecap, formatRecapDuration } from '@/lib/monthly-recap'
import type { ExerciseActivity } from '@/types/exercise'
import type { SportId } from '@/types/sports-profile'

const AUGUST = { year: 2026, month: 8 }

interface ActivityOverrides {
  id?: string
  date?: Date
  sportId?: SportId | null
  sportLabel?: string
  durationMinutes?: number | null
  venue?: string | null
  distanceKm?: number | null
}

let sequence = 0
const activity = (overrides: ActivityOverrides = {}): ExerciseActivity => ({
  id: overrides.id ?? `ex-${(sequence += 1)}`,
  date: overrides.date ?? new Date(2026, 7, 3, 19, 0),
  sportId: overrides.sportId === undefined ? 'badminton' : overrides.sportId,
  sportLabel: overrides.sportLabel ?? 'Badminton',
  durationMinutes: overrides.durationMinutes ?? null,
  venue: overrides.venue ?? null,
  distanceKm: overrides.distanceKm ?? null,
})

describe('month filtering', () => {
  it('includes only records from the target month', () => {
    const recap = calculateMonthlyExerciseRecap(
      [
        activity({ date: new Date(2026, 7, 3) }),
        activity({ date: new Date(2026, 7, 20) }),
        activity({ date: new Date(2026, 6, 30) }), // July
        activity({ date: new Date(2026, 8, 1) }), // September
      ],
      AUGUST,
    )

    expect(recap.totalSessions).toBe(2)
  })

  it('excludes a record from the same month in a different year', () => {
    const recap = calculateMonthlyExerciseRecap(
      [activity({ date: new Date(2025, 7, 3) })],
      AUGUST,
    )

    expect(recap.totalSessions).toBe(0)
  })

  it('labels the recap with the target month', () => {
    const recap = calculateMonthlyExerciseRecap([], { year: 2027, month: 1 })
    expect(recap.label).toBe('January 2027')
  })
})

describe('sessions and sports', () => {
  it('counts total sessions', () => {
    const recap = calculateMonthlyExerciseRecap(
      [activity(), activity(), activity()],
      AUGUST,
    )
    expect(recap.totalSessions).toBe(3)
  })

  it('groups sports and counts each one', () => {
    const recap = calculateMonthlyExerciseRecap(
      [
        activity({ sportId: 'badminton', sportLabel: 'Badminton' }),
        activity({ sportId: 'badminton', sportLabel: 'Badminton' }),
        activity({ sportId: 'running', sportLabel: 'Running' }),
      ],
      AUGUST,
    )

    expect(recap.sports.map(({ label, sessions }) => [label, sessions])).toEqual([
      ['Badminton', 2],
      ['Running', 1],
    ])
  })

  it('sorts sports by session count descending, not alphabetically', () => {
    const recap = calculateMonthlyExerciseRecap(
      [
        activity({ sportId: 'running', sportLabel: 'Running' }),
        activity({ sportId: 'running', sportLabel: 'Running' }),
        activity({ sportId: 'running', sportLabel: 'Running' }),
        activity({ sportId: 'badminton', sportLabel: 'Badminton' }),
      ],
      AUGUST,
    )

    expect(recap.sports[0]?.label).toBe('Running')
  })

  it('breaks a tie alphabetically so the order is stable', () => {
    const recap = calculateMonthlyExerciseRecap(
      [
        activity({ sportId: 'running', sportLabel: 'Running' }),
        activity({ sportId: 'badminton', sportLabel: 'Badminton' }),
      ],
      AUGUST,
    )

    expect(recap.sports.map(({ label }) => label)).toEqual(['Badminton', 'Running'])
  })

  it('reports the most-played sport as the top sport', () => {
    const recap = calculateMonthlyExerciseRecap(
      [
        activity({ sportId: 'climbing', sportLabel: 'Climbing' }),
        activity({ sportId: 'climbing', sportLabel: 'Climbing' }),
        activity({ sportId: 'running', sportLabel: 'Running' }),
      ],
      AUGUST,
    )

    expect(recap.topSport).toMatchObject({ label: 'Climbing', sessions: 2 })
  })

  it('derives a percentage per sport', () => {
    const recap = calculateMonthlyExerciseRecap(
      [
        activity({ sportId: 'badminton', sportLabel: 'Badminton' }),
        activity({ sportId: 'badminton', sportLabel: 'Badminton' }),
        activity({ sportId: 'running', sportLabel: 'Running' }),
        activity({ sportId: 'running', sportLabel: 'Running' }),
      ],
      AUGUST,
    )

    expect(recap.sports.every(({ percentage }) => percentage === 50)).toBe(true)
  })

  it('does not crash on a sport outside the catalog', () => {
    const recap = calculateMonthlyExerciseRecap(
      [activity({ sportId: null, sportLabel: 'Sepak Takraw' })],
      AUGUST,
    )

    expect(recap.sports).toEqual([
      { sportId: null, label: 'Sepak Takraw', sessions: 1, percentage: 100 },
    ])
  })

  it('keeps two different uncatalogued sports apart', () => {
    const recap = calculateMonthlyExerciseRecap(
      [
        activity({ sportId: null, sportLabel: 'Sepak Takraw' }),
        activity({ sportId: null, sportLabel: 'Netball' }),
      ],
      AUGUST,
    )

    expect(recap.sports).toHaveLength(2)
  })
})

describe('active days', () => {
  it('counts unique calendar days, not sessions', () => {
    const recap = calculateMonthlyExerciseRecap(
      [
        activity({ date: new Date(2026, 7, 10, 7, 0) }),
        activity({ date: new Date(2026, 7, 10, 19, 0) }),
        activity({ date: new Date(2026, 7, 11, 19, 0) }),
      ],
      AUGUST,
    )

    expect(recap.totalSessions).toBe(3)
    expect(recap.activeDays).toBe(2)
  })
})

describe('duration', () => {
  it('totals and averages duration when the source has it', () => {
    const recap = calculateMonthlyExerciseRecap(
      [
        activity({ durationMinutes: 90 }),
        activity({ durationMinutes: 60 }),
        activity({ durationMinutes: 30 }),
      ],
      AUGUST,
    )

    expect(recap.totalDurationMinutes).toBe(180)
    expect(recap.averageDurationMinutes).toBe(60)
  })

  it('is null when no session recorded a duration', () => {
    const recap = calculateMonthlyExerciseRecap([activity(), activity()], AUGUST)

    expect(recap.totalDurationMinutes).toBeNull()
    expect(recap.averageDurationMinutes).toBeNull()
  })

  it('ignores impossible durations rather than counting them as zero', () => {
    const recap = calculateMonthlyExerciseRecap(
      [
        activity({ durationMinutes: 60 }),
        activity({ durationMinutes: Number.NaN }),
        activity({ durationMinutes: -30 }),
      ],
      AUGUST,
    )

    expect(recap.totalDurationMinutes).toBe(60)
  })

  it('formats a duration', () => {
    expect(formatRecapDuration(580)).toBe('9h 40m')
    expect(formatRecapDuration(45)).toBe('45m')
    expect(formatRecapDuration(120)).toBe('2h')
  })
})

describe('venues', () => {
  it('counts sessions per venue, most frequent first', () => {
    const recap = calculateMonthlyExerciseRecap(
      [
        activity({ venue: 'Sunway Sports Centre' }),
        activity({ venue: 'Sunway Sports Centre' }),
        activity({ venue: 'PJ Sports Hub' }),
      ],
      AUGUST,
    )

    expect(recap.venues).toEqual([
      { name: 'Sunway Sports Centre', sessions: 2 },
      { name: 'PJ Sports Hub', sessions: 1 },
    ])
  })

  it('is null when the source records no venue', () => {
    expect(calculateMonthlyExerciseRecap([activity()], AUGUST).venues).toBeNull()
  })
})

describe('distance', () => {
  it('totals distance per sport when the source has it', () => {
    const recap = calculateMonthlyExerciseRecap(
      [
        activity({ sportId: 'running', sportLabel: 'Running', distanceKm: 7.2 }),
        activity({ sportId: 'running', sportLabel: 'Running', distanceKm: 5.5 }),
      ],
      AUGUST,
    )

    expect(recap.distances).toEqual([
      { sportId: 'running', label: 'Running', distanceKm: 12.7 },
    ])
  })

  it('is null when no session recorded a distance', () => {
    expect(calculateMonthlyExerciseRecap([activity()], AUGUST).distances).toBeNull()
  })
})

describe('robustness', () => {
  it('ignores a malformed date without losing the rest of the recap', () => {
    const recap = calculateMonthlyExerciseRecap(
      [activity({ date: new Date('nonsense') }), activity(), activity()],
      AUGUST,
    )

    expect(recap.totalSessions).toBe(2)
  })

  it('counts a duplicate id once', () => {
    const recap = calculateMonthlyExerciseRecap(
      [activity({ id: 'ex-dupe' }), activity({ id: 'ex-dupe' }), activity({ id: 'ex-other' })],
      AUGUST,
    )

    expect(recap.totalSessions).toBe(2)
  })

  it('returns a zero recap for an empty month, with no fake numbers', () => {
    const recap = calculateMonthlyExerciseRecap([], AUGUST)

    expect(recap).toMatchObject({
      totalSessions: 0,
      activeDays: 0,
      sports: [],
      topSport: null,
      totalDurationMinutes: null,
      venues: null,
      distances: null,
    })
  })
})
