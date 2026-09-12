import { CalendarPlus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { planPath } from '@/routes/routes'

/** A calm checkpoint before leaving chat for the focused planning flow. */
export function StartPlanDialog({
  conversationId,
  className,
}: {
  conversationId: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="default"
        className={className}
        aria-label="Plan a session"
        onClick={() => setOpen(true)}
      >
        <CalendarPlus className="size-4" />
        <span className="max-sm:sr-only">Plan a session</span>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plan a session?</DialogTitle>
          <DialogDescription>
            Pick a sport, time, budget, and venue together in the next step.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Not now</Button>
          </DialogClose>
          <Button onClick={() => navigate(planPath(conversationId))}>
            Start planning
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
