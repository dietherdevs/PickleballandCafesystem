import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarPlus, CircleCheck, LogIn, Plus, UserX, XCircle, CheckCheck, type LucideIcon } from 'lucide-react'
import { Button, ConfirmDialog, Input, Modal, Needed, Select, StatusBadge, TextArea, toast } from '../components/ui'
import {
  SlotTakenError, STATUS_LABEL, TRANSITIONS, api, changeStatus, depositFor, priceFor, recordPayment, slotTimes, updateBookingNotes, useStore,
  type Booking, type Status,
} from '../lib/store'
import { fmtDate, fmtDur, fmtMin, fmtStamp, peso, todayISO } from '../lib/util'

const ACTION: Record<Status, { label: string; icon: LucideIcon; danger?: boolean; body: string }> = {
  PENDING: { label: '', icon: CircleCheck, body: '' },
  CONFIRMED: { label: 'Confirm booking', icon: CircleCheck, body: 'The court time is held for this customer.' },
  CHECKED_IN: { label: 'Check in', icon: LogIn, body: 'Mark that the customer has arrived.' },
  COMPLETED: { label: 'Mark completed', icon: CheckCheck, body: 'The session is finished. This cannot be undone.' },
  CANCELLED: { label: 'Cancel booking', icon: XCircle, danger: true, body: 'The slot is released for other customers. This cannot be undone.' },
  NO_SHOW: { label: 'Mark no-show', icon: UserX, danger: true, body: 'The customer did not arrive. The slot stays recorded. This cannot be undone.' },
}

export function useLookups() {
  const { courts, services } = useStore()
  return {
    court: (id: string) => courts.find((c) => c.id === id)?.name ?? 'Removed court',
    service: (id: string) => services.find((s) => s.id === id)?.name ?? 'Removed service',
  }
}

export function StatusActions({ booking, size }: { booking: Booking; size?: 'sm' }) {
  const [to, setTo] = useState<Status | null>(null)
  const [reason, setReason] = useState('')
  const next = TRANSITIONS[booking.status]
  if (!next.length)
    return <p className="text-sm text-ink-soft">No further actions — {STATUS_LABEL[booking.status]} is a final status.</p>
  const a = to ? ACTION[to] : null
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {next.map((s) => (
          <Button key={s} variant={ACTION[s].danger ? 'danger' : 'primary'} icon={ACTION[s].icon} className={size === 'sm' ? '!px-3' : ''} onClick={() => { setReason(''); setTo(s) }}>{ACTION[s].label}</Button>
        ))}
      </div>
      <ConfirmDialog open={!!to} onClose={() => setTo(null)} danger={a?.danger} title={a?.label ?? ''} confirmLabel={a?.label ?? ''}
        disabled={to === 'CANCELLED' && reason.trim().length < 3}
        body={<><p><b className="text-ink">{booking.ref}</b> · {booking.name}</p><p>{STATUS_LABEL[booking.status]} → <b className="text-ink">{to && STATUS_LABEL[to]}</b></p><p>{a?.body}</p></>}
        onConfirm={() => { if (to && changeStatus(booking.id, to, reason.trim() || undefined)) toast(`${booking.ref} is now ${STATUS_LABEL[to].toLowerCase()}`); setTo(null) }}>
        {to === 'CANCELLED' && <TextArea label="Reason for cancelling" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} hint="Required. Saved to the booking history." />}
      </ConfirmDialog>
    </>
  )
}

