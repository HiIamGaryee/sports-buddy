/**
 * The ONE place chat dates are formatted — the conversation list, the message
 * bubbles and the date separators all read from here, so they can never
 * disagree. `Intl` only: no date library is added for this.
 */
const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

const shortDateFormat = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
})

const parse = (iso: string | null): Date | null => {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Local calendar day, so "Today" means the reader's today. */
const dayKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

export function isSameDay(a: string | null, b: string | null): boolean {
  const left = parse(a)
  const right = parse(b)
  return left !== null && right !== null && dayKey(left) === dayKey(right)
}

const daysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

/** `''` while a just-sent message is still waiting for its server timestamp. */
export const formatMessageTime = (iso: string | null) => {
  const date = parse(iso)
  return date ? timeFormat.format(date) : ''
}

/** "Today" / "Yesterday" / "Sep 4" above the first message of each day. */
export function formatDateSeparator(iso: string | null): string {
  const date = parse(iso)
  if (!date) return 'Today'
  if (dayKey(date) === dayKey(new Date())) return 'Today'
  if (dayKey(date) === dayKey(daysAgo(1))) return 'Yesterday'
  return shortDateFormat.format(date)
}

/** Compact stamp for a conversation row: time today, else day or date. */
export function formatConversationTime(iso: string | null): string {
  const date = parse(iso)
  if (!date) return ''
  if (dayKey(date) === dayKey(new Date())) return timeFormat.format(date)
  if (dayKey(date) === dayKey(daysAgo(1))) return 'Yesterday'
  return shortDateFormat.format(date)
}
