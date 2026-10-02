import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarPlus, Check, ChevronLeft, ChevronRight, Copy, Download, Lock, Minus, Plus, RefreshCw, Wrench } from 'lucide-react'
import { Button, EmptyState, Input, Needed, Spinner, TextArea, toast, useContent } from '../components/ui'
import {
  SlotTakenError, api, depositFor, isFree, isPastSlot, loadPlaceholderSetup, priceFor, sim, slotTimes, useStore, type Interval,
} from '../lib/store'
import { calendarLinks, cn, download, fmtDate, fmtDur, fmtMin, iso, parseISO, peso, todayISO, toMin } from '../lib/util'

type Draft = {
  date: string | null; serviceId: string; courtId: string; start: number | null; duration: number | null
  players: number; name: string; phone: string; email: string; notes: string; agree: boolean
}
const STEPS = ['Date', 'Court', 'Time', 'Duration & players', 'Your details', 'Review']
const DURATIONS = [60, 90, 120]
const DEFAULT_MAX = 4

function MonthPicker({ value, onChange }: { value: string | null; onChange: (d: string) => void }) {
  const [view, setView] = useState(() => { const d = value ? parseISO(value) : new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const first = view.getDay()
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => iso(new Date(view.getFullYear(), view.getMonth(), i + 1)))]
  const atMin = view.getFullYear() === new Date().getFullYear() && view.getMonth() === new Date().getMonth()
  return (
    <div className="card p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" className="btn btn-ghost" disabled={atMin} aria-label="Previous month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}><ChevronLeft aria-hidden /></button>
        <p className="display text-2xl" aria-live="polite">{view.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</p>
        <button type="button" className="btn btn-ghost" aria-label="Next month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}><ChevronRight aria-hidden /></button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => <span key={d} className="eyebrow py-1">{d}</span>)}
        {cells.map((c, i) => {
          if (!c) return <span key={i} />
          const past = c < todayISO(), sel = c === value, today = c === todayISO()
          return (
            <button key={c} type="button" disabled={past} aria-pressed={sel} aria-label={fmtDate(c, true) + (today ? ', today' : '') + (past ? ', unavailable' : '')}
              onClick={() => onChange(c)}
              className={cn('relative min-h-12 cursor-pointer rounded-md text-base font-semibold', sel ? 'bg-forest text-cream' : 'hover:bg-sage', past && 'cursor-not-allowed text-ink-soft/50 line-through hover:bg-transparent', today && !sel && 'ring-2 ring-inset ring-clay')}>
              {parseISO(c).getDate()}
              {sel && <Check size={12} className="absolute right-1 top-1" aria-hidden />}
            </button>
          )
        })}
      </div>
      <p className="mt-4 text-sm text-ink-soft">Today is outlined. Past dates are struck through and cannot be chosen.</p>
    </div>
  )
}

function Choice({ selected, disabled, onClick, children, className }: { selected: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" role="radio" aria-checked={selected} disabled={disabled} onClick={onClick}
      className={cn('relative min-h-14 w-full cursor-pointer rounded-md border-2 p-4 text-left', selected ? 'border-forest bg-sage/60' : 'border-edge/60 bg-paper hover:border-forest', disabled && 'cursor-not-allowed border-dashed bg-sand/60 text-ink-soft hover:border-edge/60', className)}>
      {selected && <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-forest text-cream"><Check size={14} aria-hidden /></span>}
      {children}
    </button>
  )
}

export function Booking() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { courts, services, settings } = useStore()
  const c = useContent()
  const initDate = params.get('date')
  const validInit = !!initDate && /^\d{4}-\d{2}-\d{2}$/.test(initDate) && initDate >= todayISO()
  const [step, setStep] = useState(validInit ? 1 : 0)
  const [d, setD] = useState<Draft>({ date: validInit ? initDate : null, serviceId: '', courtId: '', start: null, duration: null, players: 2, name: '', phone: '', email: '', notes: '', agree: false })
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }))
  const [slots, setSlots] = useState<{ state: 'idle' | 'loading' | 'ready' | 'error'; iv: Interval[] }>({ state: 'idle', iv: [] })
  const [reload, setReload] = useState(0)
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState<null | 'taken' | 'error'>(null)
  const [simUi, setSimUi] = useState({ ...sim })
  const head = useRef<HTMLHeadingElement>(null)

  const service = services.find((s) => s.id === d.serviceId)
  const court = courts.find((x) => x.id === d.courtId)
  const maxPlayers = court?.maxPlayers ?? DEFAULT_MAX
  const total = d.duration && d.serviceId ? priceFor(d.serviceId, d.duration) : null
  const deposit = depositFor(total)
  const closeMin = settings.closeTime ? toMin(settings.closeTime) : 0
  const times = slotTimes()

  useEffect(() => { head.current?.focus() }, [step])
  useEffect(() => {
    if (step !== 2 || !d.date || !d.courtId) return
    let live = true
    setSlots({ state: 'loading', iv: [] })
    api.getBookedIntervals(d.date, d.courtId).then((iv) => live && setSlots({ state: 'ready', iv })).catch(() => live && setSlots({ state: 'error', iv: [] }))
    return () => { live = false }
  }, [step, d.date, d.courtId, reload])

  const canNext = useMemo(() => [!!d.date, !!d.serviceId && !!d.courtId, d.start != null, !!d.duration && d.players >= 1, true, d.agree][step], [d, step])
  const hint = ['Choose a date to continue.', 'Choose a service and a court to continue.', 'Choose a start time to continue.', 'Choose how long you want to play.', '', 'Please accept the policies to continue.'][step]

  const validateDetails = () => {
    const e: Record<string, string> = {}
    if (d.name.trim().length < 2) e.name = 'Please enter your full name.'
    if (d.phone.replace(/\D/g, '').length < 7) e.phone = 'Enter a phone number we can reach you on.'
    if (!/^\S+@\S+\.\S+$/.test(d.email)) e.email = 'Enter a valid email address, e.g. name@example.com.'
    setErrs(e)
    return !Object.keys(e).length
  }
  const next = () => { if (step === 4 && !validateDetails()) return; setStep((s) => s + 1) }

  async function submit() {
    if (busy) return
    setBusy(true); setFail(null)
    try {
      const b = await api.createBooking({ date: d.date!, courtId: d.courtId, serviceId: d.serviceId, start: d.start!, duration: d.duration!, players: d.players, name: d.name.trim(), phone: d.phone.trim(), email: d.email.trim(), notes: d.notes.trim() }, { source: 'web', status: 'PENDING' })
      nav(`/booking/confirmation/${b.ref}`)
    } catch (e) {
      setBusy(false)
      setFail(e instanceof SlotTakenError ? 'taken' : 'error')
    }
  }

  const setup = courts.length > 0 && services.length > 0 && times.length > 0
  if (!setup)
    return (
      <div className="page-x max-w-3xl py-12 md:py-20">
        <EmptyState icon={Wrench} title="Booking is not set up yet" body="CLIENT INPUT REQUIRED: at least one court, one service and opening hours are needed before visitors can book."
          action={<><Button to="/admin/courts" variant="secondary">Set up in admin</Button><Button variant="primary" onClick={loadPlaceholderSetup}>Load placeholder setup (prototype)</Button></>} />
      </div>
    )

  const StepNav = (
    <div className="sticky bottom-0 z-30 -mx-5 mt-8 border-t border-line bg-cream px-5 py-3 md:-mx-0 md:rounded-b-lg md:border-0 md:bg-transparent md:px-0">
      {!canNext && hint && step !== 5 && <p className="mb-2 text-sm text-ink-soft">{hint}</p>}
      <div className="flex gap-3">
        {step > 0 && step !== 5 && <Button variant="secondary" lg icon={ArrowLeft} onClick={() => setStep(step - 1)} aria-label="Back">Back</Button>}
        {step < 5 && <Button lg className="flex-1" variant="accent" disabled={!canNext} onClick={next} icon={ArrowRight}>Continue</Button>}
      </div>
    </div>
  )

  return (
    <div className="page-x max-w-3xl py-8 md:py-14">
      <div className="mb-8">
        <p className="eyebrow mb-3">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>
        <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={6} aria-valuenow={step + 1} aria-label="Booking progress">
          {STEPS.map((s, i) => <span key={s} className={cn('h-2 flex-1 rounded-full', i <= step ? 'bg-forest' : 'bg-line')} />)}
        </div>
        {step > 0 && (
          <p className="mt-4 text-sm text-ink-soft">
            {[d.date && fmtDate(d.date), court?.name, d.start != null && fmtMin(d.start), d.duration && fmtDur(d.duration)].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {step === 0 && (
        <>
          <h1 ref={head} tabIndex={-1} className="display mb-6 text-4xl outline-none md:text-6xl">When do you want to play?</h1>
          <MonthPicker value={d.date} onChange={(date) => set({ date, start: null, duration: null })} />
          {d.date && <p className="mt-4 font-semibold">Selected: {fmtDate(d.date, true)}</p>}
        </>
      )}

      {step === 1 && (
        <>
          <h1 ref={head} tabIndex={-1} className="display mb-6 text-4xl outline-none md:text-6xl">What and where?</h1>
          <fieldset className="mb-8"><legend className="label">Service</legend>
            <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
              {services.map((s) => (
                <Choice key={s.id} selected={d.serviceId === s.id} onClick={() => set({ serviceId: s.id, duration: null })}>
                  <p className="font-bold">{s.name}</p><p className="text-sm text-ink-soft">{s.description}</p>
                  <p className="mt-1 text-sm font-semibold">{s.ratePerHour == null ? 'Rate not set' : `${peso(s.ratePerHour)} / hour`}</p>
                </Choice>
              ))}
            </div></fieldset>
          <fieldset><legend className="label">Court</legend>
            <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
              {courts.map((x) => {
                const off = x.status !== 'AVAILABLE'
                return (
                  <Choice key={x.id} selected={d.courtId === x.id} disabled={off} onClick={() => set({ courtId: x.id, start: null, duration: null })}>
                    <p className="font-bold">{x.name}</p>
                    <p className="flex items-center gap-1.5 text-sm text-ink-soft">{off ? <><Wrench size={14} aria-hidden /> Unavailable — {x.status === 'MAINTENANCE' ? 'maintenance' : 'closed'}</> : 'Available for booking'}</p>
                  </Choice>
                )
              })}
            </div></fieldset>
        </>
      )}

      {step === 2 && (
        <>
          <h1 ref={head} tabIndex={-1} className="display mb-2 text-4xl outline-none md:text-6xl">Pick a start time</h1>
          <p className="mb-6 text-ink-soft">{court?.name} · {d.date && fmtDate(d.date, true)}</p>
          {slots.state === 'loading' && (
            <div><Spinner label="Checking open times…" /><div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4" aria-hidden>{Array.from({ length: 12 }).map((_, i) => <span key={i} className="h-14 animate-pulse rounded-md bg-sand" />)}</div></div>
          )}
          {slots.state === 'error' && (
            <div role="alert" className="card border-st-cancel p-6"><p className="flex items-center gap-2 font-bold text-st-cancel"><AlertTriangle size={18} aria-hidden /> We could not load the times.</p><p className="mt-1 text-ink-soft">Check your connection and try again. Your choices are saved.</p><Button className="mt-4" icon={RefreshCw} onClick={() => setReload((r) => r + 1)}>Try again</Button></div>
          )}
          {slots.state === 'ready' && (
            <div role="radiogroup" aria-label="Start times" className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {times.map((t) => {
                const gone = isPastSlot(d.date!, t)
                const taken = !isFree(slots.iv, t, t + 30)
                const dis = gone || taken
                return (
                  <button key={t} type="button" role="radio" aria-checked={d.start === t} disabled={dis} onClick={() => set({ start: t, duration: null })}
                    className={cn('flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-md border-2 px-1 text-sm font-bold', d.start === t ? 'border-forest bg-forest text-cream' : 'border-edge/60 bg-paper hover:border-forest', dis && 'cursor-not-allowed border-dashed bg-sand/60 text-ink-soft hover:border-edge/60')}>
                    {fmtMin(t)}
                    {dis && <span className="flex items-center gap-1 text-[0.7rem] font-semibold">{taken ? <><Lock size={11} aria-hidden /> Taken</> : 'Passed'}</span>}
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {step === 3 && (
        <>
          <h1 ref={head} tabIndex={-1} className="display mb-6 text-4xl outline-none md:text-6xl">How long, and who's playing?</h1>
          <fieldset className="mb-8"><legend className="label">Duration</legend>
            <div role="radiogroup" className="grid gap-3 sm:grid-cols-3">
              {DURATIONS.map((m) => {
                const ok = isFree(slots.iv, d.start!, d.start! + m) && d.start! + m <= closeMin
                return (
                  <Choice key={m} selected={d.duration === m} disabled={!ok} onClick={() => set({ duration: m })}>
                    <p className="font-bold">{fmtDur(m)}</p>
                    <p className="text-sm text-ink-soft">{ok ? `Until ${fmtMin(d.start! + m)}` : 'Not available — next booking or closing time'}</p>
                    <p className="text-sm font-semibold">{peso(priceFor(d.serviceId, m), 'Rate not set')}</p>
                  </Choice>
                )
              })}
            </div></fieldset>
          <div>
            <p id="pl" className="label">Players</p>
            <div className="inline-flex items-center gap-2" role="group" aria-labelledby="pl">
              <button type="button" className="btn btn-secondary !px-3" aria-label="Fewer players" disabled={d.players <= 1} onClick={() => set({ players: d.players - 1 })}><Minus aria-hidden /></button>
              <output className="display w-16 text-center text-4xl" aria-live="polite">{d.players}</output>
              <button type="button" className="btn btn-secondary !px-3" aria-label="More players" disabled={d.players >= maxPlayers} onClick={() => set({ players: d.players + 1 })}><Plus aria-hidden /></button>
            </div>
            <p className="mt-2 text-sm text-ink-soft">Up to {maxPlayers} players{court?.maxPlayers == null && ' (max not set for this court — confirm with the client)'}.</p>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <h1 ref={head} tabIndex={-1} className="display mb-6 text-4xl outline-none md:text-6xl">Your details</h1>
          <div className="space-y-5">
            <Input label="Full name" autoComplete="name" value={d.name} error={errs.name} onChange={(e) => set({ name: e.target.value })} />
            <Input label="Mobile number" type="tel" autoComplete="tel" inputMode="tel" value={d.phone} error={errs.phone} onChange={(e) => set({ phone: e.target.value })} />
            <Input label="Email" type="email" autoComplete="email" value={d.email} error={errs.email} hint="Your reference number is shown on screen after booking." onChange={(e) => set({ email: e.target.value })} />
            <TextArea label="Notes" optional rows={3} value={d.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <h1 ref={head} tabIndex={-1} className="display mb-6 text-4xl outline-none md:text-6xl">Review & confirm</h1>
          <div className="card divide-y divide-line">
            <dl className="grid gap-x-6 gap-y-3 p-5 sm:grid-cols-2">
              {[['Date', fmtDate(d.date!, true)], ['Time', `${fmtMin(d.start!)} – ${fmtMin(d.start! + d.duration!)}`], ['Court', court?.name], ['Service', service?.name], ['Duration', fmtDur(d.duration!)], ['Players', String(d.players)], ['Name', d.name], ['Contact', `${d.phone} · ${d.email}`]].map(([k, v]) => (
                <div key={k}><dt className="eyebrow">{k}</dt><dd className="font-semibold">{v}</dd></div>
              ))}
            </dl>
            <dl className="space-y-2 p-5">
              <div className="flex justify-between"><dt>Total</dt><dd className="font-bold">{total == null ? <Needed tag>Rate</Needed> : peso(total)}</dd></div>
              <div className="flex justify-between"><dt>Deposit due to hold the booking</dt><dd className="font-bold">{deposit == null ? <Needed>Deposit % not set</Needed> : peso(deposit)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2"><dt>Balance on arrival</dt><dd className="display text-3xl">{total == null || deposit == null ? '—' : peso(total - deposit)}</dd></div>
            </dl>
            <div className="space-y-3 p-5 text-sm">
              <p className="eyebrow">Policies</p>
              <p className="whitespace-pre-line"><b>Cancellation: </b>{settings.cancellationPolicy || <Needed tag>Cancellation policy</Needed>}</p>
              <p className="whitespace-pre-line"><b>House rules: </b>{settings.houseRules || <Needed tag>House rules</Needed>}</p>
            </div>
          </div>
          <label className="mt-5 flex min-h-11 cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 size-6 shrink-0 accent-forest" checked={d.agree} onChange={(e) => set({ agree: e.target.checked })} />
            <span>I have read and accept the cancellation policy and house rules.</span>
          </label>

          {fail === 'taken' && (
            <div role="alert" className="mt-6 rounded-md border-2 border-st-cancel bg-st-cancel-bg p-5 text-st-cancel">
              <p className="flex items-center gap-2 font-bold"><Lock size={18} aria-hidden /> That time slot was just booked. Please choose another.</p>
              <Button className="mt-4" variant="danger" onClick={() => { setFail(null); set({ start: null, duration: null, agree: false }); setReload((r) => r + 1); setStep(2) }}>Choose another time</Button>
            </div>
          )}
          {fail === 'error' && (
            <div role="alert" className="mt-6 rounded-md border-2 border-st-cancel bg-st-cancel-bg p-5 text-st-cancel">
              <p className="flex items-center gap-2 font-bold"><AlertTriangle size={18} aria-hidden /> Something went wrong. Your booking was not made.</p>
              <p className="mt-1 text-sm">Nothing has been charged. Please try again.</p>
              <Button className="mt-4" variant="danger" icon={RefreshCw} onClick={() => setFail(null)}>Try again</Button>
            </div>
          )}
          {!fail && (
            <div className="sticky bottom-0 -mx-5 mt-6 border-t border-line bg-cream px-5 py-3 md:mx-0 md:border-0 md:px-0">
              {!d.agree && <p className="mb-2 text-sm text-ink-soft">{hint}</p>}
              <div className="flex gap-3">
                <Button variant="secondary" lg icon={ArrowLeft} disabled={busy} onClick={() => setStep(4)}>Back</Button>
                <Button variant="accent" lg className="flex-1" disabled={!d.agree || busy} aria-busy={busy} onClick={submit}>{busy ? <Spinner label="Confirming…" /> : 'Confirm booking'}</Button>
              </div>
            </div>
          )}
        </>
      )}

      {step < 5 && StepNav}

      <details className="mt-12 rounded-md border border-dashed border-edge p-4 text-sm">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold">Prototype controls — simulate backend states</summary>
        <div className="space-y-1 pt-2">
          {([['forceTaken', 'Next confirm: slot was just taken'], ['forceCreateError', 'Next confirms: network error'], ['forceLoadError', 'Time slots fail to load']] as const).map(([k, l]) => (
            <label key={k} className="flex min-h-11 cursor-pointer items-center gap-3"><input type="checkbox" className="size-5 accent-forest" checked={simUi[k]} onChange={(e) => { sim[k] = e.target.checked; setSimUi({ ...sim }) }} />{l}</label>
          ))}
        </div>
      </details>
      <span className="sr-only">{c('businessName')}</span>
    </div>
  )
}

export function Confirmation() {
  const { ref } = useParams()
  const { bookings, courts, services, settings } = useStore()
  const c = useContent()
  const b = bookings.find((x) => x.ref === ref)
  if (!b)
    return <div className="page-x max-w-3xl py-16"><EmptyState icon={AlertTriangle} title="Reference not found" body="We could not find a booking with that reference on this device." action={<><Button to="/booking">Start a booking</Button><Button to="/" variant="secondary">Home</Button></>} /></div>
  const court = courts.find((x) => x.id === b.courtId), service = services.find((x) => x.id === b.serviceId)
  const links = calendarLinks({ title: `${service?.name ?? 'Court booking'} — ${court?.name ?? ''}`, date: b.date, start: b.start, end: b.start + b.duration, location: c('address') || 'Marikina City, Philippines', ref: b.ref })
  return (
    <div className="page-x max-w-3xl py-10 md:py-16">
      <div className="rounded-lg bg-forest p-6 text-cream on-dark md:p-10" role="status">
        <p className="eyebrow !text-sage flex items-center gap-2"><Check size={16} aria-hidden /> Booking request received</p>
        <h1 className="display mt-3 text-5xl md:text-7xl">See you on court.</h1>
        <p className="mt-6 text-sm text-cream/80">Your reference number</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <p className="font-mono text-3xl font-medium tracking-widest md:text-5xl">{b.ref}</p>
          <button type="button" className="btn btn-on-dark" onClick={() => navigator.clipboard?.writeText(b.ref).then(() => toast('Reference copied'))}><Copy size={16} aria-hidden /> Copy</button>
        </div>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-cream px-3 py-1 text-sm font-bold text-st-pending">Status: Pending — awaiting deposit</p>
      </div>
      <div className="card mt-6 divide-y divide-line">
        <dl className="grid gap-x-6 gap-y-3 p-5 sm:grid-cols-2">
          {[['Date', fmtDate(b.date, true)], ['Time', `${fmtMin(b.start)} – ${fmtMin(b.start + b.duration)}`], ['Court', court?.name ?? '—'], ['Players', String(b.players)], ['Total', peso(b.total, 'Rate not set')], ['Deposit due', peso(b.deposit, 'Not set')]].map(([k, v]) => (
            <div key={k}><dt className="eyebrow">{k}</dt><dd className="font-semibold">{v}</dd></div>
          ))}
        </dl>
        <div className="p-5"><p className="eyebrow mb-2">How to pay your deposit</p>{settings.paymentInstructions ? <p className="whitespace-pre-line">{settings.paymentInstructions}</p> : <Needed tag>Payment instructions</Needed>}</div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button href={links.google} icon={CalendarPlus}>Add to Google Calendar</Button>
        <Button variant="secondary" icon={Download} onClick={() => download(`${b.ref}.ics`, links.ics, 'text/calendar')}>Download .ics</Button>
        <Button to="/booking" variant="ghost">Book another</Button>
        <Link to="/" className="btn btn-ghost">Home</Link>
      </div>
    </div>
  )
}
