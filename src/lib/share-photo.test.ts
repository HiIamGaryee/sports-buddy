import { describe, expect, it } from 'vitest'

import { buildRecapFilename, toFilenameSlug } from '@/lib/filename'
import {
  getPhotoErrorMessage,
  getPhotoRejection,
  MAX_PHOTO_BYTES,
} from '@/lib/share-photo'

const fileOf = (type: string, size: number, name = 'photo') => {
  const file = new File(['x'], name, { type })
  // `size` is read-only on File, so it is stubbed to avoid allocating 10MB.
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('photo validation', () => {
  it('accepts JPEG, PNG and WebP', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(getPhotoRejection(fileOf(type, 1024))).toBeNull()
    }
  })

  it('rejects an unsupported type', () => {
    expect(getPhotoRejection(fileOf('image/gif', 1024))).toBe('type')
    expect(getPhotoRejection(fileOf('application/pdf', 1024))).toBe('type')
  })

  it('rejects a file renamed to look like an image', () => {
    // The picker's `accept` is a hint; the type is checked here regardless.
    expect(getPhotoRejection(fileOf('application/zip', 1024, 'cat.png'))).toBe('type')
  })

  it('rejects an oversized file', () => {
    expect(getPhotoRejection(fileOf('image/png', MAX_PHOTO_BYTES + 1))).toBe('size')
  })

  it('accepts a file exactly at the limit', () => {
    expect(getPhotoRejection(fileOf('image/png', MAX_PHOTO_BYTES))).toBeNull()
  })

  it('rejects an empty or missing file', () => {
    expect(getPhotoRejection(fileOf('image/png', 0))).toBe('empty')
    expect(getPhotoRejection(null)).toBe('empty')
  })

  it('returns a fixed human message that never echoes the file', () => {
    expect(getPhotoErrorMessage('type')).toBe(
      'Please choose a JPEG, PNG or WebP image.',
    )
    expect(getPhotoErrorMessage('size')).toContain('10 MB')
    expect(getPhotoErrorMessage('empty')).toBe(
      "We couldn't read that file. Please choose another image.",
    )
  })
})

describe('export filename', () => {
  it('builds a safe recap filename', () => {
    expect(buildRecapFilename('January 2027')).toBe(
      'sports-buddy-january-2027-recap.png',
    )
  })

  it('strips path separators and traversal', () => {
    expect(toFilenameSlug('../../etc/passwd')).toBe('etc-passwd')
    expect(buildRecapFilename('../../etc/passwd')).toBe(
      'sports-buddy-etc-passwd-recap.png',
    )
  })

  it('still produces a valid .png when the label slugs away to nothing', () => {
    expect(buildRecapFilename('///')).toBe('sports-buddy-recap.png')
    expect(buildRecapFilename('日本語')).toBe('sports-buddy-recap.png')
  })

  it('never leaves a trailing separator after truncation', () => {
    expect(toFilenameSlug('a'.repeat(30) + ' ' + 'b'.repeat(30))).not.toMatch(/-$/)
  })
})
