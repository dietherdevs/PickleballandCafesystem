import { useState, type FormEvent } from 'react'
import { Download, ImagePlus, Inbox, LayoutGrid, Mail, Plus, Save, Search, Tag, Trash2, Users, Wallet, Archive, Undo2, CheckCheck } from 'lucide-react'
import { Badge, Button, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Segmented, Select, TextArea, fileToDataURL, toast } from '../components/ui'
import {
  addCourt, addGalleryImages, loadPlaceholderSetup, paidFor, removeCourt, removeCustomer, removeGalleryImage, removeMenuItem, removeService, saveCustomer,
  saveMenuItem, saveService, setInquiryStatus, updateCourt, updateGalleryCaption, useStore, type Court, type CourtStatus, type Inquiry, type MenuItem, type Service,
} from '../lib/store'
import { cn, download, fmtDate, fmtMin, fmtStamp, peso, toCSV } from '../lib/util'
import { OwnerOnly } from './AdminLayout'
import { BookingDrawer } from './bookingParts'

/* ---------------- Courts ---------------- */
function CourtCard({ c }: { c: Court }) {
  const [f, setF] = useState({ name: c.name, notes: c.notes, max: c.maxPlayers == null ? '' : String(c.maxPlayers) })
  const [del, setDel] = useState(false)
  const dirty = f.name !== c.name || f.notes !== c.notes || f.max !== (c.maxPlayers == null ? '' : String(c.maxPlayers))
  return (
    <li className="card space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Court name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Select label="Status" value={c.status} onChange={(e) => { updateCourt(c.id, { status: e.target.value as CourtStatus }); toast(`${c.name}: ${e.target.value.toLowerCase()}`) }}>
          <option value="AVAILABLE">Available</option><option value="MAINTENANCE">Under maintenance</option><option value="CLOSED">Closed</option>
        </Select>
        <Input label="Max players" type="number" min={1} optional value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} />
        <Input label="Notes" optional value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button icon={Save} disabled={!dirty || !f.name.trim()} onClick={() => { updateCourt(c.id, { name: f.name.trim(), notes: f.notes, maxPlayers: f.max ? Number(f.max) : null }); toast('Court saved') }}>Save</Button>
        <Button variant="danger" icon={Trash2} onClick={() => setDel(true)}>Remove</Button>
      </div>
      <ConfirmDialog open={del} onClose={() => setDel(false)} danger title="Remove court?" confirmLabel="Remove court" body={<p>{c.name} will no longer be bookable. Existing bookings stay in the list.</p>} onConfirm={() => { removeCourt(c.id); setDel(false) }} />
    </li>
  )
}
export function Courts() {
  const { courts } = useStore()
  const [name, setName] = useState('')
  return (
    <>
      <PageHeader eyebrow="Facility" title="Courts">Set each court's availability. Unavailable courts cannot be booked and show as hatched in the calendar.</PageHeader>
      <form className="card mb-6 flex flex-wrap items-end gap-3 p-4" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { addCourt(name.trim()); setName(''); toast('Court added') } }}>
        <div className="min-w-56 flex-1"><Input label="Add a court" placeholder="e.g. court name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <Button type="submit" icon={Plus} disabled={!name.trim()}>Add court</Button>
      </form>
      {courts.length === 0 ? <EmptyState icon={LayoutGrid} title="No courts yet" body="Add your first court above." action={<Button variant="secondary" onClick={loadPlaceholderSetup}>Load placeholder setup</Button>} /> : <ul className="grid gap-5 lg:grid-cols-2">{courts.map((c) => <CourtCard key={c.id} c={c} />)}</ul>}
    </>
  )
}

