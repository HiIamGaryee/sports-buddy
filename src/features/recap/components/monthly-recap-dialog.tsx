import { useState } from 'react'

import { SectionHeader } from '@/components/common/section-header'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ShareCardPreview } from '@/features/recap/components/share-card-preview'
import { formatRecapDuration } from '@/lib/monthly-recap'
import type { MonthlyExerciseRecap } from '@/types/exercise'

/**
 * The full recap: every statistic the source actually supports, then the share
 * card. Sections for duration, venues and distance are absent — not zeroed —
 * when the source did not record them.
 */
export function MonthlyRecapDialog({
  recap,
  displayName,
  open,
  onOpenChange,
}: {
  recap: MonthlyExerciseRecap
  displayName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [isSharing, setIsSharing] = useState(false)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setIsSharing(false)
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{recap.label} Recap</DialogTitle>
          <DialogDescription>
            {isSharing
              ? 'Pick a style, add a photo if you like, then download your card.'
              : 'Everything you did last month, from your activity history.'}
          </DialogDescription>
        </DialogHeader>

        {isSharing ? (
          <ShareCardPreview recap={recap} displayName={displayName} />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat value={`${recap.totalSessions}`} label="Activities" />
              <Stat value={`${recap.activeDays}`} label="Active days" />
              {recap.totalDurationMinutes !== null && (
                <Stat
                  value={formatRecapDuration(recap.totalDurationMinutes)}
                  label="Moving"
                />
              )}
            </div>

            <Separator />

            <section className="flex flex-col gap-3">
              <SectionHeader level="group" title="Your sports" />
              <ul className="flex flex-col gap-3">
                {recap.sports.map((sport) => (
                  <li key={sport.label} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-title text-card-foreground">
                        {sport.label}
                      </span>
                      <span className="text-body-small text-muted-foreground">
                        {sport.sessions}{' '}
                        {sport.sessions === 1 ? 'session' : 'sessions'} ·{' '}
                        {sport.percentage}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary-gradient"
                        style={{ width: `${sport.percentage}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {recap.topSport && (
              <>
                <Separator />
                <section className="flex flex-col gap-2">
                  <SectionHeader level="group" title="Top sport" />
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-heading-3 text-card-foreground">
                      {recap.topSport.label}
                    </span>
                    <span className="text-body-small text-muted-foreground">
                      {recap.topSport.sessions}{' '}
                      {recap.topSport.sessions === 1 ? 'session' : 'sessions'}
                    </span>
                  </div>
                </section>
              </>
            )}

            {recap.venues && (
              <>
                <Separator />
                <section className="flex flex-col gap-2">
                  <SectionHeader level="group" title="Where you played" />
                  <ul className="flex flex-col gap-2">
                    {recap.venues.map((venue) => (
                      <li
                        key={venue.name}
                        className="flex items-baseline justify-between gap-3"
                      >
                        <span className="text-body text-card-foreground">
                          {venue.name}
                        </span>
                        <span className="text-body-small text-muted-foreground">
                          {venue.sessions}{' '}
                          {venue.sessions === 1 ? 'session' : 'sessions'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            )}

            {recap.distances && (
              <>
                <Separator />
                <section className="flex flex-col gap-2">
                  <SectionHeader level="group" title="Distance covered" />
                  <ul className="flex flex-col gap-2">
                    {recap.distances.map((entry) => (
                      <li
                        key={entry.label}
                        className="flex items-baseline justify-between gap-3"
                      >
                        <span className="text-body text-card-foreground">
                          {entry.label}
                        </span>
                        <span className="text-body-small text-muted-foreground">
                          {entry.distanceKm} km
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            )}

            <Button size="lg" onClick={() => setIsSharing(true)} className="w-full">
              Create share card
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-display text-card-foreground">{value}</span>
      <span className="text-caption text-muted-foreground uppercase">{label}</span>
    </div>
  )
}
