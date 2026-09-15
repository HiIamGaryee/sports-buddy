import { useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AppDropdown } from '@/components/ui/AppDropdown'
import { Input } from '@/components/ui/input'
import { SPORTS } from '@/constants/sports'
import type { ParticipantRule } from '@/types/discover-item'

const RULE_MODES = [
  { value: 'exact', label: 'Specific group sizes' },
  { value: 'max', label: 'Any group up to a maximum' },
] as const

const SIZE_OPTIONS = [2, 3, 4, 5, 6, 8, 10].map((size) => ({
  value: String(size),
  label: `${size} people`,
}))

const DEFAULT_RULES: Record<string, ParticipantRule> = {
  Badminton: { mode: 'exact', sizes: [2, 4] },
  Climbing: { mode: 'max', min: 2, max: 8 },
}

export function AddDiscoverDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [activity, setActivity] = useState(SPORTS[0]?.name ?? '')
  const [location, setLocation] = useState('')
  const [venue, setVenue] = useState('')
  const [budget, setBudget] = useState('')
  const [skillLevel, setSkillLevel] = useState('')
  const [buddyType, setBuddyType] = useState('')
  const [mode, setMode] = useState<ParticipantRule['mode']>('exact')
  const [sizes, setSizes] = useState<number[]>([2])
  const [min, setMin] = useState('2')
  const [max, setMax] = useState('8')
  const [saved, setSaved] = useState(false)

  const selectActivity = (value: string) => {
    setActivity(value)
    const rule = DEFAULT_RULES[value]
    if (!rule) return
    setMode(rule.mode)
    if (rule.mode === 'exact') setSizes(rule.sizes)
    if (rule.mode === 'max') {
      setMin(String(rule.min))
      setMax(String(rule.max))
    }
  }

  const toggleSize = (size: number) => {
    setSizes((current) => current.includes(size)
      ? current.filter((value) => value !== size)
      : [...current, size].sort((a, b) => a - b))
  }

  const save = () => {
    setSaved(true)
  }

  const close = (nextOpen: boolean) => {
    if (!nextOpen) setSaved(false)
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{saved ? 'Discover post ready' : 'Add new discover'}</DialogTitle>
          <DialogDescription>
            {saved ? 'Players will see exactly how many people this activity supports.' : 'Tell people what you want to play and how many can join.'}
          </DialogDescription>
        </DialogHeader>

        {saved ? (
          <div className="rounded-xl border border-primary/25 bg-primary/8 p-4 text-body text-foreground">
            Your {activity} post is ready with its participant limit.
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <AppDropdown
              label="Activity"
              value={activity}
              onChange={selectActivity}
              options={SPORTS.map(({ name }) => ({ value: name, label: name }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-body-small text-foreground">Location<Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. Puchong" /></label>
              <label className="flex flex-col gap-1.5 text-body-small text-foreground">Venue or place<Input value={venue} onChange={(event) => setVenue(event.target.value)} placeholder="e.g. TPP5 Badminton Court" /></label>
              <label className="flex flex-col gap-1.5 text-body-small text-foreground">Budget<Input value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="e.g. RM20–40 / activity" /></label>
              <label className="flex flex-col gap-1.5 text-body-small text-foreground">Skill level<Input value={skillLevel} onChange={(event) => setSkillLevel(event.target.value)} placeholder="e.g. Casual" /></label>
              <label className="flex flex-col gap-1.5 text-body-small text-foreground sm:col-span-2">Looking for<Input value={buddyType} onChange={(event) => setBuddyType(event.target.value)} placeholder="e.g. Casual sports buddy" /></label>
            </div>
            <AppDropdown
              label="Group size rule"
              value={mode}
              onChange={(value) => setMode(value as ParticipantRule['mode'])}
              options={RULE_MODES}
            />

            {mode === 'exact' ? (
              <div className="flex flex-col gap-2">
                <span className="text-body-small text-foreground">Allowed total players</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SIZE_OPTIONS.map(({ value, label }) => {
                    const size = Number(value)
                    const selected = sizes.includes(size)
                    return <Button key={value} type="button" variant={selected ? 'default' : 'outline'} onClick={() => toggleSize(size)} aria-pressed={selected}>{label}</Button>
                  })}
                </div>
                <p className="text-body-small text-muted-foreground">Choose every valid total. Example: badminton can be 2 or 4, but not 5.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-body-small text-foreground">Minimum players<Input type="number" min="1" value={min} onChange={(event) => setMin(event.target.value)} /></label>
                <label className="flex flex-col gap-1.5 text-body-small text-foreground">Maximum players<Input type="number" min={min} value={max} onChange={(event) => setMax(event.target.value)} /></label>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {saved ? <Button onClick={() => close(false)}>Done</Button> : <Button onClick={save} disabled={!location.trim() || !venue.trim() || (mode === 'exact' ? sizes.length === 0 : Number(min) < 1 || Number(max) < Number(min))}>Create discover</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
