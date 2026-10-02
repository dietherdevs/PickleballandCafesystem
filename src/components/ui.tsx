import {
  useEffect, useId, useRef, useState,
  type ComponentProps, type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import {
  AlertTriangle, CheckCheck, CircleCheck, Clock, ImagePlus, LogIn, Trash2, UserX, X, XCircle,
  type LucideIcon,
} from 'lucide-react'
import { CONTENT_PAGES } from '../lib/content'
import { STATUS_LABEL, setImage, useStore, type Status } from '../lib/store'
import { cn } from '../lib/util'

/* ---------------- Buttons ---------------- */
type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger' | 'on-dark'
type BtnExtra = { variant?: Variant; lg?: boolean; to?: string; href?: string; icon?: LucideIcon; className?: string; children?: ReactNode }
export function Button({ variant = 'primary', lg, to, href, icon: Icon, className, children, ...rest }: BtnExtra & Omit<ComponentProps<'button'>, keyof BtnExtra>) {
  const cls = cn('btn', `btn-${variant}`, lg && 'btn-lg', className)
  const inner = (<>{Icon && <Icon size={18} aria-hidden />}{children}</>)
  if (to) return <Link to={to} className={cls}>{inner}</Link>
  if (href) return <a href={href} className={cls} target="_blank" rel="noopener noreferrer">{inner}</a>
  return <button type="button" className={cls} {...rest}>{inner}</button>
}

/* ---------------- Form fields ---------------- */
type FieldProps = { label: string; hint?: string; error?: string; optional?: boolean }
function FieldShell({ label, hint, error, optional, id, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        {optional && <span className="ml-1.5 font-normal text-ink-soft">(optional)</span>}
      </label>
      {children}
      {hint && !error && <p id={id + '-h'} className="mt-1.5 text-sm text-ink-soft">{hint}</p>}
      {error && (
        <p id={id + '-e'} role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-st-cancel">
          <AlertTriangle size={15} aria-hidden /> {error}
        </p>
      )}
    </div>
  )
}
const describe = (id: string, hint?: string, error?: string) => (error ? id + '-e' : hint ? id + '-h' : undefined)

export function Input({ label, hint, error, optional, className, ...p }: FieldProps & ComponentProps<'input'>) {
  const id = useId()
  return (
    <FieldShell {...{ label, hint, error, optional, id }}>
      <input id={id} className={cn('input', className)} aria-invalid={!!error} aria-describedby={describe(id, hint, error)} {...p} />
    </FieldShell>
  )
}
export function Select({ label, hint, error, optional, className, children, ...p }: FieldProps & ComponentProps<'select'>) {
  const id = useId()
  return (
    <FieldShell {...{ label, hint, error, optional, id }}>
      <select id={id} className={cn('input pr-8', className)} aria-invalid={!!error} aria-describedby={describe(id, hint, error)} {...p}>{children}</select>
    </FieldShell>
  )
}
export function TextArea({ label, hint, error, optional, className, ...p }: FieldProps & ComponentProps<'textarea'>) {
  const id = useId()
  return (
    <FieldShell {...{ label, hint, error, optional, id }}>
      <textarea id={id} rows={4} className={cn('input', className)} aria-invalid={!!error} aria-describedby={describe(id, hint, error)} {...p} />
    </FieldShell>
  )
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-md border border-edge bg-paper p-1">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}
          className={cn('min-h-11 min-w-11 cursor-pointer rounded-sm px-4 text-sm font-bold', value === o.value ? 'bg-forest text-cream' : 'text-ink hover:bg-sand')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------------- Badges ---------------- */
export const STATUS_STYLE: Record<Status, { icon: LucideIcon; cls: string }> = {
  PENDING: { icon: Clock, cls: 'bg-st-pending-bg text-st-pending border-st-pending/40' },
  CONFIRMED: { icon: CircleCheck, cls: 'bg-st-confirmed-bg text-st-confirmed border-st-confirmed/40' },
  CHECKED_IN: { icon: LogIn, cls: 'bg-st-checked-bg text-st-checked border-st-checked/40' },
  COMPLETED: { icon: CheckCheck, cls: 'bg-st-done-bg text-st-done border-st-done/40' },
  CANCELLED: { icon: XCircle, cls: 'bg-st-cancel-bg text-st-cancel border-st-cancel/40' },
  NO_SHOW: { icon: UserX, cls: 'bg-st-noshow-bg text-st-noshow border-st-noshow/40' },
}
export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const { icon: I, cls } = STATUS_STYLE[status]
  return (
    <span className={cn('badge', cls, className)}>
      <I size={14} aria-hidden /> {STATUS_LABEL[status]}
    </span>
  )
}
export function Badge({ tone = 'neutral', icon: I, children }: { tone?: 'neutral' | 'good' | 'warn' | 'bad'; icon?: LucideIcon; children: ReactNode }) {
  const t = { neutral: 'bg-sand text-ink border-edge/40', good: 'bg-sage text-forest border-forest/30', warn: 'bg-st-pending-bg text-st-pending border-st-pending/40', bad: 'bg-st-cancel-bg text-st-cancel border-st-cancel/40' }[tone]
  return <span className={cn('badge', t)}>{I && <I size={14} aria-hidden />}{children}</span>
}

/* ---------------- Modal / Drawer ---------------- */
const modalStack: object[] = []
export function Modal({ open, onClose, title, children, footer, side, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; side?: boolean; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const tid = useId()
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    const token = {}
    modalStack.push(token)
    const prev = document.activeElement as HTMLElement | null
    const root = ref.current!
    const focusables = () => Array.from(root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((e) => !e.hasAttribute('disabled'))
    ;(root.querySelector<HTMLElement>('[data-autofocus]') ?? root).focus()
    const key = (e: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== token) return
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current() }
      if (e.key === 'Tab') {
        const f = focusables()
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', key)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', key)
      modalStack.splice(modalStack.indexOf(token), 1)
      document.body.style.overflow = overflow
      prev?.focus?.()
    }
  }, [open])
  if (!open) return null
  return createPortal(
    <div className={cn('fixed inset-0 z-[80] flex', side ? 'justify-end' : 'items-end justify-center sm:items-center sm:p-6')}>
      <div className="absolute inset-0 bg-ink/55" onClick={onClose} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={tid} tabIndex={-1}
        className={cn('relative flex max-h-full flex-col bg-cream shadow-pop outline-none',
          side ? 'h-full w-full max-w-xl border-l border-line' : cn('w-full rounded-t-lg border border-line sm:rounded-lg', wide ? 'max-w-2xl' : 'max-w-lg'))}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 md:px-6">
          <h2 id={tid} className="display text-2xl md:text-3xl">{title}</h2>
          <button type="button" onClick={onClose} aria-label={`Close ${title}`} className="btn btn-ghost -mr-2 shrink-0 !px-2.5"><X size={22} aria-hidden /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-line bg-paper px-5 py-4 md:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel, danger, children, disabled }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; body: ReactNode; confirmLabel: string; danger?: boolean; children?: ReactNode; disabled?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<>
        <Button variant="secondary" onClick={onClose} data-autofocus>Keep as is</Button>
        <Button variant={danger ? 'danger' : 'primary'} disabled={disabled} onClick={onConfirm} icon={danger ? Trash2 : CircleCheck}>{confirmLabel}</Button>
      </>}>
      <div className="space-y-4 text-ink-soft">{body}</div>
      {children && <div className="mt-4">{children}</div>}
    </Modal>
  )
}

