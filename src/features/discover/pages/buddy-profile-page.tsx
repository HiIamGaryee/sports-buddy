import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { ProfileSummary } from '@/components/profile/profile-summary'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { discoverService } from '@/services/discover/discover-service'
import type { DiscoveryProfile } from '@/types/discovery-profile'

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
  const { userId } = useParams<{ userId: string }>()
  const [state, setState] = useState<CandidateState>(() => LOADING_STATE)

  // Reset during render when the route param changes — no effect needed.
  if (state.userId !== userId) setState({ ...LOADING_STATE, userId })

  useEffect(() => {
    if (!userId) return

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

  return (
    <>
      <AppHeader
        title={candidate?.displayName ?? 'Sports buddy'}
        subtitle="Sports Buddy profile"
        showBack
      />
      <PageContainer>
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
          <Card>
            <CardContent>
              <ProfileSummary profile={candidate} />
            </CardContent>
          </Card>
        ) : (
          <p className="text-body text-muted-foreground">
            This profile isn't available any more.
          </p>
        )}
      </PageContainer>
    </>
  )
}
