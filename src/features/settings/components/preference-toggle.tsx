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
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <label htmlFor={id} className="text-title text-card-foreground">
          {label}
        </label>
        {description && (
          <span className="text-body-small text-muted-foreground">
            {description}
          </span>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        className="mt-1 shrink-0"
      />
    </div>
  )
}
