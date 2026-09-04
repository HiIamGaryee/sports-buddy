import { Link } from 'react-router-dom'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConnectAction } from '@/features/connections/components/connect-action'
import { CompatibilityScore } from '@/features/discover/components/compatibility-score'
import { MatchingReasons } from '@/features/discover/components/matching-reasons'
import { getInitials } from '@/lib/initials'
import {
  formatAvailability,
  formatBudget,
  getAreaName,
  getIntensityLabel,
  getIntentLabel,
  getSkillLabel,
  getSportName,
} from '@/lib/profile-format'
import { cn } from '@/lib/utils'
import { buddyProfilePath } from '@/routes/routes'
import { getTopMatchingReasons } from '@/services/matching/matching-service'
import type { DiscoverBuddy } from '@/types/discover'

const MAX_SPORTS_SHOWN = 3
const MAX_SLOTS_SHOWN = 2

/**
 * Discovery-safe candidate card. It takes a `DiscoverBuddy` — the projection,
 * the viewer's derived compatibility and the viewer's relationship state — so
 * no private field can reach it and no score is ever read from a document.
 * Actions are state-driven through `ConnectAction`, never four card variants.
 */
export function BuddyCard({
  buddy,
  onDismiss,
}: {
  buddy: DiscoverBuddy
  onDismiss?: (userId: string) => void
}) {
  const { profile: candidate, compatibility, connectionState } = buddy
  const shared = compatibility.sharedSports
  // Shared sports first: the reason someone is here belongs at the top.
  const ordered = [
    ...candidate.sports.filter((sport) => shared.includes(sport.sportId)),
    ...candidate.sports.filter((sport) => !shared.includes(sport.sportId)),
  ]
  const sports = ordered.slice(0, MAX_SPORTS_SHOWN)
  const hiddenSports = ordered.length - sports.length
  const slots = formatAvailability(candidate.availability)
  const shownSlots = slots.slice(0, MAX_SLOTS_SHOWN)
  const reasons = getTopMatchingReasons(compatibility)

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-14">
            {candidate.photoUrl && (
              <AvatarImage src={candidate.photoUrl} alt={candidate.displayName} />
            )}
            <AvatarFallback className="text-heading-3">
              {getInitials(candidate.displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-title text-card-foreground">
              {candidate.displayName}
            </span>
            <span className="text-body-small text-muted-foreground">
              {getAreaName(candidate.area)}
            </span>
          </div>
          <CompatibilityScore
            score={compatibility.score}
            label={compatibility.label}
          />
        </div>

        {connectionState === 'pending-incoming' && (
          <p className="text-body-small text-primary">
            {candidate.displayName} wants to connect.
          </p>
        )}

        <MatchingReasons reasons={reasons} />

        <div className="flex flex-col gap-1.5">
          {sports.map(({ sportId, skillLevel }) => (
            <div
              key={sportId}
              className={cn(
                'flex items-center justify-between gap-3 rounded-xl px-3 py-2',
                shared.includes(sportId) ? 'bg-primary/10' : 'bg-muted/50',
              )}
            >
              <span className="text-body text-card-foreground">
                {getSportName(sportId)}
              </span>
              <span className="text-label text-primary">
                {getSkillLabel(skillLevel)}
              </span>
            </div>
          ))}
          {hiddenSports > 0 && (
            <span className="text-body-small text-muted-foreground">
              +{hiddenSports} more sport{hiddenSports > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {candidate.intents.map((intent) => (
            <Badge key={intent} variant="outline">
              {getIntentLabel(intent)}
            </Badge>
          ))}
          <Badge variant="secondary">
            {getIntensityLabel(candidate.preferredIntensity)}
          </Badge>
        </div>

        {shownSlots.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-caption text-muted-foreground uppercase">
              Usually free
            </span>
            <div className="flex flex-wrap gap-2">
              {shownSlots.map((slot) => (
                <Badge key={slot} variant="outline">
                  {slot}
                </Badge>
              ))}
              {slots.length > shownSlots.length && (
                <Badge variant="ghost">
                  +{slots.length - shownSlots.length}
                </Badge>
              )}
            </div>
          </div>
        )}

        {candidate.bio && (
          <p className="line-clamp-2 text-body text-muted-foreground">
            {candidate.bio}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-body-small text-muted-foreground">
            {formatBudget(candidate.budget)} / activity
          </span>
          <Button variant="outline" size="sm" asChild>
            <Link
              to={buddyProfilePath(candidate.userId)}
              aria-label={`View ${candidate.displayName}'s profile`}
            >
              View Profile
            </Link>
          </Button>
        </div>

        <div className="flex items-start gap-2">
          <ConnectAction
            userId={candidate.userId}
            displayName={candidate.displayName}
            state={connectionState}
            className="flex-1"
          />
          {connectionState === 'none' && onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Not now — hide ${candidate.displayName} for this session`}
              onClick={() => onDismiss(candidate.userId)}
            >
              Not now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
