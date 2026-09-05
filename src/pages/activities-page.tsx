import { CalendarDays, History } from 'lucide-react'

import { EmptyState } from '@/components/common/empty-state'
import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const ACTIVITY_TABS = [
  {
    value: 'upcoming',
    label: 'Upcoming',
    icon: CalendarDays,
    title: 'No upcoming activities.',
    description: 'Plan a session with a buddy and it lands here.',
  },
  {
    value: 'past',
    label: 'Past',
    icon: History,
    title: 'Your completed activities will appear here.',
    description: 'Every session you finish stays on your record.',
  },
] as const

export function ActivitiesPage() {
  return (
    <>
      <AppHeader title="Activities" size="wide" />
      <PageContainer size="wide">
        <Tabs defaultValue={ACTIVITY_TABS[0].value}>
          {/* Full width on a phone where it is the only control; its natural
              width on a wide screen, so it is not a stretched phone tab bar. */}
          <TabsList className="w-full sm:w-auto">
            {ACTIVITY_TABS.map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex-1 sm:flex-none sm:px-6"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {ACTIVITY_TABS.map(({ value, icon, title, description }) => (
            <TabsContent key={value} value={value} className="pt-5">
              <EmptyState icon={icon} title={title} description={description} />
            </TabsContent>
          ))}
        </Tabs>
      </PageContainer>
    </>
  )
}