/* ---------------- Services & Rates ---------------- */
function ServiceEditor({ s, onDone }: { s?: Service; onDone?: () => void }) {
  const [f, setF] = useState({ name: s?.name ?? '', description: s?.description ?? '', rate: s?.ratePerHour == null ? '' : String(s.ratePerHour) })
  const [err, setErr] = useState('')
  const [del, setDel] = useState(false)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!f.name.trim()) return setErr('Enter a service name.')
    if (f.rate && !(Number(f.rate) >= 0)) return setErr('Rate must be a number.')
    setErr(''); saveService({ id: s?.id, name: f.name.trim(), description: f.description, ratePerHour: f.rate === '' ? null : Number(f.rate) })
    toast(s ? 'Service saved' : 'Service added'); if (!s) setF({ name: '', description: '', rate: '' }); onDone?.()
  }
  return (
    <form onSubmit={submit} noValidate className="card space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <Input label="Service name" value={f.name} error={err} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input label="Rate per hour (₱)" type="number" min={0} step="0.01" inputMode="decimal" optional hint="Leave blank if not decided." value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} />
      </div>
      <TextArea label="Description" rows={2} optional value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      <div className="flex flex-wrap gap-3"><Button type="submit" icon={s ? Save : Plus}>{s ? 'Save' : 'Add service'}</Button>{s && <Button variant="danger" icon={Trash2} onClick={() => setDel(true)}>Remove</Button>}</div>
      {s && <ConfirmDialog open={del} onClose={() => setDel(false)} danger title="Remove service?" confirmLabel="Remove service" body={<p>{s.name} will disappear from the Rates page and booking flow.</p>} onConfirm={() => { removeService(s.id); setDel(false) }} />}
    </form>
  )
}
function MenuEditor({ m }: { m?: MenuItem }) {
  const [f, setF] = useState({ name: m?.name ?? '', category: m?.category ?? '', price: m?.price == null ? '' : String(m.price) })
  const [err, setErr] = useState('')
  const [del, setDel] = useState(false)
  return (
    <form noValidate className="card space-y-4 p-5" onSubmit={(e) => {
      e.preventDefault()
      if (!f.name.trim()) return setErr('Enter an item name.')
      setErr(''); saveMenuItem({ id: m?.id, name: f.name.trim(), category: f.category.trim(), price: f.price === '' ? null : Number(f.price) }); toast(m ? 'Item saved' : 'Item added'); if (!m) setF({ name: '', category: f.category, price: '' })
    }}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Item name" value={f.name} error={err} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input label="Category" optional placeholder="e.g. Drinks" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
        <Input label="Price (₱)" type="number" min={0} step="0.01" optional value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
      </div>
      <div className="flex flex-wrap gap-3"><Button type="submit" icon={m ? Save : Plus}>{m ? 'Save' : 'Add item'}</Button>{m && <Button variant="danger" icon={Trash2} onClick={() => setDel(true)}>Remove</Button>}</div>
      {m && <ConfirmDialog open={del} onClose={() => setDel(false)} danger title="Remove menu item?" confirmLabel="Remove item" body={<p>{m.name} will be removed from the Café page.</p>} onConfirm={() => { removeMenuItem(m.id); setDel(false) }} />}
    </form>
  )
}
export function Services() {
  const { services, menu } = useStore()
  const [tab, setTab] = useState<'s' | 'm'>('s')
  return (
    <OwnerOnly name="Services & Rates">
      <PageHeader eyebrow="Pricing" title="Services & Rates" />
      <div className="mb-6"><Segmented label="Section" value={tab} onChange={setTab} options={[{ value: 's', label: 'Court services' }, { value: 'm', label: 'Café menu' }]} /></div>
      {tab === 's' ? (
        <div className="space-y-5"><h2 className="display text-2xl">Add a service</h2><ServiceEditor />
          {services.length === 0 ? <EmptyState icon={Tag} title="No services yet" body="Add a service such as court rental, then set its hourly rate." /> : <><h2 className="display pt-4 text-2xl">Current services</h2>{services.map((s) => <ServiceEditor key={s.id} s={s} />)}</>}</div>
      ) : (
        <div className="space-y-5"><h2 className="display text-2xl">Add a menu item</h2><MenuEditor />
          {menu.length === 0 ? <EmptyState icon={Tag} title="No menu items yet" body="Items appear on the public Café page." /> : <><h2 className="display pt-4 text-2xl">Current menu</h2>{menu.map((m) => <MenuEditor key={m.id} m={m} />)}</>}</div>
      )}
    </OwnerOnly>
  )
}

