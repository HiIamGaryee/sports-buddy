export function OnboardingProgress({
  step,
  total,
}: {
  step: number
  total: number
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label="Onboarding progress"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={total}
        className="h-1 flex-1 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
      <span className="text-caption text-muted-foreground">
        {step} / {total}
      </span>
    </div>
  )
}
