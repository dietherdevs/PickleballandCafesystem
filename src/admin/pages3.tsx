import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { BarChart3, Check, ChevronRight, Download, ExternalLink, Minus, Plus, Save, ScrollText, Search, Trash2, Undo2, UserPlus } from 'lucide-react'
import { Badge, Button, ConfirmDialog, EmptyState, ImageSlot, Input, PageHeader, Select, StatusBadge, TextArea, toast } from '../components/ui'
import { CONTENT_PAGES } from '../lib/content'
import { STATUSES, inviteUser, loadPlaceholderSetup, paidFor, resetPrototype, saveContent, saveSettings, updateUser, useStore, type Role } from '../lib/store'
import { addDays, download, fmtDur, fmtStamp, peso, todayISO, toCSV } from '../lib/util'
import { OwnerOnly } from './AdminLayout'
import { useLookups } from './bookingParts'

/* ---------------- Website content ---------------- */
export function ContentEditor() {
  const { content } = useStore()
  const [pid, setPid] = useState('home')
  const [sid, setSid] = useState('hero')
  const page = CONTENT_PAGES.find((p) => p.id === pid)!
  const section = page.sections.find((s) => s.id === sid) ?? page.sections[0]
  const [draft, setDraft] = useState<Record<string, string>>({})
  useEffect(() => setDraft(Object.fromEntries(section.fields.map((f) => [f.key, content[f.key] ?? '']))), [section.id, pid]) // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = section.fields.some((f) => (draft[f.key] ?? '') !== (content[f.key] ?? ''))
  return (
    <OwnerOnly name="Website Content">
      <PageHeader eyebrow="Website" title="Content editor" actions={<Button href={page.path} variant="secondary" icon={ExternalLink}>View page</Button>} />
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1 text-sm font-semibold">
        <span>{page.label}</span><ChevronRight size={14} aria-hidden /><span className="text-clay">{section.label}</span><ChevronRight size={14} aria-hidden /><span className="text-ink-soft">Edit fields</span>
      </nav>
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <div className="space-y-4">
          <ul className="card divide-y divide-line">{CONTENT_PAGES.map((p) => (
            <li key={p.id}>
              <button type="button" aria-current={p.id === pid} onClick={() => { setPid(p.id); setSid(p.sections[0].id) }} className={`flex min-h-11 w-full cursor-pointer items-center justify-between px-4 text-left font-bold ${p.id === pid ? 'bg-forest text-cream' : 'hover:bg-sand'}`}>{p.label}<ChevronRight size={16} aria-hidden /></button>
              {p.id === pid && p.sections.length > 1 && <ul className="bg-sand/40 py-1">{p.sections.map((s) => <li key={s.id}><button type="button" aria-current={s.id === section.id} onClick={() => setSid(s.id)} className={`min-h-11 w-full cursor-pointer px-6 text-left text-sm font-semibold ${s.id === section.id ? 'text-clay underline underline-offset-4' : 'hover:underline'}`}>{s.label}</button></li>)}</ul>}
            </li>))}</ul>
        </div>
        <form className="card space-y-6 p-5 md:p-8" onSubmit={(e) => { e.preventDefault(); saveContent(draft, `${page.label} → ${section.label}`); toast('Published to website') }}>
          <h2 className="display text-3xl">{section.label}</h2>
          {section.images?.map((i) => <div key={i.key}><p className="label">{i.label}</p><ImageSlot slot={i.key} label={i.label} className="aspect-[16/9] max-w-xl" /></div>)}
          {section.fields.map((f) => f.multiline
            ? <TextArea key={f.key} label={f.label} hint={f.hint} placeholder={f.fallback ?? f.placeholder} value={draft[f.key] ?? ''} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
            : <Input key={f.key} label={f.label} hint={f.hint} placeholder={f.fallback ?? f.placeholder} value={draft[f.key] ?? ''} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />)}
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
            <Button type="submit" icon={Save} disabled={!dirty}>Publish changes</Button>
            <Button variant="secondary" icon={Undo2} disabled={!dirty} onClick={() => setDraft(Object.fromEntries(section.fields.map((f) => [f.key, content[f.key] ?? ''])))}>Discard</Button>
            <span className="text-sm text-ink-soft" role="status">{dirty ? 'Unsaved changes' : 'All changes published'}</span>
          </div>
        </form>
      </div>
    </OwnerOnly>
  )
}

