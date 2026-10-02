import { useSyncExternalStore } from 'react'
import { fmtMin, todayISO, toMin, nowMin } from './util'

/* ============================================================
   Prototype data layer.
   HAND-OFF: everything exported below as an action or `api.*`
   maps 1:1 to a backend endpoint. Replace the localStorage
   commit() with server calls; the UI only talks to this module.
   ============================================================ */

export type Status = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
export const STATUSES: Status[] = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW']
export const STATUS_LABEL: Record<Status, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked in',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No-show',
}
export const TRANSITIONS: Record<Status, Status[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CHECKED_IN', 'NO_SHOW', 'CANCELLED'],
  CHECKED_IN: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
}
export const BLOCKING: Status[] = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED']

export type Role = 'OWNER' | 'STAFF'
export type CourtStatus = 'AVAILABLE' | 'MAINTENANCE' | 'CLOSED'
export type Court = { id: string; name: string; status: CourtStatus; notes: string; maxPlayers: number | null }
export type Service = { id: string; name: string; description: string; ratePerHour: number | null }
export type MenuItem = { id: string; name: string; category: string; price: number | null }
export type Booking = {
  id: string
  ref: string
  date: string
  courtId: string
  serviceId: string
  start: number
  duration: number
  players: number
  name: string
  phone: string
  email: string
  notes: string
  status: Status
  total: number | null
  deposit: number | null
  source: 'web' | 'admin'
  createdAt: number
  history: { at: number; status: Status; by: string; note?: string }[]
}
export type Payment = { id: string; bookingId: string; amount: number; kind: 'DEPOSIT' | 'BALANCE' | 'OTHER'; method: string; note: string; at: number }
export type Customer = { id: string; name: string; phone: string; email: string; notes: string; createdAt: number }
export type Inquiry = { id: string; name: string; email: string; phone: string; topic: string; message: string; status: 'NEW' | 'REPLIED' | 'ARCHIVED'; createdAt: number }
export type GalleryImage = { id: string; src: string; caption: string; createdAt: number }
export type User = { id: string; name: string; email: string; role: Role; active: boolean; createdAt: number }
export type Audit = { id: string; at: number; actor: string; role: Role | 'PUBLIC'; action: string; target: string }
export type Settings = {
  openTime: string | null
  closeTime: string | null
  depositPercent: number | null
  cancellationPolicy: string
  houseRules: string
  paymentInstructions: string
}
export type Session = { name: string; email: string; role: Role } | null

export type State = {
  courts: Court[]
  services: Service[]
  menu: MenuItem[]
  bookings: Booking[]
  payments: Payment[]
  customers: Customer[]
  inquiries: Inquiry[]
  gallery: GalleryImage[]
  images: Record<string, string>
  content: Record<string, string>
  users: User[]
  audit: Audit[]
  settings: Settings
  session: Session
}

const KEY = 'court-cafe-prototype.v1'
const blank = (): State => ({
  courts: [],
  services: [],
  menu: [],
  bookings: [],
  payments: [],
  customers: [],
  inquiries: [],
  gallery: [],
  images: {},
  content: {},
  users: [],
  audit: [],
  settings: { openTime: null, closeTime: null, depositPercent: null, cancellationPolicy: '', houseRules: '', paymentInstructions: '' },
  session: null,
})

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...blank(), ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return blank()
}

let state: State = load()
const listeners = new Set<() => void>()
export let saveFailed = false

function commit(next: State) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    saveFailed = false
  } catch {
    saveFailed = true
  }
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const useStore = () => useSyncExternalStore(subscribe, () => state)
export const getState = () => state
export const uid = (p: string) => p + '_' + Math.random().toString(36).slice(2, 9)

function update(fn: (s: State) => State, audit?: { action: string; target: string }, actorOverride?: { name: string; role: Role | 'PUBLIC' }) {
  let next = fn(state)
  if (audit) {
    const actor = actorOverride ?? (state.session ? { name: state.session.name, role: state.session.role } : { name: 'Website visitor', role: 'PUBLIC' as const })
    next = { ...next, audit: [{ id: uid('au'), at: Date.now(), actor: actor.name, role: actor.role, ...audit }, ...next.audit].slice(0, 500) }
  }
  commit(next)
}
const actorName = () => state.session?.name ?? 'Website visitor'

