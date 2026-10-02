import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, CalendarDays, Clock, Coffee, Image as ImageIcon, MapPin, MessageSquare, Navigation, Phone, Send, Tag } from 'lucide-react'
import { Button, EmptyState, ImageSlot, Input, Modal, Needed, Select, Txt, TextArea, useContent } from '../components/ui'
import { loadPlaceholderSetup, submitInquiry, useStore } from '../lib/store'
import { cn, peso, todayISO } from '../lib/util'
import { SocialLinks } from './PublicLayout'

function Section({ children, className, tone = 'cream' }: { children: ReactNode; className?: string; tone?: 'cream' | 'sand' | 'forest' }) {
  return (
    <section className={cn('py-14 md:py-24', tone === 'sand' && 'bg-sand/60', tone === 'forest' && 'on-dark bg-forest text-cream', className)}>
      <div className="page-x">{children}</div>
    </section>
  )
}
function PageHero({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="border-b border-line bg-sand/50">
      <div className="page-x py-12 md:py-20">
        <p className="eyebrow mb-4">{eyebrow}</p>
        <h1 className="display max-w-4xl text-[clamp(2.75rem,8vw,6rem)]">{title}</h1>
        {children && <div className="mt-6 max-w-2xl text-lg text-ink-soft">{children}</div>}
      </div>
    </div>
  )
}
const Prose = ({ k }: { k: string }) => <p className="text-lg leading-relaxed"><Txt k={k} /></p>

