import { ChevronLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * Full-screen form shell for editing flows: back/cancel header, scrolling
 * content and a save action.
 *
 * These routes stay outside `AppShell` on purpose — an edit screen is a
 * focused task with an explicit Save/Cancel, so the navigation is deliberately
 * out of the way at every width.
 *
 * On a phone the save bar is sticky above the home indicator. From `md` the
 * content sits in a readable column and the actions move into the header,
 * where a desktop expects them, rather than a full-width bar pinned to the
 * bottom of a 900px-tall window.
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
    <div className="flex min-h-dvh flex-col bg-background pl-safe-left pr-safe-right">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 px-gutter pt-safe-top pb-4 backdrop-blur-xl md:pb-5">
        <div className="mx-auto flex w-full max-w-default items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Cancel"
            onClick={onCancel}
            className="-ml-2 shrink-0"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="flex min-w-0 flex-1 flex-col">
            <h1 className="truncate text-heading-2 text-foreground">{title}</h1>
            {subtitle && (
              <p className="truncate text-body-small text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={saveDisabled}>
              {saveLabel}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-default flex-1 animate-in flex-col gap-8 px-gutter py-6 duration-200 ease-out fade-in-0 slide-in-from-bottom-1 md:gap-10 md:py-8">
        {children}
        {(error ?? hint) && (
          <p
            role={error ? 'alert' : undefined}
            className={
              error
                ? 'hidden text-body-small text-destructive md:block'
                : 'hidden text-body-small text-muted-foreground md:block'
            }
          >
            {error ?? hint}
          </p>
        )}
      </main>

      <footer className="sticky bottom-0 border-t border-border bg-background/90 px-gutter pt-4 pb-safe-bottom backdrop-blur-xl md:hidden">
        <div className="mx-auto flex w-full max-w-default flex-col gap-3">
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
        </div>
      </footer>
    </div>
  )
}
