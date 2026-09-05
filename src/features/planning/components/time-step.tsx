import { useState } from 'react'

import { FormField } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatPlanDate, formatSharedSlot } from '@/lib/plan-format'
import { cn } from '@/lib/utils'
import type { PlannedTime, SuggestedSlot } from '@/types/planning'
import type { AvailabilitySlot } from '@/types/sports-profile'

/**
 * Recurring availability answers "roughly when"; a plan needs an actual date.
 * Suggestions are REAL upcoming dates generated from the slots both people
 * marked, and every one of them stays editable.
 *
 * The copy is careful: this is Sports Buddy availability, not a calendar. We
 * have no access to anyone's real calendar, so nothing here claims to.
 */
export function TimeStep({
  sharedSlots,
  suggestions,
  proposed,
  isSaving,
  onPropose,
}: {
  sharedSlots: readonly AvailabilitySlot[]
  suggestions: readonly SuggestedSlot[]
  proposed: PlannedTime | null
  isSaving: boolean
  onPropose: (time: Omit<PlannedTime, 'timeZone'>) => void
}) {
  const [draft, setDraft] = useState<Omit<PlannedTime, 'timeZone'>>(
    () =>
      proposed ?? {
        date: suggestions[0]?.date ?? '',
        startTime: suggestions[0]?.startTime ?? '',
        endTime: suggestions[0]?.endTime ?? '',
      },
  )

  const canPropose =
    draft.date !== '' && draft.startTime !== '' && draft.endTime !== ''

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
      <section className="flex flex-col gap-3">
        <h3 className="text-caption text-muted-foreground uppercase">
          Times you both marked free
        </h3>

        {sharedSlots.length === 0 ? (
          <p className="text-body-small text-muted-foreground">
            Your Sports Buddy availability doesn't overlap yet — pick any date
            and time that works instead.
          </p>
        ) : (
          <>
            <p className="text-body-small text-muted-foreground">
              Based on your Sports Buddy availability, not a calendar.
            </p>
            <div className="flex flex-col gap-2">
              {suggestions.map((slot) => {
                const isSelected =
                  draft.date === slot.date &&
                  draft.startTime === slot.startTime &&
                  draft.endTime === slot.endTime

                return (
                  <button
                    key={`${slot.date}-${slot.period}`}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={isSaving}
                    onClick={() =>
                      setDraft({
                        date: slot.date,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                      })
                    }
                    className={cn(
                      'flex flex-col items-start gap-0.5 rounded-xl border px-4 py-3 text-left transition-ui pressable focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
                      isSelected
                        ? 'border-primary bg-primary/12'
                        : 'border-border bg-card hover:border-border-strong',
                    )}
                  >
                    <span className="text-title text-card-foreground">
                      {formatPlanDate(slot.date)}
                    </span>
                    <span className="text-body-small text-muted-foreground">
                      You both marked {formatSharedSlot(slot.day, slot.period)}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-caption text-muted-foreground uppercase">
          Exact time
        </h3>

        <FormField id="plan-date" label="Date">
          <Input
            id="plan-date"
            type="date"
            value={draft.date}
            onChange={(event) =>
              setDraft({ ...draft, date: event.target.value })
            }
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField id="plan-start" label="Starts">
            <Input
              id="plan-start"
              type="time"
              value={draft.startTime}
              onChange={(event) =>
                setDraft({ ...draft, startTime: event.target.value })
              }
            />
          </FormField>
          <FormField id="plan-end" label="Ends">
            <Input
              id="plan-end"
              type="time"
              value={draft.endTime}
              onChange={(event) =>
                setDraft({ ...draft, endTime: event.target.value })
              }
            />
          </FormField>
        </div>

        <Button
          disabled={isSaving || !canPropose}
          onClick={() => onPropose(draft)}
          className="sm:w-auto sm:self-start sm:px-8"
        >
          {isSaving ? 'Saving…' : 'Suggest this time'}
        </Button>
      </section>
    </div>
  )
}
