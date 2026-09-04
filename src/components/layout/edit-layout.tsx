import { ChevronLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * Full-screen form shell for editing flows: back/cancel header, scrolling
 * content and a sticky save area that clears the home indicator. No bottom
 * navigation, so the save action is never obscured.
 */
export function EditLayout({
  title,
  subtitle,
  error,
  hint,
  saveLabel,
  saveDisabled,
  onSave,
  onCancel,
  children,
}: {
  title: string
  subtitle?: string
  error?: string
  hint?: string
  saveLabel: string
  saveDisabled?: boolean
  onSave: () => void
  onCancel: () => void
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh justify-center bg-background pl-safe-left pr-safe-right">
      <div className="flex w-full max-w-content flex-col border-border sm:border-x">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/85 px-page pt-safe-top pb-4 backdrop-blur-xl">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Cancel"
            onClick={onCancel}
            className="-ml-2 shrink-0"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-heading-2 text-foreground">{title}</h1>
            {subtitle && (
              <p className="truncate text-body-small text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        </header>

        <main className="flex flex-1 animate-in flex-col gap-8 px-page py-6 duration-200 ease-out fade-in-0 slide-in-from-bottom-1">
          {children}
        </main>

        <footer className="sticky bottom-0 flex flex-col gap-3 border-t border-border bg-background/90 px-page pt-4 pb-safe-bottom backdrop-blur-xl">
          {error ? (
            <p role="alert" className="text-body-small text-destructive">
              {error}
            </p>
          ) : (
            hint && (
              <p className="text-body-small text-muted-foreground">{hint}</p>
            )
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              size="lg"
              onClick={onSave}
              disabled={saveDisabled}
              className="flex-[2]"
            >
              {saveLabel}
            </Button>
          </div>
          <span className="h-2" />
        </footer>
      </div>
    </div>
  )
}
