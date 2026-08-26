import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import path from 'node:path'
import fs from 'node:fs/promises'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import { pool } from './db.js'
import { ensureCommerceSchema } from './commerce/schema.js'
import { registerCommerceRoutes } from './commerce/routes.js'
import { toDateOnly } from './dates.js'
import { ensureStayCmsSchema, registerStayCmsRoutes } from './stayCms.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT ?? 4000)
const NODE_ENV = process.env.NODE_ENV ?? 'development'
const isProduction = NODE_ENV === 'production'

function requiredEnv(name) {
  const value = process.env[name]
  if (isProduction && !value) {
    throw new Error(`${name} must be set in production`)
  }
  return value
}

const ADMIN_PASSWORD = requiredEnv('ADMIN_PASSWORD') ?? 'dev-only-admin-password'
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin'
const ADMIN_JWT_SECRET = requiredEnv('ADMIN_JWT_SECRET') ?? 'dev_admin_jwt_secret_change_me'
const ADMIN_JWT_EXPIRES = process.env.ADMIN_JWT_EXPIRES ?? '8h'
const ADMIN_COOKIE_NAME = process.env.ADMIN_COOKIE_NAME ?? 'omaru_admin_session'
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL ?? 'http://localhost:5173'
const COOKIE_SECURE = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProduction
const corsOrigins = (process.env.CORS_ORIGIN ?? (isProduction ? '' : 'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173'))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

if (isProduction && corsOrigins.length === 0) {
  throw new Error('CORS_ORIGIN must be set in production')
}
if (isProduction && ADMIN_JWT_SECRET.length < 32) {
  throw new Error('ADMIN_JWT_SECRET must be at least 32 characters in production')
}
if (isProduction && ADMIN_PASSWORD.length < 12) {
  throw new Error('ADMIN_PASSWORD must be at least 12 characters in production')
}
const CUSTOMER_JWT_SECRET_CHECK = process.env.CUSTOMER_JWT_SECRET ?? ''
if (isProduction) {
  if (!CUSTOMER_JWT_SECRET_CHECK || CUSTOMER_JWT_SECRET_CHECK.length < 32) {
    throw new Error('CUSTOMER_JWT_SECRET must be set and at least 32 characters in production')
  }
  if (CUSTOMER_JWT_SECRET_CHECK === ADMIN_JWT_SECRET) {
    throw new Error('CUSTOMER_JWT_SECRET must be distinct from ADMIN_JWT_SECRET')
  }
  if (!String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim()) {
    throw new Error('STRIPE_WEBHOOK_SECRET must be set in production')
  }
}
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), '../frontend/public/images/uploads')

const DEFAULT_ABOUT_CONTENT = {
  legacyTitle: 'Our Legacy',
  legacyDescription:
    'Built on patient craft and deep respect for the land, Omaru has grown into a place where guests can taste the seasons, meet the makers, and take home pantry essentials made with intention.',
  foundationTitle: 'The Living Earth of Omaru',
  foundationDescription:
    'Our work is guided by sustainability, quality, and heritage. Every harvest, meal, and product is shaped by patience, restraint, and a quiet respect for the land.',
}

const DEFAULT_CONTACT_CONTENT = {
  farmName: 'Omaru Farm',
  addressLine1: '776 Ventnor Road, Ventnor',
  addressLine2: 'Phillip Island VIC 3922',
  email: 'Omarufarmcafe@gmail.com',
  phone: '+61 476 302 477',
  whatsapp: 'https://wa.me/61476302477',
  // Rosie's WhatsApp — backup enquiry line for when the main business number isn't on hand.
  whatsappSecondary: 'https://wa.me/61427558536',
  instagram: 'https://instagram.com',
  mapQuery: '776 Ventnor Road, Ventnor, Phillip Island VIC 3922, Australia',
  hoursCafe: 'Thu–Fri: 10am–2pm & 5–8pm · Sat–Sun: 10am–8pm',
  hoursStore: 'Mon–Sun: 9am–5pm',
  hoursTours: 'By appointment',
}

const DEFAULT_MENU_ITEMS = [
  {
    section: 'Lunch',
    itemName: 'Sri Lankan Rice & Curry',
    description: 'Traditional rice and curry with coconut sambol, dhal curry, and seasonal vegetables',
    price: 28,
    image: 'images/farm/image-farm/IMG_0869.jpg',
  },
  {
    section: 'Lunch',
    itemName: 'Kottu Roti',
    description: 'Chopped roti stir-fried with vegetables, egg, and choice of chicken or vegetables',
    price: 24,
    image: 'images/farm/image-farm/IMG_0642.jpg',
  },
  {
    section: 'Lunch',
    itemName: 'Fish Ambul Thiyal',
    description: 'Sour fish curry with goraka, onions, and aromatic spices, served with rice',
    price: 32,
    image: 'images/farm/image-farm/IMG_4672.JPG',
  },
  {
    section: 'Dinner',
    itemName: 'Lampries Set',
    description: 'Traditional Dutch Burgher meal with rice, curries, and accompaniments wrapped in banana leaf',
    price: 45,
    image: 'images/farm/image-farm/IMG_0674.jpg',
  },
  {
    section: 'Dinner',
    itemName: 'Seafood Curry Feast',
    description: 'Fresh Phillip Island seafood in rich coconut curry with string hoppers',
    price: 42,
    image: 'images/farm/image-farm/IMG_0781.jpg',
  },
  {
    section: 'Dinner',
    itemName: 'Devilled Prawns',
    description: 'Spicy stir-fried prawns with capsicum, onions, and Sri Lankan spices',
    price: 38,
    image: 'images/farm/image-farm/IMG_4682.jpg',
  },
  {
    section: 'Beverages',
    itemName: 'Barista Coffee',
    description: 'Freshly ground single-origin coffee, espresso and milk-based drinks',
    price: 6,
    image: 'images/farm/image-farm/IMG_0641.jpg',
  },
  {
    section: 'Beverages',
    itemName: 'Phillip Island Wine Selection',
    description: 'Regional varietals from Phillip Island and Mornington Peninsula',
    price: 14,
    image: 'images/farm/image-farm/IMG_6051.jpg',
  },
  {
    section: 'Beverages',
    itemName: 'Fully Licensed Bar',
    description: 'Beer, spirits, and cocktails — fully licensed dining with curated pours',
    price: 12,
    image: 'images/farm/image-farm/IMG_6051.jpg',
  },
]

