import { Copy, Download, MessageCircle, Share2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { safeLinkUrl } from '@/lib/safe-url'
import type { MonthlyRecap } from '@/types/recap'

/**
 * Where a recap can go.
 *
 * WhatsApp and Facebook take a link, so they get a real one-tap web intent.
 * Instagram and RedNote (小红书) have no such thing — neither accepts a posted
 * link from the web — so for those the honest answer is the IMAGE: save the
 * card and attach it in the app. Saying "share to Instagram" and opening
 * nothing would be a button that lies.
 *
 * Every URL is built here from encoded parts and then passed through
 * `safeLinkUrl`, so nothing reaches an `href` unchecked.
 */
export function RecapShareTargets({
  recap,
  memberName,
  onSaveImage,
  isPreparing,
}: {
  recap: MonthlyRecap
  memberName: string
  /** Renders the card and hands the viewer a PNG. */
  onSaveImage: () => void
  isPreparing: boolean
}) {
  const [copied, setCopied] = useState(false)

  const summary = recap.topSport
    ? `${memberName} played ${recap.totalSessions} sessions in ${recap.monthLabel} on Sports Buddy.`
    : `${memberName}'s ${recap.monthLabel} on Sports Buddy.`
  // The app's own public page — the one link that means anything to a reader.
  const link = 'https://sportbuddy-4d596.web.app'
  const message = `${summary} ${link}`

  const whatsapp = safeLinkUrl(`https://wa.me/?text=${encodeURIComponent(message)}`)
  const facebook = safeLinkUrl(
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}&quote=${encodeURIComponent(summary)}`,
  )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-label text-foreground">Share your recap</span>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" disabled={isPreparing} onClick={onSaveImage}>
          <Download className="size-4" />
          {isPreparing ? 'Preparing…' : 'Save image'}
        </Button>

        {whatsapp && (
          <Button variant="outline" asChild>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4" />
              WhatsApp
            </a>
          </Button>
        )}

        {facebook && (
          <Button variant="outline" asChild>
            <a href={facebook} target="_blank" rel="noopener noreferrer">
              <Share2 className="size-4" />
              Facebook
            </a>
          </Button>
        )}

        <Button variant="outline" onClick={() => void copy()}>
          <Copy className="size-4" />
          {copied ? 'Link copied' : 'Copy link'}
        </Button>
      </div>

      <p className="text-caption text-muted-foreground">
        For Instagram or RedNote, save the image and attach it in the app — neither accepts a
        post from a web link.
      </p>
    </div>
  )
}
