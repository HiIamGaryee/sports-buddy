import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

import { cn } from '@/lib/utils'

const PULL_TRIGGER_PX = 64
const PULL_MAX_PX = 96
const PULL_RESISTANCE = 0.5
const MIN_SPIN_MS = 600

/** True when nothing above the element has been scrolled, window included. */
function isScrolledToTop(element: HTMLElement) {
  for (let node = element.parentElement; node; node = node.parentElement) {
    if (node.scrollTop > 0) return false
  }
  return window.scrollY <= 0
}

/**
 * Touch pull-to-refresh for list screens. It re-runs the page's OWN refresh
 * and never fetches anything itself. Only touch starts a pull, so a mouse
 * keeps using the page's Refresh buttons.
 */
export function PullToRefresh({
  onRefresh,
  className,
  children,
}: {
  onRefresh: () => unknown
  className?: string
  children: React.ReactNode
}) {
  const [startY, setStartY] = useState<number | null>(null)
  const [pull, setPull] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    if (isRefreshing || !touch || !isScrolledToTop(event.currentTarget)) return
    setStartY(touch.clientY)
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    if (startY === null || !touch) return
    const delta = touch.clientY - startY
    setPull(delta > 0 ? Math.min(delta * PULL_RESISTANCE, PULL_MAX_PX) : 0)
  }

  const handleTouchEnd = async () => {
    if (startY === null) return
    setStartY(null)
    if (pull < PULL_TRIGGER_PX) {
      setPull(0)
      return
    }

    setIsRefreshing(true)
    setPull(PULL_TRIGGER_PX)
    await Promise.all([
      Promise.resolve()
        .then(onRefresh)
        .catch(() => undefined),
      new Promise((resolve) => window.setTimeout(resolve, MIN_SPIN_MS)),
    ])
    setIsRefreshing(false)
    setPull(0)
  }

  return (
    <div
      className="flex flex-1 flex-col"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => void handleTouchEnd()}
      onTouchCancel={() => void handleTouchEnd()}
    >
      <div
        aria-hidden="true"
        className={cn(
          'flex items-end justify-center overflow-hidden text-muted-foreground',
          startY === null && 'transition-ui',
        )}
        style={{ height: pull }}
      >
        <RefreshCw
          className={cn('mb-3 size-5', isRefreshing && 'animate-spin text-primary')}
          style={isRefreshing ? undefined : { transform: `rotate(${pull * 4}deg)` }}
        />
      </div>
      <span role="status" className="sr-only">
        {isRefreshing ? 'Refreshing' : ''}
      </span>
      <div className={cn('flex flex-1 flex-col', className)}>{children}</div>
    </div>
  )
}
