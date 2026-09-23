import { RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import compassIllustration from '@/assets/svg/compas-svgrepo-com.svg'
import calendarIcon from '@/assets/svg/calendar-svgrepo-com.svg'
import { EmptyState } from '@/components/common/empty-state'
import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { AppDropdown } from '@/components/ui/AppDropdown'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SegmentedToggle } from '@/components/ui/segmented-toggle'
import { Skeleton } from '@/components/ui/skeleton'
import { AREAS } from '@/constants/areas'
import { SPORTS } from '@/constants/sports'
import { useCoarseNow } from '@/features/activities/use-activities'
import { ActivityPostCard } from '@/features/discover/components/activity-post-card'
import { BuddyCard } from '@/features/discover/components/buddy-card'
import { PremiumDiscoverFilters } from '@/features/discover/components/premium-discover-filters'
import { useActivityPosts } from '@/features/discover/use-activity-posts'
import { useDiscover } from '@/features/discover/use-discover'
import { GroupActivityCard } from '@/features/group-activities/components/group-activity-card'
import { useGroupActivities } from '@/features/group-activities/use-group-activities'
import { useConnections } from '@/hooks/use-connections'
import { useSubscription } from '@/hooks/use-subscription'
import { groupActivityService } from '@/services/group-activity/group-activity-service'
import { ROUTES } from '@/routes/routes'
import type { ActivityPost } from '@/types/activity-post'

const ALL = 'all'

const AREA_OPTIONS = [
  { value: ALL, label: 'All locations' },
  ...AREAS.map(({ id, name }) => ({ value: id, label: name })),
]

const SPORT_OPTIONS = [
  { value: ALL, label: 'Any activity' },
  ...SPORTS.map(({ id, name }) => ({ value: id, label: name })),
]

/** Two cards per row on desktop, one below `sm` — the result grid. */
const CARD_GRID = 'grid gap-7 sm:grid-cols-2'

const SKELETON_CARDS = [0, 1, 2, 3]

type View = 'people' | 'activities' | 'groups'

/*
 * Short labels on purpose: the three segments sit on ONE line and their text
 * does not wrap, so "Sports buddies / Open activities / Group activities" was
 * wider than a 390px phone and pushed the whole page sideways.
 */
const VIEWS = [
  { value: 'people', label: 'Buddies' },
  { value: 'activities', label: '1-to-1' },
  { value: 'groups', label: 'Groups' },
] as const satisfies readonly { value: View; label: string }[]

