import { Check, ChevronLeft, Search } from 'lucide-react'
import { useReducer, useState } from 'react'

import { FormField } from '@/components/common/form-field'
import { AppDropdown } from '@/components/ui/AppDropdown'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SPORTS } from '@/constants/sports'
import { useVenueMapSearch } from '@/features/map/use-venue-map-search'
import { formatPlanDate } from '@/lib/plan-format'
import type { ParticipantRule } from '@/types/discover-item'
import type { SportId } from '@/types/sports-profile'

const STEP_COUNT = 4
const MAX_DISCOVER_PLAYERS = 50
const MAX_PRICE = 1_000
const MAX_LOCATION_TEXT_LENGTH = 120

const STEPS = [
  { number: 1, label: 'Activity' },
  { number: 2, label: 'Date & Time' },
  { number: 3, label: 'Budget' },
  { number: 4, label: 'Location' },
] as const

const GROUP_RULES = [
  { value: 'max', label: 'Any group up to a maximum' },
  { value: 'exact', label: 'Exact group size' },
  { value: 'range', label: 'Range of players' },
] as const

const DEFAULT_SPORT = SPORTS[0]?.id ?? 'badminton'
type GroupRule = (typeof GROUP_RULES)[number]['value']

interface DiscoverDraftState {
  sportId: SportId
  groupRule: GroupRule
  minPlayers: string
  maxPlayers: string
  date: string
  startAt: string
  endAt: string
  budgetMin: string
  budgetMax: string
  locationText: string
}

export interface DiscoverDraft {
  sportId: SportId
  participantRule: ParticipantRule
  date: string
  startAt: string
  endAt: string
  budget: { min: number; max: number; currency: 'MYR'; unit: 'per-person' }
  locationText: string
}

type DraftAction =
  | { type: 'set'; field: keyof DiscoverDraftState; value: string }
  | { type: 'reset' }

const initialDraft: DiscoverDraftState = {
  sportId: DEFAULT_SPORT,
  groupRule: 'max',
  minPlayers: '2',
  maxPlayers: '8',
  date: '',
  startAt: '',
  endAt: '',
  budgetMin: '20',
  budgetMax: '40',
  locationText: '',
}

function draftReducer(state: DiscoverDraftState, action: DraftAction): DiscoverDraftState {
  if (action.type === 'reset') return initialDraft
  return { ...state, [action.field]: action.value }
}

const sportName = (sportId: SportId) => SPORTS.find(({ id }) => id === sportId)?.name ?? sportId
const toNumber = (value: string) => Number(value)

function getPlayerError(draft: DiscoverDraftState): string | null {
  const min = toNumber(draft.minPlayers)
  const max = toNumber(draft.maxPlayers)
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 2 || max < 2) return 'Players must be at least 2.'
  if (min > MAX_DISCOVER_PLAYERS || max > MAX_DISCOVER_PLAYERS) return `Use ${MAX_DISCOVER_PLAYERS} players or fewer.`
  if (draft.groupRule === 'exact' && min !== max) return 'Exact group size needs matching minimum and maximum.'
  if (max < min) return 'Maximum players must be at least the minimum.'
  return null
}

function getDateError(draft: DiscoverDraftState): string | null {
  if (!draft.date || !draft.startAt || !draft.endAt) return 'Choose a date, start time and end time.'
  if (draft.endAt <= draft.startAt) return 'End time must be after start time.'
  const end = new Date(`${draft.date}T${draft.endAt}`)
  if (!Number.isFinite(end.getTime()) || end <= new Date()) return 'Choose a future date and time.'
  return null
}

function getBudgetError(draft: DiscoverDraftState): string | null {
  const min = toNumber(draft.budgetMin)
  const max = toNumber(draft.budgetMax)
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < 0) return 'Enter valid prices.'
  if (min > MAX_PRICE || max > MAX_PRICE) return `Use prices up to RM${MAX_PRICE}.`
  if (max < min) return 'Maximum price must be at least the minimum.'
  return null
}

const hasDraftInput = (draft: DiscoverDraftState) =>
  (Object.keys(initialDraft) as (keyof DiscoverDraftState)[]).some((key) => draft[key] !== initialDraft[key])