/* ---------------- Settings ---------------- */
export function SettingsPage() {
  const { settings } = useStore()
  const [f, setF] = useState({ open: settings.openTime ?? '', close: settings.closeTime ?? '', dep: settings.depositPercent == null ? '' : String(settings.depositPercent), cancel: settings.cancellationPolicy, rules: settings.houseRules, pay: settings.paymentInstructions })
  const [err, setErr] = useState<Record<string, string>>({})
  const [reset, setReset] = useState(false)
  return (
    <OwnerOnly name="Settings">
      <PageHeader eyebrow="Configure" title="Settings" />
      <form noValidate className="card max-w-3xl space-y-6 p-5 md:p-8" onSubmit={(e) => {
        e.preventDefault()
        const er: Record<string, string> = {}
        if (f.open && f.close && f.open >= f.close) er.close = 'Closing time must be after opening time.'
        if (f.dep && !(Number(f.dep) >= 0 && Number(f.dep) <= 100)) er.dep = 'Enter a percentage from 0 to 100.'
        setErr(er); if (Object.keys(er).length) return
        saveSettings({ openTime: f.open || null, closeTime: f.close || null, depositPercent: f.dep === '' ? null : Number(f.dep), cancellationPolicy: f.cancel, houseRules: f.rules, paymentInstructions: f.pay }); toast('Settings saved')
      }}>
        <div className="grid gap-5 sm:grid-cols-3">
          <Input label="Opens" type="time" value={f.open} onChange={(e) => setF({ ...f, open: e.target.value })} />
          <Input label="Closes" type="time" value={f.close} error={err.close} onChange={(e) => setF({ ...f, close: e.target.value })} />
          <Input label="Deposit (%)" type="number" min={0} max={100} inputMode="numeric" value={f.dep} error={err.dep} hint="Blank = not decided." onChange={(e) => setF({ ...f, dep: e.target.value })} />
        </div>
        <TextArea label="Cancellation policy" hint="Shown in the booking summary and Rates page." value={f.cancel} onChange={(e) => setF({ ...f, cancel: e.target.value })} />
        <TextArea label="House rules" value={f.rules} onChange={(e) => setF({ ...f, rules: e.target.value })} />
        <TextArea label="Deposit payment instructions" hint="Shown on the confirmation page." value={f.pay} onChange={(e) => setF({ ...f, pay: e.target.value })} />
        <Button type="submit" icon={Save}>Save settings</Button>
      </form>
      <section className="card mt-8 max-w-3xl space-y-4 border-dashed p-5 md:p-8" aria-labelledby="pd">
        <h2 id="pd" className="display text-2xl">Prototype data</h2>
        <p className="text-ink-soft">Everything is stored in this browser only. A backend replaces this.</p>
        <div className="flex flex-wrap gap-3"><Button variant="secondary" onClick={() => { loadPlaceholderSetup(); toast('Placeholder setup loaded') }}>Load placeholder setup</Button><Button variant="danger" icon={Trash2} onClick={() => setReset(true)}>Clear all prototype data</Button></div>
      </section>
      <ConfirmDialog open={reset} onClose={() => setReset(false)} danger title="Clear all data?" confirmLabel="Clear everything" body={<p>Bookings, customers, payments, content and photos are deleted from this browser. You stay signed in.</p>} onConfirm={() => { resetPrototype(); setReset(false); setF({ open: '', close: '', dep: '', cancel: '', rules: '', pay: '' }); toast('Prototype data cleared') }} />
    </OwnerOnly>
  )
}

