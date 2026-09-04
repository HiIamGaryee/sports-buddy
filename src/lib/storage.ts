/** Guarded localStorage access. Feature code goes through a dedicated module. */
export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
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
