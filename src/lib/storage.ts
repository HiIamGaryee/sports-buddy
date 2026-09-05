/**
 * Guarded localStorage access. Feature code goes through a dedicated module.
 *
 * localStorage is UNTRUSTED INPUT. The user can edit it in devtools, another
 * script on the origin can write to it, and a value written by an older
 * version of the app can have a shape this version has never seen. "We wrote
 * it, so it is fine" is not true of browser storage.
 *
 * `readStore` therefore never hands back a value it has not been asked to
 * check: callers pass a guard, and anything that fails it is discarded in
 * favour of the fallback. That keeps a corrupted key from becoming a render
 * crash — and only that key is affected, so a broken chat history cannot wipe
 * an unrelated profile.
 */

/**
 * `__proto__`, `constructor` and `prototype` arriving as OBJECT KEYS from
 * `JSON.parse` are the classic prototype-pollution vector: they are inert
 * until the object is merged or spread into something trusted, which the mock
 * repositories do. Stripping them at the parse boundary means they never
 * enter the app in the first place.
 */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * `JSON.parse` reviver: dropping a key here removes it from the result. Note
 * that `JSON.parse` already puts `__proto__` on the object as an own property
 * rather than changing the prototype, but the property survives a later
 * spread — so it is removed rather than relied upon to stay harmless.
 */
const reviver = (key: string, value: unknown) =>
  FORBIDDEN_KEYS.has(key) ? undefined : value

/**
 * Reads and validates. `isValid` is what makes the return type honest: without
 * it this was `JSON.parse(raw) as T`, which asserted a shape nobody had
 * checked. Callers that genuinely accept anything can pass `() => true`, but
 * they should say so explicitly.
 */
export function readStore<T>(
  key: string,
  fallback: T,
  isValid?: (value: unknown) => value is T,
): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback

    const parsed: unknown = JSON.parse(raw, reviver)
    if (isValid) return isValid(parsed) ? parsed : fallback
    return parsed as T
  } catch {
    // Unavailable, unparseable, or quota-blocked — behave as if unset.
    return fallback
  }
}

/** Reads an array, dropping entries that fail `isItem` instead of the whole key. */
export function readStoreArray<T>(
  key: string,
  isItem: (value: unknown) => value is T,
): T[] {
  const parsed = readStore<unknown>(key, null)
  return Array.isArray(parsed) ? parsed.filter(isItem) : []
}

/**
 * Reads a record-shaped store (the mock repositories' `{ conversations: [],
 * messages: [], … }` shapes) and repairs it against `fallback` FIELD BY
 * FIELD: a key whose stored value is the wrong kind falls back to the
 * default, and unknown keys are dropped.
 *
 * The alternative — trusting the parsed object — is what let a hand-edited
 * `mock-chat` key crash the Messages screen with
 * `Cannot read properties of undefined (reading 'includes')`. Corrupt storage
 * should cost the user their mock data, not the page.
 */
export function readStoreRecord<T extends object>(key: string, fallback: T): T {
  const parsed = readStore<unknown>(key, null)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return fallback
  }

  const stored = parsed as Record<string, unknown>
  const result = { ...fallback }

  for (const field of Object.keys(fallback) as (keyof T & string)[]) {
    const value = stored[field]
    const expected = fallback[field]
    if (value === undefined) continue
    if (Array.isArray(expected) !== Array.isArray(value)) continue
    if (typeof value !== typeof expected) continue
    result[field] = value as T[keyof T & string]
  }

  return result
}

export function writeStore(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable (private mode) — the value simply won't persist.
  }
}

export function clearStore(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
