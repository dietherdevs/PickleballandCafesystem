export type FieldDef = { key: string; label: string; placeholder: string; multiline?: boolean; hint?: string; fallback?: string }
export type SectionDef = { id: string; label: string; fields: FieldDef[]; images?: { key: string; label: string }[] }
export type PageDef = { id: string; label: string; path: string; sections: SectionDef[] }

export const CONTENT_PAGES: PageDef[] = [
  {
    id: 'home',
    label: 'Homepage',
    path: '/',
    sections: [
      {
        id: 'hero',
        label: 'Hero',
        fields: [
          { key: 'heroHeadline', label: 'Headline', placeholder: 'Add headline', fallback: 'Pickleball courts and a café in Marikina City.' },
          { key: 'heroSub', label: 'Supporting line', placeholder: 'Add a one-sentence supporting line', multiline: true },
        ],
        images: [{ key: 'heroImage', label: 'Hero photo' }],
      },
      {
        id: 'booking-entry',
        label: 'Booking entry section',
        fields: [
          { key: 'bookingEntryTitle', label: 'Section title', placeholder: 'Add title', fallback: 'Pick a day. We will show open courts.' },
          { key: 'bookingEntryBody', label: 'Body text', placeholder: 'Add body text', multiline: true },
        ],
      },
    ],
  },
  {
    id: 'business',
    label: 'Business info',
    path: '/contact',
    sections: [
      {
        id: 'name',
        label: 'Name & contact',
        fields: [
          { key: 'businessName', label: 'Business name', placeholder: 'Add business name' },
          { key: 'phone', label: 'Phone', placeholder: 'Add phone number' },
          { key: 'email', label: 'Email', placeholder: 'Add email address' },
        ],
      },
      {
        id: 'location',
        label: 'Location',
        fields: [
          { key: 'address', label: 'Street address', placeholder: 'Add street address', multiline: true, hint: 'Shown in the quick-info strip, footer and Location page.' },
          { key: 'directions', label: 'Directions & parking', placeholder: 'Add directions and parking notes', multiline: true },
          { key: 'mapUrl', label: 'Map link', placeholder: 'Paste a Google Maps link', hint: 'Used by the Get directions button.' },
        ],
      },
      { id: 'hours', label: 'Opening hours (display text)', fields: [{ key: 'hours', label: 'Hours', placeholder: 'Add opening hours', multiline: true }] },
      {
        id: 'social',
        label: 'Social links',
        fields: [
          { key: 'facebook', label: 'Facebook page URL', placeholder: 'https://facebook.com/…' },
          { key: 'instagram', label: 'Instagram profile URL', placeholder: 'https://instagram.com/…' },
        ],
      },
    ],
  },
  {
    id: 'about',
    label: 'About',
    path: '/about',
    sections: [
      {
        id: 'story',
        label: 'Our story',
        fields: [
          { key: 'aboutTitle', label: 'Title', placeholder: 'Add title', fallback: 'About us' },
          { key: 'aboutBody', label: 'Story', placeholder: 'Add the story of the facility', multiline: true },
        ],
        images: [{ key: 'aboutImage', label: 'About photo' }],
      },
    ],
  },
  {
    id: 'pickleball',
    label: 'Pickleball',
    path: '/pickleball',
    sections: [
      {
        id: 'intro',
        label: 'Intro & beginners',
        fields: [
          { key: 'pickleballIntro', label: 'Intro', placeholder: 'Add intro about the courts', multiline: true },
          { key: 'beginnerNote', label: 'First-timer note', placeholder: 'Add a note for first-time players', multiline: true },
          { key: 'equipmentNote', label: 'Equipment note', placeholder: 'Add equipment rental / bring-your-own info', multiline: true },
        ],
        images: [{ key: 'pickleballImage', label: 'Courts photo' }],
      },
    ],
  },
  {
    id: 'cafe',
    label: 'Café',
    path: '/cafe',
    sections: [
      {
        id: 'intro',
        label: 'Café intro',
        fields: [
          { key: 'cafeIntro', label: 'Intro', placeholder: 'Add intro about the café', multiline: true },
          { key: 'cafeHours', label: 'Café hours', placeholder: 'Add café hours' },
        ],
        images: [{ key: 'cafeImage', label: 'Café photo' }],
      },
    ],
  },
  {
    id: 'contact',
    label: 'Contact page',
    path: '/contact',
    sections: [{ id: 'intro', label: 'Intro', fields: [{ key: 'contactIntro', label: 'Intro text', placeholder: 'Add a short welcome for visitors', multiline: true }] }],
  },
]
