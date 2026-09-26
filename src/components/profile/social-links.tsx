import { ExternalLink } from 'lucide-react'

import { cn } from '@/lib/utils'

const SOCIAL_LINKS = [
  {
    key: 'instagramUsername',
    label: 'Instagram',
    baseUrl: 'https://www.instagram.com/',
  },
  {
    key: 'linkedinUsername',
    label: 'LinkedIn',
    baseUrl: 'https://www.linkedin.com/in/',
  },
] as const

export function SocialLinks({
  instagramUsername,
  linkedinUsername,
  stacked = false,
}: {
  instagramUsername?: string
  linkedinUsername?: string
  stacked?: boolean
}) {
  const usernames = { instagramUsername, linkedinUsername }
  const links = SOCIAL_LINKS.flatMap(({ key, ...link }) => {
    const username = usernames[key]
    return username ? [{ ...link, username }] : []
  })

  if (links.length === 0) return null

  return (
    <div
      className={cn('flex gap-2', stacked ? 'flex-col' : 'flex-wrap')}
      aria-label="Social profiles"
    >
      {links.map(({ label, baseUrl, username }) => (
        <a
          key={label}
          href={`${baseUrl}${encodeURIComponent(username)}`}
          target="_blank"
          rel="noreferrer"
          className={cn(
            'inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 py-2 text-body-small text-muted-foreground transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
            stacked && 'w-full',
          )}
        >
          <ExternalLink aria-hidden className="size-4" />
          <span>{label}</span>
          <span className="text-foreground">@{username}</span>
        </a>
      ))}
    </div>
  )
}
