import { Capacitor } from '@capacitor/core'

/**
 * Whether the app is running inside the Capacitor shell (the Android app)
 * rather than a browser tab.
 *
 * Layout NEVER branches on this — that is CSS's job. It exists for the few
 * places where a capability genuinely differs between the shell and the web:
 * real purchases (`repositories.ts`) and Google sign-in, which uses Firebase's
 * web popup flow and cannot work in a storage-partitioned WebView (CLAUDE.md
 * §13). Hiding a control that cannot work is honest; leaving it visible to
 * fail is not.
 */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform()
