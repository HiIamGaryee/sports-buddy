import { useState } from 'react'

import { useProfile } from '@/hooks/use-profile'
import type { UserPreferences } from '@/types/preferences'

/**
 * Simple settings persist as soon as they are toggled (one merge write each);
 * multi-field screens use an explicit Save instead.
 */
export function usePreferenceUpdate() {
  const { updatePreferences } = useProfile()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(preferences: UserPreferences) {
    setError('')
    setIsSaving(true)
    try {
      await updatePreferences(preferences)
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "We couldn't update your preferences. Please try again.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  return { save, isSaving, error }
}
