import { useEffect, useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { SettingsRow } from '@/features/settings/components/settings-row'
import { useSafety } from '@/hooks/use-safety'
import { getInitials } from '@/lib/initials'
import { discoverService } from '@/services/discover/discover-service'
import type { DiscoveryProfile } from '@/types/discovery-profile'

interface ProfilesState {
  key: string
  profiles: DiscoveryProfile[]
}

/**
 * The only way back from a block. A blocked person is hidden from Discover and
 * Messages, so their profile can no longer be reached to undo it there.
 *
 * Names come from ONE batched `publicProfiles` read, never `users/{uid}`. A
 * buddy who has since turned Discoverable off has no projection, so they are
 * listed generically rather than dropped — otherwise they could never be
 * unblocked.
 */
export function BlockedUsersList() {
  const { blockedIds, isLoading, unblockUser } = useSafety()
  const ids = [...blockedIds].sort()
  // Stable identity for the batch read: user ids never contain a comma.
  const idsKey = ids.join(',')

  const [profileState, setProfileState] = useState<ProfilesState>({
    key: '',
    profiles: [],
  })
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!idsKey) return
    let active = true
    discoverService
      .getProfiles(idsKey.split(','))
      .then((profiles) => {
        if (active) setProfileState({ key: idsKey, profiles })
      })
      .catch(() => {
        // Names are a nicety; the list and the Unblock action still work.
        if (active) setProfileState({ key: idsKey, profiles: [] })
      })
    return () => {
      active = false
    }
  }, [idsKey])

  const byId = new Map(
    profileState.profiles.map((profile) => [profile.userId, profile]),
  )

  const unblock = async (userId: string) => {
    setPendingId(userId)
    setError('')
    try {
      await unblockUser(userId)
    } catch {
      setError("We couldn't unblock this user. Please try again.")
    } finally {
      setPendingId(null)
    }
  }

  const description = isLoading
    ? 'Loading…'
    : ids.length === 0
      ? "You haven't blocked anyone."
      : "They can't find you, message you or plan with you. Unblocking restores an existing connection."

  return (
    <div className="flex flex-col gap-3">
      <SettingsRow label="Blocked users" description={description} />

      {ids.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Blocked users">
          {ids.map((id) => {
            const profile = byId.get(id)
            const name = profile?.displayName ?? 'Sports buddy'
            return (
              <li key={id} className="flex items-center gap-3">
                <Avatar className="size-9 shrink-0">
                  {profile?.photoUrl && (
                    <AvatarImage src={profile.photoUrl} alt="" />
                  )}
                  <AvatarFallback className="text-label">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-body text-card-foreground">
                  {name}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pendingId !== null}
                  aria-label={`Unblock ${name}`}
                  onClick={() => void unblock(id)}
                >
                  {pendingId === id ? 'Unblocking…' : 'Unblock'}
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-body-small text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
