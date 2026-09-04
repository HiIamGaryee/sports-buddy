import { CalendarDays, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/common/empty-state'
import { SectionHeader } from '@/components/common/section-header'
import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { APP_NAME, APP_TAGLINE_LINES } from '@/constants/app'
import { useProfile } from '@/hooks/use-profile'
import { getAreaName, getSportName } from '@/lib/profile-format'
import { ROUTES } from '@/routes/routes'

export function HomePage() {
  const { profile } = useProfile()
  const firstName = profile?.displayName.split(' ')[0]

  return (
    <>
      <AppHeader
        title={APP_NAME}
        subtitle={firstName ? `Ready to move, ${firstName}?` : 'Ready to move?'}
      />
      <PageContainer>
        {profile && profile.sports.length > 0 && (
          <section className="flex flex-col gap-2">
            <span className="text-caption text-muted-foreground uppercase">
              {getAreaName(profile.area)}
              {profile.radiusKm !== null && ` · within ${profile.radiusKm} km`}
            </span>
            <div className="flex flex-wrap gap-2">
              {profile.sports.map(({ sportId }) => (
                <Badge key={sportId} variant="outline">
                  {getSportName(sportId)}
                </Badge>
              ))}
            </div>
          </section>
        )}

        <Card className="border-primary/30 bg-card">
          <CardContent className="flex flex-col gap-4">
            <span className="flex w-fit items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-caption text-primary uppercase">
              <Sparkles aria-hidden className="size-3" />
              Get started
            </span>
            <div className="flex flex-col gap-2">
              <p className="text-heading-1 text-card-foreground">
                {APP_TAGLINE_LINES.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
              <p className="text-body text-muted-foreground">
                Meet compatible sports buddies and turn a connection into a
                real activity.
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              <Button size="lg" asChild>
                <Link to={ROUTES.discover}>Find a Buddy</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to={ROUTES.activities}>View Activities</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <section className="flex flex-col gap-3">
          <SectionHeader title="Upcoming" />
          <EmptyState
            icon={CalendarDays}
            title="No upcoming activities yet."
            description="Once you plan a session with a buddy, it shows up here."
          />
        </section>
      </PageContainer>
    </>
  )
}
