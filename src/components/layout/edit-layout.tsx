import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { StickyActionBar } from '@/components/layout/sticky-action-bar'
import { Button } from '@/components/ui/button'

/**
 * Editing keeps its focused actions, but lives inside the shared app shell so
 * the desktop sidebar, header width and responsive gutters match every main
 * route. On phones the save controls remain in the safe-area-aware sticky bar.
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
    <>
      <AppHeader
        title={title}
        subtitle={subtitle}
        size="wide"
        variant="detail"
        onBack={onCancel}
        action={
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={saveDisabled}>
              {saveLabel}
            </Button>
          </div>
        }
      />
      <PageContainer size="wide" className="gap-8 md:gap-10">
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
      </PageContainer>

      <StickyActionBar className="md:hidden">
        {error ? (
          <p role="alert" className="text-body-small text-destructive">
            {error}
          </p>
        ) : (
          hint && <p className="text-body-small text-muted-foreground">{hint}</p>
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
      </StickyActionBar>
    </>
  )
}
