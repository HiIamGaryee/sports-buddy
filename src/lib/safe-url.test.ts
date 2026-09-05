import { describe, expect, it } from 'vitest'

import {
  isSafeImageUrl,
  isSafeLinkUrl,
  isTrustedMapsUrl,
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

describe('isTrustedMapsUrl', () => {
  it('accepts the Google hosts a maps link really comes from', () => {
    expect(isTrustedMapsUrl('https://www.google.com/maps/place/?q=1')).toBe(true)
    expect(isTrustedMapsUrl('https://maps.google.com/?cid=123')).toBe(true)
    expect(isTrustedMapsUrl('https://maps.app.goo.gl/abc')).toBe(true)
    expect(isTrustedMapsUrl('https://google.com.my/maps')).toBe(false)
  })

  it('rejects a look-alike host — https alone is not trust', () => {
    expect(isTrustedMapsUrl('https://google.com.evil.test/maps')).toBe(false)
    expect(isTrustedMapsUrl('https://notgoogle.com/maps')).toBe(false)
    expect(isTrustedMapsUrl('http://www.google.com/maps')).toBe(false)
  })

  it.each(HOSTILE_URLS)('rejects %s', (url) => {
    expect(isTrustedMapsUrl(url)).toBe(false)
  })
})
