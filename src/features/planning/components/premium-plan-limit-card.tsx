import { LockKeyhole, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import general from '@/data/general.json'
import { ROUTES } from '@/routes/routes'

const PLAN_COPY = general.planning.premiumPlans

export function PremiumPlanLimitCard() {
  return (
    <Card variant="subtle">
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
            <LockKeyhole className="size-4" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-title text-card-foreground">{PLAN_COPY.title}</span>
            <p className="text-body-small text-muted-foreground">
              Free members can keep {PLAN_COPY.freeLimit} active plan per Buddy.{' '}
              {PLAN_COPY.description}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <Link to={ROUTES.paywall}>
            <Sparkles className="size-4" aria-hidden />
            Unlock Buddy+
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
