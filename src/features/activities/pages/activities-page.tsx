import { useMemo } from 'react'
import { History } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import clipboardIllustration from '@/assets/svg/clipboard-svgrepo-com.svg'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { SegmentedToggle } from '@/components/ui/segmented-toggle'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EventRow } from '@/features/activities/components/event-row'
import { useMyActivityPosts } from '@/features/activities/use-my-activity-posts'
import { useMyGroupActivities } from '@/features/activities/use-my-group-activities'
import {
  useCoarseNow,
  usePastActivities,
  useUpcomingActivities,
} from '@/features/activities/use-activities'
import { useAuth } from '@/hooks/use-auth'
import { getAreaName, getSportName } from '@/lib/profile-format'
import { activityPath, activityPostPath, groupActivityDetailPath, ROUTES } from '@/routes/routes'
import type { ActivityWithBuddy } from '@/types/activity'
import type { ActivityPost } from '@/types/activity-post'
import type { DiscoveryProfile } from '@/types/discovery-profile'
import type { GroupActivity } from '@/types/group-activity'

const SKELETON_ROWS = [0, 1, 2]

/**
 * Group and 1-to-1 are two different kinds of plan, so every tab asks which
 * one you are looking at rather than stacking six headed sections down the
 * page. The switch is the same in all three tabs.
 */
type EventKind = 'group' | 'solo'

const KINDS = [
  { value: 'group', label: 'Group' },
  { value: 'solo', label: '1-to-1' },
] as const satisfies readonly { value: EventKind; label: string }[]

/** The three tabs, as they appear in the URL. */
const TABS = ['planned', 'created', 'past'] as const
type TabValue = (typeof TABS)[number]

/** An unknown or missing `?tab=` falls back rather than rendering nothing. */
const asTab = (raw: string | null): TabValue =>
  TABS.includes(raw as TabValue) ? (raw as TabValue) : 'planned'

const asKind = (raw: string | null): EventKind =>
  raw === 'solo' || raw === 'group' ? raw : 'group'

type Tone = 'neutral' | 'pending' | 'success' | 'active'

/** One event in a list, whatever kind it came from. */
interface EventItem {
  id: string
  to: string
  title: string
  startAt: string
  meta: string
  pill?: { label: string; tone: Tone }
}

const joinPart = (...parts: (string | null | undefined)[]) =>
  parts.filter((part): part is string => Boolean(part)).join(' · ')

function fromGroupActivity(
  activity: GroupActivity,
  pill?: { label: string; tone: Tone },
): EventItem {
  const spots = `${activity.participantIds.length + 1}/${activity.maxParticipants} going`
  return {
    id: activity.id,
    to: groupActivityDetailPath(activity.id),
    title: activity.title,
    startAt: activity.startAt,
    meta: joinPart(getSportName(activity.sportId), activity.venueName, getAreaName(activity.areaId), spots),
    pill,
  }
}

/**
 * A 1-to-1 post has no title of its own, so it is named after the sport and
 * the person: "Badminton with Aina". Until somebody has the spot there is no
 * name to use, so it reads as the sport alone.
 */
function fromActivityPost(
  post: ActivityPost,
  viewerId: string | null,
  people: ReadonlyMap<string, DiscoveryProfile>,
  pill?: { label: string; tone: Tone },
): EventItem {
  const otherId =
    post.authorId === viewerId
      ? (post.joinedIds[0] ?? post.invitedId ?? null)
      : post.authorId
  const otherName = otherId ? people.get(otherId)?.displayName : undefined
  const sport = getSportName(post.sportId)

  return {
    id: post.id,
    to: activityPostPath(post.id),
    title: otherName ? `${sport} with ${otherName}` : `${sport} (1-to-1)`,
    startAt: post.startAt,
    meta: joinPart(post.venueName, getAreaName(post.areaId)),
    pill,
  }
}

function fromSession(item: ActivityWithBuddy): EventItem {
  return {
    id: item.activity.id,
    to: activityPath(item.activity.id),
    title: `${getSportName(item.activity.sportId)} with ${item.buddyName}`,
    startAt: item.activity.startAt,
    meta: joinPart(item.activity.venue.name),
    pill: { label: 'Confirmed', tone: 'success' },
  }
}

const soonestFirst = (items: EventItem[]) =>
  [...items].sort((a, b) => a.startAt.localeCompare(b.startAt))

const latestFirst = (items: EventItem[]) =>
  [...items].sort((a, b) => b.startAt.localeCompare(a.startAt))

