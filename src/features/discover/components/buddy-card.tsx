import { MapPin, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { GenderLabel } from '@/components/profile/gender-label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConnectAction } from '@/features/connections/components/connect-action'
import { useConnections } from '@/hooks/use-connections'
import {
  formatBudget,
  getAreaName,
  getIntentLabel,
  getSkillLabel,
  getSportName,
} from '@/lib/profile-format'
import { buddyProfilePath, conversationPath } from '@/routes/routes'
import type { DiscoverBuddy } from '@/types/discover'

const MAX_TAGS_SHOWN = 2

/**
 * One ranked sports buddy, on the pastel `.opportunity-card` surface: the
 * sport you would play and the engine's score at the top, then who they are
 * and where, the tags, what a session costs, and ONE primary action.
 *
 * Everything shown comes from the discovery-safe `DiscoveryProfile`
 * projection, so nothing private can reach this card. There is deliberately
 * no distance: the app stores an area, never a coordinate, so no kilometre
 * figure exists to print.
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
  // The sport this pairing is actually about — the engine already picked it.
  const bestSport = compatibility.bestSportMatch
  const headlineSport = bestSport ?? candidate.sports[0]?.sportId ?? null
  const headlineSkill = candidate.sports.find(
    ({ sportId }) => sportId === headlineSport,
  )?.skillLevel
  const intents = candidate.intents.slice(0, MAX_TAGS_SHOWN)

  return (
    <article className="opportunity-card h-full">
      <div className="flex h-full flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col items-start gap-1.5">
            <span className="truncate text-heading-3 text-card-foreground">
              {headlineSport ? getSportName(headlineSport) : 'Sports buddy'}
            </span>
            <Badge variant="outline">{compatibility.label}</Badge>
          </div>
          <span
            className="shrink-0 text-heading-2 text-primary"
            aria-label={`${compatibility.score} percent compatible`}
          >
            {compatibility.score}%
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <Link
            to={buddyProfilePath(candidate.userId)}
            className="truncate rounded-lg text-title text-card-foreground transition-ui hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {candidate.displayName}
          </Link>
          <span className="flex items-center gap-1.5 text-body-small text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{getAreaName(candidate.area)}</span>
            <GenderLabel gender={candidate.gender} />
          </span>
        </div>

        {connectionState === 'pending-incoming' && (
          <p className="text-body-small text-primary">
            {candidate.displayName} wants to connect.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {headlineSkill && (
            <Badge variant="secondary">{getSkillLabel(headlineSkill)}</Badge>
          )}
          {intents.map((intent) => (
            <Badge key={intent} variant="secondary">
              {getIntentLabel(intent)}
            </Badge>
          ))}
        </div>

        <p className="text-body-small text-muted-foreground">
          {formatBudget(candidate.budget)} / activity
        </p>

        <div className="mt-auto flex items-start gap-3">
          <ConnectAction
            userId={candidate.userId}
            displayName={candidate.displayName}
            state={connectionState}
            size="lg"
            showMessage={false}
            allowDisconnect={connectionState === 'connected'}
            className="min-w-0 flex-1 [&>button]:rounded-full"
            connectedClassName="rounded-full"
          />
          {connectionState === 'connected' && conversationId && (
            <Button
              size="icon-lg"
              className="opportunity-message size-13 rounded-full"
              aria-label={`Message ${candidate.displayName}`}
              title="Message"
              asChild
            >
              <Link to={conversationPath(conversationId)}>
                <MessageCircle className="size-5" />
              </Link>
            </Button>
          )}
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
      </div>
    </article>
  )
}
