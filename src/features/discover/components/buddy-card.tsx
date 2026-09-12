import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConnectAction } from '@/features/connections/components/connect-action'
import { CompatibilityScore } from '@/features/discover/components/compatibility-score'
import { StartPlanDialog } from '@/features/planning/components/start-plan-dialog'
import { useConnections } from '@/hooks/use-connections'
import {
  formatAvailability,
  formatBudget,
  getIntentLabel,
  getSkillLabel,
  getSportName,
} from '@/lib/profile-format'
import { cn } from '@/lib/utils'
import { conversationPath } from '@/routes/routes'
import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import type { DiscoverBuddy } from '@/types/discover'

const MAX_SPORTS_SHOWN = 3
const MAX_SLOTS_SHOWN = 2

/**
 * A deliberately anonymous match card. Discover communicates what someone
 * wants to play and when, while names, photos, bios and profiles stay hidden
 * until the two people have connected.
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
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-title text-card-foreground">
              Your next sports buddy
            </span>
            <span className="text-body-small text-muted-foreground">
              {connectionState === 'connected'
                ? "You're connected — plan a session together."
                : 'Connect to reveal their profile.'}
            </span>
          </div>
          <CompatibilityScore
            score={compatibility.score}
            label={compatibility.label}
          />
        </div>

        {connectionState === 'pending-incoming' && (
          <p className="text-body-small text-primary">
            Someone wants to connect with you.
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
          <span className="text-body-small text-muted-foreground">
            {formatBudget(candidate.budget)} / activity
          </span>
        </div>

        {connectionState === 'connected' && conversationId ? (
          <div className="mt-auto grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_3rem]">
            <ConnectAction
              userId={candidate.userId}
              displayName="this sports buddy"
              state={connectionState}
              showMessage={false}
              className="col-span-2 sm:col-span-1"
              connectedClassName="h-12 rounded-2xl"
            />
            <StartPlanDialog
              conversationId={conversationId}
              className="h-12 w-full rounded-2xl"
            />
            <Button
              size="icon-lg"
              className="size-12 rounded-full"
              aria-label="Message"
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
              displayName="this sports buddy"
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
