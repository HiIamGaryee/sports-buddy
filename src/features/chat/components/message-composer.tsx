import { useState } from 'react'
import { SendHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MAX_MESSAGE_LENGTH, MESSAGE_COUNTER_THRESHOLD } from '@/constants/chat'
import { normalizeMessageContent } from '@/lib/chat'

/**
 * The composer owns its own draft and clears it ONLY after a confirmed send,
 * so a failed message is never lost. Nothing optimistic is inserted into the
 * list — the realtime subscription delivers the message once it exists.
 */
export function MessageComposer({
  buddyName,
  isSending,
  error,
  onSend,
}: {
  buddyName: string
  isSending: boolean
  error: string
  onSend: (content: string) => Promise<boolean>
}) {
  const [draft, setDraft] = useState('')

  const trimmed = normalizeMessageContent(draft)
  const isTooLong = draft.length > MAX_MESSAGE_LENGTH
  const canSend = trimmed.length > 0 && !isTooLong && !isSending

  const submit = async () => {
    if (!canSend) return
    const sent = await onSend(draft)
    if (sent) setDraft('')
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p role="alert" className="text-body-small text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-end gap-2">
        <label htmlFor="message-input" className="sr-only">
          Message {buddyName}
        </label>
        <Textarea
          id="message-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends on a hardware keyboard; Shift+Enter is a newline.
            // `isComposing` keeps IME candidate selection from sending.
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault()
              void submit()
            }
          }}
          placeholder="Message…"
          rows={1}
          aria-invalid={isTooLong || undefined}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl py-2.5"
        />
        <Button
          size="icon"
          aria-label={`Send message to ${buddyName}`}
          disabled={!canSend}
          onClick={() => void submit()}
          className="shrink-0 rounded-full"
        >
          <SendHorizontal className="size-5" />
        </Button>
      </div>

      {draft.length >= MESSAGE_COUNTER_THRESHOLD && (
        <span
          className={`self-end text-caption ${
            isTooLong ? 'text-destructive' : 'text-muted-foreground'
          }`}
        >
          {draft.length} / {MAX_MESSAGE_LENGTH}
        </span>
      )}
    </div>
  )
}
