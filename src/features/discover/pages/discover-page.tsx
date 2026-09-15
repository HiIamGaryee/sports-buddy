import { RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'

import compassIllustration from '@/assets/svg/compas-svgrepo-com.svg'
import calendarIcon from '@/assets/svg/calendar-svgrepo-com.svg'
import { EmptyState } from '@/components/common/empty-state'
import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { AppDropdown } from '@/components/ui/AppDropdown'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AddDiscoverDialog } from '@/features/discover/components/add-discover-dialog'
import { SPORTS } from '@/constants/sports'
import { OpportunityCard } from '@/features/discover/components/opportunity-card'
import { useDiscover } from '@/features/discover/use-discover'
import discoverList from '@/data/discover-list.json'
import type { DiscoverItem } from '@/types/discover-item'

const items = discoverList as DiscoverItem[]
const ALL = 'all'
const locations = [...new Set(items.map(({ location }) => location))]
const skillOptions = [...new Set(items.flatMap(({ skillLevel }) => skillLevel ? [skillLevel] : []))]
const buddyTypeOptions = [...new Set(items.flatMap(({ buddyType }) => buddyType ? [buddyType] : []))]
const distanceOptions = [10, 25, 50, 200] as const

const options = (values: readonly string[], allLabel: string) => [
  { value: ALL, label: allLabel },
  ...values.map((value) => ({ value, label: value })),
]

export function DiscoverPage() {
  const { incoming, suggested, isLoading, error, refresh } = useDiscover()
  const [location, setLocation] = useState(ALL)
  const [place, setPlace] = useState(ALL)
  const [activity, setActivity] = useState(ALL)
  const [skill, setSkill] = useState(ALL)
  const [buddyType, setBuddyType] = useState(ALL)
  const [distance, setDistance] = useState(ALL)
  const [moreOpen, setMoreOpen] = useState(false)
  const [searchVersion, setSearchVersion] = useState(0)
  const [addDiscoverOpen, setAddDiscoverOpen] = useState(false)

  const buddies = useMemo(() => [...incoming, ...suggested], [incoming, suggested])
  const buddiesById = useMemo(() => new Map(buddies.map((buddy) => [buddy.profile.userId, buddy])), [buddies])
  const placeOptions = useMemo(
    () => [...new Set(items.filter((item) => location === ALL || item.location === location).map(({ place: itemPlace }) => itemPlace))],
    [location],
  )
  const selectedPlace = placeOptions.includes(place) ? place : ALL

  const visibleItems = useMemo(() => items.filter((item) => {
    if (location !== ALL && item.location !== location) return false
    if (selectedPlace !== ALL && item.place !== selectedPlace) return false
    if (activity !== ALL && item.activity !== activity) return false
    if (skill !== ALL && item.skillLevel !== skill) return false
    if (buddyType !== ALL && item.buddyType !== buddyType) return false
    if (distance !== ALL && (item.distanceKm ?? Infinity) > Number(distance)) return false
    return true
  }), [activity, buddyType, distance, location, searchVersion, selectedPlace, skill])

  const hasFilters = [location, selectedPlace, activity, skill, buddyType, distance].some((value) => value !== ALL)
  const locationLabel = location === ALL ? 'All locations' : location
  const summary = [locationLabel, selectedPlace !== ALL ? selectedPlace : null, activity !== ALL ? activity : null, skill !== ALL ? skill : null]
    .filter(Boolean)
    .join(' · ')

  const clearFilters = () => {
    setLocation(ALL)
    setPlace(ALL)
    setActivity(ALL)
    setSkill(ALL)
    setBuddyType(ALL)
    setDistance(ALL)
    setMoreOpen(false)
  }

  return (
    <>
      <AppHeader
        title="Discover"
        subtitle="Find people and places to play near you."
        size="wide"
        action={<div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setAddDiscoverOpen(true)}><img src={calendarIcon} alt="" className="size-4" />Add new discover</Button><Button variant="ghost" size="icon-sm" aria-label="Refresh matches" onClick={refresh} disabled={isLoading}><RefreshCw className="size-5" /></Button></div>}
      />
      <PageContainer size="wide">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-[1fr_1.4fr_1fr_auto]">
              <AppDropdown value={location} onChange={(value) => { setLocation(value); setPlace(ALL) }} options={options(locations, 'All locations')} ariaLabel="Location" />
              <AppDropdown value={selectedPlace} onChange={setPlace} options={options(placeOptions, 'Any venue')} ariaLabel="Place or venue" />
              <AppDropdown value={activity} onChange={setActivity} options={options(SPORTS.map(({ name }) => name), 'Any activity')} ariaLabel="Activity" />
              <Button onClick={() => setSearchVersion((value) => value + 1)} className="h-11">Search</Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-body-small text-muted-foreground">{summary}</p>
              <div className="flex items-center gap-3">
                {hasFilters && <button type="button" onClick={clearFilters} className="text-body-small text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Clear filters</button>}
                <button type="button" onClick={() => setMoreOpen((value) => !value)} aria-expanded={moreOpen} className="text-body-small text-primary">{moreOpen ? 'Hide filters' : 'More filters'}</button>
              </div>
            </div>
            {moreOpen && (
              <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
                <AppDropdown label="Skill" value={skill} onChange={setSkill} options={options(skillOptions, 'Any skill')} />
                <AppDropdown label="Looking for" value={buddyType} onChange={setBuddyType} options={options(buddyTypeOptions, 'Any buddy type')} />
                <AppDropdown label="Distance" value={distance} onChange={setDistance} options={options(distanceOptions.map(String), 'Any distance')} />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <span className="text-body-small text-muted-foreground">{isLoading ? 'Looking for matches…' : `${visibleItems.length} ${visibleItems.length === 1 ? 'match' : 'matches'}`}</span>
        </div>

        {isLoading && <div className="grid gap-6 sm:grid-cols-2">{[0, 1, 2, 3].map((key) => <Card key={key}><CardContent className="flex flex-col gap-4"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-14 w-full" /><Skeleton className="h-8 w-1/2" /></CardContent></Card>)}</div>}
        {!isLoading && error && <EmptyState title={error} action={<Button variant="outline" onClick={refresh}>Try again</Button>} />}
        {!isLoading && !error && visibleItems.length === 0 && <EmptyState illustration={compassIllustration} title="No matches found" description="Try another location, venue or activity." action={hasFilters ? <Button variant="outline" onClick={clearFilters}>Clear filters</Button> : undefined} />}
        {!isLoading && !error && visibleItems.length > 0 && (
          <div key={searchVersion} className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((item) => <OpportunityCard key={item.id} item={item} buddy={buddiesById.get(item.buddyId)} />)}
          </div>
        )}
      </PageContainer>
      <AddDiscoverDialog open={addDiscoverOpen} onOpenChange={setAddDiscoverOpen} />
    </>
  )
}
