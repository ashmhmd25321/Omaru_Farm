import { pool } from './db.js'

function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

const DEFAULT_STAY_PAGE = {
  heroKicker: 'Welcome to Omaru',
  heroTitleLine: 'A Sanctuary',
  heroTitleItalic: 'Silence',
  heroLead:
    'Only our self-contained cabins are on Omaru Farm. Holiday homes are separate properties on Phillip Island — each a comfortable base minutes from the farm and the Penguin Parade.',
  heroImage: '/images/farm/image-farm/Gemini_Generated_Image_f9njj4f9njj4f9nj.jpg',
  sectionTitle: 'The Stays',
  sectionLead:
    'Stay in a self-contained cabin on the farm, or choose a holiday home elsewhere on Phillip Island — both keep you close to Omaru, the café, and island adventures.',
}

const DEFAULT_STAY_GROUPS = [
  {
    slug: 'on-farm',
    title: 'On the Farm',
    lead: 'Only our self-contained cabins sit on Omaru Farm — wake to paddocks, farm sounds, and views across the land.',
    sortOrder: 0,
  },
  {
    slug: 'holiday-homes',
    title: 'Holiday Homes on Phillip Island',
    lead: 'Rose and Jasmine by Omaru Farm are separate holiday homes in Cowes, available for accommodation with easy access to Omaru Farm, beaches, cafes, and island attractions.',
    sortOrder: 1,
  },
]

const ROSE_STAY_GALLERY = [
  [1, 'Living room'], [2, 'Living room'], [12, 'Living room'], [17, 'Living room'],
  [4, 'Kitchen'], [8, 'Kitchen'], [3, 'Dining area'], [5, 'Dining area'],
  [10, 'Bedroom 1'], [13, 'Bedroom 1'], [16, 'Bedroom 1'], [14, 'Bedroom 2'],
  [15, 'Bedroom 3'], [6, 'Bedroom 4'], [9, 'Bathroom 1'], [11, 'Bathroom 1'],
  [7, 'Bathroom 2'], [19, 'Laundry'], [20, 'Exterior'], [21, 'Exterior'],
  [22, 'Exterior'], [18, 'More of the home'], [23, 'More of the home'],
].map(([n, label]) => ({
  src: `/images/holiday-homes/rose/rose-${String(n).padStart(2, '0')}.jpg`,
  label,
}))

const JASMINE_STAY_GALLERY = [
  [1, 'Living room'], [2, 'Living room'], [3, 'Living room'],
  [4, 'Kitchen'], [5, 'Kitchen'], [6, 'Kitchen'], [7, 'Dining area'],
  [8, 'Bedroom 1'], [9, 'Bedroom 1'], [10, 'Bedroom 2'], [11, 'Bedroom 2'],
  [12, 'Bedroom 3'], [13, 'Bedroom 3'], [14, 'Bedroom 4'], [15, 'Bedroom 4'],
  [16, 'Bedroom 5'], [17, 'Bedroom 5'], [18, 'Bathroom 1'], [19, 'Bathroom 2'],
  [20, 'Bathroom 2'], [21, 'Half bathroom'], [22, 'Backyard'], [23, 'Patio'],
  [24, 'Front yard'], [25, 'Laundry'], [26, 'Exterior'], [27, 'Game room'],
  [28, 'Game room'], [29, 'More of the home'],
].map(([n, label]) => ({
  src: `/images/holiday-homes/jasmine/jasmine-${String(n).padStart(2, '0')}.jpg`,
  label,
}))

