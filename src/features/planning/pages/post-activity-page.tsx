import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AppDropdown } from '@/components/ui/AppDropdown'
import { Input } from '@/components/ui/input'
import { SPORTS } from '@/constants/sports'
import { ROUTES } from '@/routes/routes'
import type { SportId } from '@/types/sports-profile'

const STEPS = ['Sport', 'Time', 'Budget', 'Venue'] as const

export function PostActivityPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [sportId, setSportId] = useState<SportId>('badminton')
  const [date, setDate] = useState('')
  const [budget, setBudget] = useState('')
  const [venue, setVenue] = useState('')
  const isLastStep = step === STEPS.length - 1
  const canContinue = [Boolean(sportId), Boolean(date), Boolean(budget), Boolean(venue.trim())][step]

  return (
    <>
      <AppHeader title="Post an activity" subtitle="Create a public session people can join." size="wide" showBack />
      <PageContainer size="narrow">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-4 gap-2">
            {STEPS.map((label, index) => <div key={label} className="flex flex-col gap-2"><span className={`h-1 rounded-full ${index <= step ? 'bg-primary' : 'bg-muted'}`} /><span className={`text-caption ${index === step ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span></div>)}
          </div>
          <Card><CardContent className="flex flex-col gap-5">
            {step === 0 && <AppDropdown label="What sport?" value={sportId} onChange={(value) => setSportId(value as SportId)} options={SPORTS.map(({ id, name }) => ({ value: id, label: name }))} />}
            {step === 1 && <label className="flex flex-col gap-2 text-body-small">When are you playing?<Input type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} /></label>}
            {step === 2 && <label className="flex flex-col gap-2 text-body-small">Budget per person (RM)<Input type="number" min="0" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="e.g. 20" /></label>}
            {step === 3 && <label className="flex flex-col gap-2 text-body-small">Where will you play?<Input value={venue} onChange={(event) => setVenue(event.target.value)} placeholder="e.g. KL Sports City" /></label>}
            <div className="flex justify-between gap-3"><Button variant="outline" onClick={() => step === 0 ? navigate(ROUTES.discover) : setStep((current) => current - 1)}>{step === 0 ? 'Cancel' : 'Back'}</Button><Button disabled={!canContinue} onClick={() => isLastStep ? navigate(ROUTES.discover) : setStep((current) => current + 1)}>{isLastStep ? 'Post activity' : 'Continue'}</Button></div>
          </CardContent></Card>
        </div>
      </PageContainer>
    </>
  )
}
