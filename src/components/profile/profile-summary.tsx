import { SectionHeader } from '@/components/common/section-header'
import { GenderLabel } from '@/components/profile/gender-label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { getInitials } from '@/lib/initials'
import {
  formatAvailability,
  formatBudget,
  getAreaName,
  getIntensityLabel,
  getIntentLabel,
  getSkillLabel,
  getSportName,
} from '@/lib/profile-format'
import type { DiscoveryProfile } from '@/types/discovery-profile'

/**
 * The discovery-safe profile card. It accepts `DiscoveryProfile` only, so it
 * is structurally impossible to render an email or a preference here.
 */
export function ProfileSummary({ profile }: { profile: DiscoveryProfile }) {
  const availability = formatAvailability(profile.availability)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          {profile.photoUrl && (
            <AvatarImage src={profile.photoUrl} alt={profile.displayName} />
          )}
          <AvatarFallback className="text-heading-2">
            {getInitials(profile.displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-heading-2 text-card-foreground">
            {profile.displayName}
          </span>
          <span className="text-body-small text-muted-foreground">
            {getAreaName(profile.area)}
          </span>
          <GenderLabel gender={profile.gender} />
        </div>
      </div>

      {profile.bio && (
        <p className="text-body text-card-foreground">{profile.bio}</p>
      )}

      <SummarySection title="Sports">
        <div className="flex flex-col gap-2">
          {profile.sports.map(({ sportId, skillLevel }) => (
            <div
              key={sportId}
              className="flex items-center justify-between gap-3 rounded-xl bg-surface-subtle px-3 py-2.5"
            >
              <span className="text-title text-card-foreground">
                {getSportName(sportId)}
              </span>
              <span className="text-label text-primary">
                {getSkillLabel(skillLevel)}
              </span>
            </div>
          ))}
        </div>
      </SummarySection>

      <SummarySection title="Looking for">
        <div className="flex flex-wrap gap-2">
          {profile.intents.map((intent) => (
            <Badge key={intent} variant="outline">
              {getIntentLabel(intent)}
            </Badge>
          ))}
          <Badge variant="secondary">
            {getIntensityLabel(profile.preferredIntensity)}
          </Badge>
        </div>
      </SummarySection>

      <SummarySection title="Usually free">
        {availability.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {availability.map((slot) => (
              <Badge key={slot} variant="outline">
                {slot}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-body-small text-muted-foreground">
            No availability set yet.
          </p>
        )}
      </SummarySection>

      <SummarySection title="Usual budget">
        <span className="text-metric text-card-foreground">
          {formatBudget(profile.budget)}
          <span className="text-body-small text-muted-foreground">
            {' '}
            / activity
          </span>
        </span>
      </SummarySection>
    </div>
  )
}

function SummarySection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <SectionHeader level="group" as="h3" title={title} />
      {children}
    </section>
  )
}
