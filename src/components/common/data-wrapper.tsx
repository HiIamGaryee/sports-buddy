import type { CSSProperties, ReactNode } from 'react'

import { cn } from '@/lib/utils'

const LOADING_LETTERS = ['L', 'O', 'A', 'D', 'I', 'N', 'G', '.', '.'] as const

type LoadingLetterStyle = CSSProperties & { '--loading-index': number }

/** Shared async-state wrapper for API-backed UI. */
export function DataWrapper({
  isLoading,
  children,
  loadingLabel = 'Loading',
  className,
}: {
  isLoading: boolean
  children: ReactNode
  loadingLabel?: string
  className?: string
}) {
  if (!isLoading) return <>{children}</>

  return (
    <div
      role="status"
      aria-label={loadingLabel}
      className={cn('flex min-h-32 items-center justify-center text-foreground', className)}
    >
      <span aria-hidden className="flex text-xl leading-none">
        {LOADING_LETTERS.map((letter, index) => (
          <span
            key={`${letter}-${index}`}
            className="animate-loading-letter inline-block"
            style={{ '--loading-index': index + 1 } as LoadingLetterStyle}
          >
            {letter}
          </span>
        ))}
      </span>
      <span className="sr-only">{loadingLabel}</span>
    </div>
  )
}
