import { ChevronRight } from 'lucide-react'

import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const PREVIEW_THREADS = [
  { name: 'Aina', preview: 'Badminton Saturday?', time: '18:04' },
  { name: 'Jason', preview: 'Sounds good.', time: 'Yesterday' },
] as const

export function MessagesPage() {
  return (
    <>
      <AppHeader title="Messages" />
      <PageContainer>
        <Card className="py-0">
          {PREVIEW_THREADS.map(({ name, preview, time }, index) => (
            <div key={name}>
              {index > 0 && <Separator />}
              <div className="flex items-center gap-3 p-4">
                <Avatar className="size-11">
                  <AvatarFallback className="text-title">
                    {name.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-title text-card-foreground">
                    {name}
                  </span>
                  <span className="truncate text-body-small text-muted-foreground">
                    {preview}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-caption text-muted-foreground">
                    {time}
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="size-4 text-muted-foreground"
                  />
                </div>
              </div>
            </div>
          ))}
        </Card>
        <p className="text-body-small text-muted-foreground">
          Conversations are visual placeholders until chat is built.
        </p>
      </PageContainer>
    </>
  )
}
