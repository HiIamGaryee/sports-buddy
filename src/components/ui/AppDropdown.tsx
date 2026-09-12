import { Check, ChevronDown } from 'lucide-react'
import { Select as SelectPrimitive } from 'radix-ui'
import { useId } from 'react'

import { cn } from '@/lib/utils'

export type AppDropdownOption = {
  value: string
  label: string
  disabled?: boolean
}

export function AppDropdown({
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  label,
  disabled = false,
  error,
  className,
  id,
  name,
  ariaLabel,
}: {
  value: string
  options: readonly AppDropdownOption[]
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  error?: string
  className?: string
  id?: string
  name?: string
  ariaLabel?: string
}) {
  const generatedId = useId()
  const triggerId = id ?? generatedId
  const errorId = `${triggerId}-error`

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={triggerId} className="text-body-small text-foreground">
          {label}
        </label>
      )}
      <SelectPrimitive.Root
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        name={name}
      >
        <SelectPrimitive.Trigger
          id={triggerId}
          aria-label={ariaLabel ?? label}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'group flex h-11 w-full min-w-0 items-center justify-between rounded-lg border border-input bg-transparent px-3.5 py-2 text-left text-base text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 data-[state=open]:border-ring data-[state=open]:ring-3 data-[state=open]:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30',
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-180" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={6}
            collisionPadding={12}
            className="z-[1100] max-h-70 w-(--radix-select-trigger-width) min-w-32 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg duration-150 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          >
            <SelectPrimitive.Viewport className="max-h-67 overflow-y-auto">
              {options.map(({ value: optionValue, label: optionLabel, disabled: optionDisabled }) => (
                <SelectPrimitive.Item
                  key={optionValue}
                  value={optionValue}
                  disabled={optionDisabled}
                  className="relative flex h-11 cursor-pointer items-center rounded-lg py-2 pr-9 pl-3 text-body text-foreground outline-none select-none data-[highlighted]:bg-surface-subtle data-[state=checked]:bg-primary/14 data-[state=checked]:text-primary data-disabled:pointer-events-none data-disabled:opacity-45"
                >
                  <SelectPrimitive.ItemText>{optionLabel}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-3 inline-flex items-center text-primary">
                    <Check className="size-4" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {error && (
        <p id={errorId} role="alert" className="text-body-small text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