const DEFAULT_TESTIMONIALS = [
  { guestName: 'Emily R.', location: 'Adelaide, SA', rating: 5, comment: 'Beautiful location, elegant atmosphere, and one of the best farm store selections we have visited.', visitDate: 'Mar 2026' },
  { guestName: 'Daniel S.', location: 'Port Lincoln, SA', rating: 5, comment: 'The cafe food felt fresh and thoughtful. You can really taste the local ingredients.', visitDate: 'Feb 2026' },
  { guestName: 'Priya K.', location: 'Melbourne, VIC', rating: 5, comment: 'A premium countryside experience with warm hospitality and excellent products.', visitDate: 'Jan 2026' },
]

const DEFAULT_SITE_SETTINGS = {
  brandName: 'Omaru Farm',
  missionText:
    'A premium farm-to-table destination — seasonal produce, thoughtful hospitality, and quiet luxury rooted in the land.',
  footerTagline: 'Grown with intention',
  supportEmail: 'Omarufarmcafe@gmail.com',
  whatsappUrl: 'https://wa.me/61476302477',
  // Rosie's WhatsApp — backup enquiry line for when the main business number isn't on hand.
  whatsappSecondaryUrl: 'https://wa.me/61427558536',
  instagramUrl: 'https://instagram.com',
}

const ADMIN_LOGIN_WINDOW_MS = Number(process.env.ADMIN_LOGIN_WINDOW_MS ?? 10 * 60 * 1000)
const ADMIN_LOGIN_MAX_ATTEMPTS = Number(process.env.ADMIN_LOGIN_MAX_ATTEMPTS ?? 8)
const loginAttemptMap = new Map()

app.set('trust proxy', 1)

app.use(helmet())
app.use(cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) return callback(null, true)
    // Local Vite often hops ports (5173/5174/5180); allow any localhost origin outside production.
    if (!isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(String(origin))) {
      return callback(null, true)
    }
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token'],
}))
// Stripe webhooks need the raw body; everything else uses JSON.
app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe/webhook') {
    return express.raw({ type: 'application/json' })(req, res, next)
  }
  return express.json({ limit: '5mb' })(req, res, next)
})

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true })
      cb(null, UPLOAD_DIR)
    } catch (error) {
      cb(error)
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase()
    const safeBase = String(path.basename(file.originalname, ext) || 'upload')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40)
    const stamp = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${safeBase || 'upload'}-${stamp}${ext || '.jpg'}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.mimetype)) return cb(new Error('Only image files are allowed'))
    return cb(null, true)
  },
})


function logServerError(context, error) {
  // Keep implementation details in server logs, not public JSON responses.
  // eslint-disable-next-line no-console
  console.error(context, error)
}

function sendServerError(res, message, error) {
  logServerError(message, error)
  return res.status(500).json({ message })
}

function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function sanitizePrice(value) {
  const n = toNumber(value, 0)
  return Number(n.toFixed(2))
}

/** Shopper size + packed weight/volume are required for shippable products. */
function validateProductShippingFields(body) {
  const size = String(body?.size ?? '').trim()
  if (!size) return 'Size is required (e.g. 250ml or 175g)'
  const shippable = !(body?.shippable === false || body?.shippable === 0 || body?.shippable === '0')
  if (!shippable) return null
  if (body?.weightGrams === undefined || body?.weightGrams === null || body?.weightGrams === '') {
    return 'Weight (grams) is required'
  }
  const weight = Number(body.weightGrams)
  if (!Number.isFinite(weight) || weight <= 0 || !Number.isInteger(weight)) {
    return 'Weight (grams) must be a whole number greater than 0'
  }
  if (weight > 22000) return 'Weight exceeds Australia Post’s 22 kg parcel limit'
  const volume = Number(body?.volumeCm3)
  if (!Number.isFinite(volume) || volume <= 0 || !Number.isInteger(volume)) {
    return 'Packed volume (cm³) must be a whole number greater than 0'
  }
  if (volume > 250000) return 'Packed volume exceeds Australia Post’s parcel-size limit'
  return null
}

async function ensureProductCategoryName(rawName) {
  const name = String(rawName ?? '').trim()
  if (!name) return
  try {
    await pool.query('INSERT IGNORE INTO product_categories (name, sort_order) VALUES (?, 500)', [name])
  } catch {
    // non-fatal; catalog row is optional
  }
}

function getClientIp(req) {
  const xff = String(req.headers['x-forwarded-for'] ?? '')
  if (xff.includes(',')) return xff.split(',')[0].trim()
  if (xff) return xff.trim()
  return String(req.ip ?? req.socket?.remoteAddress ?? 'unknown')
}

function consumeLoginAttempt(ip) {
  const now = Date.now()
  const current = loginAttemptMap.get(ip) ?? { count: 0, resetAt: now + ADMIN_LOGIN_WINDOW_MS }
  if (now > current.resetAt) {
    current.count = 0
    current.resetAt = now + ADMIN_LOGIN_WINDOW_MS
  }
  current.count += 1
  loginAttemptMap.set(ip, current)
  return current
}

function clearLoginAttempts(ip) {
  loginAttemptMap.delete(ip)
}

function isRateLimited(ip) {
  const now = Date.now()
  const current = loginAttemptMap.get(ip)
  if (!current) return null
  if (now > current.resetAt) {
    loginAttemptMap.delete(ip)
    return null
  }
  if (current.count >= ADMIN_LOGIN_MAX_ATTEMPTS) {
    return Math.ceil((current.resetAt - now) / 1000)
  }
  return null
}


