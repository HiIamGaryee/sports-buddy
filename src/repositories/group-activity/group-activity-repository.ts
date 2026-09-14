import type { CreateGroupActivityInput, GroupActivity } from '@/types/group-activity'

/**
 * `groupActivities/{activityId}` — public group activities shown on
 * Discover. One-time reads with an explicit refresh, same as
 * `ActivityPostRepository`: a list does not need to move under the reader's
 * thumb.
 */
export interface GroupActivityRepository {
  /** Upcoming activities, soonest first, one batch. */
  listUpcoming(now: Date, limit: number): Promise<GroupActivity[]>
  /** Everything one organizer created, past and upcoming, unordered. */
  listByOrganizer(organizerId: string, limit: number): Promise<GroupActivity[]>
  /** Upcoming and past activities this user has joined (not organizing). */
  listJoinedBy(userId: string, limit: number): Promise<GroupActivity[]>
  getById(activityId: string): Promise<GroupActivity | null>
  create(input: CreateGroupActivityInput): Promise<GroupActivity>
  /** The organizer changes their own activity; identity fields never move. */
  update(activityId: string, input: CreateGroupActivityInput): Promise<void>
  /** Only the organizer may remove an activity; the rules enforce it. */
  remove(activityId: string): Promise<void>

  /**
   * Transactions, both idempotent. `join` adds the caller if there is a free
   * spot; it refuses a full, started, or self-organized activity. `leave`
   * drops the caller's spot.
   */
  join(activityId: string, userId: string): Promise<GroupActivity>
  leave(activityId: string, userId: string): Promise<void>
  /** Organizer only: take someone out of the participant list. */
  removeParticipant(activityId: string, organizerId: string, userId: string): Promise<void>
}

export const GROUP_ACTIVITIES_COLLECTION = 'groupActivities'
