import { describe, expect, it } from 'vitest'

import {
  getAvatarFileError,
  readUploadedAvatarUrl,
} from '@/services/profile/avatar-upload'

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]
const WEBP = [...'RIFF'].map((c) => c.charCodeAt(0))
  .concat([0, 0, 0, 0], [...'WEBP'].map((c) => c.charCodeAt(0)))

const file = (bytes: number[] | string, type: string, name = 'photo') =>
  new File([typeof bytes === 'string' ? bytes : new Uint8Array(bytes)], name, { type })

describe('getAvatarFileError', () => {
  it.each([
    [PNG, 'image/png'],
    [JPEG, 'image/jpeg'],
    [WEBP, 'image/webp'],
  ])('accepts a real image', async (bytes, type) => {
    expect(await getAvatarFileError(file(bytes, type))).toBeNull()
  })

  it('refuses a script renamed to an image', async () => {
    const renamed = file('<script>alert(1)</script>', 'image/jpeg', 'photo.jpg')
    expect(await getAvatarFileError(renamed)).not.toBeNull()
  })

  it('refuses SVG, HTML and an empty file', async () => {
    expect(await getAvatarFileError(file('<svg onload="x()"/>', 'image/svg+xml'))).not.toBeNull()
    expect(await getAvatarFileError(file('<html></html>', 'text/html'))).not.toBeNull()
    expect(await getAvatarFileError(file([], 'image/png'))).not.toBeNull()
  })

  it('refuses a real image over 5 MB', async () => {
    const big = new File([new Uint8Array(PNG), new Uint8Array(5 * 1024 * 1024)], 'big.png', {
      type: 'image/png',
    })
    expect(await getAvatarFileError(big)).not.toBeNull()
  })
})

describe('readUploadedAvatarUrl', () => {
  const ok = {
    resource_type: 'image',
    format: 'png',
    secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/avatars/a.png',
  }

  it('returns the transformed delivery URL', () => {
    expect(readUploadedAvatarUrl(ok, 'demo')).toBe(
      'https://res.cloudinary.com/demo/image/upload/c_fill,g_face,w_320,h_320,f_auto,q_auto/v1/avatars/a.png',
    )
  })

  it.each([
    { ...ok, resource_type: 'raw' },
    { ...ok, format: 'svg' },
    { ...ok, secure_url: 'https://evil.example.com/a.png' },
    { ...ok, secure_url: 'https://res.cloudinary.com/other/image/upload/a.png' },
    null,
  ])('refuses %o', (data) => {
    expect(readUploadedAvatarUrl(data, 'demo')).toBeNull()
  })
})
