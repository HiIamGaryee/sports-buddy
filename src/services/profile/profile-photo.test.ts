import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createDefaultUserPreferences } from '@/lib/preferences'
import {
  getPhotoUrlAfterRemove,
  profileService,
} from '@/services/profile/profile-service'
import type { SaveProfileInput } from '@/types/sports-profile'

const repositories = vi.hoisted(() => ({
  profileRepository: {
    setPhotoUrl: vi.fn(),
    saveProfile: vi.fn(),
  },
  publicProfileRepository: { upsert: vi.fn(), remove: vi.fn() },
}))
vi.mock('@/repositories/repositories', () => repositories)

const upload = vi.hoisted(() => ({
  getAvatarFileError: vi.fn(async () => null as string | null),
  uploadAvatar: vi.fn(async () => UPLOADED),
  isAvatarUploadConfigured: true,
}))
vi.mock('@/services/profile/avatar-upload', () => upload)

const GOOGLE = 'https://lh3.googleusercontent.com/a/abc=s96-c'
const CUSTOM = 'https://res.cloudinary.com/demo/image/upload/v1/a.png'
const UPLOADED = 'https://res.cloudinary.com/demo/image/upload/c_fill/v1/new.png'

const INPUT: SaveProfileInput = {
  displayName: 'Gary Tan',
  bio: 'Weeknight badminton.',
  instagramUsername: 'garytan',
  linkedinUsername: '',
  sports: [{ sportId: 'badminton', skillLevel: 'intermediate' }],
  intents: ['casual'],
  preferredIntensity: 'moderate',
  availability: [{ day: 'saturday', periods: ['morning'] }],
  area: 'subang-jaya',
  radiusKm: 10,
  budget: { min: 10, max: 40 },
}
const PREFERENCES = createDefaultUserPreferences(INPUT)

describe('getPhotoUrlAfterRemove', () => {
  it('restores the Google photo after removing a custom one', () => {
    expect(getPhotoUrlAfterRemove(CUSTOM, GOOGLE)).toBe(GOOGLE)
  })

  it('falls back to initials when the Google photo itself is removed', () => {
    expect(getPhotoUrlAfterRemove(GOOGLE, GOOGLE)).toBeNull()
  })

  it('falls back to initials without a provider photo', () => {
    expect(getPhotoUrlAfterRemove(CUSTOM, null)).toBeNull()
    expect(getPhotoUrlAfterRemove(CUSTOM, 'javascript:alert(1)')).toBeNull()
  })
})

describe('saving the avatar with the profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    repositories.profileRepository.saveProfile.mockImplementation(
      async (id: string, input: SaveProfileInput) => ({ id, ...input }),
    )
  })

  it('uploads a picked file, stores the returned URL, then saves the fields', async () => {
    const file = new File(['x'], 'me.png', { type: 'image/png' })
    await profileService.updateProfile('gary', INPUT, PREFERENCES, undefined, { file })

    expect(upload.uploadAvatar).toHaveBeenCalledWith(file)
    expect(repositories.profileRepository.setPhotoUrl).toHaveBeenCalledWith('gary', UPLOADED)
    const [, saved] = repositories.profileRepository.saveProfile.mock.calls[0]
    expect(saved).toMatchObject({
      displayName: 'Gary Tan',
      bio: 'Weeknight badminton.',
      instagramUsername: 'garytan',
    })
    expect(saved).not.toHaveProperty('gender')
  })

  it('switches to a provider photo without uploading', async () => {
    await profileService.updateProfile('gary', INPUT, PREFERENCES, undefined, { url: GOOGLE })

    expect(upload.uploadAvatar).not.toHaveBeenCalled()
    expect(repositories.profileRepository.setPhotoUrl).toHaveBeenCalledWith('gary', GOOGLE)
  })

  it('never touches the photo when none was picked', async () => {
    await profileService.updateProfile('gary', INPUT, PREFERENCES)

    expect(upload.uploadAvatar).not.toHaveBeenCalled()
    expect(repositories.profileRepository.setPhotoUrl).not.toHaveBeenCalled()
    expect(repositories.profileRepository.saveProfile).toHaveBeenCalledOnce()
  })

  it('refuses an invalid form before uploading anything', async () => {
    const file = new File(['x'], 'me.png', { type: 'image/png' })
    await expect(
      profileService.updateProfile('gary', { ...INPUT, displayName: '' }, PREFERENCES, undefined, { file }),
    ).rejects.toThrow()

    expect(upload.uploadAvatar).not.toHaveBeenCalled()
    expect(repositories.profileRepository.setPhotoUrl).not.toHaveBeenCalled()
  })

  it('refuses a rejected file and saves nothing', async () => {
    upload.getAvatarFileError.mockResolvedValueOnce('Choose a JPG, PNG or WebP image.')
    const file = new File(['<script>'], 'me.jpg', { type: 'image/jpeg' })
    await expect(
      profileService.updateProfile('gary', INPUT, PREFERENCES, undefined, { file }),
    ).rejects.toThrow('Choose a JPG, PNG or WebP image.')

    expect(repositories.profileRepository.setPhotoUrl).not.toHaveBeenCalled()
    expect(repositories.profileRepository.saveProfile).not.toHaveBeenCalled()
  })
})
