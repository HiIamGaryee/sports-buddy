import { Link } from 'react-router-dom'

import { Card, CardContent } from '@/components/ui/card'
import { StatusPill } from '@/components/ui/status-pill'
import {
  formatActivityShortDate,
  formatActivityTimeRange,
  formatDateBlock,
} from '@/lib/activity-format'

/**
 * ONE row shape for every kind of event on the Activities page — a group
 * activity, a 1-to-1 post and a session confirmed through Plan Together.
 *
 * The title leads, the date and time sit directly underneath it, and the
 * month/day block anchors the left edge, so a list of mixed events reads as
 * one chronological list instead of three differently-shaped card designs.
 * Callers sort; this component never reorders anything.
 */
export function EventRow({
  to,
  title,
  startAt,
  endAt,
  meta,
  pill,
  trailing,
}: {
  to: string
  title: string
  /** ISO instant. The date and time under the title come from this. */
  startAt: string
  /** ISO instant, or null when the event has no end time. */
  endAt: string | null
  /** One short line under the time: venue, area, who it is with. */
  meta?: string
  pill?: { label: string; tone: 'neutral' | 'pending' | 'success' | 'active' }
  /** An action that belongs to the row (e.g. Remove); rendered outside the link. */
  trailing?: React.ReactNode
}) {
  const { month, day } = formatDateBlock(startAt)

  return (
    <Card variant="interactive" size="sm">
      <CardContent className="flex items-start gap-3 p-3">
        <Link to={to} className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-subtle">
            <span className="text-caption text-muted-foreground">{month}</span>
            <span className="text-title leading-none text-card-foreground">{day}</span>
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-title text-card-foreground">{title}</span>
              {pill && <StatusPill tone={pill.tone}>{pill.label}</StatusPill>}
            </span>
            <span className="text-body-small text-muted-foreground">
              {formatActivityShortDate(startAt)} · {formatActivityTimeRange(startAt, endAt)}
            </span>
            {meta && <span className="text-caption text-muted-foreground">{meta}</span>}
          </span>
        </Link>
        {trailing}
      </CardContent>
    </Card>
  )
}