const DEFAULT_STAY_LISTINGS = [
  {
    groupSlug: 'on-farm',
    slug: 'glass-pavilion',
    name: 'The Glass Pavilion',
    typeLabel: 'On-Farm · Self-Contained Cabin',
    badge: 'Most Popular',
    tagline: 'Wake to the sound of the farm.',
    description:
      'A self-contained cabin on Omaru Farm — part of a working farm established in 1970. Enjoy life in the open paddock without compromising on comfort, with the finest farm produce on your doorstep.',
    guests: '2–4',
    bookingUrl: '',
    bookingCta: '',
    image: '/images/farm/IMG_9130.jpg',
    gallery: [],
    amenities: [
      { icon: 'BedDouble', label: 'King bed + sofa bed' },
      { icon: 'Waves', label: 'Private deck, ocean views' },
      { icon: 'UtensilsCrossed', label: 'Self-contained kitchen' },
    ],
    imagePosition: 'left',
    sortOrder: 0,
  },
  {
    groupSlug: 'on-farm',
    slug: 'stone-cottage',
    name: 'Heritage Stone Cottage',
    typeLabel: 'On-Farm · Self-Contained Cabin',
    badge: '',
    tagline: 'Surrounded by olive trees and open skies.',
    description:
      'A self-contained heritage cabin on Omaru Farm, nestled among ancient olive groves. Stone walls carry warmth from the land while veranda views stretch across the Phillip Island farmscape.',
    guests: '2–4',
    bookingUrl: '',
    bookingCta: '',
    image: '/images/farm/2025-01-12-8.jpg',
    gallery: [],
    amenities: [
      { icon: 'BedDouble', label: 'Queen & twin rooms' },
      { icon: 'Leaf', label: 'Olive grove outlook' },
      { icon: 'PawPrint', label: 'Dog-friendly outdoors' },
    ],
    imagePosition: 'right',
    sortOrder: 1,
  },
  {
    groupSlug: 'holiday-homes',
    slug: 'rose-by-omaru-farm',
    name: 'Rose by Omaru Farm',
    typeLabel: 'Holiday Home · Phillip Island',
    badge: '',
    tagline: 'The perfect island getaway in Cowes.',
    description:
      'A spacious four-bedroom holiday home in the heart of Cowes, Phillip Island. Relax in the outdoor hot tub after exploring the island, unwind in cosy living spaces, and enjoy a fully equipped kitchen close to local beaches, cafes, shops, and the Penguin Parade.',
    guests: '10',
    bookingUrl: 'https://www.airbnb.com.au/rooms/1377277021524589149?guests=1&adults=1&s=67&unique_share_id=9414357d-89c2-4786-b862-7b94c999640f&source_impression_id=p3_1779517969_P3IRQGtTZUwYTH6T',
    bookingCta: 'View on Airbnb',
    image: ROSE_STAY_GALLERY[0].src,
    gallery: ROSE_STAY_GALLERY,
    amenities: [
      { icon: 'Users', label: '10 guests' },
      { icon: 'BedDouble', label: '4 bedrooms, 5 beds, 2 baths' },
      { icon: 'Waves', label: 'Outdoor hot tub' },
      { icon: 'UtensilsCrossed', label: 'Kitchen, wifi, parking' },
    ],
    imagePosition: 'left',
    sortOrder: 0,
  },
  {
    groupSlug: 'holiday-homes',
    slug: 'jasmine-by-omaru-farm',
    name: 'Jasmine by Omaru Farm',
    typeLabel: 'Holiday Home · Phillip Island',
    badge: '',
    tagline: 'A peaceful five-bedroom retreat near Cowes.',
    description:
      'A warm and welcoming five-bedroom holiday home for families or friends seeking a peaceful Phillip Island escape. Walk to Cowes town centre, cafes, and the foreshore, enjoy a game on the pool table or relaxed barbeque, and explore Red Rocks Beach, the Grand Prix Circuit, the Penguin Parade, and the Nobbies.',
    guests: '12',
    bookingUrl: 'https://www.airbnb.com.au/rooms/1387952701303020884?guests=1&adults=1&s=67&unique_share_id=19c46540-f704-42d5-9848-e975de620952&source_impression_id=p3_1779517989_P34-Oun_Clb_uWZm',
    bookingCta: 'View on Airbnb',
    image: JASMINE_STAY_GALLERY[0].src,
    gallery: JASMINE_STAY_GALLERY,
    amenities: [
      { icon: 'Users', label: '12 guests' },
      { icon: 'BedDouble', label: '5 bedrooms, 6 beds, 2.5 baths' },
      { icon: 'MapPin', label: 'Walk to Cowes and foreshore' },
      { icon: 'UtensilsCrossed', label: 'Kitchen, wifi, workspace, parking' },
    ],
    imagePosition: 'right',
    sortOrder: 1,
  },
]