function formatTime(value: string) {
  if (!value) return '—'
  const [hours, minutes] = value.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date)
}

export function AddDiscoverDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate?: (draft: DiscoverDraft) => void
}) {
  const [step, setStep] = useState(1)
  const [draft, dispatch] = useReducer(draftReducer, initialDraft)
  const [discardPromptOpen, setDiscardPromptOpen] = useState(false)
  const [created, setCreated] = useState(false)

  const stepError = step === 1
    ? getPlayerError(draft)
    : step === 2
      ? getDateError(draft)
      : step === 3
        ? getBudgetError(draft)
        : draft.locationText.trim().length === 0
          ? 'Enter an area or venue.'
          : draft.locationText.trim().length > MAX_LOCATION_TEXT_LENGTH
            ? `Use ${MAX_LOCATION_TEXT_LENGTH} characters or fewer.`
            : null

  const setField = (field: keyof DiscoverDraftState, value: string) => {
    dispatch({ type: 'set', field, value })
  }

  const createDraft = (): DiscoverDraft => {
    const min = toNumber(draft.minPlayers)
    const max = toNumber(draft.maxPlayers)
    return {
      sportId: draft.sportId,
      participantRule: draft.groupRule === 'exact' ? { mode: 'exact', sizes: [min] } : draft.groupRule === 'range' ? { mode: 'range', min, max } : { mode: 'max', min, max },
      date: draft.date,
      startAt: draft.startAt,
      endAt: draft.endAt,
      budget: { min: toNumber(draft.budgetMin), max: toNumber(draft.budgetMax), currency: 'MYR', unit: 'per-person' },
      locationText: draft.locationText.trim(),
    }
  }

  const requestClose = () => {
    if (created || !hasDraftInput(draft)) {
      onOpenChange(false)
      return
    }
    setDiscardPromptOpen(true)
  }

  const discard = () => {
    dispatch({ type: 'reset' })
    setStep(1)
    setCreated(false)
    setDiscardPromptOpen(false)
    onOpenChange(false)
  }

  const continueStep = () => {
    if (stepError) return
    if (step < STEP_COUNT) {
      setStep((current) => current + 1)
      return
    }
    onCreate?.(createDraft())
    setCreated(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? onOpenChange(true) : requestClose()}>
        <DialogContent className="flex max-h-[min(90dvh,42rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl">
          <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-6">
            <DialogHeader className="gap-1 pr-8">
              <DialogTitle className="text-heading-2">Add new discover</DialogTitle>
              <DialogDescription>{getStepDescription(step)}</DialogDescription>
            </DialogHeader>
            <StepIndicator step={step} />
            <div key={step} className="min-h-0 flex-1 overflow-y-auto py-5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200">
              {step === 1 && <ActivityStep draft={draft} setField={setField} error={stepError} />}
              {step === 2 && <DateTimeStep draft={draft} setField={setField} error={stepError} />}
              {step === 3 && <BudgetStep draft={draft} setField={setField} error={stepError} />}
              {step === 4 && <LocationStep draft={draft} setField={setField} error={stepError} />}
            </div>
            <DialogFooter className="-mx-5 -mb-5 mt-0 border-t border-border bg-surface-subtle px-5 py-4 sm:-mx-6 sm:-mb-6 sm:px-6">
              {step > 1 && <Button type="button" variant="ghost" onClick={() => setStep((current) => Math.max(1, current - 1))}><ChevronLeft className="size-4" />Back</Button>}
              {step === 1 && <Button type="button" variant="ghost" onClick={requestClose}>Cancel</Button>}
              <Button type="button" className="sm:ml-auto" disabled={Boolean(stepError)} onClick={continueStep}>{step === STEP_COUNT ? 'Create discover' : 'Continue'}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={discardPromptOpen} onOpenChange={setDiscardPromptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Discard this discover?</DialogTitle><DialogDescription>Your progress will be cleared.</DialogDescription></DialogHeader>
          <DialogFooter><Button type="button" variant="ghost" onClick={() => setDiscardPromptOpen(false)}>Continue editing</Button><Button type="button" variant="destructive" onClick={discard}>Discard</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {created && <CreationConfirmation draft={draft} onClose={() => { dispatch({ type: 'reset' }); setStep(1); setCreated(false); onOpenChange(false) }} />}
    </>
  )
}

function getStepDescription(step: number) {
  return [
    'Choose what you want to play and how many people can join.',
    'Choose when you want this activity to happen.',
    'Set a comfortable price range per person.',
    'Tell people where you want to play.',
  ][step - 1]
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="mt-5 flex items-center gap-2" aria-label={`Step ${step} of ${STEP_COUNT}`}>
      <span className="text-caption text-muted-foreground sm:hidden">Step {step} of {STEP_COUNT}</span>
      <div className="hidden w-full items-center gap-2 sm:flex">
        {STEPS.map((entry, index) => {
          const complete = entry.number < step
          const current = entry.number === step
          return <div key={entry.number} className="flex min-w-0 flex-1 items-center gap-2"><div className="flex min-w-0 items-center gap-1.5"><span className={current ? 'text-caption text-primary' : complete ? 'text-caption text-foreground' : 'text-caption text-muted-foreground'}>{complete ? <Check aria-hidden className="inline size-3.5" /> : String(entry.number).padStart(2, '0')}</span><span className={current ? 'truncate text-body-small font-medium text-foreground' : 'truncate text-body-small text-muted-foreground'}>{entry.label}</span></div>{index < STEPS.length - 1 && <span className="h-px min-w-3 flex-1 bg-border" aria-hidden />}</div>
        })}
      </div>
      <span className="text-body-small font-medium text-foreground sm:hidden">{STEPS[step - 1]?.label}</span>
    </div>
  )
}

