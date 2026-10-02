import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Activity, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Clock, Inbox, Lock, Plus, Search, Wallet, Wrench, PenLine, ArrowUpDown } from 'lucide-react'
import { Button, EmptyState, Input, PageHeader, Segmented, Select, StatusBadge, STATUS_STYLE } from '../components/ui'
import { STATUSES, STATUS_LABEL, loadPlaceholderSetup, slotTimes, useStore, type Booking, type Status } from '../lib/store'
import { addDays, cn, fmtDate, fmtMin, iso, nowMin, parseISO, peso, todayISO } from '../lib/util'
import { BookingDrawer, ManualCreate, StatusActions, useLookups } from './bookingParts'

/* ---------------- Dashboard ---------------- */
export function Dashboard() {
  const { bookings, courts, payments, inquiries, session, services } = useStore()
  const { court, service } = useLookups()
  const [open, setOpen] = useState<string | null>(null)
  const [create, setCreate] = useState(false)
  const today = todayISO()
  const todays = bookings.filter((b) => b.date === today && b.status !== 'CANCELLED').sort((a, b) => a.start - b.start)
  const pending = bookings.filter((b) => b.status === 'PENDING')
  const revenue = payments.filter((p) => iso(new Date(p.at)) === today).reduce((a, p) => a + p.amount, 0)
  const fresh = inquiries.filter((q) => q.status === 'NEW').length
  const owner = session?.role === 'OWNER'
  const tiles = [
    { l: "Today's bookings", v: String(todays.length), I: CalendarDays },
    { l: 'Pending approval', v: String(pending.length), I: Clock },
    { l: 'Revenue today', v: owner ? peso(revenue) : 'Owner only', I: owner ? Wallet : Lock },
    { l: 'New inquiries', v: String(fresh), I: Inbox },
  ]
  const now = nowMin()
  const courtNow = (id: string, st: string) => {
    if (st === 'MAINTENANCE') return { t: 'Maintenance', I: Wrench, c: 'bg-st-pending-bg text-st-pending' }
    if (st === 'CLOSED') return { t: 'Closed', I: Lock, c: 'bg-st-done-bg text-st-done' }
    const cur = todays.find((b) => b.courtId === id && b.start <= now && now < b.start + b.duration)
    if (cur) return cur.status === 'CHECKED_IN' ? { t: 'In play', I: Activity, c: 'bg-st-checked-bg text-st-checked' } : { t: 'Booked now', I: Clock, c: 'bg-st-confirmed-bg text-st-confirmed' }
    return { t: 'Free now', I: CheckCircle2, c: 'bg-sage text-forest' }
  }
  return (
    <>
      <PageHeader eyebrow={fmtDate(today, true)} title="Dashboard" actions={<Button icon={Plus} onClick={() => setCreate(true)}>New booking</Button>} />
      <div className="grid grid-cols-2 gap-3 md:gap-5 xl:grid-cols-4">
        {tiles.map(({ l, v, I }) => (
          <div key={l} className="card p-4 md:p-5"><I size={20} className="text-clay" aria-hidden /><p className="display mt-3 text-3xl md:text-4xl">{v}</p><p className="eyebrow mt-1">{l}</p></div>
        ))}
      </div>
      <div className="mt-8 grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="sch">
          <h2 id="sch" className="display mb-4 text-3xl">Today's schedule</h2>
          {todays.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No bookings today" body="New bookings for today will appear here." action={<Button variant="secondary" onClick={() => setCreate(true)}>Create a booking</Button>} />
          ) : (
            <ul className="card divide-y divide-line">
              {todays.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-3 p-4">
                  <button type="button" onClick={() => setOpen(b.id)} className="min-h-11 min-w-0 flex-1 cursor-pointer text-left">
                    <p className="font-bold">{fmtMin(b.start)} · {b.name}</p><p className="text-sm text-ink-soft">{court(b.courtId)} · {service(b.serviceId)} · {b.ref}</p>
                  </button>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
          <h2 className="display mb-4 mt-10 text-3xl">Needs approval</h2>
          {pending.length === 0 ? <p className="rounded-md border border-dashed border-edge p-4 text-ink-soft">Nothing pending. Online requests land here first.</p> : (
            <ul className="space-y-3">{pending.slice(0, 5).map((b) => (
              <li key={b.id} className="card space-y-3 p-4"><button type="button" onClick={() => setOpen(b.id)} className="min-h-11 cursor-pointer text-left font-bold">{b.ref} · {b.name} · {fmtDate(b.date)} {fmtMin(b.start)}</button><StatusActions booking={b} /></li>
            ))}</ul>
          )}
        </section>
        <div className="space-y-8">
          <section aria-labelledby="cs">
            <h2 id="cs" className="display mb-4 text-3xl">Court status</h2>
            {courts.length === 0 ? <EmptyState icon={Wrench} title="No courts yet" action={<><Button to="/admin/courts" variant="secondary">Add courts</Button><Button variant="ghost" onClick={loadPlaceholderSetup}>Load placeholders</Button></>} /> : (
              <ul className="card divide-y divide-line">{courts.map((c) => { const s = courtNow(c.id, c.status); return (
                <li key={c.id} className="flex items-center justify-between p-4"><span className="font-bold">{c.name}</span><span className={cn('badge border-transparent', s.c)}><s.I size={14} aria-hidden /> {s.t}</span></li>) })}</ul>
            )}
          </section>
          <section aria-labelledby="qa">
            <h2 id="qa" className="display mb-4 text-3xl">Quick actions</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Button variant="secondary" icon={Plus} onClick={() => setCreate(true)}>New booking</Button>
              <Button to="/admin/calendar" variant="secondary" icon={CalendarDays}>Open calendar</Button>
              <Button to="/admin/inquiries" variant="secondary" icon={Inbox}>Inquiries{fresh ? ` (${fresh} new)` : ''}</Button>
              <Button to="/admin/content" variant="secondary" icon={PenLine}>Edit website</Button>
            </div>
            {services.length === 0 && <p className="mt-3 text-sm text-ink-soft">Tip: add services in Services & Rates to set pricing.</p>}
          </section>
        </div>
      </div>
      <BookingDrawer id={open} onClose={() => setOpen(null)} />
      <ManualCreate open={create} onClose={() => setCreate(false)} />
    </>
  )
}

/* ---------------- Bookings ---------------- */
type Sort = 'date-asc' | 'date-desc' | 'created' | 'status'
export function Bookings() {
  const { bookings, courts } = useStore()
  const { court, service } = useLookups()
  const [q, setQ] = useState('')
  const [st, setSt] = useState<Status | 'ALL'>('ALL')
  const [when, setWhen] = useState('all')
  const [ct, setCt] = useState('all')
  const [sort, setSort] = useState<Sort>('date-asc')
  const [open, setOpen] = useState<string | null>(null)
  const [create, setCreate] = useState(false)
  const today = todayISO()
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    const r = bookings.filter((b) =>
      (st === 'ALL' || b.status === st) && (ct === 'all' || b.courtId === ct) &&
      (when === 'all' || (when === 'today' ? b.date === today : when === 'upcoming' ? b.date >= today : b.date < today)) &&
      (!t || [b.ref, b.name, b.phone, b.email].some((v) => v.toLowerCase().includes(t))))
    const key = (b: Booking) => b.date + String(b.start).padStart(4, '0')
    return r.sort((a, b) => sort === 'date-asc' ? key(a).localeCompare(key(b)) : sort === 'date-desc' ? key(b).localeCompare(key(a)) : sort === 'created' ? b.createdAt - a.createdAt : STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status))
  }, [bookings, q, st, ct, when, sort, today])
  const count = (s: Status) => bookings.filter((b) => b.status === s).length
  return (
    <>
      <PageHeader eyebrow="Manage" title="Bookings" actions={<Button icon={Plus} onClick={() => setCreate(true)}>New booking</Button>} />
      <div className="card mb-6 space-y-4 p-4">
        <div className="relative"><Search size={18} className="pointer-events-none absolute left-3.5 top-[2.9rem] text-ink-soft" aria-hidden /><Input label="Search" type="search" className="!pl-10" placeholder="Reference, name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
          {(['ALL', ...STATUSES] as const).map((s) => (
            <button key={s} type="button" aria-pressed={st === s} onClick={() => setSt(s)} className={cn('inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-2 px-4 text-sm font-bold', st === s ? 'border-forest bg-forest text-cream' : 'border-edge/60 hover:border-forest')}>
              {s !== 'ALL' && (() => { const I = STATUS_STYLE[s].icon; return <I size={14} aria-hidden /> })()}{s === 'ALL' ? 'All' : STATUS_LABEL[s]} <span className="font-mono text-xs">{s === 'ALL' ? bookings.length : count(s)}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="When" value={when} onChange={(e) => setWhen(e.target.value)}><option value="all">All dates</option><option value="today">Today</option><option value="upcoming">Upcoming</option><option value="past">Past</option></Select>
          <Select label="Court" value={ct} onChange={(e) => setCt(e.target.value)}><option value="all">All courts</option>{courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Select label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as Sort)}><option value="date-asc">Play date, soonest</option><option value="date-desc">Play date, latest</option><option value="created">Recently created</option><option value="status">Status</option></Select>
        </div>
      </div>
      {bookings.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No bookings yet" body="Online requests and manual bookings will be listed here." action={<Button icon={Plus} onClick={() => setCreate(true)}>Create first booking</Button>} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Search} title="No matches" body="Try clearing the search or filters." action={<Button variant="secondary" onClick={() => { setQ(''); setSt('ALL'); setWhen('all'); setCt('all') }}>Clear filters</Button>} />
      ) : (
        <>
          <p className="mb-3 flex items-center gap-2 text-sm text-ink-soft"><ArrowUpDown size={14} aria-hidden /> {rows.length} booking{rows.length === 1 ? '' : 's'}</p>
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Bookings</caption>
              <thead className="border-b border-line bg-sand/50"><tr>{['Reference', 'When', 'Court', 'Customer', 'Status', ''].map((h) => <th key={h} scope="col" className="eyebrow px-4 py-3">{h || 'Open'}</th>)}</tr></thead>
              <tbody className="divide-y divide-line">{rows.map((b) => (
                <tr key={b.id} className="hover:bg-sand/30">
                  <td className="px-4 py-3 font-mono">{b.ref}</td>
                  <td className="px-4 py-3">{fmtDate(b.date)}<br /><span className="text-ink-soft">{fmtMin(b.start)}</span></td>
                  <td className="px-4 py-3">{court(b.courtId)}<br /><span className="text-ink-soft">{service(b.serviceId)}</span></td>
                  <td className="px-4 py-3">{b.name}<br /><span className="text-ink-soft">{b.phone}</span></td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3"><Button variant="secondary" onClick={() => setOpen(b.id)} aria-label={`Open ${b.ref}`}>Details</Button></td>
                </tr>))}</tbody>
            </table>
          </div>
          <ul className="space-y-3 md:hidden">{rows.map((b) => (
            <li key={b.id}><button type="button" onClick={() => setOpen(b.id)} className="card block w-full cursor-pointer p-4 text-left"><div className="flex items-start justify-between gap-3"><p className="font-mono text-sm">{b.ref}</p><StatusBadge status={b.status} /></div><p className="mt-2 font-bold">{b.name}</p><p className="text-sm text-ink-soft">{fmtDate(b.date)} · {fmtMin(b.start)} · {court(b.courtId)}</p></button></li>
          ))}</ul>
        </>
      )}
      <BookingDrawer id={open} onClose={() => setOpen(null)} />
      <ManualCreate open={create} onClose={() => setCreate(false)} />
    </>
  )
}

