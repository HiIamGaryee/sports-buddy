import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { getInitials } from '@/lib/initials'
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
        <Avatar className="size-24 md:size-32">
          {profile.photoUrl && (
            <AvatarImage src={profile.photoUrl} alt={profile.displayName} />
          )}
          <AvatarFallback className="text-heading-1">
            {getInitials(profile.displayName, profile.email)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-heading-1 text-foreground md:text-display">
            {profile.displayName}
          </span>
          <span className="text-body-small text-muted-foreground">
            {getAreaName(profile.area)} · within{' '}
            {formatRadius(profile.radiusKm)}
          </span>
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