const bookingAttemptMap = new Map()
const BOOKING_WINDOW_MS = Number(process.env.BOOKING_WINDOW_MS ?? 15 * 60 * 1000)
const BOOKING_MAX_ATTEMPTS = Number(process.env.BOOKING_MAX_ATTEMPTS ?? 8)

function consumeWindowedAttempt(store, key, windowMs) {
  const now = Date.now()
  const current = store.get(key) ?? { count: 0, resetAt: now + windowMs }
  if (now > current.resetAt) {
    current.count = 0
    current.resetAt = now + windowMs
  }
  current.count += 1
  store.set(key, current)
  return current
}

function checkWindowedLimit(store, key, maxAttempts) {
  const now = Date.now()
  const current = store.get(key)
  if (!current) return null
  if (now > current.resetAt) {
    store.delete(key)
    return null
  }
  if (current.count >= maxAttempts) return Math.ceil((current.resetAt - now) / 1000)
  return null
}

function parseCookies(req) {
  return String(req.headers.cookie ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const eq = part.indexOf('=')
      if (eq === -1) return cookies
      const key = decodeURIComponent(part.slice(0, eq).trim())
      const value = decodeURIComponent(part.slice(eq + 1).trim())
      cookies[key] = value
      return cookies
    }, {})
}

function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SECURE ? 'none' : 'lax',
    path: '/',
    maxAge: 1000 * 60 * 60 * 8,
  }
}

function getAdminToken(req) {
  const cookies = parseCookies(req)
  const cookieToken = cookies[ADMIN_COOKIE_NAME]
  if (cookieToken) return cookieToken

  const authHeader = String(req.headers.authorization ?? '')
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim()
  }

  // Header token is kept only for local development tooling; production prefers httpOnly cookies.
  if (!isProduction) return String(req.headers['x-admin-token'] ?? '')
  return ''
}

function truncateText(value, maxLength) {
  const text = String(value ?? '').trim()
  return text.length > maxLength ? text.slice(0, maxLength) : text
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '').trim())
}

function isValidISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''))) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime())
}

function requireAdmin(req, res, next) {
  const token = getAdminToken(req)
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized admin request' })
  }

  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET)
    if (payload.role && payload.role !== 'admin') {
      return res.status(401).json({ message: 'Unauthorized admin request' })
    }
    if (!payload.username) {
      return res.status(401).json({ message: 'Unauthorized admin request' })
    }
    req.admin = payload
  } catch {
    return res.status(401).json({ message: 'Unauthorized admin request' })
  }
  return next()
}

async function getSetting(settingKey, fallback) {
  const [rows] = await pool.query('SELECT setting_value FROM admin_settings WHERE setting_key = ? LIMIT 1', [settingKey])
  if (!rows[0]?.setting_value) return fallback
  try {
    return JSON.parse(String(rows[0].setting_value))
  } catch {
    return fallback
  }
}

async function setSetting(settingKey, value) {
  const serialized = JSON.stringify(value ?? {})
  await pool.query(
    `INSERT INTO admin_settings (setting_key, setting_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
    [settingKey, serialized],
  )
}

async function addColumnIfMissing(tableName, columnName, definitionSql) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName],
  )
  if (toNumber(rows[0]?.c, 0) > 0) return
  await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definitionSql}`)
}

