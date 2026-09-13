import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { validDocumentId } from '@/lib/ids'
import { StickyActionBar } from '@/components/layout/sticky-action-bar'
import { ProfileSummary } from '@/components/profile/profile-summary'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ConnectAction } from '@/features/connections/components/connect-action'
import { SafetyActions } from '@/components/safety/safety-actions'
import { CompatibilityBreakdown } from '@/features/discover/components/compatibility-breakdown'
import { CompatibilityScore } from '@/features/discover/components/compatibility-score'
import { MatchingReasons } from '@/features/discover/components/matching-reasons'
import { useConnections } from '@/hooks/use-connections'
import { useProfile } from '@/hooks/use-profile'
import { discoverService } from '@/services/discover/discover-service'
import { toMatchingSubject } from '@/services/matching/matching-service'
import type { DiscoveryProfile } from '@/types/discovery-profile'
import { ROUTES } from '@/routes/routes'

interface CandidateState {
  userId?: string
  candidate: DiscoveryProfile | null
  isLoading: boolean
  error: string
}

const LOADING_STATE: CandidateState = {
  candidate: null,
  isLoading: true,
  error: '',
}

export function BuddyProfilePage() {
  const { userId: rawUserId } = useParams<{ userId: string }>()
  // A route param is untrusted input on its way to `doc(db, COLLECTION, id)`.
  // An invalid id becomes `undefined`, which the hook already treats as
  // "nothing to load", so the page shows its normal unavailable state instead
  // of building a malformed document path.
  const userId = validDocumentId(rawUserId) ?? undefined
  const { profile } = useProfile()
  const { getConnectionState } = useConnections()
  const navigate = useNavigate()
  const [state, setState] = useState<CandidateState>(() => LOADING_STATE)

  // Reset during render when the route param changes — no effect needed.
  if (state.userId !== userId) setState({ ...LOADING_STATE, userId })

  useEffect(() => {
    if (!userId) {
      setState({ userId, candidate: null, isLoading: false, error: '' })
      return
    }

    let active = true
    discoverService
      .getCandidate(userId)
      .then((loaded) => {
        if (active) {
          setState({ userId, candidate: loaded, isLoading: false, error: '' })
        }
      })
      .catch((loadError: unknown) => {
        if (!active) return
        setState({
          userId,
          candidate: null,
          isLoading: false,
          error:
            loadError instanceof Error
              ? loadError.message
              : "We couldn't load this profile.",
        })
      })

    return () => {
      active = false
    }
  }, [userId])

  const { candidate, isLoading, error } = state

  // Derived per viewer, at runtime. Nothing about it is stored or fetched.
  const buddy = useMemo(
    () =>
      candidate && profile
        ? discoverService.rankCandidate(candidate, toMatchingSubject(profile))
        : null,
    [candidate, profile],
  )

  return (
    <>
      <AppHeader
        title={candidate?.displayName ?? 'Sports buddy'}
        subtitle="Sports Buddy profile"
        size="wide"
        showBack
      />
      <PageContainer size="wide">
        {isLoading ? (
          <Card>
            <CardContent className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <Skeleton className="size-16 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </CardContent>
          </Card>
        ) : error ? (
          <p role="alert" className="text-body text-destructive">
            {error}
          </p>
        ) : candidate ? (
          // Two columns from `lg`: the profile reads on the left while the
          // compatibility breakdown and the connect action sit beside it,
          // instead of one very long full-width column.
          <div className="flex flex-col gap-6 lg:grid lg:grid-aside-end lg:items-start lg:gap-8">
            {buddy && (
              <Card className="lg:col-start-2 lg:row-start-1">
                <CardContent className="flex flex-col gap-5">
                  <div className="flex items-end justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="text-caption text-muted-foreground uppercase">
                        Compatibility
                      </span>
                      <h2 className="text-heading-3 text-card-foreground">
                        {buddy.compatibility.reasons.length > 0
                          ? 'Why you could play well together'
                          : 'How the two of you compare'}
                      </h2>
                    </div>
                    <CompatibilityScore
                      score={buddy.compatibility.score}
                      label={buddy.compatibility.label}
                      size="lg"
                    />
                  </div>

                  {buddy.compatibility.reasons.length > 0 ? (
                    <MatchingReasons reasons={buddy.compatibility.reasons} />
                  ) : (
                    <p className="text-body-small text-muted-foreground">
                      Not a lot in common yet — the breakdown below shows where.
                    </p>
                  )}
                  <Separator />
                  <CompatibilityBreakdown
                    compatibility={buddy.compatibility}
                  />
                </CardContent>
              </Card>
            )}

            <Card className="lg:col-start-1 lg:row-start-1">
              <CardContent>
                <ProfileSummary profile={candidate} />
                <div className="mt-5 border-t border-border pt-4"><SafetyActions targetUserId={candidate.userId} displayName={candidate.displayName} context={{ type: 'profile' }} onBlocked={() => navigate(ROUTES.discover)} /></div>
              </CardContent>
            </Card>

            {/* Phone/tablet: sticky above the bottom navigation, which already
                owns the bottom safe-area inset, and in flow so it never hides
                content. Desktop: a sticky card in the side column, because a
                full-width bar under a 1440px page looks like a phone habit. */}
            <StickyActionBar
              offset="nav"
              bleed
              className="pt-3 pb-3 lg:relative lg:bottom-auto lg:col-start-2 lg:row-start-2 lg:mx-0 lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-5 lg:backdrop-blur-none"
            >
              <ConnectAction
                userId={candidate.userId}
                displayName={candidate.displayName}
                state={getConnectionState(candidate.userId)}
                size="lg"
              />
            </StickyActionBar>
          </div>
        ) : (
          <p className="text-body text-muted-foreground">
            This profile isn't available any more.
          </p>
        )}
      </PageContainer>
    </>
  )
}
