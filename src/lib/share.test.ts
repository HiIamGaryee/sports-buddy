import { describe, expect, it } from 'vitest'

import {
  buildActivityShareUrl,
  buildGroupActivityShareUrl,
  parseActivityShareUrl,
  parseSharedActivityUrl,
  splitActivityLinks,
  toShareOrigin,
} from '@/lib/share'

const ORIGIN = 'https://sportbuddy-4d596.web.app'

describe('toShareOrigin', () => {
  it('keeps an https origin and drops any path', () => {
    expect(toShareOrigin('https://sportbuddy-4d596.web.app/some/path')).toBe(ORIGIN)
  })

  it('allows plain http only for local development', () => {
    expect(toShareOrigin('http://localhost:5173')).toBe('http://localhost:5173')
    expect(toShareOrigin('http://example.com')).toBeNull()
  })

  it('refuses anything that is not a web address', () => {
    expect(toShareOrigin('javascript:alert(1)')).toBeNull()
    expect(toShareOrigin('not a url')).toBeNull()
    expect(toShareOrigin('')).toBeNull()
    expect(toShareOrigin(undefined)).toBeNull()
  })
})

describe('share links', () => {
  it('round-trips a post id', () => {
    const url = buildActivityShareUrl(ORIGIN, 'post_123')
    expect(url).toBe(`${ORIGIN}/activity/post_123`)
    expect(parseActivityShareUrl(url, [ORIGIN])).toBe('post_123')
    expect(parseSharedActivityUrl(url, [ORIGIN])).toEqual({ kind: 'post', id: 'post_123' })
  })

  it('round-trips a group activity id, distinctly from a post', () => {
    const url = buildGroupActivityShareUrl(ORIGIN, 'group_123')
    expect(url).toBe(`${ORIGIN}/group-activity/group_123`)
    expect(parseSharedActivityUrl(url, [ORIGIN])).toEqual({ kind: 'group', id: 'group_123' })
    // The post-only helper never mistakes a group link for a post.
    expect(parseActivityShareUrl(url, [ORIGIN])).toBeNull()
  })

  it('ignores links to any other host', () => {
    expect(
      parseActivityShareUrl('https://sportbuddy-4d596.web.app.evil.com/activity/p1', [ORIGIN]),
    ).toBeNull()
    expect(parseActivityShareUrl('https://evil.com/activity/p1', [ORIGIN])).toBeNull()
  })

  it('ignores other paths and malformed ids', () => {
    expect(parseActivityShareUrl(`${ORIGIN}/messages/p1`, [ORIGIN])).toBeNull()
    expect(parseActivityShareUrl(`${ORIGIN}/activity/..`, [ORIGIN])).toBeNull()
    expect(parseActivityShareUrl(`${ORIGIN}/activity/a%2Fb`, [ORIGIN])).toBeNull()
  })
})

describe('splitActivityLinks', () => {
  it('picks our activity link out of surrounding text', () => {
    expect(
      splitActivityLinks(`Join me! ${ORIGIN}/activity/p1 see you`, [ORIGIN]),
    ).toEqual([
      { kind: 'text', text: 'Join me! ' },
      { kind: 'activity', text: `${ORIGIN}/activity/p1`, linkKind: 'post', id: 'p1' },
      { kind: 'text', text: ' see you' },
    ])
  })

  it('picks out a group activity link too', () => {
    expect(splitActivityLinks(`${ORIGIN}/group-activity/g1`, [ORIGIN])).toEqual([
      { kind: 'activity', text: `${ORIGIN}/group-activity/g1`, linkKind: 'group', id: 'g1' },
    ])
  })

  it('leaves every other URL as plain text', () => {
    const content = 'Look at https://evil.com/activity/p1 and <b>this</b>'
    expect(splitActivityLinks(content, [ORIGIN])).toEqual([
      { kind: 'text', text: content },
    ])
  })

  it('returns nothing for an empty message', () => {
    expect(splitActivityLinks('', [ORIGIN])).toEqual([])
  })
})
