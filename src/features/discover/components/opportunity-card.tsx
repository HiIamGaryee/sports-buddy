import { MessageCircle, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConnectAction } from '@/features/connections/components/connect-action'
import { useConnections } from '@/hooks/use-connections'
import { conversationPath } from '@/routes/routes'
import type { DiscoverBuddy } from '@/types/discover'
import type { DiscoverItem } from '@/types/discover-item'

export function OpportunityCard({ item, buddy }: { item: DiscoverItem; buddy?: DiscoverBuddy }) {
  const { connections } = useConnections()
  const conversationId = connections.get(item.buddyId)?.id
  const connectionState = buddy?.connectionState ?? (item.connected ? 'connected' : 'none')

  return (
    <article className="opportunity-card group/card h-full">
      <div className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-heading-3 text-card-foreground">{item.activity}</span>
            <Badge variant="outline" className="w-fit">Possible fit</Badge>
          </div>
          <span className="shrink-0 text-heading-2 text-primary">{item.matchPercentage ?? '—'}%</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-title text-card-foreground">{item.place}</span>
          <span className="flex items-start gap-1.5 text-body-small text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            {item.location}{item.distanceKm !== undefined && ` · ${item.distanceKm < 1 ? `${Math.round(item.distanceKm * 1_000)} m` : `${item.distanceKm.toFixed(1)} km`} away`}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {item.skillLevel && <Badge variant="secondary">{item.skillLevel}</Badge>}
          {item.buddyType && <Badge variant="secondary">{item.buddyType}</Badge>}
        </div>
        <p className="text-body-small text-muted-foreground">
          {item.participantRule.mode === 'exact'
            ? `${item.participantRule.sizes.join(' or ')} total players`
            : `${item.participantRule.min}–${item.participantRule.max} total players`}
        </p>
        {item.priceRange && <p className="text-body-small text-muted-foreground">{item.priceRange}</p>}
        <div className={`mt-auto grid items-center gap-3 ${connectionState === 'connected' && conversationId ? 'grid-cols-[minmax(0,1fr)_48px]' : 'grid-cols-1'}`}>
          <ConnectAction
            userId={item.buddyId}
            displayName="this sports buddy"
            state={connectionState}
            showMessage={false}
            className="min-w-0 [&>button]:rounded-xl [&>button]:border-white/20 [&>button]:shadow-md [&>div]:rounded-xl"
          />
          {connectionState === 'connected' && conversationId && (
            <Button size="icon-lg" className="opportunity-message size-12 rounded-full hover:scale-105 active:scale-95" aria-label="Message" title="Message" asChild>
              <Link to={conversationPath(conversationId)}><MessageCircle className="size-5" /></Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
