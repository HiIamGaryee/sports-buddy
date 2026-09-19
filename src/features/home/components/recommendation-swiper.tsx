import { MapPin } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import badmintonImage from '@/assets/recommend-badminton.jpeg'
import climbImage from '@/assets/recommend-climb.jpeg'
import tennisImage from '@/assets/recommend-tennis.jpg'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecommendations } from '@/features/home/use-recommendations'
import { getSportName } from '@/lib/profile-format'

const recommendationImages = {
  badminton: badmintonImage,
  climbing: climbImage,
  tennis: tennisImage,
} as const

export function RecommendationSwiper() {
  const { venues, isLoading, error, retry, sportId } = useRecommendations()
  const viewportRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const goTo = useCallback((index: number) => {
    const viewport = viewportRef.current
    if (!viewport) return
    if (venues.length === 0) return
    const nextIndex = (index + venues.length) % venues.length
    viewport.scrollTo({ left: nextIndex * viewport.clientWidth, behavior: 'smooth' })
    setActiveIndex(nextIndex)
  }, [venues.length])

  useEffect(() => {
    const timer = window.setInterval(() => goTo(activeIndex + 1), 5_000)
    return () => window.clearInterval(timer)
  }, [activeIndex, goTo])

  if (isLoading) {
    return (
      <section className="flex min-w-0 flex-col gap-3" aria-labelledby="recommendations-title">
        <h2 id="recommendations-title" className="text-heading-3 text-foreground">Recommended for you</h2>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </section>
    )
  }

  if (error) {
    return (
      <section className="flex min-w-0 flex-col gap-3" aria-labelledby="recommendations-title">
        <h2 id="recommendations-title" className="text-heading-3 text-foreground">Recommended for you</h2>
        <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-5 text-center">
          <p role="alert" className="text-body-small text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={retry}>Try again</Button>
        </div>
      </section>
    )
  }

  if (venues.length === 0) {
    return (
      <section className="flex min-w-0 flex-col gap-3" aria-labelledby="recommendations-title">
        <h2 id="recommendations-title" className="text-heading-3 text-foreground">Recommended for you</h2>
        <p className="rounded-2xl border border-border bg-card p-5 text-body-small text-muted-foreground">
          {sportId && 'Add an area to your profile to discover nearby venues.'}
          {!sportId && 'Add a sport and area to your profile to discover nearby venues.'}
        </p>
      </section>
    )
  }

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-labelledby="recommendations-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="recommendations-title" className="text-heading-3 text-foreground">Recommended for you</h2>
      </div>
      <div
        ref={viewportRef}
        role="region"
        aria-label="Recommended activity places"
        onScroll={(event) => setActiveIndex(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-2xl scrollbar-none"
      >
        {venues.map((venue) => (
          <article key={venue.id} className="relative min-w-full snap-center overflow-hidden rounded-2xl border border-border bg-card">
            <img src={recommendationImages[sportId as keyof typeof recommendationImages] ?? badmintonImage} alt="" className="h-52 w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5 text-white">
              <Badge className="w-fit border-white/30 bg-black/25 text-white">{sportId ? getSportName(sportId) : 'Sports venue'}</Badge>
              <h3 className="text-heading-2">{venue.name}</h3>
              <p className="flex items-center gap-1.5 text-body-small text-white/80"><MapPin className="size-3.5" />{venue.address}</p>
              <p className="text-body-small text-white/80">Nearby venue for your next session.</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
