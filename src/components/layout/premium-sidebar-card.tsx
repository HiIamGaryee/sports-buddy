import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import subCtaImage from '@/assets/sub-cta.jpeg'
import diamondIcon from '@/assets/svg/diamond-search-svgrepo-com.svg'
import general from '@/data/general.json'
import { ROUTES } from '@/routes/routes'

const CTA_COPY = general.premium.sidebarCta

export function PremiumSidebarCard() {
  return (
    <Link
      to={ROUTES.paywall}
      className="group relative mx-1 block overflow-hidden rounded-3xl border border-primary/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <img
        src={subCtaImage}
        alt=""
        aria-hidden
        className="absolute inset-0 size-full scale-105 object-cover blur-[1px] transition-ui group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-background/55" aria-hidden />
      <div className="relative flex min-h-44 flex-col items-start justify-end gap-2.5 p-4 text-foreground">
        <span className="flex items-center gap-1.5 text-caption font-semibold tracking-[0.12em] text-primary uppercase">
          <img src={diamondIcon} alt="" aria-hidden className="size-3.5" />
          {CTA_COPY.eyebrow}
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-heading-3 leading-tight">{CTA_COPY.title}</span>
          <span className="line-clamp-2 text-caption leading-snug text-foreground/75">
            {CTA_COPY.description}
          </span>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-label text-primary-foreground shadow-sm">
          {CTA_COPY.actionLabel}
          <ArrowUpRight className="size-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  )
}
