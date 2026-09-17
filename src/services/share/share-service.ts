import { env } from '@/config/env'
import { buildActivityShareUrl, buildGroupActivityShareUrl, toShareOrigin } from '@/lib/share'

export type ShareOutcome = 'shared' | 'copied' | 'cancelled'
export type FileShareOutcome = 'shared' | 'downloaded' | 'cancelled'

const SHARE_FAILED = "We couldn't share this link. Please try again."

/** The configured public address, else the page's own origin. */
function shareOrigin(): string {
  return (
    toShareOrigin(env.publicAppUrl) ??
    toShareOrigin(window.location.origin) ??
    window.location.origin
  )
}

/**
 * Share links: build them, hand them to the device's share sheet when there
 * is one, and fall back to copying. The UI never touches `navigator` itself.
 */
export const shareService = {
  activityUrl(postId: string): string {
    return buildActivityShareUrl(shareOrigin(), postId)
  },

  groupActivityUrl(activityId: string): string {
    return buildGroupActivityShareUrl(shareOrigin(), activityId)
  },

  /** Origins whose activity links a chat message may render as in-app links. */
  trustedOrigins(): string[] {
    return [
      ...new Set(
        [toShareOrigin(env.publicAppUrl), toShareOrigin(window.location.origin)].filter(
          (origin): origin is string => origin !== null,
        ),
      ),
    ]
  },

  async share({ url, title, text }: { url: string; title: string; text: string }): Promise<ShareOutcome> {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ url, title, text })
        return 'shared'
      } catch (error) {
        // Closing the share sheet is not a failure.
        if (error instanceof DOMException && error.name === 'AbortError') {
          return 'cancelled'
        }
        // Otherwise fall through to copying.
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      return 'copied'
    } catch {
      throw new Error(SHARE_FAILED)
    }
  },

  /**
   * Shares an actual FILE (the recap image) through the OS share sheet when
   * the platform supports it (Web Share API Level 2 — most mobile browsers
   * and the Capacitor Android WebView); otherwise falls back to a plain
   * browser download, so there is always something the member can do with
   * the image rather than a dead end.
   */
  async shareFile({
    file,
    title,
    text,
  }: {
    file: File
    title: string
    text: string
  }): Promise<FileShareOutcome> {
    const canShareFiles =
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })

    if (canShareFiles) {
      try {
        await navigator.share({ files: [file], title, text })
        return 'shared'
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return 'cancelled'
        }
        // Otherwise fall through to a download.
      }
    }

    const url = URL.createObjectURL(file)
    try {
      const link = document.createElement('a')
      link.href = url
      link.download = file.name
      link.click()
      return 'downloaded'
    } finally {
      // Revoked after the click has had a chance to start the download.
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  },
}