/* ---------- auth stub (replace with real auth) ---------- */
export function signIn(name: string, email: string, role: Role) {
  update(
    (s) => ({
      ...s,
      session: { name, email, role },
      users: s.users.some((u) => u.email.toLowerCase() === email.toLowerCase()) ? s.users : [...s.users, { id: uid('u'), name, email, role, active: true, createdAt: Date.now() }],
    }),
    { action: 'Signed in', target: email },
    { name, role },
  )
}
export function signOut() {
  update((s) => ({ ...s, session: null }), state.session ? { action: 'Signed out', target: state.session.email } : undefined)
}
export function switchRole(role: Role) {
  if (!state.session) return
  update((s) => ({ ...s, session: s.session && { ...s.session, role } }), { action: 'Switched prototype view', target: role })
}

/* ---------- setup ---------- */
export function loadPlaceholderSetup() {
  update(
    (s) => ({
      ...s,
      courts: s.courts.length ? s.courts : [1, 2].map((n) => ({ id: uid('c'), name: `Court ${n}`, status: 'AVAILABLE' as const, notes: 'Placeholder court — rename or replace', maxPlayers: null })),
      services: s.services.length ? s.services : [{ id: uid('s'), name: 'Court rental', description: 'Placeholder service — add description', ratePerHour: null }],
      settings: { ...s.settings, openTime: s.settings.openTime ?? '06:00', closeTime: s.settings.closeTime ?? '22:00' },
    }),
    { action: 'Loaded placeholder setup', target: 'Courts, services, hours' },
  )
}
export function resetPrototype() {
  const session = state.session
  commit({ ...blank(), session })
}

/* ---------- courts / services / menu ---------- */
export const addCourt = (name: string) =>
  update((s) => ({ ...s, courts: [...s.courts, { id: uid('c'), name, status: 'AVAILABLE', notes: '', maxPlayers: null }] }), { action: 'Added court', target: name })
export const updateCourt = (id: string, patch: Partial<Court>) =>
  update((s) => ({ ...s, courts: s.courts.map((c) => (c.id === id ? { ...c, ...patch } : c)) }), {
    action: patch.status ? `Set court status ${patch.status}` : 'Edited court',
    target: state.courts.find((c) => c.id === id)?.name ?? id,
  })
export const removeCourt = (id: string) =>
  update((s) => ({ ...s, courts: s.courts.filter((c) => c.id !== id) }), { action: 'Removed court', target: state.courts.find((c) => c.id === id)?.name ?? id })
export const saveService = (v: Omit<Service, 'id'> & { id?: string }) =>
  update(
    (s) => ({ ...s, services: v.id ? s.services.map((x) => (x.id === v.id ? { ...x, ...v } as Service : x)) : [...s.services, { ...v, id: uid('s') } as Service] }),
    { action: v.id ? 'Edited service' : 'Added service', target: v.name },
  )
export const removeService = (id: string) =>
  update((s) => ({ ...s, services: s.services.filter((x) => x.id !== id) }), { action: 'Removed service', target: state.services.find((x) => x.id === id)?.name ?? id })
export const saveMenuItem = (v: Omit<MenuItem, 'id'> & { id?: string }) =>
  update((s) => ({ ...s, menu: v.id ? s.menu.map((x) => (x.id === v.id ? { ...x, ...v } as MenuItem : x)) : [...s.menu, { ...v, id: uid('m') } as MenuItem] }), {
    action: v.id ? 'Edited menu item' : 'Added menu item',
    target: v.name,
  })
export const removeMenuItem = (id: string) =>
  update((s) => ({ ...s, menu: s.menu.filter((x) => x.id !== id) }), { action: 'Removed menu item', target: state.menu.find((x) => x.id === id)?.name ?? id })