/* ---------------- Home ---------------- */
export function Home() {
  const nav = useNavigate()
  const [date, setDate] = useState(todayISO())
  const { gallery } = useStore()
  return (
    <>
      <section className="border-b border-line">
        <div className="page-x grid gap-10 py-10 md:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14 lg:py-20">
          <div className="flex flex-col justify-center">
            <p className="eyebrow mb-5 flex items-center gap-2"><MapPin size={14} aria-hidden /> Marikina City, Philippines</p>
            <h1 className="display text-[clamp(3rem,9.5vw,7.5rem)] text-forest"><Txt k="heroHeadline" /></h1>
            <p className="mt-6 max-w-xl text-lg text-ink-soft"><Txt k="heroSub" /></p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button to="/booking" variant="accent" lg icon={CalendarDays}>Book a court</Button>
              <Button to="/rates" variant="secondary" lg>See rates</Button>
            </div>
          </div>
          <div className="relative">
            <ImageSlot slot="heroImage" label="Hero photo" className="aspect-[4/5] w-full lg:aspect-[3/4]" />
            <div className="absolute -bottom-4 -left-2 hidden rounded-md bg-clay px-4 py-2 font-mono text-xs uppercase tracking-widest text-white md:block">Pickleball · Café</div>
          </div>
        </div>
        <div className="border-t border-line bg-paper">
          <dl className="page-x grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
            {[
              { I: MapPin, t: 'Where', k: 'address' },
              { I: Clock, t: 'Open', k: 'hours' },
              { I: Phone, t: 'Call', k: 'phone' },
            ].map(({ I, t, k }) => (
              <div key={k} className="flex gap-4 py-5 md:px-6 first:md:pl-0">
                <I size={22} className="mt-1 shrink-0 text-clay" aria-hidden />
                <div><dt className="eyebrow">{t}</dt><dd className="mt-1 font-semibold"><Txt k={k} /></dd></div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          {[
            { to: '/pickleball', t: 'Play', b: 'Courts for open play, lessons and private games.', I: CalendarDays, slot: 'pickleballImage' },
            { to: '/cafe', t: 'Linger', b: 'The café, for before, between and after games.', I: Coffee, slot: 'cafeImage' },
          ].map((c, i) => (
            <Link key={c.to} to={c.to} className={cn('card group block overflow-hidden', i === 1 && 'md:mt-14')}>
              <ImageSlot slot={c.slot} label={c.t === 'Play' ? 'Courts photo' : 'Café photo'} className="aspect-[16/10] w-full !rounded-none" />
              <div className="flex items-end justify-between gap-4 p-6">
                <div><h2 className="display text-5xl text-forest">{c.t}</h2><p className="mt-2 text-ink-soft">{c.b}</p></div>
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-forest text-cream transition-transform group-hover:translate-x-1"><ArrowRight aria-hidden /></span>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section tone="forest">
        <div className="grid items-end gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow !text-sage mb-4">Booking</p>
            <h2 className="display text-5xl md:text-6xl"><Txt k="bookingEntryTitle" /></h2>
            <p className="mt-4 text-cream/85"><Txt k="bookingEntryBody" /></p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); nav(`/booking?date=${date}`) }} className="rounded-lg bg-cream p-5 text-ink md:p-6">
            <Input label="Date" type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value || todayISO())} required />
            <Button type="submit" variant="accent" lg className="mt-4 w-full" icon={ArrowRight}>Check open courts</Button>
          </form>
        </div>
      </Section>

      <Section>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 className="display text-4xl md:text-5xl">Around the courts</h2>
          <Button to="/gallery" variant="secondary">Open gallery</Button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
          {[0, 1, 2].map((i) => gallery[i] ? (
            <img key={gallery[i].id} src={gallery[i].src} alt={gallery[i].caption || 'Gallery photo'} className={cn('aspect-square w-full rounded-lg object-cover', i === 0 && 'col-span-2 md:col-span-1')} />
          ) : (
            <div key={i} className={cn('flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-edge bg-sand/50 p-4 text-center', i === 0 && 'col-span-2 md:col-span-1')}>
              <ImageIcon aria-hidden className="text-bark" /><span className="mt-2 font-mono text-xs uppercase tracking-wider">Photo slot {i + 1}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="sand">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div><h2 className="display text-4xl md:text-5xl">Follow along</h2><p className="mt-2 text-ink-soft">Updates, open play and café news.</p></div>
          <SocialLinks />
        </div>
      </Section>
    </>
  )
}

/* ---------------- About ---------------- */
export function About() {
  return (
    <>
      <PageHero eyebrow="About" title="About us"><Txt k="aboutBody" /></PageHero>
      <Section><div className="grid gap-10 md:grid-cols-2"><ImageSlot slot="aboutImage" label="About photo" className="aspect-[4/3]" /><div className="space-y-5"><h2 className="display text-4xl"><Txt k="aboutTitle" /></h2><Prose k="aboutBody" /><Button to="/location" variant="secondary" icon={MapPin}>Find us</Button></div></div></Section>
    </>
  )
}

/* ---------------- Pickleball ---------------- */
export function Pickleball() {
  const { courts, services } = useStore()
  return (
    <>
      <PageHero eyebrow="Pickleball" title="The courts"><Txt k="pickleballIntro" /></PageHero>
      <Section>
        <div className="grid gap-10 md:grid-cols-2">
          <ImageSlot slot="pickleballImage" label="Courts photo" className="aspect-[4/3]" />
          <div className="space-y-8">
            <div><h2 className="display text-3xl">New to pickleball?</h2><p className="mt-3 text-lg"><Txt k="beginnerNote" /></p></div>
            <div><h2 className="display text-3xl">Equipment</h2><p className="mt-3 text-lg"><Txt k="equipmentNote" /></p></div>
          </div>
        </div>
      </Section>
      <Section tone="sand">
        <h2 className="display mb-8 text-4xl">Courts & services</h2>
        {courts.length === 0 && services.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No courts listed yet" body="Courts and services appear here once they are added in the admin." action={<Button to="/admin/courts" variant="secondary">Add courts in admin</Button>} />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            <ul className="card divide-y divide-line">{courts.map((c) => <li key={c.id} className="flex items-center justify-between p-4"><span className="font-semibold">{c.name}</span><span className="text-sm text-ink-soft">{c.status === 'AVAILABLE' ? 'Open for booking' : 'Currently unavailable'}</span></li>)}</ul>
            <ul className="card divide-y divide-line">{services.map((s) => <li key={s.id} className="p-4"><p className="font-semibold">{s.name}</p><p className="text-sm text-ink-soft">{s.description}</p></li>)}</ul>
          </div>
        )}
        <Button to="/booking" variant="accent" lg className="mt-8">Book a court</Button>
      </Section>
    </>
  )
}

/* ---------------- Café ---------------- */
export function Cafe() {
  const { menu } = useStore()
  const cats = [...new Set(menu.map((m) => m.category || 'Menu'))]
  return (
    <>
      <PageHero eyebrow="Café" title="The café"><Txt k="cafeIntro" /></PageHero>
      <Section>
        <div className="grid gap-10 md:grid-cols-2">
          <div className="space-y-6">
            <ImageSlot slot="cafeImage" label="Café photo" className="aspect-[4/3]" />
            <p className="flex items-center gap-3"><Clock size={20} className="text-clay" aria-hidden /> <span className="font-semibold">Café hours:</span> <Txt k="cafeHours" /></p>
          </div>
          <div>
            <h2 className="display mb-6 text-4xl">Menu</h2>
            {menu.length === 0 ? (
              <EmptyState icon={Coffee} title="Menu not added yet" body="Menu items appear here once added in Services & Rates." action={<Button to="/admin/services" variant="secondary">Add menu items</Button>} />
            ) : (
              cats.map((cat) => (
                <div key={cat} className="mb-8">
                  <h3 className="eyebrow mb-2">{cat}</h3>
                  <ul className="divide-y divide-line border-y border-line">{menu.filter((m) => (m.category || 'Menu') === cat).map((m) => <li key={m.id} className="flex justify-between gap-4 py-3"><span className="font-semibold">{m.name}</span><span>{peso(m.price, 'Price not set')}</span></li>)}</ul>
                </div>
              ))
            )}
          </div>
        </div>
      </Section>
    </>
  )
}

/* ---------------- Rates ---------------- */
export function Rates() {
  const { services, settings } = useStore()
  return (
    <>
      <PageHero eyebrow="Rates" title="Rates & policies" />
      <Section>
        {services.length === 0 ? (
          <EmptyState icon={Tag} title="Rates not published yet" body="CLIENT INPUT REQUIRED: add services and hourly rates in the admin." action={<><Button to="/admin/services" variant="secondary">Add rates</Button><Button variant="ghost" onClick={loadPlaceholderSetup}>Load placeholder setup</Button></>} />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <div key={s.id} className="card flex flex-col p-6">
                <h2 className="display text-3xl text-forest">{s.name}</h2>
                <p className="mt-2 flex-1 text-ink-soft">{s.description}</p>
                <p className="mt-6 border-t border-line pt-4"><span className="display text-4xl">{s.ratePerHour == null ? <Needed tag>Rate</Needed> : peso(s.ratePerHour)}</span>{s.ratePerHour != null && <span className="text-ink-soft"> / hour</span>}</p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[['Deposit', settings.depositPercent == null ? '' : `A ${settings.depositPercent}% deposit is due to hold your booking.`], ['Cancellation', settings.cancellationPolicy], ['House rules', settings.houseRules]].map(([t, v]) => (
            <div key={t} className="card p-6"><h3 className="eyebrow mb-3">{t}</h3>{v ? <p className="whitespace-pre-line">{v}</p> : <Needed tag>{t} policy</Needed>}</div>
          ))}
        </div>
        <Button to="/booking" variant="accent" lg className="mt-10">Book a court</Button>
      </Section>
    </>
  )
}

/* ---------------- Gallery ---------------- */
export function Gallery() {
  const { gallery } = useStore()
  const [open, setOpen] = useState<number | null>(null)
  return (
    <>
      <PageHero eyebrow="Gallery" title="Gallery" />
      <Section>
        {gallery.length === 0 ? (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-edge bg-sand/50 text-center"><ImageIcon aria-hidden className="text-bark" /><span className="mt-2 font-mono text-xs uppercase tracking-wider">Photo slot {i + 1}</span></div>)}</div>
            <p className="mt-6 text-ink-soft">CLIENT INPUT REQUIRED: upload photos in <Link className="font-semibold text-forest underline" to="/admin/gallery">Admin → Gallery</Link>.</p>
          </>
        ) : (
          <ul className="columns-2 gap-4 md:columns-3">
            {gallery.map((g, i) => (
              <li key={g.id} className="mb-4 break-inside-avoid">
                <button type="button" onClick={() => setOpen(i)} className="block w-full cursor-zoom-in overflow-hidden rounded-lg"><img src={g.src} alt={g.caption || 'Gallery photo'} className="w-full" /></button>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Modal open={open !== null} onClose={() => setOpen(null)} title={open !== null ? gallery[open]?.caption || 'Photo' : ''} wide
        footer={<><Button variant="secondary" disabled={open === 0} onClick={() => setOpen((o) => (o ?? 1) - 1)}>Previous</Button><Button variant="secondary" disabled={open === gallery.length - 1} onClick={() => setOpen((o) => (o ?? 0) + 1)}>Next</Button></>}>
        {open !== null && gallery[open] && <img src={gallery[open].src} alt={gallery[open].caption || 'Gallery photo'} className="w-full rounded-md" />}
      </Modal>
    </>
  )
}

/* ---------------- Location ---------------- */
export function Location() {
  const c = useContent()
  const map = c('mapUrl')
  return (
    <>
      <PageHero eyebrow="Location" title="Find us in Marikina City" />
      <Section>
        <div className="grid gap-10 md:grid-cols-2">
          <div className="space-y-8">
            <div><h2 className="eyebrow mb-2">Address</h2><p className="text-xl"><Txt k="address" /></p></div>
            <div><h2 className="eyebrow mb-2">Directions & parking</h2><p className="text-lg"><Txt k="directions" /></p></div>
            <div><h2 className="eyebrow mb-2">Hours</h2><p className="text-lg"><Txt k="hours" /></p></div>
            {map ? <Button href={map} icon={Navigation}>Get directions</Button> : <Button to="/admin/content" icon={Navigation} variant="secondary">Add map link</Button>}
          </div>
          <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-lg border-2 border-dashed border-edge bg-sand/50 text-center">
            <MapPin className="text-bark" aria-hidden /><p className="mt-2 font-semibold">Map</p><p className="font-mono text-xs uppercase tracking-wider text-ink-soft">{map ? 'Opens in Google Maps' : 'Client input required · map link'}</p>
          </div>
        </div>
      </Section>
    </>
  )
}

/* ---------------- Contact ---------------- */
export function Contact() {
  const c = useContent()
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<Record<string, string>>({})
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const v = Object.fromEntries(f) as Record<string, string>
    const er: Record<string, string> = {}
    if (!v.name.trim()) er.name = 'Please enter your name.'
    if (!/^\S+@\S+\.\S+$/.test(v.email)) er.email = 'Enter a valid email address.'
    if (v.message.trim().length < 5) er.message = 'Please write a short message.'
    setErr(er)
    if (Object.keys(er).length) return
    setBusy(true)
    setTimeout(() => { submitInquiry({ name: v.name, email: v.email, phone: v.phone, topic: v.topic, message: v.message }); setBusy(false); setSent(true) }, 600)
  }
  return (
    <>
      <PageHero eyebrow="Contact" title="Get in touch"><Txt k="contactIntro" /></PageHero>
      <Section>
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-6">
            {[{ I: Phone, t: 'Phone', k: 'phone', href: c('phone') ? `tel:${c('phone').replace(/[^+\d]/g, '')}` : '' }, { I: MessageSquare, t: 'Email', k: 'email', href: c('email') ? `mailto:${c('email')}` : '' }, { I: MapPin, t: 'Visit', k: 'address', href: '' }].map(({ I, t, k, href }) => (
              <div key={k} className="flex gap-4"><I className="mt-1 text-clay" aria-hidden /><div><p className="eyebrow">{t}</p>{href ? <a className="font-semibold underline underline-offset-4" href={href}><Txt k={k} /></a> : <p className="font-semibold"><Txt k={k} /></p>}</div></div>
            ))}
            <SocialLinks />
          </div>
          {sent ? (
            <div className="card p-8" role="status">
              <h2 className="display text-4xl text-forest">Message sent</h2>
              <p className="mt-3 text-ink-soft">Thank you. It has been added to the Inquiries inbox in the admin.</p>
              <div className="mt-6 flex flex-wrap gap-3"><Button variant="secondary" onClick={() => setSent(false)}>Send another</Button><Button to="/admin/inquiries" variant="ghost">View in admin</Button></div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="card space-y-5 p-6 md:p-8">
              <div className="grid gap-5 md:grid-cols-2"><Input label="Name" name="name" autoComplete="name" error={err.name} /><Input label="Email" name="email" type="email" autoComplete="email" error={err.email} /></div>
              <div className="grid gap-5 md:grid-cols-2"><Input label="Phone" name="phone" type="tel" autoComplete="tel" optional /><Select label="Topic" name="topic"><option>Booking question</option><option>Café</option><option>Groups & events</option><option>Other</option></Select></div>
              <TextArea label="Message" name="message" error={err.message} />
              <Button type="submit" variant="accent" lg disabled={busy} icon={Send} aria-busy={busy}>{busy ? 'Sending…' : 'Send message'}</Button>
            </form>
          )}
        </div>
      </Section>
    </>
  )
}

export function NotFound() {
  return <Section><EmptyState icon={MapPin} title="Page not found" body="That page does not exist." action={<Button to="/">Back to home</Button>} /></Section>
}
