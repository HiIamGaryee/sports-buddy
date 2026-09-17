import type { AreaId, BudgetPreference, SportId } from '@/types/sports-profile'

/**
 * How someone gets into a post, chosen by the person who posted it:
 * `open` — tapping Join takes the spot straight away;
 * `approval` — tapping Join sends a request the author approves or declines.
 */
export type JoinPolicy = 'open' | 'approval'

/**
 * Who can find a post:
 * `public` — listed on Discover;
 * `link` — never listed; anyone signed in who has its share link can open it;
 * `invite` — private, created from a chat for ONE connected buddy; only the
 *   author and that buddy can see it.
 */
export type PostVisibility = 'public' | 'link' | 'invite'

/**
 * What ONE viewer can do with one post. Derived, never stored — the same
 * post is `author` to its author, `full` to a stranger and `joined` to the
 * person in it.
 */
export type PostViewerState =
  | 'author'
  | 'invited'
  | 'joined'
  | 'requested'
  | 'full'
  | 'can-join'
  | 'can-request'
  | 'past'

/**
 * A PUBLIC invitation to play, posted to Discover: "badminton, Sat 5pm,
 * Subang Jaya, RM10–20". Anyone signed in can see it.
 *
 * Deliberately different from `Activity` (`types/activity.ts`), which is the
 * private, agreed snapshot between two connected people. A post is not
 * agreed by anyone yet — pressing Join starts the normal connect → chat →
 * plan flow with its author.
 *
 * It stores ids and the author's own choices only. The author's name and
 * photo are resolved from `publicProfiles` at render time, never copied.
 */
export interface ActivityPost {
  id: string
  authorId: string
  sportId: SportId
  /** Resolved instant (ISO), from the author's local date/time + zone. */
  startAt: string
  /** IANA zone the author posted from, e.g. `Asia/Kuala_Lumpur`. */
  timeZone: string
  areaId: AreaId
  venueName: string
  budget: BudgetPreference
  joinPolicy: JoinPolicy
  visibility: PostVisibility
  /** The one connected buddy an `invite` post is for; `null` otherwise. */
  invitedId: string | null
  /** How many people may join. 1 for a 1v1 session today. */
  capacity: number
  /** People who have the spot. Full once this reaches `capacity`. */
  joinedIds: string[]
  /** People waiting for the author's approval (`approval` posts only). */
  pendingIds: string[]
  /** `null` until the server resolves `serverTimestamp()`. */
  createdAt: string | null
  /**
   * Set when the author edits the post (time, place, sport or budget) —
   * usually after someone asked in chat. `null` for a post never edited.
   */
  updatedAt: string | null
}

/** What the post form hands the service. */
export interface ActivityPostDraft {
  sportId: SportId | null
  /** `YYYY-MM-DDTHH:mm`, straight from `<input type="datetime-local">`. */
  localDateTime: string
  timeZone: string
  areaId: AreaId | null
  venueName: string
  budget: BudgetPreference | null
  joinPolicy: JoinPolicy
  visibility: PostVisibility
  invitedId: string | null
}

/** A validated post, ready for the repository. */
export interface CreateActivityPostInput {
  authorId: string
  sportId: SportId
  startAt: string
  timeZone: string
  areaId: AreaId
  venueName: string
  budget: BudgetPreference
  joinPolicy: JoinPolicy
  visibility: PostVisibility
  invitedId: string | null
}