function parseJsonArray(value, fallback = []) {
  if (Array.isArray(value)) return value
  if (!value) return fallback
  try {
    const parsed = JSON.parse(String(value))
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function slugifyStay(value, fallback = 'stay') {
  const slug = String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return slug || fallback
}

function normalizeStayGallery(raw) {
  return parseJsonArray(raw)
    .map((item) => {
      if (typeof item === 'string') return { src: item.trim(), label: '' }
      return {
        src: String(item?.src ?? item?.url ?? '').trim(),
        label: String(item?.label ?? '').trim(),
      }
    })
    .filter((item) => item.src)
}

function normalizeStayAmenities(raw) {
  return parseJsonArray(raw)
    .map((item) => {
      if (typeof item === 'string') return { icon: 'Leaf', label: item.trim() }
      return {
        icon: String(item?.icon ?? 'Leaf').trim() || 'Leaf',
        label: String(item?.label ?? '').trim(),
      }
    })
    .filter((item) => item.label)
}

function mapStayListingRow(row) {
  return {
    id: row.id,
    groupId: row.groupId,
    groupSlug: row.groupSlug,
    groupTitle: row.groupTitle,
    slug: row.slug,
    name: row.name,
    type: row.typeLabel,
    badge: row.badge || null,
    tagline: row.tagline,
    description: row.description,
    guests: row.guests,
    bookingUrl: row.bookingUrl || null,
    bookingCta: row.bookingCta || '',
    image: row.image,
    gallery: normalizeStayGallery(row.galleryJson),
    amenities: normalizeStayAmenities(row.amenitiesJson),
    imagePosition: row.imagePosition === 'right' ? 'right' : 'left',
    isPublished: Number(row.isPublished) === 1,
    sortOrder: toNumber(row.sortOrder, 0),
  }
}

function stayListingFieldsFromBody(body) {
  const name = String(body?.name ?? '').trim()
  return {
    groupId: toNumber(body?.groupId, 0),
    slug: slugifyStay(body?.slug || name),
    name,
    typeLabel: String(body?.type ?? body?.typeLabel ?? '').trim(),
    badge: String(body?.badge ?? '').trim(),
    tagline: String(body?.tagline ?? '').trim(),
    description: String(body?.description ?? ''),
    guests: String(body?.guests ?? '').trim(),
    bookingUrl: String(body?.bookingUrl ?? '').trim(),
    bookingCta: String(body?.bookingCta ?? '').trim(),
    image: String(body?.image ?? '').trim(),
    galleryJson: JSON.stringify(normalizeStayGallery(body?.gallery)),
    amenitiesJson: JSON.stringify(normalizeStayAmenities(body?.amenities)),
    imagePosition: String(body?.imagePosition ?? 'left') === 'right' ? 'right' : 'left',
    isPublished: body?.isPublished === false ? 0 : 1,
    sortOrder: toNumber(body?.sortOrder, 0),
  }
}


export async function ensureStayCmsSchema({ getSetting, setSetting, toNumber }) {
  await setSetting('stay_page', await getSetting('stay_page', DEFAULT_STAY_PAGE))

  await pool.query(
    `CREATE TABLE IF NOT EXISTS stay_groups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(80) NOT NULL UNIQUE,
      title VARCHAR(180) NOT NULL,
      lead_text TEXT,
      is_published TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  )

  await pool.query(
    `CREATE TABLE IF NOT EXISTS stay_listings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      group_id INT NOT NULL,
      slug VARCHAR(120) NOT NULL UNIQUE,
      name VARCHAR(180) NOT NULL,
      type_label VARCHAR(180) DEFAULT '',
      badge VARCHAR(80) DEFAULT '',
      tagline VARCHAR(255) DEFAULT '',
      description TEXT,
      guests VARCHAR(60) DEFAULT '',
      booking_url TEXT,
      booking_cta VARCHAR(80) DEFAULT '',
      image VARCHAR(500) DEFAULT '',
      gallery_json LONGTEXT,
      amenities_json TEXT,
      image_position VARCHAR(10) NOT NULL DEFAULT 'left',
      is_published TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_stay_listings_group (group_id),
      CONSTRAINT fk_stay_listings_group FOREIGN KEY (group_id) REFERENCES stay_groups(id) ON DELETE CASCADE
    )`,
  )

  const [stayGroupCountRows] = await pool.query('SELECT COUNT(*) AS c FROM stay_groups')
  if (toNumber(stayGroupCountRows[0]?.c, 0) === 0) {
    for (const group of DEFAULT_STAY_GROUPS) {
      await pool.query(
        `INSERT INTO stay_groups (slug, title, lead_text, is_published, sort_order)
         VALUES (?, ?, ?, 1, ?)`,
        [group.slug, group.title, group.lead, group.sortOrder],
      )
    }
  }

  const [stayListingCountRows] = await pool.query('SELECT COUNT(*) AS c FROM stay_listings')
  if (toNumber(stayListingCountRows[0]?.c, 0) === 0) {
    const [groupRows] = await pool.query('SELECT id, slug FROM stay_groups')
    const groupIdBySlug = Object.fromEntries(groupRows.map((row) => [row.slug, row.id]))
    for (const listing of DEFAULT_STAY_LISTINGS) {
      const groupId = groupIdBySlug[listing.groupSlug]
      if (!groupId) continue
      await pool.query(
        `INSERT INTO stay_listings (
          group_id, slug, name, type_label, badge, tagline, description, guests,
          booking_url, booking_cta, image, gallery_json, amenities_json, image_position, is_published, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          groupId,
          listing.slug,
          listing.name,
          listing.typeLabel,
          listing.badge,
          listing.tagline,
          listing.description,
          listing.guests,
          listing.bookingUrl,
          listing.bookingCta,
          listing.image,
          JSON.stringify(listing.gallery),
          JSON.stringify(listing.amenities),
          listing.imagePosition,
          listing.sortOrder,
        ],
      )
    }
  }

}

