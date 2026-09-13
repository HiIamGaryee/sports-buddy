import type { ReactNode } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function PolicyDialog({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="-m-2 flex items-center justify-between gap-4 rounded-xl p-2 text-left transition-ui hover:bg-surface-subtle focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-title text-card-foreground">{title}</span>
            <span className="text-body-small text-muted-foreground">{description}</span>
          </span>
          <span aria-hidden className="text-xl leading-none text-muted-foreground">›</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(80vh,42rem)] max-w-2xl overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-heading-2">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5 text-body-small leading-relaxed text-muted-foreground">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}
