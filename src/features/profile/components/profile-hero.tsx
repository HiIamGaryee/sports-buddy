import { Badge } from '@/components/ui/badge'
import { GenderLabel } from '@/components/profile/gender-label'
import { ProfileAvatar } from '@/components/profile/profile-avatar'
import { formatRadius, getAreaName } from '@/lib/profile-format'
import type { SportsProfile } from '@/types/user'

/** Avatar, name, approximate area. No email, no online status, no counts. */
export function ProfileHero({
  profile,
  isReadyToPlay,
}: {
  profile: SportsProfile
  isReadyToPlay: boolean
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-5 md:gap-6">
        <ProfileAvatar
          photoUrl={profile.photoUrl}
          displayName={profile.displayName}
          email={profile.email}
        />
        <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-heading-1 text-foreground md:text-display">
            {profile.displayName}
          </span>
          <span className="text-body-small text-muted-foreground">
            {getAreaName(profile.area)} · within{' '}
            {formatRadius(profile.radiusKm)}
          </span>
          <GenderLabel gender={profile.gender} />
          {isReadyToPlay && (
            <Badge className="mt-1 w-fit">Ready to play</Badge>
          )}
        </div>
      </div>
      {profile.bio && (
        <p className="text-body text-foreground">{profile.bio}</p>
      )}
    </div>
  )
}
