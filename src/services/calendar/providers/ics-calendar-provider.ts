import { buildIcsCalendar, buildIcsFilename } from '@/lib/ics'
import { calendarFailure } from '@/services/calendar/calendar-error'
import type { CalendarEventData, CalendarProvider } from '@/types/calendar'

/**
 * The universal baseline: build a `.ics` file and hand it to the browser.
 *
 * This works everywhere — every desktop browser, every mobile browser, and
 * inside a Capacitor WebView — with no plugin, no permission and no network,
 * which is why it is the fallback rather than an afterthought. The event data
 * is already in memory, so an export succeeds offline.
 *
 * The MIME type, the extension and the filename are all decided HERE. None of
 * them is ever taken from user input.
 */
const MIME_TYPE = 'text/calendar;charset=utf-8'

export function createIcsCalendarProvider(
  now: () => Date = () => new Date(),
): CalendarProvider {
  return {
    method: 'file',

    async addEvent(event: CalendarEventData) {
      let objectUrl: string | null = null
      try {
        const ics = buildIcsCalendar(event, now())
        const blob = new Blob([ics], { type: MIME_TYPE })
        objectUrl = URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = objectUrl
        link.download = buildIcsFilename(event.title, event.startAt)
        link.rel = 'noopener'
        // The anchor MUST be in the document. A detached `click()` is ignored
        // by Firefox and by headless Chrome, so the download silently never
        // starts — removed again immediately so nothing is left behind.
        link.style.display = 'none'
        document.body.append(link)
        try {
          link.click()
        } finally {
          link.remove()
        }

        return { ok: true, method: 'file' } as const
      } catch {
        return calendarFailure('failed')
      } finally {
        // Released on the next tick — revoking synchronously can cancel the
        // download in some browsers before it has read the blob.
        if (objectUrl) {
          const url = objectUrl
          setTimeout(() => URL.revokeObjectURL(url), 0)
        }
      }
    },
  }
}
