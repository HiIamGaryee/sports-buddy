import { describe, expect, it } from 'vitest'

import {
  isCloudinaryImageUrl,
  isSafeImageUrl,
  isSafeLinkUrl,
  isTrustedOpenStreetMapUrl,
  safeImageUrl,
  safeLinkUrl,
} from '@/lib/safe-url'

/**
 * These strings are TEST DATA, never executed. They exist so a regression in
 * the protocol allowlist fails here rather than in somebody's browser.
 */
const HOSTILE_URLS = [
  'javascript:alert(1)',
  'JaVaScRiPt:alert(1)',
  '  javascript:alert(1)',
  'java\nscript:alert(1)',
  'java\tscript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:msgbox(1)',
  'file:///etc/passwd',
  'blob:https://example.com/abc',
]

describe('isSafeLinkUrl', () => {
  it('accepts ordinary http and https links', () => {
    expect(isSafeLinkUrl('https://example.com/venue')).toBe(true)
    expect(isSafeLinkUrl('http://example.com')).toBe(true)
  })

  it.each(HOSTILE_URLS)('rejects %s', (url) => {
    expect(isSafeLinkUrl(url)).toBe(false)
  })

  it('rejects relative and non-string values', () => {
    expect(isSafeLinkUrl('/discover')).toBe(false)
    expect(isSafeLinkUrl('')).toBe(false)
    expect(isSafeLinkUrl(null)).toBe(false)
    expect(isSafeLinkUrl(undefined)).toBe(false)
    expect(isSafeLinkUrl(42)).toBe(false)
    expect(isSafeLinkUrl({ toString: () => 'https://example.com' })).toBe(false)
  })

  it('rejects an absurdly long URL rather than parsing it', () => {
    expect(isSafeLinkUrl(`https://example.com/${'a'.repeat(3000)}`)).toBe(false)
  })
})

describe('isSafeImageUrl', () => {
  it('accepts https only — an image source is stricter than a link', () => {
    expect(isSafeImageUrl('https://lh3.googleusercontent.com/a/photo')).toBe(true)
    expect(isSafeImageUrl('http://example.com/a.png')).toBe(false)
    expect(isSafeImageUrl('data:image/svg+xml,<svg onload=alert(1)>')).toBe(false)
  })
})

describe('safeLinkUrl / safeImageUrl', () => {
  it('returns the URL when safe and null otherwise — never a repaired value', () => {
    expect(safeLinkUrl('https://example.com')).toBe('https://example.com')
    expect(safeLinkUrl('javascript:alert(1)')).toBeNull()
    expect(safeImageUrl('javascript:alert(1)')).toBeNull()
  })
})

describe('isTrustedOpenStreetMapUrl', () => {
  it('accepts OpenStreetMap hosts only', () => {
    expect(isTrustedOpenStreetMapUrl('https://www.openstreetmap.org/?mlat=3&mlon=101')).toBe(true)
    expect(isTrustedOpenStreetMapUrl('https://openstreetmap.org/#map=17/3/101')).toBe(true)
    expect(isTrustedOpenStreetMapUrl('https://openstreetmap.org.evil.test/maps')).toBe(false)
  })

  it('rejects a look-alike host — https alone is not trust', () => {
    expect(isTrustedOpenStreetMapUrl('https://openstreetmap.org.evil.test/maps')).toBe(false)
    expect(isTrustedOpenStreetMapUrl('https://notopenstreetmap.org/maps')).toBe(false)
    expect(isTrustedOpenStreetMapUrl('http://www.openstreetmap.org/maps')).toBe(false)
  })

  it.each(HOSTILE_URLS)('rejects %s', (url) => {
    expect(isTrustedOpenStreetMapUrl(url)).toBe(false)
  })
})

describe('isCloudinaryImageUrl', () => {
  it('accepts an image in the configured cloud', () => {
    expect(
      isCloudinaryImageUrl('https://res.cloudinary.com/demo/image/upload/v1/a.jpg', 'demo'),
    ).toBe(true)
  })

  it.each([
    'https://res.cloudinary.com/other/image/upload/v1/a.jpg',
    'http://res.cloudinary.com/demo/image/upload/v1/a.jpg',
    'https://res.cloudinary.com/demo/raw/upload/v1/a.html',
    'https://res.cloudinary.com.evil.com/demo/image/upload/a.jpg',
    'javascript:alert(1)',
    null,
  ])('refuses %s', (url) => {
    expect(isCloudinaryImageUrl(url, 'demo')).toBe(false)
  })
})
