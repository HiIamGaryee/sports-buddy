import { Camera } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { ProfileAvatar } from '@/components/profile/profile-avatar'
import { Button } from '@/components/ui/button'
import { AVATAR_FILE_TYPES } from '@/constants/profile-options'
import { useAuth } from '@/hooks/use-auth'
import {
  getAvatarFileError,
  isAvatarUploadConfigured,
} from '@/services/profile/avatar-upload'
import { getPhotoUrlAfterRemove } from '@/services/profile/profile-service'
import type { SportsProfile } from '@/types/user'

/** A pending photo edit plus, for a picked file, its local preview URL. */
export type PhotoDraft = { file: File; previewUrl: string } | { url: string | null }

/**
 * The avatar as a form field. Picking a file only PREVIEWS it; nothing is
 * uploaded until the form's Save, so Cancel leaves the saved photo untouched.
 * `value` is `null` while the saved photo is unchanged.
 */
export function ProfilePhotoField({
  profile,
  value,
  onChange,
  disabled = false,
}: {
  profile: SportsProfile
  value: PhotoDraft | null
  onChange: (value: PhotoDraft | null) => void
  disabled?: boolean
}) {
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<string | null>(null)
  const [error, setError] = useState('')
  const [isChecking, setIsChecking] = useState(false)

  // Revoke the last preview when the field goes away (save, cancel, leave).
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    },
    [],
  )

  const shownUrl = value
    ? 'file' in value
      ? value.previewUrl
      : value.url
    : profile.photoUrl
  const removeTarget = getPhotoUrlAfterRemove(shownUrl, user?.photoUrl ?? null)
  const isLocked = disabled || isChecking

  /** Every change goes through here, so a replaced preview is always revoked. */
  function commit(next: PhotoDraft | null) {
    const nextPreview = next && 'file' in next ? next.previewUrl : null
    if (previewRef.current && previewRef.current !== nextPreview) {
      URL.revokeObjectURL(previewRef.current)
    }
    previewRef.current = nextPreview
    onChange(next)
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset so picking the same file again still fires a change.
    event.target.value = ''
    if (!file) return

    setError('')
    setIsChecking(true)
    const problem = await getAvatarFileError(file)
    setIsChecking(false)
    if (problem) {
      setError(problem)
      return
    }
    commit({ file, previewUrl: URL.createObjectURL(file) })
  }

  function handleRemove() {
    setError('')
    // Landing back on the saved photo is not a change at all.
    commit(removeTarget === profile.photoUrl ? null : { url: removeTarget })
  }

  const openPicker = () => inputRef.current?.click()
  const avatar = (
    <ProfileAvatar
      photoUrl={shownUrl}
      displayName={profile.displayName}
      email={profile.email}
    />
  )

  return (
    <div className="flex items-center gap-5 md:gap-6">
      {isAvatarUploadConfigured ? (
        <button
          type="button"
          disabled={isLocked}
          onClick={openPicker}
          aria-label="Change photo"
          className="group pressable transition-ui relative shrink-0 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
        >
          {avatar}
          <span
            aria-hidden
            className="transition-ui absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-surface-overlay text-caption text-foreground opacity-0 backdrop-blur-xl group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <Camera className="size-5" />
            Change photo
          </span>
          <span
            aria-hidden
            className="absolute right-0 bottom-0 flex size-9 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm"
          >
            <Camera className="size-4" />
          </span>
        </button>
      ) : (
        <div className="shrink-0">{avatar}</div>
      )}

      <div className="flex min-w-0 flex-col items-start gap-2">
        <div className="flex flex-wrap gap-2">
          {isAvatarUploadConfigured && (
            <Button
              type="button"
              variant="outline"
              disabled={isLocked}
              onClick={openPicker}
            >
              <Camera />
              Change photo
            </Button>
          )}
          {(shownUrl || removeTarget) && (
            <Button
              type="button"
              variant="ghost"
              disabled={isLocked}
              onClick={handleRemove}
            >
              {removeTarget ? 'Use Google photo' : 'Remove photo'}
            </Button>
          )}
        </div>
        <span className="text-body-small text-muted-foreground">
          {value
            ? 'New photo — saved when you save your profile.'
            : 'JPG, PNG or WebP, up to 5 MB.'}
        </span>
        {error && (
          <p role="alert" className="text-body-small text-destructive">
            {error}
          </p>
        )}
      </div>

      {isAvatarUploadConfigured && (
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_FILE_TYPES.join(',')}
          aria-label="Profile photo file"
          tabIndex={-1}
          className="hidden"
          onChange={(event) => void handleFile(event)}
        />
      )}
    </div>
  )
}
