import femaleIcon from '@/assets/svg/female-signs-svgrepo-com.svg'
import maleIcon from '@/assets/svg/male-man-svgrepo-com.svg'
import { cn } from '@/lib/utils'
import { formatGender, type Gender } from '@/types/gender'

const GENDER_ICONS: Record<Gender, string> = {
  male: maleIcon,
  female: femaleIcon,
}

export function GenderLabel({
  gender,
  className,
}: {
  gender: Gender | null
  className?: string
}) {
  if (!gender) return null

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-body-small text-muted-foreground', className)}>
      <img src={GENDER_ICONS[gender]} alt="" aria-hidden="true" className="size-4 object-contain" />
      {formatGender(gender)}
    </span>
  )
}
