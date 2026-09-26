// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ProfileHero } from '@/features/profile/components/profile-hero'
import {
  ProfilePhotoField,
  type PhotoDraft,
} from '@/features/profile/components/profile-photo-field'
import type { SportsProfile } from '@/types/user'

vi.mock('@/hooks/use-auth', () => ({ useAuth: () => ({ user: { photoUrl: null } }) }))
vi.mock('@/services/profile/avatar-upload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/profile/avatar-upload')>()),
  isAvatarUploadConfigured: true,
}))

const SAVED = 'https://res.cloudinary.com/demo/image/upload/v1/saved.png'
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])

const PROFILE = {
  id: 'gary',
  email: 'gary@example.com',
  displayName: 'Gary Tan',
  photoUrl: SAVED,
  gender: 'male',
  bio: '',
  area: 'subang-jaya',
  radiusKm: 10,
} as SportsProfile

let previewCount = 0
const createObjectURL = vi.fn(() => `blob:${location.origin}/preview-${++previewCount}`)
const revokeObjectURL = vi.fn()

beforeEach(() => {
  // jsdom never loads images, so Radix would only ever show the fallback.
  vi.stubGlobal(
    'Image',
    class {
      complete = true
      naturalWidth = 1
      src = ''
      referrerPolicy = ''
      crossOrigin = null
      addEventListener() {}
      removeEventListener() {}
    },
  )
  URL.createObjectURL = createObjectURL
  URL.revokeObjectURL = revokeObjectURL
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

/** The field wired the way the edit page wires it. */
function Harness({ onChange = vi.fn() }: { onChange?: (value: PhotoDraft | null) => void }) {
  const [value, setValue] = useState<PhotoDraft | null>(null)
  return (
    <ProfilePhotoField
      profile={PROFILE}
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange(next)
      }}
    />
  )
}

const fileInput = () => screen.getByLabelText('Profile photo file') as HTMLInputElement
const avatarImg = (container: HTMLElement) =>
  container.querySelector('[data-slot="avatar-image"]')?.getAttribute('src')

describe('ProfilePhotoField', () => {
  it('renders the same avatar as the profile overview', () => {
    const hero = render(<ProfileHero profile={PROFILE} isReadyToPlay={false} />)
    const heroSrc = avatarImg(hero.container)
    const heroClass = hero.container.querySelector('[data-slot="avatar"]')?.className
    cleanup()

    const field = render(<Harness />)
    expect(avatarImg(field.container)).toBe(heroSrc)
    expect(heroSrc).toBe(SAVED)
    expect(field.container.querySelector('[data-slot="avatar"]')?.className).toBe(heroClass)
  })

  it('opens the file picker from the avatar and the Change photo button', () => {
    render(<Harness />)
    const click = vi.spyOn(fileInput(), 'click')

    // The avatar circle and the visible button share the accessible name.
    const [avatar, button] = screen.getAllByRole('button', { name: 'Change photo' })
    expect(avatar.querySelector('[data-slot="avatar"]')).toBeTruthy()
    fireEvent.click(avatar)
    fireEvent.click(button)
    expect(click).toHaveBeenCalledTimes(2)
    expect(fileInput().accept).toBe('image/jpeg,image/png,image/webp')
  })

  it('previews a valid image immediately', async () => {
    const onChange = vi.fn()
    const { container } = render(<Harness onChange={onChange} />)
    const file = new File([PNG_BYTES], 'me.png', { type: 'image/png' })

    fireEvent.change(fileInput(), { target: { files: [file] } })

    await waitFor(() => expect(avatarImg(container)).toMatch(/^blob:/))
    expect(onChange).toHaveBeenCalledWith({ file, previewUrl: avatarImg(container) })
    expect(screen.getByText(/saved when you save your profile/i)).toBeTruthy()
  })

  it('revokes the previous preview when another file is picked', async () => {
    render(<Harness />)
    const pick = (name: string) =>
      fireEvent.change(fileInput(), {
        target: { files: [new File([PNG_BYTES], name, { type: 'image/png' })] },
      })

    pick('one.png')
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1))
    pick('two.png')
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(2))
    expect(revokeObjectURL).toHaveBeenCalledWith(createObjectURL.mock.results[0].value)
  })

  it('rejects an invalid file with a clear message and no preview', async () => {
    const onChange = vi.fn()
    const { container } = render(<Harness onChange={onChange} />)
    const script = new File(['<script>alert(1)</script>'], 'photo.jpg', { type: 'image/jpeg' })

    fireEvent.change(fileInput(), { target: { files: [script] } })

    expect((await screen.findByRole('alert')).textContent).toBe('Choose a JPG, PNG or WebP image.')
    expect(onChange).not.toHaveBeenCalled()
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(avatarImg(container)).toBe(SAVED)
  })

  it('leaves the saved avatar unchanged when the edit is abandoned', async () => {
    const { unmount } = render(<Harness />)
    fireEvent.change(fileInput(), {
      target: { files: [new File([PNG_BYTES], 'me.png', { type: 'image/png' })] },
    })
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledOnce())

    unmount()

    expect(revokeObjectURL).toHaveBeenCalledWith(createObjectURL.mock.results[0].value)
    expect(PROFILE.photoUrl).toBe(SAVED)
  })
})
