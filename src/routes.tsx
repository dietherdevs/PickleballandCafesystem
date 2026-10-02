import { createBrowserRouter } from 'react-router'
import AdminLayout from './admin/AdminLayout'
import { Bookings, CalendarPage, Dashboard } from './admin/pages1'
import { AdminGallery, Courts, Customers, Inquiries, Payments, Services } from './admin/pages2'
import { AuditLog, ContentEditor, Reports, SettingsPage, Users } from './admin/pages3'
import { Booking, Confirmation } from './public/Booking'
import PublicLayout from './public/PublicLayout'
import { About, Cafe, Contact, Gallery, Home, Location, NotFound, Pickleball, Rates } from './public/pages'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: PublicLayout,
    children: [
      { index: true, Component: Home },
      { path: 'about', Component: About },
      { path: 'pickleball', Component: Pickleball },
      { path: 'cafe', Component: Cafe },
      { path: 'rates', Component: Rates },
      { path: 'gallery', Component: Gallery },
      { path: 'location', Component: Location },
      { path: 'contact', Component: Contact },
      { path: 'booking', Component: Booking },
      { path: 'booking/confirmation/:ref', Component: Confirmation },
      { path: '*', Component: NotFound },
    ],
  },
  {
    path: '/admin',
    Component: AdminLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'bookings', Component: Bookings },
      { path: 'calendar', Component: CalendarPage },
      { path: 'courts', Component: Courts },
      { path: 'services', Component: Services },
      { path: 'customers', Component: Customers },
      { path: 'payments', Component: Payments },
      { path: 'inquiries', Component: Inquiries },
      { path: 'gallery', Component: AdminGallery },
      { path: 'content', Component: ContentEditor },
      { path: 'reports', Component: Reports },
      { path: 'users', Component: Users },
      { path: 'audit', Component: AuditLog },
      { path: 'settings', Component: SettingsPage },
    ],
  },
])
