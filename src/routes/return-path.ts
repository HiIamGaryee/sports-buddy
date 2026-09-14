import { isValidDocumentId } from '@/lib/ids'
import { activityPostPath, groupActivityDetailPath } from '@/routes/routes'

/**
 * Where to go after sign-in or onboarding, when someone arrived through a
 * share link. Kept in sessionStorage so it survives the Google popup, a
 * register → onboarding detour and a reload, but not a new browser session.
 *
 * Only a validated (kind, id) pair is ever stored or returned — never an
 * arbitrary string — so a crafted value cannot turn this into an open
 * redirect.
 */

type SharedKind = 'post' | 'group'

const KEY = 'sports-buddy:return-to-activity'

const isSharedKind = (value: unknown): value is SharedKind => value === 'post' || value === 'group'

export function rememberSharedActivity(id: string, kind: SharedKind = 'post') {
  if (!isValidDocumentId(id)) return
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ kind, id }))
  } catch {
    // Storage unavailable (private mode): the user lands on Home instead.
  }
}

/** The path to resume, or `null`. Reading does not clear it. */
export function peekReturnPath(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const { kind, id } = parsed as { kind?: unknown; id?: unknown }
    if (!isSharedKind(kind) || !isValidDocumentId(id)) return null
    return kind === 'group' ? groupActivityDetailPath(id) : activityPostPath(id)
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