export function BookingDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { bookings, payments } = useStore()
  const { court, service } = useLookups()
  const b = bookings.find((x) => x.id === id)
  const [notes, setNotes] = useState('')
  const [pay, setPay] = useState({ amount: '', kind: 'DEPOSIT', method: 'Cash', note: '' })
  const [payErr, setPayErr] = useState('')
  useEffect(() => { setNotes(b?.notes ?? ''); setPayErr('') }, [b?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!b) return <Modal open={false} onClose={onClose} title="Booking" side>{null}</Modal>
  const mine = payments.filter((p) => p.bookingId === b.id)
  const paid = mine.reduce((a, p) => a + p.amount, 0)
  return (
    <Modal open onClose={onClose} title={b.ref} side>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center gap-3"><StatusBadge status={b.status} /><span className="text-sm text-ink-soft">{b.source === 'web' ? 'Booked online' : 'Created by staff'} · {fmtStamp(b.createdAt)}</span></div>
        <StatusActions booking={b} />
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {[['Date', fmtDate(b.date, true)], ['Time', `${fmtMin(b.start)} – ${fmtMin(b.start + b.duration)}`], ['Court', court(b.courtId)], ['Service', service(b.serviceId)], ['Duration', fmtDur(b.duration)], ['Players', String(b.players)], ['Customer', b.name], ['Phone', b.phone], ['Email', b.email || '—']].map(([k, v]) => (
            <div key={k}><dt className="eyebrow">{k}</dt><dd className="font-semibold">{v}</dd></div>
          ))}
        </dl>
        <section aria-labelledby="pay-h">
          <h3 id="pay-h" className="display mb-3 text-2xl">Payment</h3>
          <dl className="card divide-y divide-line">
            {[['Total', peso(b.total, 'Rate not set')], ['Deposit required', peso(b.deposit, 'Not set')], ['Paid so far', peso(paid)], ['Balance due', b.total == null ? '—' : peso(Math.max(0, b.total - paid))]].map(([k, v]) => (
              <div key={k} className="flex justify-between p-3"><dt>{k}</dt><dd className="font-bold">{v}</dd></div>
            ))}
          </dl>
          {mine.length > 0 && <ul className="mt-3 space-y-1 text-sm">{mine.map((p) => <li key={p.id}>{peso(p.amount)} · {p.kind.toLowerCase()} · {p.method} · {fmtStamp(p.at)}</li>)}</ul>}
          {b.status !== 'CANCELLED' && (
            <form className="mt-4 grid gap-3 sm:grid-cols-2" noValidate onSubmit={(e) => {
              e.preventDefault()
              const amt = Number(pay.amount)
              if (!(amt > 0)) return setPayErr('Enter an amount greater than zero.')
              setPayErr('')
              recordPayment({ bookingId: b.id, amount: amt, kind: pay.kind as 'DEPOSIT', method: pay.method, note: pay.note })
              setPay({ ...pay, amount: '', note: '' }); toast('Payment recorded')
            }}>
              <Input label="Amount (₱)" type="number" min="0" step="0.01" inputMode="decimal" value={pay.amount} error={payErr} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
              <Select label="Type" value={pay.kind} onChange={(e) => setPay({ ...pay, kind: e.target.value })}><option value="DEPOSIT">Deposit</option><option value="BALANCE">Balance</option><option value="OTHER">Other</option></Select>
              <Select label="Method" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{['Cash', 'GCash', 'Bank transfer', 'Card', 'Other'].map((m) => <option key={m}>{m}</option>)}</Select>
              <div className="flex items-end"><Button type="submit" variant="secondary" className="w-full" icon={Plus}>Record payment</Button></div>
            </form>
          )}
        </section>
        <section>
          <h3 className="display mb-3 text-2xl">Notes</h3>
          <TextArea label="Internal notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button variant="secondary" className="mt-3" disabled={notes === b.notes} onClick={() => { updateBookingNotes(b.id, notes); toast('Notes saved') }}>Save notes</Button>
        </section>
        <section>
          <h3 className="display mb-3 text-2xl">History</h3>
          <ol className="space-y-3 border-l-2 border-line pl-4">
            {[...b.history].reverse().map((h, i) => (
              <li key={i}><StatusBadge status={h.status} /><p className="mt-1 text-sm text-ink-soft">{fmtStamp(h.at)} · {h.by}{h.note ? ` · ${h.note}` : ''}</p></li>
            ))}
          </ol>
        </section>
      </div>
    </Modal>
  )
}

