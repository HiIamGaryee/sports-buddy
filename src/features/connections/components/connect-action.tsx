import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, UserCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useConnections } from '@/hooks/use-connections'
import { cn } from '@/lib/utils'
import { conversationPath } from '@/routes/routes'
import type { ConnectionState } from '@/types/connection'

type ActionSize = 'default' | 'lg'

/**
 * The ONE place connection wording and behaviour live, so Discover, activity
 * cards and the candidate profile can never drift apart. `connected` is a
 * status, not a button — there is nothing to tap and no dead action.
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
  showMessage = true,
  connectedClassName,
  allowDisconnect = false,
}: {
  userId: string
  displayName: string
  state: ConnectionState
  size?: ActionSize
  className?: string
  /** Discover can place the existing message route beside other quick actions. */
  showMessage?: boolean
  connectedClassName?: string
  /**
   * Offer "Unconnect" on a connected relationship. Always behind a
   * confirmation, so one stray tap can never end a buddy relationship.
   */
  allowDisconnect?: boolean
}) {
  const { connect, cancelRequest, disconnect, connections } = useConnections()
  // The connection id IS the conversation id, so a Message link needs no
  // lookup and no conversation is created just to render a button — the
  // chat route ensures the document when it opens.
  const conversationId = connections.get(userId)?.id ?? null
  const [busy, setBusy] = useState<
    'idle' | 'connecting' | 'cancelling' | 'disconnecting'
  >('idle')
  const [isConfirmingDisconnect, setIsConfirmingDisconnect] = useState(false)
  const [error, setError] = useState('')

  // A single busy flag is what stops a double tap creating a second request;
  // the operation itself is idempotent as a second line of defence.
  const run = async (
    mode: 'connecting' | 'cancelling' | 'disconnecting',
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
              'flex items-center justify-center gap-2 border border-border bg-surface-subtle px-4',
              STATUS_SIZES[size],
              connectedClassName,
            )}
            aria-label={`Connected with ${displayName}`}
          >
            <UserCheck className="size-4 text-primary" />
            <span className="text-label text-foreground">Connected</span>
          </div>
          {conversationId && showMessage && (
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

      {state === 'connected' && allowDisconnect && (
        <>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Unconnect from ${displayName}`}
            disabled={busy !== 'idle'}
            onClick={() => setIsConfirmingDisconnect(true)}
          >
            Unconnect
          </Button>
          <Dialog
            open={isConfirmingDisconnect}
            onOpenChange={(open) => {
              if (busy === 'idle') setIsConfirmingDisconnect(open)
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Unconnect from {displayName}?</DialogTitle>
                <DialogDescription>
                  You won't be able to message or plan sessions together until
                  you both connect again. Your chat history is kept.
                </DialogDescription>
              </DialogHeader>
              {error && (
                <p role="alert" className="text-body-small text-destructive">
                  {error}
                </p>
              )}
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={busy !== 'idle'}>
                    Keep connection
                  </Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  disabled={busy !== 'idle'}
                  onClick={() =>
                    void run('disconnecting', async () => {
                      await disconnect(userId)
                      setIsConfirmingDisconnect(false)
                    })
                  }
                >
                  {busy === 'disconnecting' ? 'Unconnecting…' : 'Unconnect'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
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