/* ---------------- Calendar ---------------- */
type View = 'day' | 'week' | 'month'
function Chip({ b, label, onOpen, cont }: { b: Booking; label: string; onOpen: () => void; cont?: boolean }) {
  const { icon: I, cls } = STATUS_STYLE[b.status]
  return (
    <button type="button" onClick={onOpen} className={cn('flex min-h-11 w-full cursor-pointer items-start gap-1.5 rounded-sm border px-2 py-1 text-left text-xs font-semibold', cls, cont && 'border-dashed')}>
      <I size={13} className="mt-0.5 shrink-0" aria-hidden />
      <span><span className="block">{STATUS_LABEL[b.status]}{cont && ' (continues)'}</span><span className="font-medium">{label}</span></span>
    </button>
  )
}
export function CalendarPage() {
  const { bookings, courts, settings } = useStore()
  const [view, setView] = useState<View>('day')
  const [date, setDate] = useState(todayISO())
  const [open, setOpen] = useState<string | null>(null)
  const [create, setCreate] = useState<{ date: string; courtId?: string; start?: number } | null>(null)
  const times = slotTimes()
  const hours = times.length ? Array.from({ length: Math.ceil((times[times.length - 1] + 60 - times[0]) / 60) }, (_, i) => Math.floor(times[0] / 60) * 60 + i * 60) : []
  const step = view === 'day' ? 1 : view === 'week' ? 7 : 0
  const move = (dir: number) => {
    if (view === 'month') { const d = parseISO(date); d.setMonth(d.getMonth() + dir); setDate(iso(d)) } else setDate(addDays(date, dir * step))
  }
  const weekStart = addDays(date, -parseISO(date).getDay())
  const label = view === 'day' ? fmtDate(date, true) : view === 'week' ? `${fmtDate(weekStart)} – ${fmtDate(addDays(weekStart, 6))}` : parseISO(date).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
  const on = (d: string, courtId?: string) => bookings.filter((b) => b.date === d && b.status !== 'CANCELLED' && b.status !== 'NO_SHOW' ? (!courtId || b.courtId === courtId) : false)
  const any = (d: string) => bookings.filter((b) => b.date === d)

  const body = () => {
    if (!courts.length) return <EmptyState icon={Wrench} title="Add a court to see the calendar" action={<><Button to="/admin/courts" variant="secondary">Add courts</Button><Button variant="ghost" onClick={loadPlaceholderSetup}>Load placeholders</Button></>} />
    if (view === 'month') {
      const d0 = parseISO(date); const first = new Date(d0.getFullYear(), d0.getMonth(), 1); const n = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate()
      const cells = [...Array(first.getDay()).fill(null), ...Array.from({ length: n }, (_, i) => iso(new Date(d0.getFullYear(), d0.getMonth(), i + 1)))]
      return (
        <div className="grid grid-cols-7 gap-1.5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <span key={d} className="eyebrow p-1 text-center">{d}</span>)}
          {cells.map((c, i) => {
            if (!c) return <span key={i} />
            const all = any(c); const act = all.filter((b) => b.status !== 'CANCELLED' && b.status !== 'NO_SHOW'); const pend = all.filter((b) => b.status === 'PENDING').length
            return (
              <button key={c} type="button" onClick={() => { setDate(c); setView('day') }} aria-label={`${fmtDate(c, true)}: ${act.length} bookings, ${pend} pending. Open day view`}
                className={cn('flex min-h-20 cursor-pointer flex-col items-start rounded-md border p-1.5 text-left text-xs hover:border-forest md:min-h-28 md:p-2', c === todayISO() ? 'border-2 border-clay bg-paper' : 'border-line bg-paper')}>
                <span className="text-sm font-bold">{parseISO(c).getDate()}</span>
                {act.length > 0 && <span className="mt-auto flex items-center gap-1 font-semibold"><CalendarDays size={12} aria-hidden /> {act.length}<span className="hidden md:inline"> booked</span></span>}
                {pend > 0 && <span className="flex items-center gap-1 text-st-pending"><Clock size={12} aria-hidden /> {pend}<span className="hidden md:inline"> pending</span></span>}
              </button>
            )
          })}
        </div>
      )
    }
    if (view === 'week') {
      const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
      return (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-sm">
            <caption className="sr-only">Week by court</caption>
            <thead><tr><th scope="col" className="eyebrow w-28 p-2 text-left">Court</th>{days.map((d) => <th key={d} scope="col" className={cn('p-2 text-left', d === todayISO() && 'text-clay')}><button type="button" className="min-h-11 cursor-pointer font-bold underline-offset-4 hover:underline" onClick={() => { setDate(d); setView('day') }}>{fmtDate(d)}</button></th>)}</tr></thead>
            <tbody>{courts.map((c) => (
              <tr key={c.id} className="border-t border-line align-top">
                <th scope="row" className="p-2 text-left font-bold">{c.name}{c.status !== 'AVAILABLE' && <span className="flex items-center gap-1 text-xs font-semibold text-st-pending"><Wrench size={12} aria-hidden /> {c.status === 'CLOSED' ? 'Closed' : 'Maintenance'}</span>}</th>
                {days.map((d) => (
                  <td key={d} className={cn('p-1.5', c.status !== 'AVAILABLE' && 'hatch')}>
                    <div className="space-y-1.5">{on(d, c.id).sort((a, b) => a.start - b.start).map((b) => <Chip key={b.id} b={b} label={`${fmtMin(b.start)} · ${b.name}`} onOpen={() => setOpen(b.id)} />)}
                      {c.status === 'AVAILABLE' && <button type="button" onClick={() => setCreate({ date: d, courtId: c.id })} aria-label={`Add booking ${c.name} ${fmtDate(d)}`} className="grid min-h-11 w-full cursor-pointer place-items-center rounded-sm border border-dashed border-edge/60 text-ink-soft hover:bg-sage/40"><Plus size={16} aria-hidden /></button>}</div>
                  </td>))}
              </tr>))}</tbody>
          </table>
        </div>
      )
    }
    if (!hours.length) return <EmptyState icon={Clock} title="Opening hours not set" body="Set opening and closing time to see the day grid." action={<Button to="/admin/settings" variant="secondary">Open settings</Button>} />
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <caption className="sr-only">Day schedule by court</caption>
          <thead><tr><th scope="col" className="eyebrow w-20 p-2 text-left">Time</th>{courts.map((c) => <th key={c.id} scope="col" className="p-2 text-left font-bold">{c.name}{c.status !== 'AVAILABLE' && <span className="flex items-center gap-1 text-xs font-semibold text-st-pending"><Wrench size={12} aria-hidden /> {c.status === 'CLOSED' ? 'Closed' : 'Maintenance'}</span>}</th>)}</tr></thead>
          <tbody>{hours.map((h) => (
            <tr key={h} className="border-t border-line align-top">
              <th scope="row" className="whitespace-nowrap p-2 text-left font-mono text-xs">{fmtMin(h)}</th>
              {courts.map((c) => {
                const here = on(date, c.id).filter((b) => b.start < h + 60 && b.start + b.duration > h)
                return (
                  <td key={c.id} className={cn('p-1.5', c.status !== 'AVAILABLE' && 'hatch')}>
                    <div className="space-y-1.5">{here.map((b) => { const cont = b.start < h; return <Chip key={b.id} b={b} cont={cont} label={cont ? b.name : `${fmtMin(b.start)}–${fmtMin(b.start + b.duration)} · ${b.name}`} onOpen={() => setOpen(b.id)} /> })}
                      {!here.length && c.status === 'AVAILABLE' && <button type="button" onClick={() => setCreate({ date, courtId: c.id, start: h })} aria-label={`Add booking ${c.name} ${fmtMin(h)}`} className="grid min-h-11 w-full cursor-pointer place-items-center rounded-sm border border-dashed border-edge/60 text-ink-soft hover:bg-sage/40"><Plus size={16} aria-hidden /></button>}
                      {!here.length && c.status !== 'AVAILABLE' && <span className="block min-h-11 text-xs text-st-pending">{c.status === 'CLOSED' ? 'Closed' : 'Maintenance'}</span>}</div>
                  </td>)
              })}
            </tr>))}</tbody>
        </table>
        <p className="mt-2 text-xs text-ink-soft">Hours {settings.openTime}–{settings.closeTime}.</p>
      </div>
    )
  }
  return (
    <>
      <PageHeader eyebrow="Schedule" title="Calendar" actions={<Button icon={Plus} onClick={() => setCreate({ date })}>New booking</Button>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented label="Calendar view" value={view} onChange={setView} options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
        <div className="flex items-center gap-1">
          <button type="button" className="btn btn-secondary !px-3" aria-label={`Previous ${view}`} onClick={() => move(-1)}><ChevronLeft aria-hidden /></button>
          <button type="button" className="btn btn-secondary" onClick={() => setDate(todayISO())}>Today</button>
          <button type="button" className="btn btn-secondary !px-3" aria-label={`Next ${view}`} onClick={() => move(1)}><ChevronRight aria-hidden /></button>
        </div>
        <p className="display text-2xl" aria-live="polite">{label}</p>
      </div>
      <ul className="mb-5 flex flex-wrap gap-2" aria-label="Status legend">{STATUSES.map((s) => <li key={s}><StatusBadge status={s} /></li>)}<li><span className="badge hatch border-edge text-bark"><Wrench size={14} aria-hidden /> Court unavailable</span></li></ul>
      <div className="card p-3 md:p-5">{body()}</div>
      <BookingDrawer id={open} onClose={() => setOpen(null)} />
      <ManualCreate open={!!create} onClose={() => setCreate(null)} defaults={create ?? undefined} />
      <p className="sr-only"><Link to="/admin/bookings">Bookings list</Link></p>
    </>
  )
}