/**
 * Activities: what you have planned, what you created and what has already
 * happened. Every list is one chronological run of `EventRow`s — title first,
 * date and time under it — so a group activity, a 1-to-1 post and a session
 * confirmed through Plan Together read the same way.
 *
 * "Past" means only that the end time went by. It does NOT mean the session
 * happened or that anyone turned up (see `docs/activities.md`).
 */
export function ActivitiesPage() {
  const { user } = useAuth()
  const now = useCoarseNow()
  const upcoming = useUpcomingActivities()
  const past = usePastActivities()
  const myPosts = useMyActivityPosts(now)
  const myGroups = useMyGroupActivities(now)
  const viewerId = user?.id ?? null
  /*
   * Which tab and which kind are NAVIGATION state, so they belong to the
   * router rather than to component state: opening an event and pressing back
   * returns to the URL you left, which is the tab you were reading. Component
   * state would be thrown away and reset to Planned / Group every time.
   */
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = asTab(searchParams.get('tab'))
  const kind = asKind(searchParams.get('kind'))

  const setTab = (next: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('tab', next)
    // `replace` so the tabs do not fill the back stack with every switch.
    setSearchParams(params, { replace: true })
  }

  const setKind = (next: EventKind) => {
    const params = new URLSearchParams(searchParams)
    params.set('kind', next)
    setSearchParams(params, { replace: true })
  }

  const isLoadingPlanned = myGroups.isLoading || myPosts.isLoading || upcoming.isLoading
  const groupError = myGroups.error
  const soloError = myPosts.error || upcoming.error

  const planned = useMemo(
    () => ({
      group: soonestFirst([
        ...myGroups.hostedPlanned.map((activity) =>
          fromGroupActivity(activity, { label: 'Hosting', tone: 'active' }),
        ),
        ...myGroups.joinedPlanned.map((activity) =>
          fromGroupActivity(activity, { label: 'Joined', tone: 'success' }),
        ),
      ]),
      solo: soonestFirst([
        ...myPosts.invitations.map((post) =>
          fromActivityPost(post, viewerId, myPosts.people, { label: 'Invitation', tone: 'pending' }),
        ),
        ...myPosts.openPlanned.map((post) =>
          fromActivityPost(post, viewerId, myPosts.people, { label: 'Looking for a buddy', tone: 'neutral' }),
        ),
        ...myPosts.waitingPlanned.map((post) =>
          fromActivityPost(post, viewerId, myPosts.people, { label: 'Waiting for approval', tone: 'pending' }),
        ),
        ...myPosts.confirmedPlanned.map((post) =>
          fromActivityPost(post, viewerId, myPosts.people, { label: 'Confirmed', tone: 'success' }),
        ),
        ...upcoming.items.map(fromSession),
      ]),
    }),
    [myGroups.hostedPlanned, myGroups.joinedPlanned, myPosts.invitations, myPosts.openPlanned, myPosts.waitingPlanned, myPosts.confirmedPlanned, upcoming.items, viewerId, myPosts.people],
  )

  /**
   * Created holds only what is still to come, soonest first. Anything whose
   * time has gone moves to Past, so this tab answers "what have I got coming
   * up that I organised" rather than mixing it with history.
   */
  const created = useMemo(() => {
    const mySessions = upcoming.items.filter(
      ({ activity }) => activity.createdBy === viewerId,
    )
    return {
      group: soonestFirst(
        myGroups.hostedPlanned.map((activity) =>
          fromGroupActivity(activity, { label: 'Hosting', tone: 'active' }),
        ),
      ),
      solo: soonestFirst([
        ...myPosts.createdPlanned.map((post) => fromActivityPost(post, viewerId, myPosts.people)),
        ...mySessions.map(fromSession),
      ]),
    }
  }, [myGroups.hostedPlanned, myPosts.createdPlanned, upcoming.items, viewerId, myPosts.people])

  /**
   * Past is EVERYTHING whose time has gone, newest first — hosted as well as
   * joined, so a session never disappears from both tabs at once. "Past" means
   * the end time passed and nothing more; it does not claim anyone turned up.
   */
  const pastEvents = useMemo(
    () => ({
      group: latestFirst([
        ...myGroups.hostedPast.map((activity) =>
          fromGroupActivity(activity, { label: 'You hosted', tone: 'neutral' }),
        ),
        ...myGroups.joinedPast.map((activity) => fromGroupActivity(activity)),
      ]),
      solo: latestFirst([
        ...myPosts.createdPast.map((post) =>
          fromActivityPost(post, viewerId, myPosts.people, { label: 'You posted', tone: 'neutral' }),
        ),
        ...myPosts.joinedPast.map((post) => fromActivityPost(post, viewerId, myPosts.people)),
        ...past.items.map(fromSession),
      ]),
    }),
    [
      myGroups.hostedPast,
      myGroups.joinedPast,
      myPosts.createdPast,
      myPosts.joinedPast,
      past.items,
      viewerId,
      myPosts.people,
    ],
  )

  return (
    <>
      <AppHeader
        title="Activities"
        subtitle="What you have planned, created and played."
        size="wide"
      />
      <PageContainer size="wide">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="planned" className="flex-1 sm:flex-none sm:px-6">
              Planned
            </TabsTrigger>
            <TabsTrigger value="created" className="flex-1 sm:flex-none sm:px-6">
              Created
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1 sm:flex-none sm:px-6">
              Past
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planned" className="flex flex-col gap-5 pt-5">
            <SegmentedToggle options={KINDS} value={kind} onChange={setKind} />
            <EventList
              items={planned[kind]}
              isLoading={isLoadingPlanned}
              error={kind === 'group' ? groupError : soloError}
              onRetry={kind === 'group' ? myGroups.refresh : myPosts.refresh}
              emptyIllustration={clipboardIllustration}
              emptyTitle={
                kind === 'group'
                  ? 'No group activities planned.'
                  : 'No 1-to-1 activities planned.'
              }
              emptyDescription="Join something on Discover, or post your own activity."
              emptyAction={
                <Button variant="outline" asChild className="px-8">
                  <Link to={ROUTES.discover}>Go to Discover</Link>
                </Button>
              }
            />
          </TabsContent>

          <TabsContent value="created" className="flex flex-col gap-5 pt-5">
            <SegmentedToggle options={KINDS} value={kind} onChange={setKind} />
            <EventList
              items={created[kind]}
              isLoading={isLoadingPlanned}
              error={kind === 'group' ? groupError : soloError}
              onRetry={kind === 'group' ? myGroups.refresh : myPosts.refresh}
              emptyIllustration={clipboardIllustration}
              emptyTitle={
                kind === 'group'
                  ? "You haven't created a group activity yet."
                  : "You haven't posted a 1-to-1 activity yet."
              }
              emptyDescription="Post an activity and let people find it on Discover."
              emptyAction={
                <Button variant="outline" asChild className="px-8">
                  <Link to={ROUTES.postActivity}>Post an activity</Link>
                </Button>
              }
            />
          </TabsContent>

          <TabsContent value="past" className="flex flex-col gap-5 pt-5">
            <SegmentedToggle options={KINDS} value={kind} onChange={setKind} />
            <EventList
              items={pastEvents[kind]}
              isLoading={past.isLoading || myGroups.isLoading || myPosts.isLoading}
              error={kind === 'group' ? groupError : past.error || myPosts.error}
              onRetry={kind === 'group' ? myGroups.refresh : past.refresh}
              emptyIcon={History}
              emptyTitle={
                kind === 'group' ? 'No past group activities.' : 'No past 1-to-1 activities.'
              }
              /* Careful wording: an activity lands here because its end time
                 passed, which says nothing about whether anyone went. */
              emptyDescription="Activities appear here after their scheduled time."
            />
            {kind === 'solo' && past.hasMore && (
              <Button
                variant="outline"
                onClick={past.loadMore}
                disabled={past.isLoadingMore}
                className="self-center px-8"
              >
                {past.isLoadingMore ? 'Loading…' : 'Load more'}
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </PageContainer>
    </>
  )
}

/** Loading, error, empty and the rows — one implementation for every tab. */
function EventList({
  items,
  isLoading,
  error,
  onRetry,
  emptyIcon,
  emptyIllustration,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  items: readonly EventItem[]
  isLoading: boolean
  error: string
  onRetry: () => void
  emptyIcon?: LucideIcon
  emptyIllustration?: string
  emptyTitle: string
  emptyDescription: string
  emptyAction?: React.ReactNode
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {SKELETON_ROWS.map((key) => (
          <Skeleton key={key} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  if (error) return <ErrorState title={error} onRetry={onRetry} />

  if (items.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        illustration={emptyIllustration}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <EventRow
          key={item.id}
          to={item.to}
          title={item.title}
          startAt={item.startAt}
          meta={item.meta}
          pill={item.pill}
        />
      ))}
    </div>
  )
}