/* ---------- settings / content ---------- */
export const saveSettings = (patch: Partial<Settings>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } }), { action: 'Updated settings', target: Object.keys(patch).join(', ') })
export const saveContent = (patch: Record<string, string>, label: string) => update((s) => ({ ...s, content: { ...s.content, ...patch } }), { action: 'Published content', target: label })
export const setImage = (key: string, src: string | null) =>
  update(
    (s) => {
      const images = { ...s.images }
      if (src) images[key] = src
      else delete images[key]
      return { ...s, images }
    },
    { action: src ? 'Uploaded image' : 'Removed image', target: key },
  )
export const addGalleryImages = (items: { src: string; caption: string }[]) =>
  update((s) => ({ ...s, gallery: [...s.gallery, ...items.map((i) => ({ ...i, id: uid('g'), createdAt: Date.now() }))] }), { action: 'Added gallery photos', target: `${items.length} photo(s)` })
export const updateGalleryCaption = (id: string, caption: string) => update((s) => ({ ...s, gallery: s.gallery.map((g) => (g.id === id ? { ...g, caption } : g)) }))
export const removeGalleryImage = (id: string) => update((s) => ({ ...s, gallery: s.gallery.filter((g) => g.id !== id) }), { action: 'Removed gallery photo', target: id })

/* ---------- customers / inquiries / users ---------- */
const digits = (v: string) => v.replace(/\D/g, '')
function upsertCustomerIn(s: State, c: { name: string; phone: string; email: string }): State {
  const hit = s.customers.find((x) => (c.email && x.email.toLowerCase() === c.email.toLowerCase()) || (digits(c.phone) && digits(x.phone) === digits(c.phone)))
  if (hit) return s
  return { ...s, customers: [...s.customers, { id: uid('cu'), ...c, notes: '', createdAt: Date.now() }] }
}
export const saveCustomer = (v: Omit<Customer, 'id' | 'createdAt'> & { id?: string }) =>
  update((s) => (v.id ? { ...s, customers: s.customers.map((c) => (c.id === v.id ? { ...c, ...v } : c)) } : { ...s, customers: [...s.customers, { ...v, id: uid('cu'), createdAt: Date.now() }] }), {
    action: v.id ? 'Edited customer' : 'Added customer',
    target: v.name,
  })
export const removeCustomer = (id: string) => update((s) => ({ ...s, customers: s.customers.filter((c) => c.id !== id) }), { action: 'Removed customer', target: state.customers.find((c) => c.id === id)?.name ?? id })
export const submitInquiry = (v: Omit<Inquiry, 'id' | 'status' | 'createdAt'>) =>
  update((s) => ({ ...s, inquiries: [{ ...v, id: uid('q'), status: 'NEW', createdAt: Date.now() }, ...s.inquiries] }), { action: 'Sent inquiry', target: v.name })
export const setInquiryStatus = (id: string, status: Inquiry['status']) =>
  update((s) => ({ ...s, inquiries: s.inquiries.map((q) => (q.id === id ? { ...q, status } : q)) }), { action: `Inquiry marked ${status}`, target: state.inquiries.find((q) => q.id === id)?.name ?? id })
export const inviteUser = (name: string, email: string, role: Role) =>
  update((s) => ({ ...s, users: [...s.users, { id: uid('u'), name, email, role, active: true, createdAt: Date.now() }] }), { action: 'Invited user', target: `${email} (${role})` })
export const updateUser = (id: string, patch: Partial<User>) =>
  update((s) => ({ ...s, users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }), {
    action: patch.role ? `Changed role to ${patch.role}` : patch.active === false ? 'Deactivated user' : 'Reactivated user',
    target: state.users.find((u) => u.id === id)?.email ?? id,
  })

/* ---------- bookings ---------- */
export function changeStatus(id: string, to: Status, note?: string) {
  const b = state.bookings.find((x) => x.id === id)
  if (!b || !TRANSITIONS[b.status].includes(to)) return false
  update(
    (s) => ({ ...s, bookings: s.bookings.map((x) => (x.id === id ? { ...x, status: to, history: [...x.history, { at: Date.now(), status: to, by: actorName(), note }] } : x)) }),
    { action: `${STATUS_LABEL[b.status]} → ${STATUS_LABEL[to]}`, target: b.ref },
  )
  return true
}
export const updateBookingNotes = (id: string, notes: string) => update((s) => ({ ...s, bookings: s.bookings.map((x) => (x.id === id ? { ...x, notes } : x)) }))
export const recordPayment = (p: Omit<Payment, 'id' | 'at'>) =>
  update((s) => ({ ...s, payments: [{ ...p, id: uid('p'), at: Date.now() }, ...s.payments] }), { action: `Recorded ${p.kind.toLowerCase()} payment`, target: `${state.bookings.find((b) => b.id === p.bookingId)?.ref} · ₱${p.amount}` })

