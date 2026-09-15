import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { GenderLabel } from '@/components/profile/gender-label'
import { ConnectAction } from '@/features/connections/components/connect-action'
import { CompatibilityScore } from '@/features/discover/components/compatibility-score'
import { useConnections } from '@/hooks/use-connections'
import { getInitials } from '@/lib/initials'
import {
  formatAvailability,
  formatBudget,
  getIntentLabel,
  getSkillLabel,
  getAreaName,
  getSportName,
} from '@/lib/profile-format'
import { cn } from '@/lib/utils'
import { buddyProfilePath, conversationPath } from '@/routes/routes'
import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import type { DiscoverBuddy } from '@/types/discover'

const MAX_SPORTS_SHOWN = 3
const MAX_SLOTS_SHOWN = 2

/**
 * One ranked sports buddy: who they are (name, photo, area), how well you fit,
 * what they play and when, then the action. Everything shown comes from the
 * discovery-safe `DiscoveryProfile` projection, so nothing private can reach
 * this card, and View profile opens the same projection in full.
 */
export function BuddyCard({
  buddy,
  onDismiss,
}: {
  buddy: DiscoverBuddy
  onDismiss?: (userId: string) => void
}) {
  const { profile: candidate, compatibility, connectionState } = buddy
  const { connections } = useConnections()
  const conversationId = connections.get(candidate.userId)?.id
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

  return (
    <Card variant="interactive" className="h-full">
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            to={buddyProfilePath(candidate.userId)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl transition-ui focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Avatar className="size-12 shrink-0">
              {candidate.photoUrl && (
                <AvatarImage src={candidate.photoUrl} alt="" />
              )}
              <AvatarFallback className="text-title">
                {getInitials(candidate.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-title text-card-foreground">
                {candidate.displayName}
              </span>
              <span className="truncate text-body-small text-muted-foreground">
                {getAreaName(candidate.area)}
              </span>
            </div>
          </Link>
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

        <div className="flex flex-col gap-1.5">
          <span className="text-caption text-muted-foreground uppercase">
            Plays
          </span>
          {sports.map(({ sportId, skillLevel }) => (
            <div
              key={sportId}
              className={cn(
                'flex items-center justify-between gap-3 rounded-xl px-3 py-2',
                shared.includes(sportId) ? 'bg-primary/12' : 'bg-surface-subtle',
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

        <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-subtle px-3 py-2">
          <span className="flex min-w-0 items-center gap-2 text-body-small text-muted-foreground">
            <span className="truncate">{formatBudget(candidate.budget)} / activity</span>
            <GenderLabel gender={candidate.gender} />
          </span>
          <Button variant="outline" size="sm" asChild>
            <Link
              to={buddyProfilePath(candidate.userId)}
              aria-label={`View ${candidate.displayName}'s profile`}
            >
              View profile
            </Link>
          </Button>
        </div>

        {connectionState === 'connected' && conversationId ? (
          <div className="mt-auto flex items-start gap-3">
            <ConnectAction
              userId={candidate.userId}
              displayName={candidate.displayName}
              state={connectionState}
              showMessage={false}
              allowDisconnect
              className="min-w-0 flex-1"
              connectedClassName="h-12 rounded-2xl"
            />
            <Button
              size="icon-lg"
              className="size-12 rounded-full"
              aria-label={`Message ${candidate.displayName}`}
              title="Message"
              asChild
            >
              <Link to={conversationPath(conversationId)}>
                <MessageCircle className="size-5" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-auto flex items-start gap-2">
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
                aria-label="Not now — hide this sports buddy for this session"
                onClick={() => onDismiss(candidate.userId)}
              >
                Not now
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
