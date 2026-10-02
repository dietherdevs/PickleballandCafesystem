export const pad = (n: number) => String(n).padStart(2, '0')
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const todayISO = () => iso(new Date())
export const addDays = (s: string, n: number) => {
  const d = parseISO(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}
export const fmtDate = (s: string, long = false) =>
  parseISO(s).toLocaleDateString('en-PH', long ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' } : { weekday: 'short', month: 'short', day: 'numeric' })
export const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
export const fmtMin = (m: number) => {
  const h = Math.floor(m / 60) % 24
  return `${h % 12 || 12}:${pad(m % 60)} ${h >= 12 ? 'PM' : 'AM'}`
}
export const fmtHM = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
export const fmtDur = (m: number) => (m % 60 === 0 ? `${m / 60} hour${m === 60 ? '' : 's'}` : `${m / 60} hours`)
export const nowMin = () => {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}
export const peso = (n: number | null | undefined, unset = 'Not set') =>
  n == null ? unset : '₱' + n.toLocaleString('en-PH', { maximumFractionDigits: 2 })
export const fmtStamp = (ms: number) =>
  new Date(ms).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export function download(filename: string, text: string, mime = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

export const toCSV = (rows: (string | number | null)[][]) =>
  rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')

const stamp = (date: string, min: number) => date.replace(/-/g, '') + 'T' + pad(Math.floor(min / 60)) + pad(min % 60) + '00'

export function calendarLinks(o: { title: string; date: string; start: number; end: number; location: string; ref: string }) {
  const google =
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(o.title)}&dates=${stamp(o.date, o.start)}/${stamp(o.date, o.end)}` +
    `&ctz=Asia/Manila&location=${encodeURIComponent(o.location)}&details=${encodeURIComponent('Booking reference ' + o.ref)}`
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Court Booking//EN',
    'BEGIN:VEVENT',
    `UID:${o.ref}@booking`,
    `DTSTAMP:${stamp(todayISO(), nowMin())}`,
    `DTSTART;TZID=Asia/Manila:${stamp(o.date, o.start)}`,
    `DTEND;TZID=Asia/Manila:${stamp(o.date, o.end)}`,
    `SUMMARY:${o.title}`,
    `LOCATION:${o.location}`,
    `DESCRIPTION:Booking reference ${o.ref}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  return { google, ics }
}
