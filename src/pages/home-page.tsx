import { CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'

import heroDark from '@/assets/hero-dark.jpeg'
import heroLight from '@/assets/hero-light.jpeg'
import { EmptyState } from '@/components/common/empty-state'
import { SectionHeader } from '@/components/common/section-header'
import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { APP_NAME, APP_TAGLINE_LINES } from '@/constants/app'
import { ActivityCard } from '@/features/activities/components/activity-card'
import { useCoarseNow, useUpcomingActivities } from '@/features/activities/use-activities'
import { useMyActivityPosts } from '@/features/activities/use-my-activity-posts'
import { ActivityPostCard } from '@/features/discover/components/activity-post-card'
import { RecommendationSwiper } from '@/features/home/components/recommendation-swiper'
import { useProfile } from '@/hooks/use-profile'
import { useTheme } from '@/hooks/use-theme'
import { ROUTES } from '@/routes/routes'

export function HomePage() {
  const { profile } = useProfile()
  const { resolvedTheme } = useTheme()
  const now = useCoarseNow()
  const { items, isLoading: isLoadingActivities } = useUpcomingActivities()
  const myPosts = useMyActivityPosts(now)
  const firstName = profile?.displayName.split(' ')[0]

  // The soonest thing you are actually doing: a confirmed session, a post you
  // created, or a post you have a spot in. A request still waiting for
  // approval, or an invite not yet accepted, is not something you are doing.
  const nextSession = items[0] ?? null
  const nextPost =
    [...myPosts.openPlanned, ...myPosts.confirmedPlanned].sort((a, b) =>
      a.startAt.localeCompare(b.startAt),
    )[0] ?? null
  const showPost =
    nextPost !== null &&
    (nextSession === null || nextPost.startAt < nextSession.activity.startAt)
  const isLoadingUpcoming = isLoadingActivities || myPosts.isLoading

  return (
    <>
      <AppHeader title={APP_NAME} subtitle={firstName ? `Ready to move, ${firstName}?` : 'Ready to move?'} size="wide" />
      <PageContainer size="wide">
        <Card className="relative min-h-68 overflow-hidden border-primary/30 bg-card">
          {/*
           * The image owns the right half and fades into the text column. The
           * fade used to be a gradient PLUS a `w-3/5` blur panel, whose hard
           * right edge drew a visible seam straight down the banner.
           */}
          <img
            src={resolvedTheme === 'dark' ? heroDark : heroLight}
            alt=""
            className="absolute inset-y-0 right-0 h-full w-3/5 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card from-40% via-card/85 to-card/10" />
          <CardContent className="relative z-10 flex max-w-lg flex-col gap-6 p-6 md:p-8">
            <div className="flex flex-col gap-2">
              <p className="text-heading-1 text-card-foreground">
                {APP_TAGLINE_LINES.map((line) => <span key={line} className="block">{line}</span>)}
              </p>
              <p className="text-body text-muted-foreground">Meet compatible sports buddies and turn a connection into a real activity.</p>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Button size="lg" asChild className="sm:flex-1"><Link to={ROUTES.discover}>Find a Buddy</Link></Button>
              <Button size="lg" variant="outline" asChild className="sm:flex-1"><Link to={ROUTES.activities}>View Activities</Link></Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
          <section className="flex min-w-0 flex-col gap-3">
            <SectionHeader title="Upcoming" />
            {isLoadingUpcoming ? (
              <Skeleton className="h-36 w-full rounded-2xl" />
            ) : showPost && nextPost ? (
              <ActivityPostCard
                post={nextPost}
                people={myPosts.people}
                now={now}
                onChanged={myPosts.refresh}
                onRemove={myPosts.remove}
              />
            ) : nextSession ? (
              <ActivityCard item={nextSession} now={now} surface="pastel" />
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No upcoming activities yet."
                description="Post an activity or join one on Discover, and it shows up here."
                action={
                  <Button variant="outline" asChild>
                    <Link to={ROUTES.discover}>Find an activity</Link>
                  </Button>
                }
              />
            )}
          </section>
          <RecommendationSwiper />
        </div>
      </PageContainer>
    </>
  )
}