/* ---------------- Empty states / placeholders ---------------- */
export function EmptyState({ icon: I, title, body, action, className }: { icon: LucideIcon; title: string; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center rounded-lg border-2 border-dashed border-edge bg-paper/60 px-6 py-12 text-center', className)}>
      <span className="mb-4 grid size-14 place-items-center rounded-full bg-sand text-bark"><I size={26} aria-hidden /></span>
      <h3 className="display text-2xl">{title}</h3>
      {body && <p className="mt-2 max-w-md text-ink-soft">{body}</p>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  )
}
export function Needed({ children, tag = false }: { children: ReactNode; tag?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 rounded-sm border border-dashed border-edge bg-sand/70 px-2 py-0.5 align-baseline text-[0.85em] font-medium not-italic text-bark">
      {tag && <span className="font-mono text-[0.7em] uppercase tracking-wider">Client input required ·</span>}
      {children}
    </span>
  )
}

export const FIELD_INDEX = Object.fromEntries(CONTENT_PAGES.flatMap((p) => p.sections.flatMap((s) => s.fields)).map((f) => [f.key, f]))
export function useContent() {
  const { content } = useStore()
  return (key: string) => (content[key] ?? '').trim() || FIELD_INDEX[key]?.fallback || ''
}
export function Txt({ k, className }: { k: string; className?: string }) {
  const c = useContent()
  const v = c(k)
  if (v) return <span className={cn('whitespace-pre-line', className)}>{v}</span>
  return <Needed>{FIELD_INDEX[k]?.placeholder ?? 'Add text'}</Needed>
}

/* ---------------- Images ---------------- */
export function fileToDataURL(file: File, maxW = 1400): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width)
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.78))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Not an image')) }
    img.src = url
  })
}