export function ManualCreate({ open, onClose, defaults }: { open: boolean; onClose: () => void; defaults?: { date?: string; courtId?: string; start?: number } }) {
  const { courts, services } = useStore()
  const times = slotTimes()
  const init = () => ({ date: defaults?.date ?? todayISO(), courtId: defaults?.courtId ?? courts.find((c) => c.status === 'AVAILABLE')?.id ?? '', serviceId: services[0]?.id ?? '', start: String(defaults?.start ?? times[0] ?? ''), duration: '60', players: '2', name: '', phone: '', email: '', status: 'CONFIRMED' })
  const [f, setF] = useState(init)
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState('')
  useEffect(() => { if (open) { setF(init()); setErrs({}); setFail(''); setBusy(false) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }))
  const total = f.serviceId ? priceFor(f.serviceId, Number(f.duration)) : null
  const ready = courts.length > 0 && services.length > 0 && times.length > 0

  async function submit() {
    if (busy) return
    const e: Record<string, string> = {}
    if (f.name.trim().length < 2) e.name = 'Enter the customer name.'
    if (f.phone.replace(/\D/g, '').length < 7) e.phone = 'Enter a phone number.'
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Email format looks wrong.'
    if (!f.courtId) e.courtId = 'Choose a court.'
    setErrs(e); if (Object.keys(e).length) return
    setBusy(true); setFail('')
    try {
      const b = await api.createBooking({ date: f.date, courtId: f.courtId, serviceId: f.serviceId, start: Number(f.start), duration: Number(f.duration), players: Number(f.players) || 1, name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(), notes: '' }, { source: 'admin', status: f.status as Status })
      toast(`Booking ${b.ref} created`); onClose()
    } catch (err) {
      setFail(err instanceof SlotTakenError ? 'That time slot was just booked. Please choose another.' : 'Could not create the booking. Please try again.')
    }
    setBusy(false)
  }
  return (
    <Modal open={open} onClose={onClose} title="New booking" wide
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!ready || busy} aria-busy={busy} onClick={submit} icon={CalendarPlus}>{busy ? 'Saving…' : 'Create booking'}</Button></>}>
      {!ready ? (
        <p className="rounded-md border border-dashed border-edge p-4">CLIENT INPUT REQUIRED: add a court, a service and opening hours first (Courts, Services & Rates, Settings).</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {fail && <p role="alert" className="flex items-center gap-2 rounded-md bg-st-cancel-bg p-3 font-semibold text-st-cancel sm:col-span-2"><AlertTriangle size={18} aria-hidden /> {fail}</p>}
          <Input label="Date" type="date" min={todayISO()} value={f.date} onChange={(e) => set({ date: e.target.value })} />
          <Select label="Court" value={f.courtId} error={errs.courtId} onChange={(e) => set({ courtId: e.target.value })}>{courts.map((c) => <option key={c.id} value={c.id} disabled={c.status !== 'AVAILABLE'}>{c.name}{c.status !== 'AVAILABLE' ? ` (${c.status.toLowerCase()})` : ''}</option>)}</Select>
          <Select label="Service" value={f.serviceId} onChange={(e) => set({ serviceId: e.target.value })}>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
          <Select label="Start time" value={f.start} onChange={(e) => set({ start: e.target.value })}>{times.map((t) => <option key={t} value={t}>{fmtMin(t)}</option>)}</Select>
          <Select label="Duration" value={f.duration} onChange={(e) => set({ duration: e.target.value })}>{[60, 90, 120].map((m) => <option key={m} value={m}>{fmtDur(m)}</option>)}</Select>
          <Input label="Players" type="number" min={1} value={f.players} onChange={(e) => set({ players: e.target.value })} />
          <Input label="Customer name" value={f.name} error={errs.name} onChange={(e) => set({ name: e.target.value })} />
          <Input label="Phone" type="tel" value={f.phone} error={errs.phone} onChange={(e) => set({ phone: e.target.value })} />
          <Input label="Email" type="email" optional value={f.email} error={errs.email} onChange={(e) => set({ email: e.target.value })} />
          <Select label="Initial status" value={f.status} onChange={(e) => set({ status: e.target.value })}><option value="CONFIRMED">Confirmed</option><option value="PENDING">Pending</option></Select>
          <p className="text-sm text-ink-soft sm:col-span-2">Total: {total == null ? <Needed>Rate not set</Needed> : peso(total)} · Deposit: {depositFor(total) == null ? 'not set' : peso(depositFor(total))}</p>
        </div>
      )}
    </Modal>
  )
}