function ActivityStep({ draft, setField, error }: { draft: DiscoverDraftState; setField: (field: keyof DiscoverDraftState, value: string) => void; error: string | null }) {
  return <div className="flex flex-col gap-5"><AppDropdown label="Activity" value={draft.sportId} onChange={(value) => setField('sportId', value)} options={SPORTS.map(({ id, name }) => ({ value: id, label: name }))} /><AppDropdown label="Group size rule" value={draft.groupRule} onChange={(value) => setField('groupRule', value)} options={GROUP_RULES} /><div className="grid grid-cols-2 gap-3"><FormField id="discover-min-players" label="Minimum players"><Input id="discover-min-players" type="number" inputMode="numeric" min="2" max={MAX_DISCOVER_PLAYERS} value={draft.minPlayers} onChange={(event) => setField('minPlayers', event.target.value)} /></FormField><FormField id="discover-max-players" label="Maximum players"><Input id="discover-max-players" type="number" inputMode="numeric" min="2" max={MAX_DISCOVER_PLAYERS} value={draft.maxPlayers} onChange={(event) => setField('maxPlayers', event.target.value)} /></FormField></div>{error && <p role="alert" className="text-body-small text-destructive">{error}</p>}<p className="text-body-small text-muted-foreground">Use 2–{MAX_DISCOVER_PLAYERS} players. Exact group size uses matching minimum and maximum values.</p></div>
}

function DateTimeStep({ draft, setField, error }: { draft: DiscoverDraftState; setField: (field: keyof DiscoverDraftState, value: string) => void; error: string | null }) {
  return <div className="flex flex-col gap-5"><FormField id="discover-date" label="Date"><Input id="discover-date" type="date" value={draft.date} onChange={(event) => setField('date', event.target.value)} /></FormField><div className="grid grid-cols-2 gap-3"><FormField id="discover-start-time" label="Start time"><Input id="discover-start-time" type="time" value={draft.startAt} onChange={(event) => setField('startAt', event.target.value)} /></FormField><FormField id="discover-end-time" label="End time"><Input id="discover-end-time" type="time" value={draft.endAt} onChange={(event) => setField('endAt', event.target.value)} /></FormField></div>{error && <p role="alert" className="text-body-small text-destructive">{error}</p>}<SummaryLine draft={draft} /></div>
}

