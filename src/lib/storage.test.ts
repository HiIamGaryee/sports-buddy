import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  readStore,
  readStoreArray,
  readStoreRecord,
  writeStore,
} from '@/lib/storage'

const KEY = 'sports-buddy.test'

/** The same in-memory localStorage the service tests use — no jsdom needed. */
const storage = new Map<string, string>()

beforeAll(() => {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
    removeItem: (key: string) => void storage.delete(key),
    clear: () => storage.clear(),
  })
})

interface Item {
  id: string
}

const isItem = (value: unknown): value is Item =>
  Boolean(value) &&
  typeof value === 'object' &&
  typeof (value as Item).id === 'string'

beforeEach(() => storage.clear())

describe('readStore treats storage as untrusted input', () => {
  it('returns the fallback for a missing key', () => {
    expect(readStore(KEY, 'fallback')).toBe('fallback')
  })

  it('returns the fallback for unparseable JSON instead of throwing', () => {
    storage.set(KEY, '{ not json')
    expect(readStore(KEY, 'fallback')).toBe('fallback')
  })

  it('returns the fallback when the parsed value fails its guard', () => {
    storage.set(KEY, '"a string where an object belongs"')
    expect(readStore<Item>(KEY, { id: 'default' }, isItem)).toEqual({
      id: 'default',
    })
  })

  it('returns a valid value through its guard', () => {
    writeStore(KEY, { id: 'gary' })
    expect(readStore<Item>(KEY, { id: 'default' }, isItem)).toEqual({
      id: 'gary',
    })
  })
})

describe('readStore blocks prototype-pollution keys at the parse boundary', () => {
  it('drops __proto__ so a later spread cannot carry it', () => {
    storage.set(KEY, '{"id":"gary","__proto__":{"admin":true}}')

    const value = readStore<Record<string, unknown>>(KEY, {})
    const spread = { ...value }

    expect(Object.keys(value)).not.toContain('__proto__')
    expect(spread.admin).toBeUndefined()
    expect(({} as Record<string, unknown>).admin).toBeUndefined()
  })

  it('drops constructor and prototype keys too', () => {
    localStorage.setItem(
      KEY,
      '{"id":"gary","constructor":{"x":1},"prototype":{"y":2}}',
    )

    const value = readStore<Record<string, unknown>>(KEY, {})

    expect(Object.keys(value)).toEqual(['id'])
  })
})

describe('readStoreArray', () => {
  it('drops only the corrupted entries, not the whole key', () => {
    localStorage.setItem(
      KEY,
      '[{"id":"gary"},null,42,{"nope":true},{"id":"aina"}]',
    )

    expect(readStoreArray<Item>(KEY, isItem)).toEqual([
      { id: 'gary' },
      { id: 'aina' },
    ])
  })

  it('returns an empty array when the stored value is not an array', () => {
    storage.set(KEY, '{"id":"gary"}')
    expect(readStoreArray<Item>(KEY, isItem)).toEqual([])
  })
})

describe('readStoreRecord repairs a corrupted store field by field', () => {
  const EMPTY = { seededUserIds: [] as string[], items: [] as string[] }

  it('returns the fallback when the stored value is not a record', () => {
    // The real crash this was written for: a hand-edited key holding an array
    // where a store object belongs, then `store.seededUserIds.includes(...)`.
    storage.set(KEY, '[{"__proto__":{"admin":true}}]')
    expect(readStoreRecord(KEY, EMPTY)).toEqual(EMPTY)

    storage.set(KEY, '{ not json')
    expect(readStoreRecord(KEY, EMPTY)).toEqual(EMPTY)
  })

  it('keeps good fields and defaults the wrong-typed ones', () => {
    storage.set(KEY, '{"seededUserIds":["gary"],"items":"not an array"}')
    expect(readStoreRecord(KEY, EMPTY)).toEqual({
      seededUserIds: ['gary'],
      items: [],
    })
  })

  it('drops keys the store does not declare', () => {
    storage.set(KEY, '{"seededUserIds":[],"items":[],"admin":true}')
    expect(Object.keys(readStoreRecord(KEY, EMPTY)).sort()).toEqual([
      'items',
      'seededUserIds',
    ])
  })
})
