import { useState } from 'react'
import { ChevronLeft, ChevronRight, Share2 } from 'lucide-react'

import { ErrorState } from '@/components/common/error-state'
import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RecapCard } from '@/features/recap/components/recap-card'
import { useMonthlyRecap } from '@/features/recap/use-monthly-recap'
import { useProfile } from '@/hooks/use-profile'
import { buildRecapImageFile } from '@/services/share/recap-image'
import { shareService } from '@/services/share/share-service'

/**
 * `/recap` — a member's own monthly recap. Read-only and free for everyone
 * (see `docs/monetization.md`): nothing here is gated behind Buddy+.
 */
export function MonthlyRecapPage() {
  const { profile } = useProfile()
  const { recap, isLoading, error, canGoToNextMonth, goToPreviousMonth, goToNextMonth } =
    useMonthlyRecap()
  const [isSharing, setIsSharing] = useState(false)
  const [shareFeedback, setShareFeedback] = useState('')

  const memberName = profile?.displayName ?? 'Your'

  const share = async () => {
    if (!recap) return
    setIsSharing(true)
    setShareFeedback('')
    try {
      const file = await buildRecapImageFile(recap, memberName)
      const outcome = await shareService.shareFile({
        file,
        title: `${memberName}'s ${recap.monthLabel} — Sports Buddy`,
        text: `${memberName}'s ${recap.monthLabel} recap on Sports Buddy`,
      })
      if (outcome === 'downloaded') setShareFeedback('Image saved — share it from your gallery.')
    } catch (shareError) {
      setShareFeedback(
        shareError instanceof Error ? shareError.message : "We couldn't share your recap.",
      )
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <>
      <AppHeader title="Monthly recap" size="narrow" showBack />
      <PageContainer size="narrow">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous month"
            onClick={goToPreviousMonth}
            disabled={isLoading}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <span className="text-title text-foreground">{recap?.monthLabel ?? ' '}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next month"
            onClick={goToNextMonth}
            disabled={isLoading || !canGoToNextMonth}
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>

        {isLoading && <Skeleton className="h-96 w-full rounded-2xl" />}
        {!isLoading && error && <ErrorState title={error} />}
        {!isLoading && !error && recap && (
          <div className="flex flex-col gap-4">
            <RecapCard recap={recap} memberName={memberName} />
            <Button disabled={isSharing} onClick={() => void share()}>
              <Share2 className="size-4" />
              {isSharing ? 'Preparing…' : 'Share recap'}
            </Button>
            {shareFeedback && (
              <p role="status" className="text-center text-body-small text-muted-foreground">
                {shareFeedback}
              </p>
            )}
          </div>
        )}
      </PageContainer>
    </>
  )
}