function CardSkeletons() {
  return (
    <div className={CARD_GRID}>
      {SKELETON_CARDS.map((key) => (
        <Card key={key}>
          <CardContent className="flex flex-col gap-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-8 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Discover shows REAL data only: the result cards are the page. One compact
 * filter row, a divider, the live match count, then the grid — the extra
 * feeds (open activities, group activities) are the same data behind a view
 * switch rather than three full-height sections stacked down the page, and
 * the premium toolkit sits behind a disclosure.
 *
 * "Wants to connect" is never filtered — a waiting request must not
 * disappear behind a filter. No distance and no invented match percentage
 * appear here: there are no coordinates to measure from, and a score is only
 * shown where the matching engine actually computed one.
 */
export function DiscoverPage() {
  const people = useDiscover()
  const activities = useActivityPosts()
  const groupActivities = useGroupActivities()
  const { getConnectionState } = useConnections()
  const { state: subscriptionState } = useSubscription()
  const now = useCoarseNow()
  const [area, setArea] = useState(ALL)
  const [sport, setSport] = useState(ALL)
  const [view, setView] = useState<View>('people')
  const [isToolkitOpen, setIsToolkitOpen] = useState(false)

  const hasFilters = area !== ALL || sport !== ALL

  const visiblePosts = useMemo(
    () =>
      activities.posts.filter(
        (post) =>
          (area === ALL || post.areaId === area) &&
          (sport === ALL || post.sportId === sport),
      ),
    [activities.posts, area, sport],
  )

  // Your connected buddies' posts first: the people you already play with.
  const { fromBuddies, fromOthers } = useMemo(() => {
    const buddies: ActivityPost[] = []
    const others: ActivityPost[] = []
    for (const post of visiblePosts) {
      const isBuddy =
        post.authorId !== activities.currentUserId &&
        getConnectionState(post.authorId) === 'connected'
      ;(isBuddy ? buddies : others).push(post)
    }
    return { fromBuddies: buddies, fromOthers: others }
  }, [visiblePosts, activities.currentUserId, getConnectionState])

  const orderedPosts = useMemo(
    () => [...fromBuddies, ...fromOthers],
    [fromBuddies, fromOthers],
  )

  const visibleBuddies = useMemo(
    () =>
      people.suggested.filter(
        ({ profile }) =>
          (area === ALL || profile.area === area) &&
          (sport === ALL ||
            profile.sports.some(({ sportId }) => sportId === sport)),
      ),
    [people.suggested, area, sport],
  )

  const visibleGroupActivities = useMemo(
    () =>
      groupActivities.activities.filter(
        (activity) =>
          (area === ALL || activity.areaId === area) &&
          (sport === ALL || activity.sportId === sport),
      ),
    [groupActivities.activities, area, sport],
  )

  const clearFilters = () => {
    setArea(ALL)
    setSport(ALL)
  }

  const refreshAll = () => {
    activities.refresh()
    groupActivities.refresh()
    people.refresh()
  }

  const removeGroupActivity = async (id: string) => {
    await groupActivityService.remove(id)
    groupActivities.refresh()
  }

  const current = {
    people: {
      isLoading: people.isLoading,
      error: people.error,
      count: people.incoming.length + visibleBuddies.length,
      retry: people.refresh,
    },
    activities: {
      isLoading: activities.isLoading,
      error: activities.error,
      count: orderedPosts.length,
      retry: activities.refresh,
    },
    groups: {
      isLoading: groupActivities.isLoading,
      error: groupActivities.error,
      count: visibleGroupActivities.length,
      retry: groupActivities.refresh,
    },
  }[view]

  const isEmpty = !current.isLoading && !current.error && current.count === 0

  return (
    <>
      <AppHeader
        title="Discover"
        subtitle="Find people and places to play near you."
        size="wide"
        action={
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Post an activity"
              asChild
            >
              <Link to={ROUTES.postActivity}>
                <img src={calendarIcon} alt="" className="size-5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Refresh"
              onClick={refreshAll}
              disabled={
                activities.isLoading ||
                groupActivities.isLoading ||
                people.isLoading
              }
            >
              <RefreshCw className="size-5" />
            </Button>
          </div>
        }
      />
      <PageContainer size="wide" className="gap-5 md:gap-6">
        {/* One compact filter row instead of a full-width filter panel. */}
        <div className="flex flex-wrap items-center gap-3">
          <AppDropdown
            value={area}
            onChange={setArea}
            options={AREA_OPTIONS}
            ariaLabel="Location"
            className="w-full sm:w-56"
          />
          <AppDropdown
            value={sport}
            onChange={setSport}
            options={SPORT_OPTIONS}
            ariaLabel="Activity"
            className="w-full sm:w-56"
          />
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-body-small text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Clear filters
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsToolkitOpen((open) => !open)}
            aria-expanded={isToolkitOpen}
            className="ml-auto text-body-small text-primary underline-offset-4 hover:underline"
          >
            {isToolkitOpen ? 'Hide search tools' : 'More filters'}
          </button>
        </div>

        {isToolkitOpen && (
          <PremiumDiscoverFilters
            subscriptionState={subscriptionState}
            filters={people.filters}
            onApply={people.setFilters}
            onReset={people.resetFilters}
          />
        )}

        <hr className="border-border" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-body text-muted-foreground">
            {current.isLoading
              ? 'Looking for matches…'
              : `${current.count} ${current.count === 1 ? 'match' : 'matches'}`}
          </span>
          {/* Wraps on a phone: the count, the post button and the three-way
              toggle do not fit on one 390px line. */}
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            {view === 'activities' && (
              <Button variant="outline" size="sm" asChild>
                <Link to={ROUTES.postActivity}>Post an activity</Link>
              </Button>
            )}
            {view === 'groups' && (
              <Button variant="outline" size="sm" asChild>
                <Link to={ROUTES.createGroupActivity}>Create activity</Link>
              </Button>
            )}
            <SegmentedToggle
              options={VIEWS}
              value={view}
              onChange={setView}
              className="h-11 w-full sm:w-auto"
            />
          </div>
        </div>

        {current.isLoading && <CardSkeletons />}

        {!current.isLoading && current.error && (
          <EmptyState
            title={current.error}
            action={
              <Button variant="outline" onClick={current.retry}>
                Try again
              </Button>
            }
          />
        )}

        {isEmpty && view === 'people' && (
          <EmptyState
            size="compact"
            illustration={compassIllustration}
            title="No sports buddies found"
            description={
              hasFilters
                ? 'Try another location or activity.'
                : 'Check back soon, or review your discovery settings.'
            }
            action={
              hasFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        )}

        {isEmpty && view === 'activities' && (
          <EmptyState
            size="compact"
            illustration={compassIllustration}
            title={
              hasFilters
                ? 'No activities match these filters'
                : 'No open activities yet'
            }
            description={
              hasFilters
                ? 'Try another location or activity.'
                : 'Be the first — post a session and let people join you.'
            }
            action={
              hasFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button asChild>
                  <Link to={ROUTES.postActivity}>Post an activity</Link>
                </Button>
              )
            }
          />
        )}

        {isEmpty && view === 'groups' && (
          <EmptyState
            size="compact"
            illustration={compassIllustration}
            title={
              hasFilters
                ? 'No group activities match these filters'
                : 'No group activities yet'
            }
            description={
              hasFilters
                ? 'Try another location or activity.'
                : 'Be the first — create one and let people join.'
            }
            action={
              hasFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button asChild>
                  <Link to={ROUTES.createGroupActivity}>Create activity</Link>
                </Button>
              )
            }
          />
        )}

        {!current.isLoading && !current.error && view === 'people' && (
          <div className={CARD_GRID}>
            {/* Incoming requests lead the grid and ignore the filters. */}
            {people.incoming.map((buddy) => (
              <BuddyCard key={buddy.profile.userId} buddy={buddy} />
            ))}
            {visibleBuddies.map((buddy) => (
              <BuddyCard
                key={buddy.profile.userId}
                buddy={buddy}
                onDismiss={people.dismiss}
              />
            ))}
          </div>
        )}

        {!current.isLoading && !current.error && view === 'activities' && (
          <div className={CARD_GRID}>
            {orderedPosts.map((post) => (
              <ActivityPostCard
                key={post.id}
                post={post}
                people={activities.people}
                now={now}
                onChanged={activities.refresh}
                onRemove={activities.remove}
              />
            ))}
          </div>
        )}

        {!current.isLoading && !current.error && view === 'groups' && (
          <div className={CARD_GRID}>
            {visibleGroupActivities.map((activity) => (
              <GroupActivityCard
                key={activity.id}
                activity={activity}
                people={groupActivities.people}
                now={now}
                onChanged={groupActivities.refresh}
                onRemove={removeGroupActivity}
              />
            ))}
          </div>
        )}
      </PageContainer>
    </>
  )
}
