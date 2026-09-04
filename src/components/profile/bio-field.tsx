import { Textarea } from '@/components/ui/textarea'
import { MAX_BIO_LENGTH } from '@/constants/profile-options'

export function BioField({
  value,
  onChange,
  id = 'profile-bio',
}: {
  value: string
  onChange: (value: string) => void
  id?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-label text-foreground">
        Short bio <span className="text-muted-foreground">(optional)</span>
      </label>
      <Textarea
        id={id}
        value={value}
        maxLength={MAX_BIO_LENGTH}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Tell people what you enjoy about playing."
      />
      <span className="self-end text-caption text-muted-foreground">
        {value.length} / {MAX_BIO_LENGTH}
      </span>
    </div>
  )
}
