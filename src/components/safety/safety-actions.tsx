import { useState } from 'react'
import { Flag, ShieldBan } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useSafety } from '@/hooks/use-safety'
import { MAX_REPORT_NOTE_LENGTH, REPORT_REASONS, type ReportReason } from '@/types/safety'

const REPORT_OPTIONS = REPORT_REASONS.map((value) => ({ value, label: value.replaceAll('-', ' ') }))
/**
 * Report and Block for one member.
 *
 * `compact` drops the text labels and leaves two icon buttons, for a place
 * where these sit next to something more important — the chat header, where
 * two labelled buttons plus Invite left no room for the buddy's own name. The
 * `aria-label`s carry the meaning either way.
 */
export function SafetyActions({ targetUserId, displayName, context, onBlocked, compact = false }: { targetUserId: string; displayName: string; context: { type: 'profile' | 'conversation'; connectionId?: string; conversationId?: string }; onBlocked?: () => void; compact?: boolean }) {
  const { blockUser, reportUser } = useSafety(); const [mode, setMode] = useState<'block' | 'report' | null>(null); const [reason, setReason] = useState<ReportReason>('harassment'); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  const block = async () => { setBusy(true); setError(''); try { await blockUser(targetUserId); setMode(null); onBlocked?.() } catch { setError("We couldn't block this user. Please try again.") } finally { setBusy(false) } }
  const report = async () => { setBusy(true); setError(''); try { await reportUser(targetUserId, reason, note || null, context); setMode(null) } catch { setError("We couldn't submit your report. Please try again.") } finally { setBusy(false) } }
  return <><div className="flex gap-2"><Button variant="outline" size={compact ? 'icon-sm' : 'sm'} onClick={() => setMode('report')} aria-label={`Report ${displayName}`} title={compact ? `Report ${displayName}` : undefined}><Flag className="size-4" />{!compact && 'Report'}</Button><Button variant="outline" size={compact ? 'icon-sm' : 'sm'} onClick={() => setMode('block')} aria-label={`Block ${displayName}`} title={compact ? `Block ${displayName}` : undefined}><ShieldBan className="size-4" />{!compact && 'Block'}</Button></div><Dialog open={mode === 'block'} onOpenChange={(open) => !open && setMode(null)}><DialogContent><DialogHeader><DialogTitle>Block {displayName}?</DialogTitle><DialogDescription>They will no longer appear in Discover or Messages, and you won't be able to message or plan activities together.</DialogDescription></DialogHeader>{error && <p role="alert" className="text-body-small text-destructive">{error}</p>}<DialogFooter><DialogClose asChild><Button variant="outline" disabled={busy}>Cancel</Button></DialogClose><Button variant="destructive" disabled={busy} onClick={() => void block()}>{busy ? 'Blocking…' : 'Block User'}</Button></DialogFooter></DialogContent></Dialog><Dialog open={mode === 'report'} onOpenChange={(open) => !open && setMode(null)}><DialogContent><DialogHeader><DialogTitle>Report {displayName}</DialogTitle><DialogDescription>Why are you reporting this user?</DialogDescription></DialogHeader><div role="radiogroup" className="grid gap-2">{REPORT_OPTIONS.map(({ value, label }) => <Button key={value} type="button" variant={reason === value ? 'default' : 'outline'} className="justify-start capitalize" onClick={() => setReason(value)}>{label}</Button>)}</div><Textarea value={note} onChange={(event) => setNote(event.target.value.slice(0, MAX_REPORT_NOTE_LENGTH))} maxLength={MAX_REPORT_NOTE_LENGTH} placeholder="Tell us more (optional)" aria-label="Report note" />{error && <p role="alert" className="text-body-small text-destructive">{error}</p>}<DialogFooter><DialogClose asChild><Button variant="outline" disabled={busy}>Cancel</Button></DialogClose><Button disabled={busy} onClick={() => void report()}>{busy ? 'Submitting…' : 'Submit Report'}</Button></DialogFooter></DialogContent></Dialog></>
}
