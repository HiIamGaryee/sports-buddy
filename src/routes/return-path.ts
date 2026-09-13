import { isValidDocumentId } from '@/lib/ids'
import { activityPostPath } from '@/routes/routes'

/**
 * Where to go after sign-in or onboarding, when someone arrived through a
 * share link. Kept in sessionStorage so it survives the Google popup, a
 * register → onboarding detour and a reload, but not a new browser session.
 *
 * Only an ACTIVITY POST path is ever stored or returned — never an arbitrary
 * string — so a crafted value cannot turn this into an open redirect.
 */

const KEY = 'sports-buddy:return-to-activity'

export function rememberSharedActivity(postId: string) {
  if (!isValidDocumentId(postId)) return
  try {
    sessionStorage.setItem(KEY, postId)
  } catch {
    // Storage unavailable (private mode): the user lands on Home instead.
  }
}

/** The path to resume, or `null`. Reading does not clear it. */
export function peekReturnPath(): string | null {
  try {
    const postId = sessionStorage.getItem(KEY)
    return isValidDocumentId(postId) ? activityPostPath(postId) : null
  } catch {
    return null
  }
}

/** Called once the activity page has opened, so it is not resumed twice. */
export function clearReturnPath() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}
