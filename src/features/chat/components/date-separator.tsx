/** "Today" / "Yesterday" / "Sep 4" above the first message of each day. */
export function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span aria-hidden className="h-px flex-1 bg-border" />
      <span className="text-caption text-muted-foreground uppercase">
        {label}
      </span>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  )
}
