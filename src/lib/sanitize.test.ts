import { describe, expect, it } from 'vitest'

import {
  hasUnsafeCharacters,
  normalizeMultiLine,
  normalizeSingleLine,
} from '@/lib/sanitize'

/** Characters no keyboard produces, written as escapes so the source stays ASCII. */
const NUL = '\u0000'
const ESC = '\u001B'
const ZWSP = '\u200B'
const RLO = '\u202E'
const BOM = '\uFEFF'
const CJK = '\u4E2D\u6587'
const ACCENTS = 'caf\u00E9 na\u00EFve'
const EMOJI = '\u{1F3F8}'

/**
 * These cover as much what normalization must NOT do as what it must.
 * Over-sanitizing is its own bug: a filter that strips `<` or an apostrophe
 * turns "Let's play!" into "Lets play!" and buys nothing, because React
 * escapes text when it renders it.
 *
 * The hostile-looking strings below are TEST DATA. They are expected to
 * survive as ordinary text, which is exactly the point - safety comes from
 * treating them as data, not from banning the words.
 */
describe('normalization leaves legitimate text alone', () => {
  it.each([
    "I'm free at 7:30.",
    'Court A & B',
    'RM20-40',
    "Let's play!",
    '<3',
    '<script>alert(1)</script>',
    '"><img src=x onerror=alert(1)>',
    "' OR 1=1 --",
    '"; DROP TABLE users; --',
    '<foo>&bar</foo>',
    '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>',
    '${7*7}',
    '__proto__',
    '../../admin',
  ])('preserves %s exactly', (input) => {
    expect(normalizeSingleLine(input)).toBe(input)
  })

  it('keeps every language and emoji', () => {
    expect(normalizeSingleLine(CJK)).toBe(CJK)
    expect(normalizeSingleLine('Boleh main petang ni?')).toBe(
      'Boleh main petang ni?',
    )
    expect(normalizeSingleLine(ACCENTS)).toBe(ACCENTS)
    expect(normalizeSingleLine(`badminton ${EMOJI}`)).toBe(`badminton ${EMOJI}`)
  })
})

describe('normalizeSingleLine', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeSingleLine('  Gary   Lee  ')).toBe('Gary Lee')
  })

  it('flattens newlines and tabs, so a name cannot span lines', () => {
    expect(normalizeSingleLine('Gary\nLee\tTan')).toBe('Gary Lee Tan')
  })

  it('strips control characters', () => {
    expect(normalizeSingleLine(`Gary${NUL}admin`)).toBe('Garyadmin')
    expect(normalizeSingleLine(`Gary${ESC}[31m`)).toBe('Gary[31m')
  })

  it('strips zero-width and bidirectional-override characters', () => {
    expect(normalizeSingleLine(`Ga${ZWSP}ry`)).toBe('Gary')
    expect(normalizeSingleLine(`${RLO}Gary`)).toBe('Gary')
    expect(normalizeSingleLine(`${BOM}Gary`)).toBe('Gary')
  })

  it('truncates ONLY when a caller asks - authored text is validated, not cut', () => {
    expect(normalizeSingleLine('a'.repeat(50))).toHaveLength(50)
    expect(normalizeSingleLine('a'.repeat(50), 10)).toHaveLength(10)
  })
})

describe('normalizeMultiLine', () => {
  it('keeps paragraphs but collapses a wall of blank lines', () => {
    expect(normalizeMultiLine('one\n\ntwo')).toBe('one\n\ntwo')
    expect(normalizeMultiLine(`one${'\n'.repeat(40)}two`)).toBe('one\n\ntwo')
  })

  it('normalizes CRLF so stored text compares reliably', () => {
    expect(normalizeMultiLine('one\r\ntwo')).toBe('one\ntwo')
  })
})

describe('hasUnsafeCharacters', () => {
  it('flags what cannot be typed and passes what can', () => {
    expect(hasUnsafeCharacters(`Gary${NUL}`)).toBe(true)
    expect(hasUnsafeCharacters(`${RLO}Gary`)).toBe(true)
    expect(hasUnsafeCharacters(`Perfectly normal bio ${EMOJI}`)).toBe(false)
    expect(hasUnsafeCharacters('line one\nline two')).toBe(false)
  })

  it('does not carry regex state between calls', () => {
    const value = `Gary${NUL}x`
    expect(hasUnsafeCharacters(value)).toBe(true)
    expect(hasUnsafeCharacters(value)).toBe(true)
  })
})