export function registerStayCmsRoutes(app, { requireAdmin, getSetting, setSetting, toNumber, sendServerError }) {
app.get('/api/content/stay', async (_req, res) => {
  try {
    const page = {
      ...DEFAULT_STAY_PAGE,
      ...(await getSetting('stay_page', DEFAULT_STAY_PAGE)),
    }
    const [groupRows] = await pool.query(
      `SELECT id, slug, title, lead_text AS introText, sort_order AS sortOrder
       FROM stay_groups
       WHERE is_published = 1
       ORDER BY sort_order ASC, id ASC`,
    )
    const [listingRows] = await pool.query(
      `SELECT
        l.id,
        l.group_id AS groupId,
        g.slug AS groupSlug,
        g.title AS groupTitle,
        l.slug,
        l.name,
        l.type_label AS typeLabel,
        l.badge,
        l.tagline,
        l.description,
        l.guests,
        l.booking_url AS bookingUrl,
        l.booking_cta AS bookingCta,
        l.image,
        l.gallery_json AS galleryJson,
        l.amenities_json AS amenitiesJson,
        l.image_position AS imagePosition,
        l.is_published AS isPublished,
        l.sort_order AS sortOrder
       FROM stay_listings l
       JOIN stay_groups g ON g.id = l.group_id
       WHERE l.is_published = 1 AND g.is_published = 1
       ORDER BY l.sort_order ASC, l.id ASC`,
    )
    const listings = listingRows.map(mapStayListingRow)
    const groups = groupRows.map((group) => ({
      id: group.id,
      slug: group.slug,
      title: group.title,
      lead: group.introText,
      sortOrder: group.sortOrder,
      listings: listings.filter((listing) => listing.groupId === group.id),
    }))
    res.json({ page, groups })
  } catch (error) {
    sendServerError(res, 'Failed to load stay content', error)
  }
})

app.get('/api/admin/content/stay-page', requireAdmin, async (_req, res) => {
  try {
    res.json({
      ...DEFAULT_STAY_PAGE,
      ...(await getSetting('stay_page', DEFAULT_STAY_PAGE)),
    })
  } catch (error) {
    sendServerError(res, 'Failed to load stay page copy', error)
  }
})

app.put('/api/admin/content/stay-page', requireAdmin, async (req, res) => {
  const nextValue = {
    heroKicker: String(req.body?.heroKicker ?? DEFAULT_STAY_PAGE.heroKicker),
    heroTitleLine: String(req.body?.heroTitleLine ?? DEFAULT_STAY_PAGE.heroTitleLine),
    heroTitleItalic: String(req.body?.heroTitleItalic ?? DEFAULT_STAY_PAGE.heroTitleItalic),
    heroLead: String(req.body?.heroLead ?? DEFAULT_STAY_PAGE.heroLead),
    heroImage: String(req.body?.heroImage ?? DEFAULT_STAY_PAGE.heroImage),
    sectionTitle: String(req.body?.sectionTitle ?? DEFAULT_STAY_PAGE.sectionTitle),
    sectionLead: String(req.body?.sectionLead ?? DEFAULT_STAY_PAGE.sectionLead),
  }

  try {
    await setSetting('stay_page', nextValue)
    res.json({ ok: true })
  } catch (error) {
    sendServerError(res, 'Failed to update stay page copy', error)
  }
})

app.get('/api/admin/stay-groups', requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, slug, title, lead_text AS introText, is_published AS isPublished, sort_order AS sortOrder
       FROM stay_groups
       ORDER BY sort_order ASC, id ASC`,
    )
    res.json(rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      lead: row.introText,
      isPublished: Number(row.isPublished) === 1,
      sortOrder: row.sortOrder,
    })))
  } catch (error) {
    sendServerError(res, 'Failed to load stay groups', error)
  }
})

app.post('/api/admin/stay-groups', requireAdmin, async (req, res) => {
  const title = String(req.body?.title ?? '').trim()
  if (!title) return res.status(400).json({ message: 'title is required' })
  const slug = slugifyStay(req.body?.slug || title, `group-${Date.now()}`)

  try {
    const [result] = await pool.query(
      `INSERT INTO stay_groups (slug, title, lead_text, is_published, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [
        slug,
        title,
        String(req.body?.lead ?? ''),
        req.body?.isPublished === false ? 0 : 1,
        toNumber(req.body?.sortOrder, 0),
      ],
    )
    res.status(201).json({ id: result.insertId })
  } catch (error) {
    sendServerError(res, 'Failed to create stay group', error)
  }
})

