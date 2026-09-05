import { useState } from 'react'
import { CalendarPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { calendarService } from '@/services/calendar/calendar-service'
import type { Activity } from '@/types/activity'
import type { CalendarOperationResult } from '@/types/calendar'

/**
 * THE calendar action. The only place the app offers an activity to a
 * calendar, so the wording and the failure handling cannot drift.
 *
 * It knows nothing about platforms. `calendarService.addActivity` picks the
 * provider, and the result says how the event actually arrived — which is
 * what lets the copy stay honest. A downloaded `.ics` file is reported as a
 * file, never as "Added to your calendar", because at that point the user
 * still has to import it.
 */
export function AddToCalendar({
  activity,
  buddyName,
}: {
  activity: Activity
  buddyName: string
}) {
  const [isWorking, setIsWorking] = useState(false)
  const [result, setResult] = useState<CalendarOperationResult | null>(null)

  const handleClick = async () => {
    setIsWorking(true)
    setResult(null)
    try {
      setResult(await calendarService.addActivity(activity, buddyName))
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        onClick={handleClick}
        disabled={isWorking}
        aria-label="Add to Calendar, downloads a calendar file"
      >
        <CalendarPlus aria-hidden className="size-4" />
        {isWorking ? 'Preparing…' : 'Add to Calendar'}
      </Button>

      {result && (
        <p
          role={result.ok ? 'status' : 'alert'}
          className={
            result.ok
              ? 'text-body-small text-muted-foreground'
              : 'text-body-small text-destructive'
          }
        >
          {result.ok
            ? result.method === 'native'
              ? 'Activity added to your calendar.'
              : 'Calendar file downloaded. Open it to add the activity.'
            : result.message}
        </p>
      )}
    </div>
  )
}