function BudgetStep({ draft, setField, error }: { draft: DiscoverDraftState; setField: (field: keyof DiscoverDraftState, value: string) => void; error: string | null }) {
  return <div className="flex flex-col gap-5"><div className="grid grid-cols-2 gap-3"><FormField id="discover-budget-min" label="Minimum"><div className="relative"><span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-body-small text-muted-foreground">RM</span><Input id="discover-budget-min" className="pl-11" type="number" inputMode="decimal" min="0" max={MAX_PRICE} value={draft.budgetMin} onChange={(event) => setField('budgetMin', event.target.value)} /></div></FormField><FormField id="discover-budget-max" label="Maximum"><div className="relative"><span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-body-small text-muted-foreground">RM</span><Input id="discover-budget-max" className="pl-11" type="number" inputMode="decimal" min="0" max={MAX_PRICE} value={draft.budgetMax} onChange={(event) => setField('budgetMax', event.target.value)} /></div></FormField></div>{error && <p role="alert" className="text-body-small text-destructive">{error}</p>}<p className="text-body-small text-muted-foreground">This amount is shown as the expected cost per person. Free activities can use RM0–RM0.</p></div>
}

function LocationStep({ draft, setField, error }: { draft: DiscoverDraftState; setField: (field: keyof DiscoverDraftState, value: string) => void; error: string | null }) {
  const { venues, status, error: searchError, search } = useVenueMapSearch({ initialLocation: draft.locationText, initialSportId: draft.sportId })
  const [selectedVenueId, setSelectedVenueId] = useState('')

  const selectVenue = (venueId: string) => {
    const venue = venues.find(({ id }) => id === venueId)
    setSelectedVenueId(venueId)
    if (venue) setField('locationText', venue.name)
  }

  return <div className="flex flex-col gap-5"><FormField id="discover-location" label="Search or enter a location" hint={`${draft.locationText.length} / ${MAX_LOCATION_TEXT_LENGTH}`} error={error ?? undefined}><div className="flex flex-col gap-2 sm:flex-row"><div className="relative min-w-0 flex-1"><Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="discover-location" maxLength={MAX_LOCATION_TEXT_LENGTH} value={draft.locationText} onChange={(event) => { setField('locationText', event.target.value); setSelectedVenueId('') }} placeholder="e.g. Subang Jaya Sports Centre" autoComplete="street-address" className="pl-9" /></div><Button type="button" variant="outline" onClick={() => void search(draft.locationText)} disabled={!draft.locationText.trim() || status === 'loading'}>{status === 'loading' ? 'Searching…' : 'Search'}</Button></div></FormField><p className="text-body-small text-muted-foreground">Enter an area or venue, then choose a nearby result if one is available.</p>{status === 'searched' && venues.length > 0 && <AppDropdown label="Nearby venues" value={selectedVenueId} onChange={selectVenue} options={venues.map(({ id, name, address }) => ({ value: id, label: address ? `${name} · ${address}` : name }))} />}{searchError && <p role="alert" className="text-body-small text-muted-foreground">{searchError}</p>}<FinalSummary draft={draft} /></div>
}

function SummaryLine({ draft }: { draft: DiscoverDraftState }) {
  if (!draft.date || !draft.startAt || !draft.endAt) return null
  return <p className="text-body-small text-muted-foreground">{sportName(draft.sportId)} · {formatPlanDate(draft.date)} · {formatTime(draft.startAt)}–{formatTime(draft.endAt)}</p>
}

function FinalSummary({ draft }: { draft: DiscoverDraftState }) {
  return <Card className="border-border bg-surface-subtle"><CardContent className="grid gap-2 p-4 text-body-small sm:grid-cols-2"><span className="text-title text-card-foreground sm:col-span-2">{sportName(draft.sportId)}</span><span>{draft.date ? formatPlanDate(draft.date) : 'Date not set'}</span><span>{draft.startAt && draft.endAt ? `${formatTime(draft.startAt)}–${formatTime(draft.endAt)}` : 'Time not set'}</span><span>{draft.minPlayers}–{draft.maxPlayers} players</span><span>RM{draft.budgetMin}–RM{draft.budgetMax} / person</span><span className="text-muted-foreground sm:col-span-2">{draft.locationText || 'Location not set'}</span></CardContent></Card>
}

function CreationConfirmation({ draft, onClose }: { draft: DiscoverDraftState; onClose: () => void }) {
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Discover created</DialogTitle><DialogDescription>{sportName(draft.sportId)} is ready for people to discover.</DialogDescription></DialogHeader><Button onClick={onClose}>Done</Button></DialogContent></Dialog>
}