app.put('/api/admin/stay-groups/:id', requireAdmin, async (req, res) => {
  const id = toNumber(req.params.id, 0)
  if (!id) return res.status(400).json({ message: 'Invalid group id' })
  const title = String(req.body?.title ?? '').trim()
  if (!title) return res.status(400).json({ message: 'title is required' })

  try {
    await pool.query(
      `UPDATE stay_groups
       SET slug = ?, title = ?, lead_text = ?, is_published = ?, sort_order = ?
       WHERE id = ?`,
      [
        slugifyStay(req.body?.slug || title, `group-${id}`),
        title,
        String(req.body?.lead ?? ''),
        req.body?.isPublished === false ? 0 : 1,
        toNumber(req.body?.sortOrder, 0),
        id,
      ],
    )
    res.json({ ok: true })
  } catch (error) {
    sendServerError(res, 'Failed to update stay group', error)
  }
})

app.delete('/api/admin/stay-groups/:id', requireAdmin, async (req, res) => {
  const id = toNumber(req.params.id, 0)
  if (!id) return res.status(400).json({ message: 'Invalid group id' })

  try {
    const [countRows] = await pool.query('SELECT COUNT(*) AS c FROM stay_listings WHERE group_id = ?', [id])
    if (toNumber(countRows[0]?.c, 0) > 0) {
      return res.status(400).json({ message: 'Move or delete listings in this section first' })
    }
    await pool.query('DELETE FROM stay_groups WHERE id = ? LIMIT 1', [id])
    res.json({ ok: true })
  } catch (error) {
    sendServerError(res, 'Failed to delete stay group', error)
  }
})