export function ImageSlot({ slot, label, className }: { slot: string; label: string; className?: string }) {
  const { images, session } = useStore()
  const id = useId()
  const src = images[slot]
  const onFile = async (f?: File | null) => {
    if (!f) return
    try { setImage(slot, await fileToDataURL(f)); toast(`${label} saved`) } catch { toast('That file could not be read as an image') }
  }
  if (src)
    return (
      <div className={cn('relative overflow-hidden rounded-lg bg-sand', className)}>
        <img src={src} alt={label} className="size-full object-cover" />
        {session && (
          <button type="button" onClick={() => setImage(slot, null)} className="btn btn-on-dark absolute right-3 top-3 !min-h-11"><Trash2 size={16} aria-hidden /> Remove</button>
        )}
      </div>
    )
  const body = (
    <>
      <ImagePlus size={30} aria-hidden className="text-bark" />
      <span className="mt-3 font-semibold text-ink">{label}</span>
      <span className="font-mono text-xs uppercase tracking-wider text-ink-soft">{session ? 'Tap to upload photo' : 'Client input required · photo'}</span>
    </>
  )
  const base = 'flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-edge bg-sand/50 p-6 text-center'
  if (!session) return <div className={cn(base, className)} role="img" aria-label={`${label} placeholder`}>{body}</div>
  return (
    <>
      <input id={id} type="file" accept="image/*" className="peer sr-only" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
      <label htmlFor={id} className={cn(base, 'cursor-pointer hover:bg-sage/50 peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-clay', className)}>{body}</label>
    </>
  )
}

/* ---------------- Toast ---------------- */
export const toast = (msg: string) => window.dispatchEvent(new CustomEvent('app-toast', { detail: msg }))
export function ToastHost() {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([])
  useEffect(() => {
    const h = (e: Event) => {
      const id = Math.random()
      setItems((i) => [...i, { id, msg: (e as CustomEvent).detail }])
      setTimeout(() => setItems((i) => i.filter((x) => x.id !== id)), 4200)
    }
    window.addEventListener('app-toast', h)
    return () => window.removeEventListener('app-toast', h)
  }, [])
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {items.map((t) => (
        <div key={t.id} className="pointer-events-auto flex items-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-cream shadow-pop">
          <CircleCheck size={18} aria-hidden /> {t.msg}
        </div>
      ))}
    </div>
  )
}

/* ---------------- Layout bits ---------------- */
export function PageHeader({ title, eyebrow, actions, children }: { title: string; eyebrow?: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="display text-4xl md:text-5xl">{title}</h1>
        {children && <p className="mt-3 max-w-2xl text-ink-soft">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  )
}
export const Spinner = ({ label = 'Loading' }: { label?: string }) => (
  <span role="status" className="inline-flex items-center gap-2 text-ink-soft">
    <span className="size-4 animate-spin rounded-full border-2 border-edge border-t-forest" aria-hidden /> {label}
  </span>
)
