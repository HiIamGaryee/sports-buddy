// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { SportBadges } from '@/components/profile/sport-badges'
import type { SportId } from '@/types/sports-profile'

const SPORTS: SportId[] = ['badminton', 'running', 'tennis', 'climbing']

afterEach(cleanup)

describe('SportBadges', () => {
  it('shows three sports, then reveals the rest from "+1 more"', () => {
    render(<SportBadges sports={SPORTS} />)
    expect(screen.queryByText('Climbing')).toBeNull()

    const more = screen.getByRole('button', { name: '+1 more' })
    expect(more.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(more)

    expect(screen.getByText('Climbing')).toBeTruthy()
    const less = screen.getByRole('button', { name: 'Show less' })
    expect(less.getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(less)
    expect(screen.queryByText('Climbing')).toBeNull()
  })

  it('has no toggle when everything already fits', () => {
    render(<SportBadges sports={SPORTS.slice(0, 3)} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('marks a shared sport with the heart and screen-reader text', () => {
    render(<SportBadges sports={SPORTS} matchingSports={['running']} />)
    expect(screen.getByText('You like this too:')).toBeTruthy()
    expect(document.querySelectorAll('svg.lucide-heart')).toHaveLength(1)
  })
})
