import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, UserCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useConnections } from '@/hooks/use-connections'
import { cn } from '@/lib/utils'
import { conversationPath } from '@/routes/routes'
import type { ConnectionState } from '@/types/connection'

type ActionSize = 'default' | 'lg'

/**
 * The ONE place connection wording and behaviour live, so Discover and the
 * candidate profile can never drift apart. `connected` is a status, not a
 * button — there is nothing to tap and no dead action.
 */
const ACTIONS = {
  none: {
    label: 'Connect',
    busyLabel: 'Connecting…',
    variant: 'default',
    ariaLabel: (name: string) => `Connect with ${name}`,
  },
  'pending-incoming': {
    label: 'Connect back',
    busyLabel: 'Connecting…',
    variant: 'default',
    ariaLabel: (name: string) => `Connect back with ${name}`,
  },
  'pending-outgoing': {
    label: 'Request sent',
    busyLabel: 'Request sent',
    variant: 'outline',
    ariaLabel: (name: string) => `Connection request sent to ${name}`,
  },
} as const satisfies Record<
  Exclude<ConnectionState, 'connected'>,
  {
    label: string
    busyLabel: string
    variant: 'default' | 'outline'
    ariaLabel: (name: string) => string
  }
>

const STATUS_SIZES = {
  default: 'h-11 rounded-lg',
  lg: 'h-13 rounded-xl',
} as const satisfies Record<ActionSize, string>

export function ConnectAction({
  userId,
  displayName,
  state,
  size = 'default',
  className,
}: {
  userId: string
  displayName: string
  state: ConnectionState
  size?: ActionSize
  className?: string
}) {
  const { connect, cancelRequest, connections } = useConnections()
  // The connection id IS the conversation id, so a Message link needs no
  // lookup and no conversation is created just to render a button — the
  // chat route ensures the document when it opens.
  const conversationId = connections.get(userId)?.id ?? null
  const [busy, setBusy] = useState<'idle' | 'connecting' | 'cancelling'>('idle')
  const [error, setError] = useState('')

  // A single busy flag is what stops a double tap creating a second request;
  // the operation itself is idempotent as a second line of defence.
  const run = async (
    mode: 'connecting' | 'cancelling',
    action: () => Promise<unknown>,
  ) => {
    if (busy !== 'idle') return
    setBusy(mode)
    setError('')
    try {
      await action()
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setBusy('idle')
    }
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {state === 'connected' ? (
        <>
          <div
            className={cn(
              'flex items-center justify-center gap-2 border border-border bg-muted/50 px-4',
              STATUS_SIZES[size],
            )}
            aria-label={`Connected with ${displayName}`}
          >
            <UserCheck className="size-4 text-primary" />
            <span className="text-label text-foreground">Connected</span>
          </div>
          {conversationId && (
            <Button size={size} asChild>
              <Link
                to={conversationPath(conversationId)}
                aria-label={`Message ${displayName}`}
              >
                <MessageCircle className="size-4" />
                Message
              </Link>
            </Button>
          )}
        </>
      ) : (
        <Button
          size={size}
          variant={ACTIONS[state].variant}
          aria-label={ACTIONS[state].ariaLabel(displayName)}
          disabled={state === 'pending-outgoing' || busy !== 'idle'}
          onClick={() => run('connecting', () => connect(userId))}
        >
          {busy === 'connecting'
            ? ACTIONS[state].busyLabel
            : ACTIONS[state].label}
        </Button>
      )}

      {state === 'pending-outgoing' && (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Cancel connection request to ${displayName}`}
          disabled={busy !== 'idle'}
          onClick={() => run('cancelling', () => cancelRequest(userId))}
        >
          {busy === 'cancelling' ? 'Cancelling…' : 'Cancel request'}
        </Button>
      )}

      {error && (
        <p role="alert" className="text-body-small text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
