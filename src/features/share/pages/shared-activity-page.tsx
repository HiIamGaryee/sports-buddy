import { useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'

import logo from '@/assets/logo.png'
import { AppSplash } from '@/components/common/app-splash'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { APP_NAME, APP_TAGLINE_LINES } from '@/constants/app'
import { validDocumentId } from '@/lib/ids'
import { rememberSharedActivity } from '@/routes/return-path'
import { activityPostPath, ROUTES } from '@/routes/routes'
import { useRouteState } from '@/routes/use-route-state'

/**
 * `/activity/:postId` — the address a share link points at, for members and
 * outsiders alike.
 *
 * A signed-in member goes straight to the activity. Anyone else is told what
 * the link is and asked to join; the post id is remembered so sign-up,
 * sign-in and onboarding all end on the activity. Nothing about the post is
 * shown here: reading a post needs an account, so a signed-out visitor learns
 * nothing from a guessed id.
 */
export function SharedActivityPage() {
  const { postId: rawPostId } = useParams<{ postId: string }>()
  const postId = validDocumentId(rawPostId)
  const state = useRouteState()

  // Remember it as soon as we know they are not ready yet — before any
  // redirect — so it survives whatever sign-in path they take.
  useEffect(() => {
    if (postId && (state === 'guest' || state === 'onboarding-required')) {
      rememberSharedActivity(postId)
    }
  }, [postId, state])

  if (!postId) return <Navigate to={ROUTES.home} replace />
  if (state === 'loading') return <AppSplash />
  if (state === 'ready') return <Navigate to={activityPostPath(postId)} replace />
  if (state === 'onboarding-required') {
    return <Navigate to={ROUTES.onboarding} replace />
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-gutter pt-safe-top pb-safe-bottom">
      <Card className="w-full max-w-narrow">
        <CardContent className="flex flex-col items-center gap-5 text-center">
          <img src={logo} alt="" className="size-14 object-contain" />
          <div className="flex flex-col gap-2">
            <span className="text-caption text-muted-foreground uppercase">
              {APP_NAME}
            </span>
            <h1 className="text-heading-2 text-card-foreground">
              You&apos;ve been invited to play
            </h1>
            <p className="text-body text-muted-foreground">
              Someone shared a sports session with you. Create a free account
              or sign in to see the details and join.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2.5">
            <Button size="lg" asChild>
              <Link to={ROUTES.register}>Create an account</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to={ROUTES.login}>I already have an account</Link>
            </Button>
          </div>
          <p className="text-caption text-muted-foreground">
            {APP_TAGLINE_LINES.join(' ')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
