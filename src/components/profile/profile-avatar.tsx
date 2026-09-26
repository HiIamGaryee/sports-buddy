import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/initials'
import { cn } from '@/lib/utils'

/**
 * THE owner's profile avatar, shared by `/profile` and `/profile/edit` so the
 * two cannot drift: same size, same image boundary, same initials fallback.
 */
export function ProfileAvatar({
  photoUrl,
  displayName,
  email,
  className,
}: {
  photoUrl: string | null
  displayName: string
  email: string
  className?: string
}) {
  return (
    <Avatar className={cn('size-24 md:size-32', className)}>
      {photoUrl && <AvatarImage src={photoUrl} alt={displayName} />}
      <AvatarFallback className="text-heading-1">
        {getInitials(displayName, email)}
      </AvatarFallback>
    </Avatar>
  )
}
