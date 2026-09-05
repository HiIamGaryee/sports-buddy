import { SettingsRow } from '@/features/settings/components/settings-row'
import { Switch } from '@/components/ui/switch'

export function PreferenceToggle({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <SettingsRow
      label={label}
      description={description}
      htmlFor={id}
      trailing={
        <Switch
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={onChange}
          className="mt-1 shrink-0"
        />
      }
    />
  )
}
