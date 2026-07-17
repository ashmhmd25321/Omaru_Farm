import { SITE_URL } from '@/utils/seo'

export const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': ['LocalBusiness', 'Restaurant', 'LodgingBusiness'],
  '@id': `${SITE_URL}/#business`,
  name: 'Omaru Farm',
  alternateName: 'Omaru Farm Store, Café & Accommodation',
  description:
    'Omaru Farm is a Phillip Island destination for farm-to-table dining, cabin stays, and a premium farm store in Ventnor.',
  image: `${SITE_URL}/images/farm/IMG_3924.jpg`,
  url: `${SITE_URL}/`,
  telephone: '+61476302477',
  email: 'Omarufarmcafe@gmail.com',
  priceRange: '$$',
  servesCuisine: ['Farm-to-table', 'Sri Lankan', 'Australian'],
  address: {
    '@type': 'PostalAddress',
    streetAddress: '776 Ventnor Road',
    addressLocality: 'Ventnor',
    addressRegion: 'VIC',
    postalCode: '3922',
    addressCountry: 'AU',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: -38.4885,
    longitude: 145.1905,
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '10:00',
      closes: '16:00',
    },
  ],
  areaServed: {
    '@type': 'Place',
    name: 'Phillip Island, Victoria, Australia',
  },
  sameAs: ['https://wa.me/61476302477'],
  hasMap: 'https://www.google.com/maps/search/?api=1&query=776+Ventnor+Road+Ventnor+VIC+3922',
}

export const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Where is Omaru Farm located?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Omaru Farm is at 776 Ventnor Road, Ventnor VIC 3922 on Phillip Island, about 5 minutes from the Penguin Parade and 10 minutes from Cowes.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does Omaru Farm have a cafe?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Café Omaru serves farm-to-table lunch and dinner with Sri Lankan flavours, barista coffee, and licensed beverages.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I stay at Omaru Farm?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Omaru Farm offers on-farm cabin stays and Phillip Island holiday home options. You can submit a booking request online.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does Omaru Farm have a farm store?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The farm store offers homemade pantry goods including pickles, chutneys, herbs, spices, and olive oil products.',
      },
    },
  ],
}
