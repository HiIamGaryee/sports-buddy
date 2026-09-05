export {
  clearStore,
  readStore,
  readStoreArray,
  readStoreRecord,
  writeStore,
} from '@/lib/storage'

/** Keeps mock calls asynchronous, like a real backend. */
export function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}