async function ensureSchemaAndSeed() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true })

  await pool.query(
    `CREATE TABLE IF NOT EXISTS admin_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(120) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  )

  await pool.query(
    `CREATE TABLE IF NOT EXISTS admin_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(100) NOT NULL UNIQUE,
      setting_value LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
  )

  await pool.query(
    `CREATE TABLE IF NOT EXISTS testimonials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      guest_name VARCHAR(120) NOT NULL,
      location VARCHAR(160) DEFAULT '',
      rating TINYINT NOT NULL DEFAULT 5,
      comment TEXT NOT NULL,
      visit_date VARCHAR(60) DEFAULT '',
      is_published TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  )

  await pool.query(
    `CREATE TABLE IF NOT EXISTS menu_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      section_name VARCHAR(120) NOT NULL,
      item_name VARCHAR(180) NOT NULL,
      description TEXT NOT NULL,
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      image VARCHAR(255) DEFAULT '',
      is_published TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  )

  await pool.query(
    `CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(150) NOT NULL,
      booking_date DATE NOT NULL,
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  )

  await pool.query(
    `CREATE TABLE IF NOT EXISTS reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_name VARCHAR(150) NOT NULL,
      rating INT NOT NULL,
      comment TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  )

  // Booking workflow columns for admin processing.
  await addColumnIfMissing('bookings', 'source', 'VARCHAR(40) NOT NULL DEFAULT "website"')
  await addColumnIfMissing('bookings', 'guest_count', 'INT NULL')
  await addColumnIfMissing('bookings', 'time_from', 'VARCHAR(10) NULL')
  await addColumnIfMissing('bookings', 'time_until', 'VARCHAR(10) NULL')
  await addColumnIfMissing('bookings', 'status', 'VARCHAR(20) NOT NULL DEFAULT "new"')
  await addColumnIfMissing('bookings', 'admin_note', 'TEXT NULL')
  await addColumnIfMissing(
    'bookings',
    'updated_at',
    'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  )

  await pool.query(
    `CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(120) NOT NULL DEFAULT 'Farm Store',
      size VARCHAR(60) DEFAULT '',
      price DECIMAL(8, 2) NOT NULL DEFAULT 0,
      image VARCHAR(255) DEFAULT '',
      description TEXT NULL,
      images_json TEXT NULL,
      is_featured TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  )
  await addColumnIfMissing('products', 'is_featured', 'TINYINT(1) NOT NULL DEFAULT 0')
  await addColumnIfMissing('products', 'description', 'TEXT NULL')
  await addColumnIfMissing('products', 'images_json', 'TEXT NULL')

  await ensureCommerceSchema()

  await pool.query(
    `CREATE TABLE IF NOT EXISTS product_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_product_category_name (name)
    )`,
  )

  const [pcCount] = await pool.query('SELECT COUNT(*) AS c FROM product_categories')
  if (toNumber(pcCount[0]?.c, 0) === 0) {
    await pool.query('INSERT IGNORE INTO product_categories (name, sort_order) VALUES (?, 0)', ['Farm Store'])
  }
  const [distinctCats] = await pool.query(
    `SELECT DISTINCT TRIM(category) AS c FROM products WHERE category IS NOT NULL AND TRIM(category) <> ''`,
  )
  for (const row of distinctCats) {
    const nm = String(row.c ?? '').trim()
    if (!nm) continue
    await pool.query('INSERT IGNORE INTO product_categories (name, sort_order) VALUES (?, 100)', [nm])
  }

  const [testimonialCountRows] = await pool.query('SELECT COUNT(*) AS c FROM testimonials')
  if (toNumber(testimonialCountRows[0]?.c, 0) === 0) {
    for (const item of DEFAULT_TESTIMONIALS) {
      await pool.query(
        `INSERT INTO testimonials (guest_name, location, rating, comment, visit_date, is_published)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [item.guestName, item.location, item.rating, item.comment, item.visitDate],
      )
    }
  }

  const [menuCountRows] = await pool.query('SELECT COUNT(*) AS c FROM menu_items')
  if (toNumber(menuCountRows[0]?.c, 0) === 0) {
    for (let i = 0; i < DEFAULT_MENU_ITEMS.length; i++) {
      const item = DEFAULT_MENU_ITEMS[i]
      await pool.query(
        `INSERT INTO menu_items (section_name, item_name, description, price, image, is_published, sort_order)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
        [item.section, item.itemName, item.description, item.price, item.image, i],
      )
    }
  }

  await setSetting('about_page', await getSetting('about_page', DEFAULT_ABOUT_CONTENT))
  await setSetting('contact_details', await getSetting('contact_details', DEFAULT_CONTACT_CONTENT))
  await setSetting('site_settings', await getSetting('site_settings', DEFAULT_SITE_SETTINGS))
  await ensureStayCmsSchema({ getSetting, setSetting, toNumber })

  const [adminRows] = await pool.query(
    'SELECT id, password_hash AS passwordHash FROM admin_users WHERE username = ? LIMIT 1',
    [ADMIN_USERNAME],
  )
  if (!adminRows[0]?.id) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)
    await pool.query(
      'INSERT INTO admin_users (username, password_hash, is_active) VALUES (?, ?, 1)',
      [ADMIN_USERNAME, passwordHash],
    )
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'omaru-farm-api' })
})

app.get('/api/products', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, size, price, image, description, images_json AS imagesJson, category,
              is_featured AS featured, stock_qty AS stockQty, weight_grams AS weightGrams,
              volume_cm3 AS volumeCm3, shippable
       FROM products
       ORDER BY id ASC
       LIMIT 1000`,
    )
    res.json(
      rows.map((row) => {
        const images = parseProductImages(row.imagesJson, row.image)
        return {
          ...row,
          images,
          imagesJson: undefined,
          image: images[0] ?? String(row.image ?? ''),
          shippable: Boolean(row.shippable),
        }
      }),
    )
  } catch (error) {
    sendServerError(res, 'Failed to load products', error)
  }
})

app.get('/api/product-categories', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, sort_order AS sortOrder FROM product_categories ORDER BY sort_order ASC, name ASC',
    )
    res.json(rows)
  } catch (error) {
    sendServerError(res, 'Failed to load categories', error)
  }
})

app.get('/api/testimonials', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, guest_name AS guestName, location, rating, comment, visit_date AS visitDate
       FROM testimonials
       WHERE is_published = 1
       ORDER BY id DESC
       LIMIT 30`,
    )
    res.json(rows)
  } catch (error) {
    sendServerError(res, 'Failed to load testimonials', error)
  }
})

app.get('/api/menu', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, section_name AS section, item_name AS itemName, description, price, image, sort_order AS sortOrder
       FROM menu_items
       WHERE is_published = 1
       ORDER BY section_name ASC, sort_order ASC, id ASC`,
    )
    res.json(rows)
  } catch (error) {
    sendServerError(res, 'Failed to load menu', error)
  }
})

app.get('/api/content/about', async (_req, res) => {
  try {
    const value = await getSetting('about_page', DEFAULT_ABOUT_CONTENT)
    res.json(value)
  } catch (error) {
    sendServerError(res, 'Failed to load about content', error)
  }
})

app.get('/api/content/contact', async (_req, res) => {
  try {
    const value = {
      ...DEFAULT_CONTACT_CONTENT,
      ...(await getSetting('contact_details', DEFAULT_CONTACT_CONTENT)),
    }
    res.json(value)
  } catch (error) {
    sendServerError(res, 'Failed to load contact details', error)
  }
})

app.get('/api/content/site-settings', async (_req, res) => {
  try {
    res.json({
      ...DEFAULT_SITE_SETTINGS,
      ...(await getSetting('site_settings', DEFAULT_SITE_SETTINGS)),
    })
  } catch (error) {
    sendServerError(res, 'Failed to load site settings', error)
  }
})

app.post('/api/bookings', async (req, res) => {
  const ip = getClientIp(req)
  const retryAfter = checkWindowedLimit(bookingAttemptMap, ip, BOOKING_MAX_ATTEMPTS)
  if (retryAfter !== null) {
    res.setHeader('Retry-After', String(retryAfter))
    return res.status(429).json({ message: `Too many booking requests. Try again in ${retryAfter}s.` })
  }
  consumeWindowedAttempt(bookingAttemptMap, ip, BOOKING_WINDOW_MS)

  const { fullName, email, bookingDate, message, source, guestCount, timeFrom, timeUntil, website } = req.body ?? {}
  if (website) {
    return res.status(202).json({ message: 'Booking submitted' })
  }

  const cleanName = truncateText(fullName, 120)
  const cleanEmail = truncateText(email, 160).toLowerCase()
  const cleanDate = truncateText(bookingDate, 20)
  if (!cleanName || !cleanEmail || !cleanDate) {
    return res.status(400).json({ message: 'fullName, email, and bookingDate are required.' })
  }
  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' })
  }
  if (!isValidISODate(cleanDate)) {
    return res.status(400).json({ message: 'Please enter a valid booking date.' })
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO bookings (full_name, email, booking_date, message, source, guest_count, time_from, time_until, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "new")',
      [
        cleanName,
        cleanEmail,
        cleanDate,
        message ? truncateText(message, 2000) : null,
        source ? truncateText(source, 40) : 'website',
        guestCount ? Math.min(Math.max(toNumber(guestCount, 1), 1), 50) : null,
        timeFrom ? truncateText(timeFrom, 20) : null,
        timeUntil ? truncateText(timeUntil, 20) : null,
      ],
    )
    res.status(201).json({ message: 'Booking submitted', bookingId: result.insertId })
  } catch (error) {
    sendServerError(res, 'Failed to submit booking', error)
  }
})

