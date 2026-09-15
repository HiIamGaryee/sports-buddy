import { RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'

import compassIllustration from '@/assets/svg/compas-svgrepo-com.svg'
import calendarIcon from '@/assets/svg/calendar-svgrepo-com.svg'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { SectionHeader } from '@/components/common/section-header'
import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { AppDropdown } from '@/components/ui/AppDropdown'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SPORTS } from '@/constants/sports'
import { BuddyCard } from '@/features/discover/components/buddy-card'
import { useDiscover } from '@/features/discover/use-discover'

const ALL = 'all'
const SKELETON_CARDS = [0, 1, 2, 3]
const distanceOptions = [10, 25, 50, 200] as const

const options = (values: readonly string[], allLabel: string) => [
  { value: ALL, label: allLabel },
  ...values.map((value) => ({
    value,
    label: value,
  })),
]

export function DiscoverPage() {
  const {
    incoming,
    suggested,
    isLoading,
    error,
    refresh,
    dismiss,
  } = useDiscover()

  const [location, setLocation] = useState(ALL)
  const [activity, setActivity] = useState(ALL)
  const [skill, setSkill] = useState(ALL)
  const [buddyType, setBuddyType] = useState(ALL)
  const [distance, setDistance] = useState(ALL)
  const [moreOpen, setMoreOpen] = useState(false)
  const [searchVersion, setSearchVersion] = useState(0)

  const allBuddies = useMemo(
    () => [...incoming, ...suggested],
    [incoming, suggested],
  )

  const getLocation = (buddy: (typeof allBuddies)[number]) =>
    buddy.profile.location ?? ''

  const getActivity = (buddy: (typeof allBuddies)[number]) =>
    buddy.profile.sport ??
    buddy.profile.activity ??
    ''

  const getSkill = (buddy: (typeof allBuddies)[number]) =>
    buddy.profile.skillLevel ?? ''

  const getBuddyType = (buddy: (typeof allBuddies)[number]) =>
    buddy.profile.buddyType ?? ''

  const getDistance = (buddy: (typeof allBuddies)[number]) =>
    buddy.profile.distanceKm ?? null

  const locations = useMemo(
    () =>
      [
        ...new Set(
          allBuddies
            .map(getLocation)
            .filter(Boolean),
        ),
      ].sort(),
    [allBuddies],
  )

  const skillOptions = useMemo(
    () =>
      [
        ...new Set(
          allBuddies
            .map(getSkill)
            .filter(Boolean),
        ),
      ].sort(),
    [allBuddies],
  )

  const buddyTypeOptions = useMemo(
    () =>
      [
        ...new Set(
          allBuddies
            .map(getBuddyType)
            .filter(Boolean),
        ),
      ].sort(),
    [allBuddies],
  )

  const matchesFilters = (buddy: (typeof allBuddies)[number]) => {
    if (location !== ALL && getLocation(buddy) !== location) {
      return false
    }

    if (activity !== ALL && getActivity(buddy) !== activity) {
      return false
    }

    if (skill !== ALL && getSkill(buddy) !== skill) {
      return false
    }

    if (buddyType !== ALL && getBuddyType(buddy) !== buddyType) {
      return false
    }

    if (distance !== ALL) {
      const buddyDistance = getDistance(buddy)

      if (
        buddyDistance === null ||
        buddyDistance > Number(distance)
      ) {
        return false
      }
    }

    return true
  }

  const filteredIncoming = useMemo(
    () => incoming.filter(matchesFilters),
    [
      incoming,
      location,
      activity,
      skill,
      buddyType,
      distance,
      searchVersion,
    ],
  )

  const filteredSuggested = useMemo(
    () => suggested.filter(matchesFilters),
    [
      suggested,
      location,
      activity,
      skill,
      buddyType,
      distance,
      searchVersion,
    ],
  )

  const visibleCount =
    filteredIncoming.length + filteredSuggested.length

  const hasFilters = [
    location,
    activity,
    skill,
    buddyType,
    distance,
  ].some((value) => value !== ALL)

  const summary = [
    location === ALL ? 'All locations' : location,
    activity !== ALL ? activity : null,
    skill !== ALL ? skill : null,
    buddyType !== ALL ? buddyType : null,
    distance !== ALL ? `Within ${distance} km` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const clearFilters = () => {
    setLocation(ALL)
    setActivity(ALL)
    setSkill(ALL)
    setBuddyType(ALL)
    setDistance(ALL)
    setMoreOpen(false)
    setSearchVersion((value) => value + 1)
  }

  return (
    <>
      <AppHeader
        title="Discover"
        subtitle="Find people and places to play near you."
        size="wide"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/discover/post-activity">
                <img
                  src={calendarIcon}
                  alt=""
                  className="size-4"
                />
                Add new discover
              </a>
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Refresh matches"
              onClick={refresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`size-5 ${
                  isLoading ? 'animate-spin' : ''
                }`}
              />
            </Button>
          </div>
        }
      />

      <PageContainer size="wide">
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
                <AppDropdown
                  value={location}
                  onChange={setLocation}
                  options={options(
                    locations,
                    'All locations',
                  )}
                  ariaLabel="Location"
                />

                <AppDropdown
                  value={activity}
                  onChange={setActivity}
                  options={options(
                    SPORTS.map(({ name }) => name),
                    'Any activity',
                  )}
                  ariaLabel="Activity"
                />

                <AppDropdown
                  value={distance}
                  onChange={setDistance}
                  options={[
                    {
                      value: ALL,
                      label: 'Any distance',
                    },
                    ...distanceOptions.map((value) => ({
                      value: String(value),
                      label: `Within ${value} km`,
                    })),
                  ]}
                  ariaLabel="Distance"
                />

                <Button
                  className="h-11"
                  onClick={() =>
                    setSearchVersion(
                      (value) => value + 1,
                    )
                  }
                >
                  Search
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-body-small text-muted-foreground">
                  {summary}
                </p>

                <div className="flex items-center gap-3">
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-body-small text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                    >
                      Clear filters
                    </button>
                  )}

                  <button
                    type="button"
                    aria-expanded={moreOpen}
                    onClick={() =>
                      setMoreOpen((value) => !value)
                    }
                    className="text-body-small text-primary"
                  >
                    {moreOpen
                      ? 'Hide filters'
                      : 'More filters'}
                  </button>
                </div>
              </div>

              {moreOpen && (
                <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                  <AppDropdown
                    label="Skill"
                    value={skill}
                    onChange={setSkill}
                    options={options(
                      skillOptions,
                      'Any skill',
                    )}
                  />

                  <AppDropdown
                    label="Looking for"
                    value={buddyType}
                    onChange={setBuddyType}
                    options={options(
                      buddyTypeOptions,
                      'Any buddy type',
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3">
            <span className="text-body-small text-muted-foreground">
              {isLoading
                ? 'Looking for buddies…'
                : `${visibleCount} ${
                    visibleCount === 1
                      ? 'buddy'
                      : 'buddies'
                  }`}
            </span>
          </div>

          {isLoading && (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {SKELETON_CARDS.map((key) => (
                <Card key={key}>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-14 shrink-0 rounded-full" />

                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>

                    <Skeleton className="h-9 w-full rounded-xl" />
                    <Skeleton className="h-9 w-full rounded-xl" />
                    <Skeleton className="h-6 w-40 rounded-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && error && (
            <ErrorState
              title={error}
              onRetry={refresh}
            />
          )}

          {!isLoading &&
            !error &&
            visibleCount === 0 && (
              <EmptyState
                illustration={compassIllustration}
                title="No sports buddies found."
                description={
                  hasFilters
                    ? "Try changing your filters or widening what you're looking for."
                    : 'Check back soon as more Sports Buddy members join your area.'
                }
                action={
                  hasFilters ? (
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            )}

          {!isLoading &&
            !error &&
            filteredIncoming.length > 0 && (
              <section className="flex flex-col gap-4">
                <SectionHeader title="Wants to connect" />

                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredIncoming.map((buddy) => (
                    <BuddyCard
                      key={buddy.profile.userId}
                      buddy={buddy}
                    />
                  ))}
                </div>
              </section>
            )}

          {!isLoading &&
            !error &&
            filteredSuggested.length > 0 && (
              <section className="flex flex-col gap-4">
                {filteredIncoming.length > 0 && (
                  <SectionHeader title="For you" />
                )}

                <div
                  key={searchVersion}
                  className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
                >
                  {filteredSuggested.map((buddy) => (
                    <BuddyCard
                      key={buddy.profile.userId}
                      buddy={buddy}
                      onDismiss={dismiss}
                    />
                  ))}
                </div>
              </section>
            )}
        </div>
      </PageContainer>
    </>
  )
}