/* ---------------- Customers ---------------- */
export function Customers() {
  const { customers, bookings } = useStore()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [add, setAdd] = useState(false)
  const [del, setDel] = useState(false)
  const [f, setF] = useState({ name: '', phone: '', email: '', notes: '' })
  const [err, setErr] = useState('')
  const rows = customers.filter((c) => [c.name, c.phone, c.email].some((v) => v.toLowerCase().includes(q.toLowerCase())))
  const c = customers.find((x) => x.id === sel)
  const theirs = c ? bookings.filter((b) => (c.email && b.email.toLowerCase() === c.email.toLowerCase()) || (c.phone && b.phone === c.phone)) : []
  const [notes, setNotes] = useState('')
  const pick = (id: string) => { setSel(id); setNotes(customers.find((x) => x.id === id)?.notes ?? '') }
  return (
    <>
      <PageHeader eyebrow="People" title="Customers" actions={<Button icon={Plus} onClick={() => { setF({ name: '', phone: '', email: '', notes: '' }); setErr(''); setAdd(true) }}>Add customer</Button>} />
      <div className="mb-5 max-w-md"><Input label="Search customers" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone or email" /></div>
      {customers.length === 0 ? <EmptyState icon={Users} title="No customers yet" body="Customers are added automatically from bookings, or add one manually." /> : rows.length === 0 ? <EmptyState icon={Search} title="No matches" /> : (
        <ul className="card divide-y divide-line">{rows.map((x) => (
          <li key={x.id}><button type="button" onClick={() => pick(x.id)} className="flex min-h-14 w-full cursor-pointer flex-wrap items-center justify-between gap-2 p-4 text-left hover:bg-sand/40"><span><b>{x.name}</b><br /><span className="text-sm text-ink-soft">{x.phone || 'No phone'} · {x.email || 'No email'}</span></span><Badge>{bookings.filter((b) => b.email.toLowerCase() === x.email.toLowerCase() || (x.phone && b.phone === x.phone)).length} bookings</Badge></button></li>
        ))}</ul>
      )}
      <Modal open={add} onClose={() => setAdd(false)} title="Add customer" footer={<><Button variant="secondary" onClick={() => setAdd(false)}>Cancel</Button><Button icon={Plus} onClick={() => { if (!f.name.trim()) return setErr('Enter a name.'); saveCustomer(f); setAdd(false); toast('Customer added') }}>Add customer</Button></>}>
        <div className="space-y-4"><Input label="Name" value={f.name} error={err} onChange={(e) => setF({ ...f, name: e.target.value })} /><Input label="Phone" type="tel" optional value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /><Input label="Email" type="email" optional value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /><TextArea label="Notes" optional value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
      </Modal>
      {c && (
        <Modal open onClose={() => setSel(null)} title={c.name} side>
          <div className="space-y-6">
            <dl className="grid gap-3 sm:grid-cols-2"><div><dt className="eyebrow">Phone</dt><dd className="font-semibold">{c.phone || '—'}</dd></div><div><dt className="eyebrow">Email</dt><dd className="font-semibold">{c.email || '—'}</dd></div></dl>
            <TextArea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Button icon={Save} disabled={notes === c.notes} onClick={() => { saveCustomer({ ...c, notes }); toast('Notes saved') }}>Save notes</Button>
            <div><h3 className="display mb-2 text-2xl">Bookings</h3>{theirs.length === 0 ? <p className="text-ink-soft">No bookings yet.</p> : <ul className="space-y-1">{theirs.map((b) => <li key={b.id}>{b.ref} · {fmtDate(b.date)} {fmtMin(b.start)} · {b.status.toLowerCase().replace('_', ' ')}</li>)}</ul>}</div>
            <Button variant="danger" icon={Trash2} onClick={() => setDel(true)}>Delete customer</Button>
          </div>
          <ConfirmDialog open={del} onClose={() => setDel(false)} danger title="Delete customer?" confirmLabel="Delete customer" body={<p>{c.name} is removed from this list. Their bookings stay.</p>} onConfirm={() => { removeCustomer(c.id); setDel(false); setSel(null) }} />
        </Modal>
      )}
    </>
  )
}