app.post('/api/admin/login', async (req, res) => {
  const ip = getClientIp(req)
  const retryAfter = isRateLimited(ip)
  if (retryAfter !== null) {
    res.setHeader('Retry-After', String(retryAfter))
    return res.status(429).json({ message: `Too many attempts. Try again in ${retryAfter}s.` })
  }

  const username = String(req.body?.username ?? '')
  const password = String(req.body?.password ?? '')
  if (!username || !password) {
    consumeLoginAttempt(ip)
    return res.status(400).json({ message: 'username and password are required' })
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, username, password_hash AS passwordHash, is_active AS isActive FROM admin_users WHERE username = ? LIMIT 1',
      [username],
    )
    const user = rows[0]
    if (!user?.id || !user?.isActive) {
      consumeLoginAttempt(ip)
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, String(user.passwordHash))
    if (!valid) {
      consumeLoginAttempt(ip)
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    clearLoginAttempts(ip)
    const token = jwt.sign(
      {
        sub: String(user.id),
        username: String(user.username),
        role: 'admin',
      },
      ADMIN_JWT_SECRET,
      { expiresIn: ADMIN_JWT_EXPIRES },
    )
    res.cookie(ADMIN_COOKIE_NAME, token, adminCookieOptions())
    res.json({
      token,
      user: { id: user.id, username: user.username },
    })
  } catch (error) {
    sendServerError(res, 'Failed to login', error)
  }
})

app.get('/api/admin/me', requireAdmin, (req, res) => {
  res.json({ user: req.admin })
})

app.post('/api/admin/logout', (_req, res) => {
  res.clearCookie(ADMIN_COOKIE_NAME, { ...adminCookieOptions(), maxAge: undefined })
  res.json({ ok: true })
})