/* ---------------- Users & roles ---------------- */
const CAPS: [string, boolean, boolean][] = [
  ['View dashboard, bookings and calendar', true, true], ['Create bookings and change status', true, true], ['Record payments', true, true], ['Manage courts availability', true, true], ['Customers, inquiries and gallery', true, true],
  ['Services & rates, website content', true, false], ['Reports and payments overview', true, false], ['Users & roles, audit log, settings', true, false],
]
export function Users() {
  const { users, session } = useStore()
  const owner = session?.role === 'OWNER'
  const [f, setF] = useState({ name: '', email: '', role: 'STAFF' as Role })
  const [err, setErr] = useState('')
  return (
    <>
      <PageHeader eyebrow="Access" title="Users & roles" />
      <section aria-labelledby="mx" className="mb-10"><h2 id="mx" className="display mb-3 text-3xl">What each role can do</h2>
        <div className="card overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Role permissions</caption><thead className="border-b border-line bg-sand/50"><tr><th scope="col" className="eyebrow p-3">Capability</th><th scope="col" className="eyebrow p-3">Owner</th><th scope="col" className="eyebrow p-3">Staff</th></tr></thead>
          <tbody className="divide-y divide-line">{CAPS.map(([c, o, s]) => <tr key={c}><th scope="row" className="p-3 font-semibold">{c}</th>{[o, s].map((v, i) => <td key={i} className="p-3"><span className="inline-flex items-center gap-1.5 font-semibold">{v ? <><Check size={16} className="text-moss" aria-hidden /> Allowed</> : <><Minus size={16} aria-hidden /> Not allowed</>}</span></td>)}</tr>)}</tbody></table></div>
        <p className="mt-3 text-sm text-ink-soft">Prototype: role rules are enforced in the interface only. The backend must enforce them on every request.</p>
      </section>
      {!owner ? <EmptyState icon={UserPlusIcon} title="Managing users is owner-only" body="Switch to the Owner view to invite people or change roles." /> : (
        <>
          <form noValidate className="card mb-6 grid items-end gap-4 p-5 sm:grid-cols-[1fr_1fr_10rem_auto]" onSubmit={(e) => { e.preventDefault(); if (!f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Enter a name and a valid email.'); setErr(''); inviteUser(f.name.trim(), f.email.trim(), f.role); setF({ name: '', email: '', role: 'STAFF' }); toast('User added') }}>
            <Input label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /><Input label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <Select label="Role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}><option value="STAFF">Staff</option><option value="OWNER">Owner</option></Select>
            <Button type="submit" icon={Plus}>Invite</Button>{err && <p role="alert" className="font-semibold text-st-cancel sm:col-span-4">{err}</p>}
          </form>
          <ul className="card divide-y divide-line">{users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><span><b>{u.name}</b>{u.email === session?.email && <span className="text-ink-soft"> (you)</span>}<br /><span className="text-sm text-ink-soft">{u.email}</span></span>
              <span className="flex flex-wrap items-center gap-3">{!u.active && <Badge tone="bad">Deactivated</Badge>}
                <Select label="Role" className="!min-w-32" value={u.role} disabled={u.email === session?.email} onChange={(e) => updateUser(u.id, { role: e.target.value as Role })}><option value="OWNER">Owner</option><option value="STAFF">Staff</option></Select>
                <Button variant={u.active ? 'danger' : 'secondary'} disabled={u.email === session?.email} onClick={() => updateUser(u.id, { active: !u.active })}>{u.active ? 'Deactivate' : 'Reactivate'}</Button></span></li>))}</ul>
        </>
      )}
    </>
  )
}
const UserPlusIcon = UserPlus

/* ---------------- Audit log ---------------- */
export function AuditLog() {
  const { audit } = useStore()
  const [q, setQ] = useState('')
  const rows = audit.filter((a) => [a.actor, a.action, a.target].some((v) => v.toLowerCase().includes(q.toLowerCase())))
  return (
    <OwnerOnly name="Audit Log">
      <PageHeader eyebrow="Accountability" title="Audit log" actions={<Button variant="secondary" icon={Download} disabled={!audit.length} onClick={() => download('audit-log.csv', toCSV([['When', 'Who', 'Role', 'Action', 'Target'], ...audit.map((a) => [fmtStamp(a.at), a.actor, a.role, a.action, a.target])]), 'text/csv')}>Export CSV</Button>} />
      <div className="mb-5 max-w-md"><Input label="Search log" type="search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {audit.length === 0 ? <EmptyState icon={ScrollText} title="No activity yet" body="Sign-ins, status changes, edits and bookings are recorded here automatically." /> : rows.length === 0 ? <EmptyState icon={Search} title="No matches" /> : (
        <div className="card overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Audit log</caption><thead className="border-b border-line bg-sand/50"><tr>{['When', 'Who', 'Action', 'Target'].map((h) => <th key={h} scope="col" className="eyebrow p-3">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">{rows.map((a) => <tr key={a.id}><td className="whitespace-nowrap p-3">{fmtStamp(a.at)}</td><td className="p-3 font-semibold">{a.actor} <span className="font-mono text-xs text-ink-soft">{a.role}</span></td><td className="p-3">{a.action}</td><td className="p-3">{a.target}</td></tr>)}</tbody></table></div>
      )}
    </OwnerOnly>
  )
}

