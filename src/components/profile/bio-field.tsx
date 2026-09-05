import { FormField } from '@/components/common/form-field'
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
    <FormField
      id={id}
      label="Short bio"
      optional
      hint={`${value.length} / ${MAX_BIO_LENGTH}`}
    >
      <Textarea
        id={id}
        value={value}
        maxLength={MAX_BIO_LENGTH}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Tell people what you enjoy about playing."
      />
    </FormField>
  )
}