app.get('/api/admin/products', requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, size, price, image, description, images_json AS imagesJson, category,
              is_featured AS featured, stock_qty AS stockQty, weight_grams AS weightGrams,
              volume_cm3 AS volumeCm3, shippable
       FROM products
       ORDER BY id ASC
       LIMIT 2000`,
    )
    res.json(
      rows.map((row) => {
        const images = parseProductImages(row.imagesJson, row.image)
        return {
          ...row,
          images,
          imagesJson: undefined,
          image: images[0] ?? String(row.image ?? ''),
          shippable: Boolean(row.shippable),
        }
      }),
    )
  } catch (error) {
    sendServerError(res, 'Failed to load products', error)
  }
})

function parseProductImages(raw, fallbackImage) {
  const fallback = String(fallbackImage ?? '').trim()
  try {
    if (Array.isArray(raw)) {
      return raw.map((x) => String(x ?? '').trim()).filter(Boolean)
    }
    if (typeof raw === 'string' && raw.trim()) {
      const txt = raw.trim()
      if (txt.startsWith('[')) {
        const parsed = JSON.parse(txt)
        if (Array.isArray(parsed)) {
          return parsed.map((x) => String(x ?? '').trim()).filter(Boolean)
        }
      }
      // non-JSON legacy case: treat as single path
      return [txt]
    }
  } catch {
    // ignore parse errors and fall back
  }
  return fallback ? [fallback] : []
}

function normalizeProductImages(rawImages, rawImage) {
  const list = []
  if (Array.isArray(rawImages)) list.push(...rawImages)
  const fallback = String(rawImage ?? '').trim()
  if (fallback) list.push(fallback)

  const out = []
  const seen = new Set()
  for (const item of list) {
    const v = String(item ?? '').trim()
    if (!v) continue
    if (seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out.slice(0, 10)
}

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  const body = req.body ?? {}
  if (!body.name || !body.category) {
    return res.status(400).json({ message: 'name and category are required' })
  }
  const shippingError = validateProductShippingFields(body)
  if (shippingError) return res.status(400).json({ message: shippingError })

  try {
    const featured = body.featured === true || body.featured === 1 || body.featured === '1' ? 1 : 0
    const images = normalizeProductImages(body.images, body.image)
    const primaryImage = images[0] ?? String(body.image ?? '')
    const description = body.description !== undefined ? String(body.description) : ''
    const weightGrams = Math.floor(Number(body.weightGrams))
    const [result] = await pool.query(
      'INSERT INTO products (name, size, price, image, description, images_json, category, is_featured, stock_qty, weight_grams, volume_cm3, shippable) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        String(body.name),
        String(body.size).trim(),
        sanitizePrice(body.price),
        primaryImage,
        description,
        JSON.stringify(images),
        String(body.category),
        featured,
        body.stockQty !== undefined ? toNumber(body.stockQty, 100) : 100,
        weightGrams,
        body.volumeCm3 !== undefined ? Math.max(0, Math.floor(toNumber(body.volumeCm3, 0))) : 0,
        body.shippable === false || body.shippable === 0 || body.shippable === '0' ? 0 : 1,
      ],
    )
    await ensureProductCategoryName(body.category)
    res.status(201).json({ id: result.insertId })
  } catch (error) {
    sendServerError(res, 'Failed to create product', error)
  }
})

app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const id = toNumber(req.params.id, 0)
  if (!id) return res.status(400).json({ message: 'Invalid product id' })

  const body = req.body ?? {}
  if (!String(body.name ?? '').trim() || !String(body.category ?? '').trim()) {
    return res.status(400).json({ message: 'name and category are required' })
  }
  const shippingError = validateProductShippingFields(body)
  if (shippingError) return res.status(400).json({ message: shippingError })

  const featured = body.featured === true || body.featured === 1 || body.featured === '1' ? 1 : 0
  try {
    const images = normalizeProductImages(body.images, body.image)
    const primaryImage = images[0] ?? String(body.image ?? '')
    const description = body.description !== undefined ? String(body.description) : ''
    const weightGrams = Math.floor(Number(body.weightGrams))
    await pool.query(
      'UPDATE products SET name = ?, size = ?, price = ?, image = ?, description = ?, images_json = ?, category = ?, is_featured = ?, stock_qty = ?, weight_grams = ?, volume_cm3 = ?, shippable = ? WHERE id = ?',
      [
        String(body.name ?? '').trim(),
        String(body.size).trim(),
        sanitizePrice(body.price),
        primaryImage,
        description,
        JSON.stringify(images),
        String(body.category ?? '').trim(),
        featured,
        body.stockQty !== undefined ? toNumber(body.stockQty, 100) : 100,
        weightGrams,
        body.volumeCm3 !== undefined ? Math.max(0, Math.floor(toNumber(body.volumeCm3, 0))) : 0,
        body.shippable === false || body.shippable === 0 || body.shippable === '0' ? 0 : 1,
        id,
      ],
    )
    await ensureProductCategoryName(body.category)
    res.json({ ok: true })
  } catch (error) {
    sendServerError(res, 'Failed to update product', error)
  }
})

app.get('/api/admin/product-categories', requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, sort_order AS sortOrder FROM product_categories ORDER BY sort_order ASC, name ASC',
    )
    res.json(rows)
  } catch (error) {
    sendServerError(res, 'Failed to load categories', error)
  }
})

app.post('/api/admin/product-categories', requireAdmin, async (req, res) => {
  const name = String(req.body?.name ?? '').trim()
  if (!name) return res.status(400).json({ message: 'Category name is required' })
  const sortOrder = toNumber(req.body?.sortOrder, 100)

  try {
    const [result] = await pool.query('INSERT INTO product_categories (name, sort_order) VALUES (?, ?)', [name, sortOrder])
    res.status(201).json({ id: result.insertId })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'A category with this name already exists' })
    }
    sendServerError(res, 'Failed to create category', error)
  }
})

app.put('/api/admin/product-categories/:id', requireAdmin, async (req, res) => {
  const id = toNumber(req.params.id, 0)
  if (!id) return res.status(400).json({ message: 'Invalid category id' })

  const body = req.body ?? {}
  const [existingRows] = await pool.query('SELECT id, name, sort_order AS sortOrder FROM product_categories WHERE id = ? LIMIT 1', [id])
  const existing = existingRows[0]
  if (!existing) return res.status(404).json({ message: 'Category not found' })

  const oldName = String(existing.name)
  const nextName = body.name !== undefined ? String(body.name).trim() : oldName
  const nextSort =
    body.sortOrder !== undefined ? toNumber(body.sortOrder, toNumber(existing.sortOrder, 0)) : toNumber(existing.sortOrder, 0)

  if (!nextName) return res.status(400).json({ message: 'Category name cannot be empty' })

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    if (nextName !== oldName) {
      await conn.query('UPDATE products SET category = ? WHERE category = ?', [nextName, oldName])
    }
    await conn.query('UPDATE product_categories SET name = ?, sort_order = ? WHERE id = ?', [nextName, nextSort, id])
    await conn.commit()
    res.json({ ok: true })
  } catch (error) {
    await conn.rollback()
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'A category with this name already exists' })
    }
    sendServerError(res, 'Failed to update category', error)
  } finally {
    conn.release()
  }
})

app.delete('/api/admin/product-categories/:id', requireAdmin, async (req, res) => {
  const id = toNumber(req.params.id, 0)
  if (!id) return res.status(400).json({ message: 'Invalid category id' })

  try {
    const [rowRows] = await pool.query('SELECT name FROM product_categories WHERE id = ? LIMIT 1', [id])
    const row = rowRows[0]
    if (!row) return res.status(404).json({ message: 'Category not found' })
    const name = String(row.name)
    const [countRows] = await pool.query('SELECT COUNT(*) AS c FROM products WHERE category = ?', [name])
    const used = toNumber(countRows[0]?.c, 0)
    if (used > 0) {
      return res.status(409).json({
        message: `${used} product(s) still use “${name}”. Reassign those products to another category first.`,
      })
    }
    await pool.query('DELETE FROM product_categories WHERE id = ? LIMIT 1', [id])
    res.json({ ok: true })
  } catch (error) {
    sendServerError(res, 'Failed to delete category', error)
  }
})

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const id = toNumber(req.params.id, 0)
  if (!id) return res.status(400).json({ message: 'Invalid product id' })

  try {
    await pool.query('DELETE FROM products WHERE id = ? LIMIT 1', [id])
    res.json({ ok: true })
  } catch (error) {
    sendServerError(res, 'Failed to delete product', error)
  }
})

app.get('/api/admin/testimonials', requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, guest_name AS guestName, location, rating, comment, visit_date AS visitDate, is_published AS isPublished
       FROM testimonials
       ORDER BY id DESC`,
    )
    res.json(rows)
  } catch (error) {
    sendServerError(res, 'Failed to load testimonials', error)
  }
})

app.post('/api/admin/testimonials', requireAdmin, async (req, res) => {
  const body = req.body ?? {}
  if (!body.guestName || !body.comment) {
    return res.status(400).json({ message: 'guestName and comment are required' })
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO testimonials (guest_name, location, rating, comment, visit_date, is_published)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        String(body.guestName),
        String(body.location ?? ''),
        Math.max(1, Math.min(5, toNumber(body.rating, 5))),
        String(body.comment),
        String(body.visitDate ?? ''),
        body.isPublished === false ? 0 : 1,
      ],
    )
    res.status(201).json({ id: result.insertId })
  } catch (error) {
    sendServerError(res, 'Failed to create testimonial', error)
  }
})

