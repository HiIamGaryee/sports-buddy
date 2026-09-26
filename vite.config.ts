import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // Without this, Chrome's cross-origin popup tracking can report the Google
  // sign-in popup as closed-by-user even after a successful sign-in, which
  // this app's auth-error.ts treats as a silent cancellation (by design, for
  // a genuinely user-closed popup) — see firebase/firebase-js-sdk popup
  // auth + COOP interaction. Needed on both the dev and preview servers.
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  // Unit tests only. Firestore rules tests need the emulator and run from
  // vitest.rules.config.ts via `npm run test:rules`.
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
