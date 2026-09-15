import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { FormField } from '@/components/common/form-field'
import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { ChoiceChip } from '@/components/ui/choice-chip'
import { Card, CardContent } from '@/components/ui/card'
import { GENDER_OPTIONS } from '@/types/gender'
import type { Gender } from '@/types/gender'
import { useProfile } from '@/hooks/use-profile'
import { ROUTES } from '@/routes/routes'

export function CompleteGenderPage() {
  const navigate = useNavigate()
  const { completeGender } = useProfile()
  const [gender, setGender] = useState<Gender | null>(null)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const save = async () => {
    if (!gender || isSaving) return
    setError('')
    setIsSaving(true)
    try {
      await completeGender(gender)
      navigate(ROUTES.home, { replace: true })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your gender.')
      setIsSaving(false)
    }
  }

  return (
    <>
      <AppHeader title="Complete your profile" subtitle="One last detail before you continue." size="default" />
      <PageContainer size="default">
        <Card>
          <CardContent className="flex flex-col gap-5">
            <FormField id="complete-gender" label="Gender" error={error || undefined}>
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Gender">
                {GENDER_OPTIONS.map(({ value, label }) => <ChoiceChip key={value} label={label} selection="single" selected={gender === value} onClick={() => setGender(value)} className="w-full rounded-xl" />)}
              </div>
              <p className="text-body-small text-muted-foreground">Gender can&apos;t be changed after account creation.</p>
            </FormField>
            <Button size="lg" disabled={!gender || isSaving} onClick={() => void save()}>{isSaving ? 'Saving…' : 'Continue'}</Button>
          </CardContent>
        </Card>
      </PageContainer>
    </>
  )
}