app.put('/api/admin/testimonials/:id', requireAdmin, async (req, res) => {
  const id = toNumber(req.params.id, 0)
  if (!id) return res.status(400).json({ message: 'Invalid testimonial id' })

  const body = req.body ?? {}
  try {
    await pool.query(
      `UPDATE testimonials
       SET guest_name = ?, location = ?, rating = ?, comment = ?, visit_date = ?, is_published = ?
       WHERE id = ?`,
      [
        String(body.guestName ?? ''),
        String(body.location ?? ''),
        Math.max(1, Math.min(5, toNumber(body.rating, 5))),
        String(body.comment ?? ''),
        String(body.visitDate ?? ''),
        body.isPublished === false ? 0 : 1,
        id,
      ],
    )
    res.json({ ok: true })
  } catch (error) {
    sendServerError(res, 'Failed to update testimonial', error)
  }
})

app.delete('/api/admin/testimonials/:id', requireAdmin, async (req, res) => {
  const id = toNumber(req.params.id, 0)
  if (!id) return res.status(400).json({ message: 'Invalid testimonial id' })

  try {
    await pool.query('DELETE FROM testimonials WHERE id = ? LIMIT 1', [id])
    res.json({ ok: true })
  } catch (error) {
    sendServerError(res, 'Failed to delete testimonial', error)
  }
})

app.get('/api/admin/menu', requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, section_name AS section, item_name AS itemName, description, price, image, is_published AS isPublished, sort_order AS sortOrder
       FROM menu_items
       ORDER BY section_name ASC, sort_order ASC, id ASC`,
    )
    res.json(rows)
  } catch (error) {
    sendServerError(res, 'Failed to load menu', error)
  }
})

app.post('/api/admin/menu', requireAdmin, async (req, res) => {
  const body = req.body ?? {}
  if (!body.section || !body.itemName) {
    return res.status(400).json({ message: 'section and itemName are required' })
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO menu_items (section_name, item_name, description, price, image, is_published, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        String(body.section),
        String(body.itemName),
        String(body.description ?? ''),
        sanitizePrice(body.price),
        String(body.image ?? ''),
        body.isPublished === false ? 0 : 1,
        toNumber(body.sortOrder, 0),
      ],
    )
    res.status(201).json({ id: result.insertId })
  } catch (error) {
    sendServerError(res, 'Failed to create menu item', error)
  }
})

app.put('/api/admin/menu/:id', requireAdmin, async (req, res) => {
  const id = toNumber(req.params.id, 0)
  if (!id) return res.status(400).json({ message: 'Invalid menu id' })

  const body = req.body ?? {}
  try {
    await pool.query(
      `UPDATE menu_items
       SET section_name = ?, item_name = ?, description = ?, price = ?, image = ?, is_published = ?, sort_order = ?
       WHERE id = ?`,
      [
        String(body.section ?? ''),
        String(body.itemName ?? ''),
        String(body.description ?? ''),
        sanitizePrice(body.price),
        String(body.image ?? ''),
        body.isPublished === false ? 0 : 1,
        toNumber(body.sortOrder, 0),
        id,
      ],
    )
    res.json({ ok: true })
  } catch (error) {
    sendServerError(res, 'Failed to update menu item', error)
  }
})

app.delete('/api/admin/menu/:id', requireAdmin, async (req, res) => {
  const id = toNumber(req.params.id, 0)
  if (!id) return res.status(400).json({ message: 'Invalid menu id' })

  try {
    await pool.query('DELETE FROM menu_items WHERE id = ? LIMIT 1', [id])
    res.json({ ok: true })
  } catch (error) {
    sendServerError(res, 'Failed to delete menu item', error)
  }
})

app.get('/api/admin/media', requireAdmin, async (_req, res) => {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    const files = await fs.readdir(UPLOAD_DIR, { withFileTypes: true })
    const rows = await Promise.all(
      files
        .filter((f) => f.isFile())
        .map(async (f) => {
          const absolutePath = path.join(UPLOAD_DIR, f.name)
          const stat = await fs.stat(absolutePath)
          return {
            name: f.name,
            size: stat.size,
            updatedAt: stat.mtime.toISOString(),
            url: `/images/uploads/${f.name}`,
          }
        }),
    )
    rows.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    res.json(rows)
  } catch (error) {
    sendServerError(res, 'Failed to load media library', error)
  }
})

app.post('/api/admin/media/upload', requireAdmin, (req, res) => {
  upload.single('file')(req, res, (error) => {
    if (error) {
      logServerError('Upload failed', error)
      return res.status(400).json({ message: 'Upload failed. Use a JPEG, PNG, WebP, or GIF under 10MB.' })
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    return res.status(201).json({
      name: req.file.filename,
      url: `/images/uploads/${req.file.filename}`,
      size: req.file.size,
    })
  })
})

app.delete('/api/admin/media/:fileName', requireAdmin, async (req, res) => {
  const fileName = path.basename(String(req.params.fileName ?? ''))
  if (!fileName) return res.status(400).json({ message: 'Invalid file name' })

  try {
    const absolutePath = path.join(UPLOAD_DIR, fileName)
    await fs.unlink(absolutePath)
    res.json({ ok: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return res.status(404).json({ message: 'File not found' })
    sendServerError(res, 'Failed to delete file', error)
  }
})

app.get('/api/admin/bookings', requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        id,
        full_name AS fullName,
        email,
        booking_date AS bookingDate,
        message,
        source,
        guest_count AS guestCount,
        time_from AS timeFrom,
        time_until AS timeUntil,
        status,
        admin_note AS adminNote,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM bookings
      ORDER BY id DESC
      LIMIT 500`,
    )
    // Normalize DATE fields to YYYY-MM-DD so admin UI never shows the previous day (UTC shift).
    res.json(
      rows.map((row) => ({
        ...row,
        bookingDate: toDateOnly(row.bookingDate) || row.bookingDate,
      })),
    )
  } catch (error) {
    sendServerError(res, 'Failed to load bookings', error)
  }
})

