/**
 * THE labelled form control. Eight screens had written their own
 * `div > label.text-label > control` block — two of them with a different gap,
 * two with their own error paragraph — so this is the one place a form row's
 * label typography, spacing and error wiring is decided.
 *
 * The error is `role="alert"` and sits after the control, so a screen reader
 * announces it when it appears rather than only when the field is re-read.
 */
export function FormField({
  id,
  label,
  optional = false,
  error,
  hint,
  action,
  children,
}: {
  id: string
  label: string
  /** Appends a muted "(optional)" instead of every caller writing one. */
  optional?: boolean
  error?: string
  /** Right-aligned supporting text under the control, e.g. a character count. */
  hint?: React.ReactNode
  /** A control on the label's own line, e.g. "Forgot password?". */
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-label text-foreground">
          {label}
          {optional && <span className="text-muted-foreground"> (optional)</span>}
        </label>
        {action}
      </div>
      {children}
      {error && (
        <p role="alert" className="text-body-small text-destructive">
          {error}
        </p>
      )}
      {hint && (
        <span className="self-end text-caption text-muted-foreground">
          {hint}
        </span>
      )}
    </div>
  )
}
