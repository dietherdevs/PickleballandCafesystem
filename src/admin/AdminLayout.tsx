import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import {
  BarChart3, CalendarDays, ClipboardList, ExternalLink, Images, Inbox, LayoutDashboard, LayoutGrid, Lock, LogOut, Menu, PenLine,
  ScrollText, Settings, ShieldCheck, Tag, Users, Wallet,
} from 'lucide-react'
import { Button, EmptyState, Input, Modal, Segmented, ToastHost } from '../components/ui'
import { signIn, signOut, switchRole, useStore, type Role } from '../lib/store'
import { cn } from '../lib/util'
import { BallMark } from '../public/PublicLayout'

const ITEMS = [
  { to: '/admin', label: 'Dashboard', I: LayoutDashboard, end: true },
  { to: '/admin/bookings', label: 'Bookings', I: ClipboardList },
  { to: '/admin/calendar', label: 'Calendar', I: CalendarDays },
  { to: '/admin/courts', label: 'Courts', I: LayoutGrid },
  { to: '/admin/services', label: 'Services & Rates', I: Tag, owner: true },
  { to: '/admin/customers', label: 'Customers', I: Users },
  { to: '/admin/payments', label: 'Payments', I: Wallet, owner: true },
  { to: '/admin/inquiries', label: 'Inquiries', I: Inbox },
  { to: '/admin/gallery', label: 'Gallery', I: Images },
  { to: '/admin/content', label: 'Website Content', I: PenLine, owner: true },
  { to: '/admin/reports', label: 'Reports', I: BarChart3, owner: true },
  { to: '/admin/users', label: 'Users & Roles', I: ShieldCheck, owner: true },
  { to: '/admin/audit', label: 'Audit Log', I: ScrollText, owner: true },
  { to: '/admin/settings', label: 'Settings', I: Settings, owner: true },
]

export function OwnerOnly({ children, name }: { children: ReactNode; name: string }) {
  const { session } = useStore()
  if (session?.role === 'OWNER') return <>{children}</>
  return (
    <EmptyState icon={Lock} title={`${name} is owner-only`} body="You are viewing as Staff. Switch to the Owner view using the toggle in the header to manage this area."
      action={<Button onClick={() => switchRole('OWNER')}>View as Owner</Button>} />
  )
}

function NavList({ onNav }: { onNav?: () => void }) {
  const { session, inquiries } = useStore()
  const fresh = inquiries.filter((q) => q.status === 'NEW').length
  return (
    <nav aria-label="Admin" className="flex flex-col gap-0.5">
      {ITEMS.map(({ to, label, I, end, owner }) => (
        <NavLink key={to} to={to} end={end} onClick={onNav}
          className={({ isActive }) => cn('flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold', isActive ? 'bg-forest text-cream' : 'text-ink hover:bg-sand')}>
          <I size={18} aria-hidden /> <span className="flex-1">{label}</span>
          {label === 'Inquiries' && fresh > 0 && <span className="rounded-full bg-clay px-2 text-xs text-white">{fresh}<span className="sr-only"> new</span></span>}
          {owner && session?.role !== 'OWNER' && <><Lock size={14} aria-hidden /><span className="sr-only">owner only</span></>}
        </NavLink>
      ))}
    </nav>
  )
}

function Login() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('OWNER')
  const [err, setErr] = useState<{ name?: string; email?: string }>({})
  return (
    <div className="grid min-h-screen place-items-center bg-sand/60 p-5">
      <form noValidate className="card w-full max-w-md space-y-5 p-6 md:p-8" onSubmit={(e) => {
        e.preventDefault()
        const er: typeof err = {}
        if (!name.trim()) er.name = 'Enter your name.'
        if (!/^\S+@\S+\.\S+$/.test(email)) er.email = 'Enter a valid email address.'
        setErr(er)
        if (!Object.keys(er).length) signIn(name.trim(), email.trim(), role)
      }}>
        <BallMark className="size-12 text-forest" />
        <div><h1 className="display text-4xl">Staff sign in</h1><p className="mt-2 text-sm text-ink-soft">Prototype sign-in only. Real authentication and role enforcement must be handled by the backend.</p></div>
        <Input label="Name" autoComplete="name" value={name} error={err.name} onChange={(e) => setName(e.target.value)} />
        <Input label="Email" type="email" autoComplete="email" value={email} error={err.email} onChange={(e) => setEmail(e.target.value)} />
        <div><p className="label">Sign in as</p><Segmented label="Role" value={role} onChange={setRole} options={[{ value: 'OWNER', label: 'Owner' }, { value: 'STAFF', label: 'Staff' }]} /></div>
        <Button type="submit" lg className="w-full">Sign in</Button>
        <Button to="/" variant="ghost" className="w-full">Back to website</Button>
      </form>
    </div>
  )
}

export default function AdminLayout() {
  const { session } = useStore()
  const [menu, setMenu] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setMenu(false), [pathname])
  if (!session) return <><Login /><ScrollRestoration /></>
  const title = ITEMS.find((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)))?.label ?? 'Admin'
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-forest focus:px-4 focus:py-3 focus:text-cream">Skip to content</a>
      <aside className="hidden border-r border-line bg-paper lg:block">
        <div className="sticky top-0 flex max-h-screen flex-col gap-5 overflow-y-auto p-4">
          <div className="flex items-center gap-3 px-2 pt-2 text-forest"><BallMark /><div><p className="display text-xl">Admin</p><p className="eyebrow">Court & café</p></div></div>
          <NavList />
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-b border-line bg-cream/95 px-4 py-2 md:px-8">
          <button type="button" className="btn btn-secondary lg:hidden" onClick={() => setMenu(true)} aria-label="Open admin menu"><Menu size={20} aria-hidden /></button>
          <p className="display text-xl lg:hidden">{title}</p>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <Segmented label="Prototype view" value={session.role} onChange={switchRole} options={[{ value: 'OWNER', label: 'Owner view' }, { value: 'STAFF', label: 'Staff view' }]} />
            <Button to="/" variant="ghost" icon={ExternalLink}><span className="hidden sm:inline">Website</span></Button>
            <Button variant="ghost" icon={LogOut} onClick={signOut} aria-label={`Sign out ${session.name}`}><span className="hidden sm:inline">Sign out</span></Button>
          </div>
        </header>
        <main id="admin-main" tabIndex={-1} className="mx-auto max-w-[1280px] px-4 py-6 outline-none md:px-8 md:py-10"><Outlet /></main>
      </div>
      <Modal open={menu} onClose={() => setMenu(false)} title="Admin menu" side><NavList onNav={() => setMenu(false)} /></Modal>
      <ToastHost />
      <ScrollRestoration />
    </div>
  )
}