app.put('/api/admin/bookings/:id', requireAdmin, async (req, res) => {
  const id = toNumber(req.params.id, 0)
  if (!id) return res.status(400).json({ message: 'Invalid booking id' })

  const status = String(req.body?.status ?? 'new').toLowerCase()
  const allowed = new Set(['new', 'confirmed', 'closed'])
  if (!allowed.has(status)) return res.status(400).json({ message: 'Invalid status value' })

  try {
    await pool.query(
      'UPDATE bookings SET status = ?, admin_note = ? WHERE id = ?',
      [status, req.body?.adminNote ? String(req.body.adminNote) : null, id],
    )
    res.json({ ok: true })
  } catch (error) {
    sendServerError(res, 'Failed to update booking', error)
  }
})

app.get('/api/admin/content/about', requireAdmin, async (_req, res) => {
  try {
    res.json(await getSetting('about_page', DEFAULT_ABOUT_CONTENT))
  } catch (error) {
    sendServerError(res, 'Failed to load about content', error)
  }
})

app.put('/api/admin/content/about', requireAdmin, async (req, res) => {
  const nextValue = {
    legacyTitle: String(req.body?.legacyTitle ?? DEFAULT_ABOUT_CONTENT.legacyTitle),
    legacyDescription: String(req.body?.legacyDescription ?? DEFAULT_ABOUT_CONTENT.legacyDescription),
    foundationTitle: String(req.body?.foundationTitle ?? DEFAULT_ABOUT_CONTENT.foundationTitle),
    foundationDescription: String(req.body?.foundationDescription ?? DEFAULT_ABOUT_CONTENT.foundationDescription),
  }

  try {
    await setSetting('about_page', nextValue)
    res.json({ ok: true })
  } catch (error) {
    sendServerError(res, 'Failed to update about content', error)
  }
})

app.get('/api/admin/content/contact', requireAdmin, async (_req, res) => {
  try {
    res.json({
      ...DEFAULT_CONTACT_CONTENT,
      ...(await getSetting('contact_details', DEFAULT_CONTACT_CONTENT)),
    })
  } catch (error) {
    sendServerError(res, 'Failed to load contact details', error)
  }
})

app.put('/api/admin/content/contact', requireAdmin, async (req, res) => {
  const nextValue = {
    farmName: String(req.body?.farmName ?? DEFAULT_CONTACT_CONTENT.farmName),
    addressLine1: String(req.body?.addressLine1 ?? DEFAULT_CONTACT_CONTENT.addressLine1),
    addressLine2: String(req.body?.addressLine2 ?? DEFAULT_CONTACT_CONTENT.addressLine2),
    email: String(req.body?.email ?? DEFAULT_CONTACT_CONTENT.email),
    phone: String(req.body?.phone ?? DEFAULT_CONTACT_CONTENT.phone),
    whatsapp: String(req.body?.whatsapp ?? DEFAULT_CONTACT_CONTENT.whatsapp),
    whatsappSecondary: String(req.body?.whatsappSecondary ?? DEFAULT_CONTACT_CONTENT.whatsappSecondary),
    instagram: String(req.body?.instagram ?? DEFAULT_CONTACT_CONTENT.instagram),
    mapQuery: String(req.body?.mapQuery ?? DEFAULT_CONTACT_CONTENT.mapQuery),
    hoursCafe: String(req.body?.hoursCafe ?? DEFAULT_CONTACT_CONTENT.hoursCafe),
    hoursStore: String(req.body?.hoursStore ?? DEFAULT_CONTACT_CONTENT.hoursStore),
    hoursTours: String(req.body?.hoursTours ?? DEFAULT_CONTACT_CONTENT.hoursTours),
  }

  try {
    await setSetting('contact_details', nextValue)
    res.json({ ok: true })
  } catch (error) {
    sendServerError(res, 'Failed to update contact details', error)
  }
})

app.get('/api/admin/content/site-settings', requireAdmin, async (_req, res) => {
  try {
    res.json({
      ...DEFAULT_SITE_SETTINGS,
      ...(await getSetting('site_settings', DEFAULT_SITE_SETTINGS)),
    })
  } catch (error) {
    sendServerError(res, 'Failed to load site settings', error)
  }
})

app.put('/api/admin/content/site-settings', requireAdmin, async (req, res) => {
  const nextValue = {
    brandName: String(req.body?.brandName ?? DEFAULT_SITE_SETTINGS.brandName),
    missionText: String(req.body?.missionText ?? DEFAULT_SITE_SETTINGS.missionText),
    footerTagline: String(req.body?.footerTagline ?? DEFAULT_SITE_SETTINGS.footerTagline),
    supportEmail: String(req.body?.supportEmail ?? DEFAULT_SITE_SETTINGS.supportEmail),
    whatsappUrl: String(req.body?.whatsappUrl ?? DEFAULT_SITE_SETTINGS.whatsappUrl),
    whatsappSecondaryUrl: String(req.body?.whatsappSecondaryUrl ?? DEFAULT_SITE_SETTINGS.whatsappSecondaryUrl),
    instagramUrl: String(req.body?.instagramUrl ?? DEFAULT_SITE_SETTINGS.instagramUrl),
  }

  try {
    await setSetting('site_settings', nextValue)
    res.json({ ok: true })
  } catch (error) {
    sendServerError(res, 'Failed to update site settings', error)
  }
})

registerCommerceRoutes(app, {
  requireAdmin,
  sendServerError,
  parseCookies,
  cookieSecure: COOKIE_SECURE,
})

registerStayCmsRoutes(app, {
  requireAdmin,
  getSetting,
  setSetting,
  toNumber,
  sendServerError,
})

ensureSchemaAndSeed()
  .then(() => {
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Omaru Farm API running at http://localhost:${port}`)
    })
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start API:', error)
    process.exit(1)
  })
