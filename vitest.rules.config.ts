import path from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * Firestore security-rules tests. They need the Firestore emulator, so they
 * are kept out of `npm test` and run with `npm run test:rules`, which starts
 * the emulator around them.
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    include: ['tests/firestore-rules.test.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
})
