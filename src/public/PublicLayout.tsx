import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { Menu, ShieldCheck } from 'lucide-react'
import { Button, Modal, Needed, ToastHost, Txt, useContent } from '../components/ui'
import { cn } from '../lib/util'

const Facebook = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M13.5 22v-8h2.7l.5-3.2h-3.2V8.7c0-.9.4-1.7 1.8-1.7h1.5V4.2S15.5 4 14.3 4C11.8 4 10.2 5.500 10.200 8.200v2.600H7.500V14h2.700v8z" /></svg>
)
const Instagram = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.500" cy="6.500" r="1" fill="currentColor" stroke="none" /></svg>
)

export const NAV = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/pickleball', label: 'Pickleball' },
  { to: '/cafe', label: 'Café' },
  { to: '/rates', label: 'Rates' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/location', label: 'Location' },
  { to: '/contact', label: 'Contact' },
]

export function BallMark({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <circle cx="20" cy="20" r="19" fill="currentColor" />
      {[[20, 10], [12, 17], [28, 17], [15, 27], [25, 27], [20, 20]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.6" fill="var(--color-cream)" />
      ))}
    </svg>
  )
}

export function Brand({ onDark }: { onDark?: boolean }) {
  const c = useContent()
  const name = c('businessName')
  return (
    <Link to="/" className={cn('flex min-h-11 items-center gap-3', onDark ? 'text-cream' : 'text-forest')} aria-label={name ? `${name} — home` : 'Home'}>
      <BallMark className="size-9 shrink-0" />
      {name ? <span className="display text-2xl">{name}</span> : <Needed>Add business name</Needed>}
    </Link>
  )
}

export function SocialLinks({ onDark }: { onDark?: boolean }) {
  const c = useContent()
  const items = [
    { key: 'facebook', label: 'Facebook', Icon: Facebook },
    { key: 'instagram', label: 'Instagram', Icon: Instagram },
  ]
  const cls = cn('inline-flex min-h-11 items-center gap-2 rounded-md border-2 px-4 text-sm font-bold', onDark ? 'border-cream/60 text-cream hover:bg-cream hover:text-forest' : 'border-forest text-forest hover:bg-forest hover:text-cream')
  return (
    <div className="flex flex-wrap gap-3">
      {items.map(({ key, label, Icon }) => {
        const url = c(key)
        return url ? (
          <a key={key} href={url} target="_blank" rel="noopener noreferrer" className={cls}><Icon size={18} aria-hidden /> {label}<span className="sr-only"> (opens in new tab)</span></a>
        ) : (
          <Link key={key} to="/admin/content" className={cls} title={`${label} link not set — add it in Website Content`}>
            <Icon size={18} aria-hidden /> {label} <span className="font-mono text-[0.65rem] uppercase tracking-wider opacity-80">· add link</span>
          </Link>
        )
      })}
    </div>
  )
}

export default function PublicLayout() {
  const [menu, setMenu] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setMenu(false), [pathname])
  const inBooking = pathname.startsWith('/booking')
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-forest focus:px-4 focus:py-3 focus:text-cream">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-line bg-cream/95">
        <div className="page-x flex items-center justify-between gap-4 py-2">
          <Brand />
          <nav aria-label="Main" className="hidden items-center gap-1 xl:flex">
            {NAV.slice(1).map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold hover:bg-sand', isActive ? 'text-forest underline decoration-clay decoration-2 underline-offset-8' : 'text-ink')}>{n.label}</NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {!inBooking && <Button to="/booking" variant="accent" className="hidden sm:inline-flex">Book a court</Button>}
            <button type="button" className="btn btn-secondary xl:hidden" onClick={() => setMenu(true)} aria-label="Open menu" aria-haspopup="dialog"><Menu size={20} aria-hidden /> Menu</button>
          </div>
        </div>
      </header>

      <Modal open={menu} onClose={() => setMenu(false)} title="Menu" side>
        <nav aria-label="Mobile" className="flex flex-col">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('display flex min-h-14 items-center border-b border-line text-3xl', isActive ? 'text-clay' : 'text-forest')}>{n.label}</NavLink>
          ))}
        </nav>
        <Button to="/booking" variant="accent" lg className="mt-6 w-full">Book a court</Button>
      </Modal>

      <main id="main" tabIndex={-1} className="flex-1 pb-24 outline-none lg:pb-0"><Outlet /></main>

      <footer className="on-dark bg-forest pb-28 pt-14 text-cream lg:pb-14">
        <div className="page-x grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-4">
            <Brand onDark />
            <p className="max-w-sm text-cream/85">Pickleball courts and a café in Marikina City, Philippines.</p>
            <SocialLinks onDark />
          </div>
          <div>
            <p className="eyebrow !text-sage">Visit</p>
            <p className="mt-3"><Txt k="address" /></p>
            <p className="mt-3"><Txt k="hours" /></p>
          </div>
          <div>
            <p className="eyebrow !text-sage">Explore</p>
            <ul className="mt-2">
              {[...NAV.slice(1), { to: '/booking', label: 'Book a court' }].map((n) => (
                <li key={n.to}><Link to={n.to} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{n.label}</Link></li>
              ))}
              <li><Link to="/admin" className="inline-flex min-h-11 items-center gap-2 text-sage underline-offset-4 hover:underline"><ShieldCheck size={16} aria-hidden /> Staff sign in</Link></li>
            </ul>
          </div>
        </div>
      </footer>

      {!inBooking && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-cream p-3 lg:hidden">
          <Button to="/booking" variant="accent" lg className="w-full">Book now</Button>
        </div>
      )}
      <ToastHost />
      <ScrollRestoration />
    </div>
  )
}
