import type {
  ActivityPost,
  CreateActivityPostInput,
} from '@/types/activity-post'

/**
 * `activityPosts/{postId}` — public invitations shown on Discover.
 *
 * One-time reads with an explicit refresh, like the Discover people feed: no
 * realtime listener, because a list of posts does not need to move under the
 * reader's thumb.
 */
export interface ActivityPostRepository {
  /** PUBLIC posts starting after `now`, soonest first, one batch. */
  listUpcoming(now: Date, limit: number): Promise<ActivityPost[]>
  /** Everything one author posted, past and upcoming, unordered. */
  listByAuthor(authorId: string, limit: number): Promise<ActivityPost[]>
  getById(postId: string): Promise<ActivityPost | null>
  create(input: CreateActivityPostInput): Promise<ActivityPost>
  /** The author changes their own post; identity fields never move. */
  update(postId: string, input: CreateActivityPostInput): Promise<void>
  /** Only the author may remove a post; the rules enforce it. */
  remove(postId: string): Promise<void>

  /** Upcoming and past posts this user has a spot in. */
  listJoinedBy(userId: string, limit: number): Promise<ActivityPost[]>
  /** Posts this user asked to join and is still waiting on. */
  listRequestedBy(userId: string, limit: number): Promise<ActivityPost[]>
  /** Private invites created for this user from a chat. */
  listInvitedFor(userId: string, limit: number): Promise<ActivityPost[]>

  /**
   * Transactions, all idempotent. `join` takes the spot on an `open` post or
   * files a request on an `approval` post; it refuses a full, started or own
   * post. `leave` drops the caller's spot or request.
   */
  join(postId: string, userId: string): Promise<ActivityPost>
  leave(postId: string, userId: string): Promise<void>
  /** Author only: a waiting request gets the spot, if one is free. */
  approve(postId: string, authorId: string, userId: string): Promise<void>
  /** Author only: drop a waiting request, or remove someone from the spot. */
  decline(postId: string, authorId: string, userId: string): Promise<void>
}

export const ACTIVITY_POSTS_COLLECTION = 'activityPosts'
