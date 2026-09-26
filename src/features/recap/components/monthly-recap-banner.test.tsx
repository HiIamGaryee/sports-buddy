// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MonthlyRecapBanner } from '@/features/recap/components/monthly-recap-banner'
import { useMonthlyRecap } from '@/features/recap/use-monthly-recap'
import type { MonthlyRecap } from '@/types/recap'

vi.mock('@/features/recap/use-monthly-recap', () => ({
  useMonthlyRecap: vi.fn(),
}))

const RECAP: MonthlyRecap = {
  monthKey: '2026-08',
  monthLabel: 'August 2026',
  sports: [
    { sportId: 'badminton', count: 10 },
    { sportId: 'running', count: 4 },
    { sportId: 'gym', count: 2 },
  ],
  topSport: { sportId: 'badminton', count: 10 },
  totalSessions: 16,
  activeDays: 12,
  totalDurationMinutes: null,
  venues: null,
  buddies: [],
  verifiedSessions: 8,
  showUpRatePercent: 100,
}

const hookResult = (recap: MonthlyRecap | null, isLoading = false, error = '') => ({
  monthKey: recap?.monthKey ?? '2026-08',
  recap,
  isLoading,
  error,
  canGoToNextMonth: true,
  goToPreviousMonth: vi.fn(),
  goToNextMonth: vi.fn(),
})

const renderBanner = () =>
  render(
    <MemoryRouter>
      <MonthlyRecapBanner displayName="Gary" />
    </MemoryRouter>,
  )

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('MonthlyRecapBanner', () => {
  it('renders real recap values, opens the dialog, and links every month to the recap page', () => {
    vi.mocked(useMonthlyRecap).mockReturnValue(hookResult(RECAP))

    renderBanner()

    expect(useMonthlyRecap).toHaveBeenCalledWith({ initialMonth: 'previous' })
    expect(screen.getByText(/August recap/i)).toBeTruthy()
    expect(screen.getByText('16 sessions.')).toBeTruthy()
    expect(screen.getByText(/most active sport was Badminton/i)).toBeTruthy()
    expect(screen.getByText('10')).toBeTruthy()
    expect(screen.getByText('4')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText(/Complete/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'View & share' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'See every month' }).getAttribute('href')).toBe('/recap')
  })

  it('preserves the loading state', () => {
    vi.mocked(useMonthlyRecap).mockReturnValue(hookResult(null, true))

    const { container } = renderBanner()

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(4)
  })

  it('renders a clean empty state when the month has no sessions', () => {
    vi.mocked(useMonthlyRecap).mockReturnValue(
      hookResult({ ...RECAP, sports: [], topSport: null, totalSessions: 0 }),
    )

    renderBanner()

    expect(screen.getByText('No activities last month.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'View activity history' }).getAttribute('href')).toBe('/activities')
  })

  it('keeps the recap route available when loading fails', () => {
    vi.mocked(useMonthlyRecap).mockReturnValue(hookResult(null, false, 'Recap unavailable'))

    renderBanner()

    expect(screen.getByText('Recap unavailable')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Open monthly recap' }).getAttribute('href')).toBe('/recap')
  })
})