export const priceFor = (serviceId: string, duration: number): number | null => {
  const r = state.services.find((s) => s.id === serviceId)?.ratePerHour
  return r == null ? null : Math.round((r * duration) / 60)
}
export const depositFor = (total: number | null): number | null => (total == null || state.settings.depositPercent == null ? null : Math.round((total * state.settings.depositPercent) / 100))
export const paidFor = (bookingId: string) => state.payments.filter((p) => p.bookingId === bookingId).reduce((a, p) => a + p.amount, 0)

export type Interval = { start: number; end: number }
export const intervalsFor = (date: string, courtId: string, s: State = state): Interval[] =>
  s.bookings.filter((b) => b.date === date && b.courtId === courtId && BLOCKING.includes(b.status)).map((b) => ({ start: b.start, end: b.start + b.duration }))
export const isFree = (iv: Interval[], start: number, end: number) => iv.every((i) => end <= i.start || start >= i.end)
export const isPastSlot = (date: string, start: number) => date < todayISO() || (date === todayISO() && start <= nowMin())

export function slotTimes(): number[] {
  const { openTime, closeTime } = state.settings
  if (!openTime || !closeTime) return []
  const out: number[] = []
  for (let t = toMin(openTime); t + 60 <= toMin(closeTime); t += 30) out.push(t)
  return out
}

/* ---------- mock backend API ---------- */
export class SlotTakenError extends Error {}
export const sim = { forceTaken: false, forceCreateError: false, forceLoadError: false }
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const REF_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const makeRef = () => 'BK-' + Array.from({ length: 6 }, () => REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)]).join('')

export type NewBooking = Pick<Booking, 'date' | 'courtId' | 'serviceId' | 'start' | 'duration' | 'players' | 'name' | 'phone' | 'email' | 'notes'>

export const api = {
  async getBookedIntervals(date: string, courtId: string): Promise<Interval[]> {
    await wait(550)
    if (sim.forceLoadError) throw new Error('Could not load times')
    return intervalsFor(date, courtId)
  },
  /** Backend must enforce this check atomically (unique constraint / transaction) to prevent double-booking. */
  async createBooking(input: NewBooking, opts: { source: 'web' | 'admin'; status: Status }): Promise<Booking> {
    await wait(900)
    if (sim.forceCreateError) throw new Error('Network error')
    const court = state.courts.find((c) => c.id === input.courtId)
    if (!court || court.status !== 'AVAILABLE') throw new Error('Court unavailable')
    if (sim.forceTaken || !isFree(intervalsFor(input.date, input.courtId), input.start, input.start + input.duration)) {
      sim.forceTaken = false
      throw new SlotTakenError('That time slot was just booked. Please choose another.')
    }
    const total = priceFor(input.serviceId, input.duration)
    const actor = opts.source === 'admin' ? actorName() : input.name
    const booking: Booking = {
      ...input,
      id: uid('b'),
      ref: makeRef(),
      status: opts.status,
      total,
      deposit: depositFor(total),
      source: opts.source,
      createdAt: Date.now(),
      history: [{ at: Date.now(), status: opts.status, by: actor, note: 'Created' }],
    }
    update(
      (s) => upsertCustomerIn({ ...s, bookings: [...s.bookings, booking] }, { name: input.name, phone: input.phone, email: input.email }),
      { action: opts.source === 'admin' ? 'Created booking manually' : 'Booking requested online', target: `${booking.ref} · ${court.name} ${fmtMin(input.start)}` },
      opts.source === 'admin' ? undefined : { name: input.name, role: 'PUBLIC' },
    )
    return booking
  },
}
