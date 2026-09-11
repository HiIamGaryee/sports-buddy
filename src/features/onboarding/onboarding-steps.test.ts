import { describe, expect, it } from 'vitest'

import { getStepError } from '@/features/onboarding/onboarding-steps'
import { createDraft, profileDraftReducer } from '@/lib/profile-draft'

describe('getStepError: sports', () => {
  it('blocks Continue with no sport chosen and clears once one is', () => {
    const empty = createDraft('Gary')
    expect(getStepError('sports', empty)).toBe('Choose at least one sport.')

    const withSport = profileDraftReducer(empty, {
      type: 'toggle-sport',
      sportId: 'badminton',
    })
    // Skill level is still unset at this point — the sports step must not
    // require it, or Continue can never be pressed.
    expect(withSport.sports).toEqual([{ sportId: 'badminton', skillLevel: null }])
    expect(getStepError('sports', withSport)).toBeUndefined()
  })
})

describe('getStepError: skills', () => {
  it('blocks Continue until every chosen sport has a level', () => {
    const draft = profileDraftReducer(createDraft('Gary'), {
      type: 'toggle-sport',
      sportId: 'badminton',
    })
    expect(getStepError('skills', draft)).toBe(
      'Set a skill level for every sport.',
    )

    const withSkill = profileDraftReducer(draft, {
      type: 'set-skill',
      sportId: 'badminton',
      skillLevel: 'casual',
    })
    expect(getStepError('skills', withSkill)).toBeUndefined()
  })
})