/* ---------------- Payments ---------------- */
export function Payments() {
  const { payments, bookings } = useStore()
  const [kind, setKind] = useState('ALL')
  const [open, setOpen] = useState<string | null>(null)
  const rows = payments.filter((p) => kind === 'ALL' || p.kind === kind)
  const collected = payments.reduce((a, p) => a + p.amount, 0)
  const owing = bookings.filter((b) => b.total != null && b.status !== 'CANCELLED' && b.status !== 'NO_SHOW' && paidFor(b.id) < (b.total ?? 0))
  const outstanding = owing.reduce((a, b) => a + (b.total ?? 0) - paidFor(b.id), 0)
  const ref = (id: string) => bookings.find((b) => b.id === id)?.ref ?? '—'
  return (
    <OwnerOnly name="Payments">
      <PageHeader eyebrow="Money" title="Payments" actions={<Button variant="secondary" icon={Download} disabled={!payments.length} onClick={() => download('payments.csv', toCSV([['Date', 'Booking', 'Type', 'Method', 'Amount', 'Note'], ...payments.map((p) => [fmtStamp(p.at), ref(p.bookingId), p.kind, p.method, p.amount, p.note])]), 'text/csv')}>Export CSV</Button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2"><div className="card p-5"><p className="eyebrow">Collected</p><p className="display mt-2 text-4xl">{peso(collected, '₱0')}</p></div><div className="card p-5"><p className="eyebrow">Outstanding balances</p><p className="display mt-2 text-4xl">{peso(outstanding, '₱0')}</p></div></div>
      <div className="mb-4 max-w-xs"><Select label="Type" value={kind} onChange={(e) => setKind(e.target.value)}><option value="ALL">All types</option><option value="DEPOSIT">Deposit</option><option value="BALANCE">Balance</option><option value="OTHER">Other</option></Select></div>
      {rows.length === 0 ? <EmptyState icon={Wallet} title="No payments recorded" body="Record deposits and balances from a booking's detail drawer." action={<Button to="/admin/bookings" variant="secondary">Open bookings</Button>} /> : (
        <ul className="card divide-y divide-line">{rows.map((p) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-4"><span><b>{peso(p.amount)}</b> · {p.kind.toLowerCase()} · {p.method}<br /><span className="text-sm text-ink-soft">{fmtStamp(p.at)} · {ref(p.bookingId)}</span></span><Button variant="ghost" onClick={() => setOpen(p.bookingId)}>View booking</Button></li>)}</ul>
      )}
      {owing.length > 0 && <><h2 className="display mb-3 mt-10 text-3xl">Awaiting payment</h2><ul className="card divide-y divide-line">{owing.map((b) => <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 p-4"><span><b>{b.ref}</b> · {b.name}<br /><span className="text-sm text-ink-soft">Balance {peso((b.total ?? 0) - paidFor(b.id))}</span></span><Button variant="secondary" onClick={() => setOpen(b.id)}>Record payment</Button></li>)}</ul></>}
      <BookingDrawer id={open} onClose={() => setOpen(null)} />
    </OwnerOnly>
  )
}

/* ---------------- Inquiries ---------------- */
export function Inquiries() {
  const { inquiries } = useStore()
  const [f, setF] = useState<'ALL' | Inquiry['status']>('ALL')
  const [sel, setSel] = useState<string | null>(null)
  const rows = inquiries.filter((q) => f === 'ALL' || q.status === f)
  const q = inquiries.find((x) => x.id === sel)
  const tone = (s: Inquiry['status']) => (s === 'NEW' ? 'warn' : s === 'REPLIED' ? 'good' : 'neutral')
  return (
    <>
      <PageHeader eyebrow="Inbox" title="Inquiries" />
      <div role="group" aria-label="Filter" className="mb-5 flex flex-wrap gap-2">{(['ALL', 'NEW', 'REPLIED', 'ARCHIVED'] as const).map((s) => <button key={s} type="button" aria-pressed={f === s} onClick={() => setF(s)} className={cn('min-h-11 cursor-pointer rounded-full border-2 px-4 text-sm font-bold', f === s ? 'border-forest bg-forest text-cream' : 'border-edge/60 hover:border-forest')}>{s === 'ALL' ? 'All' : s[0] + s.slice(1).toLowerCase()}</button>)}</div>
      {inquiries.length === 0 ? <EmptyState icon={Inbox} title="No inquiries yet" body="Messages from the Contact page arrive here." action={<Button to="/contact" variant="secondary">Open contact form</Button>} /> : rows.length === 0 ? <EmptyState icon={Search} title="Nothing in this filter" /> : (
        <ul className="card divide-y divide-line">{rows.map((x) => <li key={x.id}><button type="button" onClick={() => setSel(x.id)} className="flex min-h-14 w-full cursor-pointer flex-wrap items-center justify-between gap-2 p-4 text-left hover:bg-sand/40"><span><b>{x.name}</b> · {x.topic}<br /><span className="line-clamp-1 text-sm text-ink-soft">{x.message}</span></span><Badge tone={tone(x.status)}>{x.status[0] + x.status.slice(1).toLowerCase()}</Badge></button></li>)}</ul>
      )}
      {q && (
        <Modal open onClose={() => setSel(null)} title={q.name} side footer={<>
          {q.status !== 'REPLIED' && <Button icon={CheckCheck} onClick={() => { setInquiryStatus(q.id, 'REPLIED'); toast('Marked replied') }}>Mark replied</Button>}
          {q.status !== 'ARCHIVED' ? <Button variant="secondary" icon={Archive} onClick={() => { setInquiryStatus(q.id, 'ARCHIVED'); toast('Archived') }}>Archive</Button> : <Button variant="secondary" icon={Undo2} onClick={() => setInquiryStatus(q.id, 'NEW')}>Reopen</Button>}
        </>}>
          <div className="space-y-4"><Badge tone={tone(q.status)}>{q.status[0] + q.status.slice(1).toLowerCase()}</Badge><p className="text-sm text-ink-soft">{fmtStamp(q.createdAt)} · {q.topic}</p><p className="whitespace-pre-line text-lg">{q.message}</p>
            <p>{q.email} {q.phone && `· ${q.phone}`}</p><Button href={`mailto:${q.email}?subject=Re: ${encodeURIComponent(q.topic)}`} variant="secondary" icon={Mail}>Reply by email</Button></div>
        </Modal>
      )}
    </>
  )
}

/* ---------------- Gallery ---------------- */
export function AdminGallery() {
  const { gallery } = useStore()
  const [del, setDel] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    const out: { src: string; caption: string }[] = []
    for (const f of Array.from(files)) { try { out.push({ src: await fileToDataURL(f, 1200), caption: '' }) } catch { toast(`${f.name} is not an image`) } }
    if (out.length) { addGalleryImages(out); toast(`${out.length} photo(s) added`) }
    setBusy(false)
  }
  return (
    <>
      <PageHeader eyebrow="Media" title="Gallery">Photos appear on the public Gallery page and home page. The prototype stores resized copies in your browser; production should use file storage.</PageHeader>
      <label className="btn btn-primary mb-6 cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-clay"><ImagePlus size={18} aria-hidden /> {busy ? 'Processing…' : 'Upload photos'}<input type="file" multiple accept="image/*" className="sr-only" onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} /></label>
      {gallery.length === 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-edge bg-sand/50 text-center"><ImagePlus className="text-bark" aria-hidden /><span className="mt-2 font-mono text-xs uppercase tracking-wider">Empty slot</span></div>)}</div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{gallery.map((g) => (
          <li key={g.id} className="card overflow-hidden"><img src={g.src} alt={g.caption || 'Gallery photo'} className="aspect-[4/3] w-full object-cover" /><div className="space-y-3 p-4"><Input label="Caption" optional defaultValue={g.caption} onBlur={(e) => e.target.value !== g.caption && updateGalleryCaption(g.id, e.target.value)} /><Button variant="danger" icon={Trash2} onClick={() => setDel(g.id)}>Remove</Button></div></li>
        ))}</ul>
      )}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} danger title="Remove photo?" confirmLabel="Remove photo" body={<p>The photo is removed from the website.</p>} onConfirm={() => { if (del) removeGalleryImage(del); setDel(null) }} />
    </>
  )
}
