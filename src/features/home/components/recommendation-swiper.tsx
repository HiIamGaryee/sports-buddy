import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { useRef, useState } from 'react'

import badmintonImage from '@/assets/recommend-badminton.jpeg'
import climbImage from '@/assets/recommend-climb.jpeg'
import tennisImage from '@/assets/recommend-tennis.jpg'
import recommendations from '@/data/recommendations.json'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const recommendationImages = {
  'recommend-badminton': badmintonImage,
  'recommend-climb': climbImage,
  'recommend-tennis': tennisImage,
} as const

export function RecommendationSwiper() {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const goTo = (index: number) => {
    const viewport = viewportRef.current
    if (!viewport) return
    viewport.scrollTo({ left: index * viewport.clientWidth, behavior: 'smooth' })
    setActiveIndex(index)
  }

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-labelledby="recommendations-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="recommendations-title" className="text-heading-3 text-foreground">Recommended for you</h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Previous recommendation" disabled={activeIndex === 0} onClick={() => goTo(activeIndex - 1)}><ChevronLeft className="size-4" /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Next recommendation" disabled={activeIndex === recommendations.length - 1} onClick={() => goTo(activeIndex + 1)}><ChevronRight className="size-4" /></Button>
        </div>
      </div>
      <div
        ref={viewportRef}
        role="region"
        aria-label="Recommended activity places"
        onScroll={(event) => setActiveIndex(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-2xl scrollbar-none"
      >
        {recommendations.map((recommendation) => (
          <article key={recommendation.id} className="relative min-w-full snap-center overflow-hidden rounded-2xl border border-border bg-card">
            <img src={recommendationImages[recommendation.image as keyof typeof recommendationImages]} alt="" className="h-52 w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5 text-white">
              <Badge className="w-fit border-white/30 bg-black/25 text-white">{recommendation.sport}</Badge>
              <h3 className="text-heading-2">{recommendation.title}</h3>
              <p className="flex items-center gap-1.5 text-body-small text-white/80"><MapPin className="size-3.5" />{recommendation.location}</p>
              <p className="text-body-small text-white/80">{recommendation.description}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="flex justify-center gap-1.5" aria-label="Recommendation slides">
        {recommendations.map((recommendation, index) => (
          <button key={recommendation.id} type="button" aria-label={`Show recommendation ${index + 1}`} aria-current={activeIndex === index} onClick={() => goTo(index)} className={`h-1.5 rounded-full transition-all ${activeIndex === index ? 'w-6 bg-primary' : 'w-1.5 bg-muted'}`} />
        ))}
      </div>
    </section>
  )
}
