import { ProfileSummary } from '@/components/profile/profile-summary'
import { Card, CardContent } from '@/components/ui/card'
import { toSaveInput, type ProfileDraft } from '@/lib/profile-draft'
import { draftToDiscoveryProfile } from '@/lib/discovery-profile'
import type { AuthUser } from '@/types/auth'

export function PreviewStep({
  draft,
  user,
}: {
  draft: ProfileDraft
  user: AuthUser
}) {
  const preview = draftToDiscoveryProfile(toSaveInput(draft), {
    userId: user.id,
    photoUrl: user.photoUrl,
  })

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-small text-muted-foreground">
        This is the kind of profile other Sports Buddy users will see.
      </p>
      <Card>
        <CardContent>
          <ProfileSummary profile={preview} />
        </CardContent>
      </Card>
      <p className="text-body-small text-muted-foreground">
        You can change any of this later from your profile.
      </p>
    </div>
  )
}
