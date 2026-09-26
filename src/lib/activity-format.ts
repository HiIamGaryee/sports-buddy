/**
 * The one place a confirmed activity's dates become words. Home, the
 * activities list, the card, the detail page and the chat card all read from
 * here, so a date can never be spelled two ways.
 *
 * Everything renders in the reader's own locale and zone via `Intl`; nothing
 * hardcodes an offset.
 */
const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const shortDateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'short' })

const parse = (iso: string | null | undefined): Date | null => {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

/** "Saturday, 12 September" */
export const formatActivityDate = (iso: string) => {
  const date = parse(iso)
  return date ? dateFormat.format(date) : ''
}

/** "Sat, 12 Sep" — for compact rows. */
export const formatActivityShortDate = (iso: string) => {
  const date = parse(iso)
  return date ? shortDateFormat.format(date) : ''
}

/** "5:00 PM" */
export const formatActivityTime = (iso: string) => {
  const date = parse(iso)
  return date ? timeFormat.format(date) : ''
}

/** "5:00 PM – 7:00 PM", or "5:00 PM" when there is no end time. */
export const formatActivityTimeRange = (startIso: string, endIso: string | null) => {
  const start = formatActivityTime(startIso)
  const end = endIso ? formatActivityTime(endIso) : ''
  return start && end ? `${start} – ${end}` : start || end
}

/** "Sat, 12 Sep · 5:00 PM – 7:00 PM" */
export const formatActivityDateTime = (startIso: string, endIso: string | null) => {
  const date = formatActivityShortDate(startIso)
  const range = formatActivityTimeRange(startIso, endIso)
  return date && range ? `${date} · ${range}` : date || range
}

/** The compact date block on a card: `{ month: 'SEP', day: '12' }`. */
export function formatDateBlock(iso: string): { month: string; day: string } {
  const date = parse(iso)
  if (!date) return { month: '', day: '' }
  return {
    month: monthFormat.format(date).toUpperCase(),
    day: String(date.getDate()),
  }
}

/** "2 hr" / "1 hr 30 min" / "45 min" */
export function formatDuration(startIso: string, endIso: string): string {
  const start = parse(startIso)
  const end = parse(endIso)
  if (!start || !end) return ''

  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000)
  if (minutes <= 0) return ''

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  if (rest === 0) return `${hours} hr`
  return `${hours} hr ${rest} min`
}