/* ---------------- Reports ---------------- */
function Bars({ rows, unit = '' }: { rows: { label: string; value: number; node?: React.ReactNode }[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="space-y-3">{rows.map((r) => (
      <li key={r.label}><div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{r.node ?? r.label}</span><span className="font-mono">{r.value}{unit}</span></div><div className="h-3 rounded-full bg-sand" aria-hidden><div className="h-3 rounded-full bg-moss" style={{ width: `${(r.value / max) * 100}%` }} /></div></li>
    ))}</ul>
  )
}
export function Reports() {
  const { bookings, payments } = useStore()
  const { court, service } = useLookups()
  const [range, setRange] = useState('30')
  const today = todayISO()
  const list = useMemo(() => bookings.filter((b) => range === 'all' || (b.date >= addDays(today, -Number(range) + 1) && b.date <= today)), [bookings, range, today])
  const ids = new Set(list.map((b) => b.id))
  const collected = payments.filter((p) => ids.has(p.bookingId)).reduce((a, p) => a + p.amount, 0)
  const billable = list.filter((b) => b.status !== 'CANCELLED' && b.status !== 'NO_SHOW')
  const outstanding = billable.reduce((a, b) => a + Math.max(0, (b.total ?? 0) - paidFor(b.id)), 0)
  const by = (fn: (b: (typeof list)[number]) => string) => Object.entries(billable.reduce<Record<string, number>>((m, b) => ({ ...m, [fn(b)]: (m[fn(b)] ?? 0) + b.duration / 60 }), {})).map(([label, value]) => ({ label, value }))
  return (
    <OwnerOnly name="Reports">
      <PageHeader eyebrow="Insight" title="Reports" actions={<Button variant="secondary" icon={Download} disabled={!list.length} onClick={() => download('bookings-report.csv', toCSV([['Reference', 'Date', 'Court', 'Service', 'Duration', 'Status', 'Total', 'Paid'], ...list.map((b) => [b.ref, b.date, court(b.courtId), service(b.serviceId), fmtDur(b.duration), b.status, b.total, paidFor(b.id)])]), 'text/csv')}>Export CSV</Button>} />
      <div className="mb-6 max-w-xs"><Select label="Play dates" value={range} onChange={(e) => setRange(e.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All time</option></Select></div>
      {list.length === 0 ? <EmptyState icon={BarChart3} title="No bookings in this range" body="Reports fill in as bookings are made." action={<Button to="/admin/bookings" variant="secondary">Open bookings</Button>} /> : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">{[['Bookings', String(list.length)], ['Hours booked', `${billable.reduce((a, b) => a + b.duration / 60, 0)}`], ['Collected', peso(collected, '₱0')], ['Outstanding', peso(outstanding, '₱0')]].map(([l, v]) => <div key={l} className="card p-5"><p className="display text-3xl md:text-4xl">{v}</p><p className="eyebrow mt-1">{l}</p></div>)}</div>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-5" aria-labelledby="r1"><h2 id="r1" className="display mb-4 text-2xl">By status</h2><Bars rows={STATUSES.map((s) => ({ label: s, value: list.filter((b) => b.status === s).length, node: <StatusBadge status={s} /> }))} /></section>
            <section className="card p-5" aria-labelledby="r2"><h2 id="r2" className="display mb-4 text-2xl">Hours by court</h2>{by((b) => court(b.courtId)).length ? <Bars unit=" h" rows={by((b) => court(b.courtId))} /> : <p className="text-ink-soft">No billable bookings.</p>}</section>
            <section className="card p-5" aria-labelledby="r3"><h2 id="r3" className="display mb-4 text-2xl">Hours by service</h2>{by((b) => service(b.serviceId)).length ? <Bars unit=" h" rows={by((b) => service(b.serviceId))} /> : <p className="text-ink-soft">No billable bookings.</p>}</section>
          </div>
        </>
      )}
      <p className="sr-only"><Link to="/admin">Dashboard</Link></p>
    </OwnerOnly>
  )
}