app.get('/api/admin/stay-listings', requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        l.id,
        l.group_id AS groupId,
        g.slug AS groupSlug,
        g.title AS groupTitle,
        l.slug,
        l.name,
        l.type_label AS typeLabel,
        l.badge,
        l.tagline,
        l.description,
        l.guests,
        l.booking_url AS bookingUrl,
        l.booking_cta AS bookingCta,
        l.image,
        l.gallery_json AS galleryJson,
        l.amenities_json AS amenitiesJson,
        l.image_position AS imagePosition,
        l.is_published AS isPublished,
        l.sort_order AS sortOrder
       FROM stay_listings l
       JOIN stay_groups g ON g.id = l.group_id
       ORDER BY g.sort_order ASC, l.sort_order ASC, l.id ASC`,
    )
    res.json(rows.map(mapStayListingRow))
  } catch (error) {
    sendServerError(res, 'Failed to load stay listings', error)
  }
})

app.post('/api/admin/stay-listings', requireAdmin, async (req, res) => {
  const fields = stayListingFieldsFromBody(req.body)
  if (!fields.name) return res.status(400).json({ message: 'name is required' })
  if (!fields.groupId) return res.status(400).json({ message: 'groupId is required' })

  try {
    const [result] = await pool.query(
      `INSERT INTO stay_listings (
        group_id, slug, name, type_label, badge, tagline, description, guests,
        booking_url, booking_cta, image, gallery_json, amenities_json, image_position, is_published, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fields.groupId,
        fields.slug,
        fields.name,
        fields.typeLabel,
        fields.badge,
        fields.tagline,
        fields.description,
        fields.guests,
        fields.bookingUrl,
        fields.bookingCta,
        fields.image,
        fields.galleryJson,
        fields.amenitiesJson,
        fields.imagePosition,
        fields.isPublished,
        fields.sortOrder,
      ],
    )
    res.status(201).json({ id: result.insertId })
  } catch (error) {
    sendServerError(res, 'Failed to create stay listing', error)
  }
})

app.put('/api/admin/stay-listings/:id', requireAdmin, async (req, res) => {
  const id = toNumber(req.params.id, 0)
  if (!id) return res.status(400).json({ message: 'Invalid listing id' })
  const fields = stayListingFieldsFromBody(req.body)
  if (!fields.name) return res.status(400).json({ message: 'name is required' })
  if (!fields.groupId) return res.status(400).json({ message: 'groupId is required' })

  try {
    await pool.query(
      `UPDATE stay_listings
       SET group_id = ?, slug = ?, name = ?, type_label = ?, badge = ?, tagline = ?, description = ?, guests = ?,
           booking_url = ?, booking_cta = ?, image = ?, gallery_json = ?, amenities_json = ?, image_position = ?,
           is_published = ?, sort_order = ?
       WHERE id = ?`,
      [
        fields.groupId,
        fields.slug,
        fields.name,
        fields.typeLabel,
        fields.badge,
        fields.tagline,
        fields.description,
        fields.guests,
        fields.bookingUrl,
        fields.bookingCta,
        fields.image,
        fields.galleryJson,
        fields.amenitiesJson,
        fields.imagePosition,
        fields.isPublished,
        fields.sortOrder,
        id,
      ],
    )
    res.json({ ok: true })
  } catch (error) {
    sendServerError(res, 'Failed to update stay listing', error)
  }
})

app.delete('/api/admin/stay-listings/:id', requireAdmin, async (req, res) => {
  const id = toNumber(req.params.id, 0)
  if (!id) return res.status(400).json({ message: 'Invalid listing id' })

  try {
    await pool.query('DELETE FROM stay_listings WHERE id = ? LIMIT 1', [id])
    res.json({ ok: true })
  } catch (error) {
    sendServerError(res, 'Failed to delete stay listing', error)
  }
})


}
