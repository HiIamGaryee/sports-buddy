import { RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import compassIllustration from '@/assets/svg/compas-svgrepo-com.svg'
import calendarIcon from '@/assets/svg/calendar-svgrepo-com.svg'
import { EmptyState } from '@/components/common/empty-state'
import { SectionHeader } from '@/components/common/section-header'
import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { AppDropdown } from '@/components/ui/AppDropdown'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AREAS } from '@/constants/areas'
import { SPORTS } from '@/constants/sports'
import { useCoarseNow } from '@/features/activities/use-activities'
import { ActivityPostCard } from '@/features/discover/components/activity-post-card'
import { BuddyCard } from '@/features/discover/components/buddy-card'
import { useActivityPosts } from '@/features/discover/use-activity-posts'
import { useDiscover } from '@/features/discover/use-discover'
import { useConnections } from '@/hooks/use-connections'
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

const SKELETON_CARDS = [0, 1, 2]

function CardSkeletons() {
  return (
    <div className="grid-cards gap-6">
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
 * Discover shows REAL data only: open activities people have posted, then
 * people to play with. Location and activity filters narrow both, instantly
 * and without another read. "Wants to connect" is never filtered — a waiting
 * request must not disappear behind a filter.
 *
 * No distance and no invented match percentage appear here: there are no
 * coordinates to measure from, and a score is only shown where the matching
 * engine actually computed one (on each buddy card).
 */
export function DiscoverPage() {
  const people = useDiscover()
  const activities = useActivityPosts()
  const { getConnectionState } = useConnections()
  const now = useCoarseNow()
  const [area, setArea] = useState(ALL)
  const [sport, setSport] = useState(ALL)

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

  const renderPosts = (posts: readonly ActivityPost[]) => (
    <div className="grid-cards gap-6">
      {posts.map((post) => (
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

  const clearFilters = () => {
    setArea(ALL)
    setSport(ALL)
  }

  const refreshAll = () => {
    activities.refresh()
    people.refresh()
  }

  return (
    <>
      <AppHeader
        title="Discover"
        subtitle="Find activities to join and people to play with."
        size="wide"
        action={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Post an activity" asChild>
              <Link to={ROUTES.postActivity}>
                <img src={calendarIcon} alt="" className="size-5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Refresh"
              onClick={refreshAll}
              disabled={activities.isLoading || people.isLoading}
            >
              <RefreshCw className="size-5" />
            </Button>
          </div>
        }
      />
      <PageContainer size="wide">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <AppDropdown
                value={area}
                onChange={setArea}
                options={AREA_OPTIONS}
                ariaLabel="Location"
              />
              <AppDropdown
                value={sport}
                onChange={setSport}
                options={SPORT_OPTIONS}
                ariaLabel="Activity"
              />
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="self-end text-body-small text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Clear filters
              </button>
            )}
          </CardContent>
        </Card>

        <section className="flex flex-col gap-4">
          <SectionHeader
            title="Open activities"
            description="Sessions people have posted. Join to connect and chat."
            action={
              <Button variant="outline" size="sm" asChild>
                <Link to={ROUTES.postActivity}>Post an activity</Link>
              </Button>
            }
          />
          {activities.isLoading && <CardSkeletons />}
          {!activities.isLoading && activities.error && (
            <EmptyState
              title={activities.error}
              action={
                <Button variant="outline" onClick={activities.refresh}>
                  Try again
                </Button>
              }
            />
          )}
          {!activities.isLoading &&
            !activities.error &&
            visiblePosts.length === 0 && (
              <EmptyState
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
          {!activities.isLoading &&
            !activities.error &&
            visiblePosts.length > 0 && (
              <div className="flex flex-col gap-6">
                {fromBuddies.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <SectionHeader level="group" title="From your buddies" />
                    {renderPosts(fromBuddies)}
                  </div>
                )}
                {fromOthers.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {fromBuddies.length > 0 && (
                      <SectionHeader level="group" title="More activities" />
                    )}
                    {renderPosts(fromOthers)}
                  </div>
                )}
              </div>
            )}
        </section>

        {!people.isLoading && !people.error && people.incoming.length > 0 && (
          <section className="flex flex-col gap-4">
            <SectionHeader title="Wants to connect" />
            <div className="grid-cards gap-6">
              {people.incoming.map((buddy) => (
                <BuddyCard key={buddy.profile.userId} buddy={buddy} />
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-4">
          <SectionHeader
            title="Sports buddies"
            description="Ranked by how well you would play together."
          />
          {people.isLoading && <CardSkeletons />}
          {!people.isLoading && people.error && (
            <EmptyState
              title={people.error}
              action={
                <Button variant="outline" onClick={people.refresh}>
                  Try again
                </Button>
              }
            />
          )}
          {!people.isLoading && !people.error && visibleBuddies.length === 0 && (
            <EmptyState
              illustration={compassIllustration}
              title="No sports buddies found"
              description={
                hasFilters
                  ? 'Try another location or activity.'
                  : 'Check back soon, or review your discovery settings.'
              }
            />
          )}
          {!people.isLoading && !people.error && visibleBuddies.length > 0 && (
            <div className="grid-cards gap-6">
              {visibleBuddies.map((buddy) => (
                <BuddyCard
                  key={buddy.profile.userId}
                  buddy={buddy}
                  onDismiss={people.dismiss}
                />
              ))}
            </div>
          )}
        </section>
      </PageContainer>
    </>
  )
}
