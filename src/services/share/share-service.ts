import { env } from '@/config/env'
import { buildActivityShareUrl, buildGroupActivityShareUrl, toShareOrigin } from '@/lib/share'

export type ShareOutcome = 'shared' | 'copied' | 'cancelled'

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
}
