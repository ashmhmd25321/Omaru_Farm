import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'node:path'
import fs from 'node:fs/promises'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import { pool } from './db.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT ?? 4000)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123'
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin'
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET ?? 'change_me_in_production'
const ADMIN_JWT_EXPIRES = process.env.ADMIN_JWT_EXPIRES ?? '8h'
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
  addressLine1: '482 Heritage Road',
  addressLine2: 'Willow Valley, NSW 2577',
  email: 'hello@omarufarm.com.au',
  whatsapp: 'https://wa.me/61000000000',
  instagram: 'https://instagram.com',
  mapQuery: '482 Heritage Road, Willow Valley NSW 2577, Australia',
  hoursCafe: 'Thu-Sun · 9:00 - 16:00',
  hoursStore: 'Daily · 10:00 - 17:00',
  hoursTours: 'By appointment',
}

const DEFAULT_MENU_ITEMS = [
  { section: 'Breakfast', itemName: 'Heritage Oats Porridge', description: 'House spiced oat porridge, seasonal fruit, honey drizzle', price: 16, image: '' },
  { section: 'Breakfast', itemName: 'Truffle Farm Eggs', description: 'Two eggs, greens, toast, cold-pressed oil', price: 18, image: '' },
  { section: 'Breakfast', itemName: 'Smashed Garden Greens', description: 'Avocado, herbs, lemon, seeds, sourdough', price: 17, image: '' },
  { section: 'Lunch', itemName: 'Roasted Root Medley', description: 'Seasonal roasted vegetables, feta, herb dressing', price: 22, image: '' },
  { section: 'Lunch', itemName: 'Omaru Lamb Ragu', description: 'Slow-cooked ragu, pasta, parmesan, garden herbs', price: 28, image: '' },
  { section: 'Lunch', itemName: 'Wild Mushroom Risotto', description: 'Creamy risotto, mushrooms, thyme oil', price: 26, image: '' },
  { section: 'Afternoon Tea', itemName: 'Devonshire Scones', description: 'Fresh cream, farm jam, seasonal berries', price: 14, image: '' },
  { section: 'Afternoon Tea', itemName: 'Lavender Lemon Tart', description: 'Bright citrus tart with lavender sugar', price: 12, image: '' },
  { section: 'Afternoon Tea', itemName: 'The Omaru Tea Set', description: 'Tea selection with small sweet bites', price: 19, image: '' },
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
  supportEmail: 'hello@omarufarm.com.au',
  whatsappUrl: 'https://wa.me/61000000000',
  instagramUrl: 'https://instagram.com',
}

const ADMIN_LOGIN_WINDOW_MS = Number(process.env.ADMIN_LOGIN_WINDOW_MS ?? 10 * 60 * 1000)
const ADMIN_LOGIN_MAX_ATTEMPTS = Number(process.env.ADMIN_LOGIN_MAX_ATTEMPTS ?? 8)
const loginAttemptMap = new Map()

app.use(cors())
app.use(express.json({ limit: '1mb' }))

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
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
    if (!allowed.includes(file.mimetype)) return cb(new Error('Only image files are allowed'))
    return cb(null, true)
  },
})

function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function sanitizePrice(value) {
  const n = toNumber(value, 0)
  return Number(n.toFixed(2))
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

function requireAdmin(req, res, next) {
  const token = String(req.headers['x-admin-token'] ?? '')
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized admin request' })
  }

  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET)
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
      is_featured TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  )
  await addColumnIfMissing('products', 'is_featured', 'TINYINT(1) NOT NULL DEFAULT 0')

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

  const [adminRows] = await pool.query(
    'SELECT id, password_hash AS passwordHash FROM admin_users WHERE username = ? LIMIT 1',
    [ADMIN_USERNAME],
  )
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)
  if (!adminRows[0]?.id) {
    await pool.query(
      'INSERT INTO admin_users (username, password_hash, is_active) VALUES (?, ?, 1)',
      [ADMIN_USERNAME, passwordHash],
    )
  } else {
    await pool.query('UPDATE admin_users SET password_hash = ?, is_active = 1 WHERE id = ?', [passwordHash, adminRows[0].id])
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'omaru-farm-api' })
})

app.get('/api/products', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, size, price, image, category,
              is_featured AS featured
       FROM products
       ORDER BY id ASC
       LIMIT 1000`,
    )
    res.json(rows)
  } catch (error) {
    res.status(500).json({ message: 'Failed to load products', error: error.message })
  }
})

app.get('/api/product-categories', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, sort_order AS sortOrder FROM product_categories ORDER BY sort_order ASC, name ASC',
    )
    res.json(rows)
  } catch (error) {
    res.status(500).json({ message: 'Failed to load categories', error: error.message })
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
    res.status(500).json({ message: 'Failed to load testimonials', error: error.message })
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
    res.status(500).json({ message: 'Failed to load menu', error: error.message })
  }
})

app.get('/api/content/about', async (_req, res) => {
  try {
    const value = await getSetting('about_page', DEFAULT_ABOUT_CONTENT)
    res.json(value)
  } catch (error) {
    res.status(500).json({ message: 'Failed to load about content', error: error.message })
  }
})

app.get('/api/content/contact', async (_req, res) => {
  try {
    const value = await getSetting('contact_details', DEFAULT_CONTACT_CONTENT)
    res.json(value)
  } catch (error) {
    res.status(500).json({ message: 'Failed to load contact details', error: error.message })
  }
})

app.get('/api/content/site-settings', async (_req, res) => {
  try {
    const value = await getSetting('site_settings', DEFAULT_SITE_SETTINGS)
    res.json(value)
  } catch (error) {
    res.status(500).json({ message: 'Failed to load site settings', error: error.message })
  }
})

app.post('/api/bookings', async (req, res) => {
  const { fullName, email, bookingDate, message, source, guestCount, timeFrom, timeUntil } = req.body
  if (!fullName || !email || !bookingDate) {
    return res.status(400).json({ message: 'fullName, email, and bookingDate are required.' })
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO bookings (full_name, email, booking_date, message, source, guest_count, time_from, time_until, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "new")',
      [
        String(fullName),
        String(email),
        String(bookingDate),
        message ? String(message) : null,
        source ? String(source) : 'website',
        guestCount ? toNumber(guestCount, 1) : null,
        timeFrom ? String(timeFrom) : null,
        timeUntil ? String(timeUntil) : null,
      ],
    )
    res.status(201).json({ message: 'Booking submitted', bookingId: result.insertId })
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit booking', error: error.message })
  }
})

app.post('/api/reviews', async (req, res) => {
  const { customerName, rating, comment } = req.body
  if (!customerName || !rating || !comment) {
    return res.status(400).json({ message: 'customerName, rating, and comment are required.' })
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO reviews (customer_name, rating, comment) VALUES (?, ?, ?)',
      [String(customerName), toNumber(rating, 5), String(comment)],
    )
    res.status(201).json({ message: 'Review submitted', reviewId: result.insertId })
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit review', error: error.message })
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
      },
      ADMIN_JWT_SECRET,
      { expiresIn: ADMIN_JWT_EXPIRES },
    )
    res.json({
      token,
      user: { id: user.id, username: user.username },
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to login', error: error.message })
  }
})

app.get('/api/admin/me', requireAdmin, (req, res) => {
  res.json({ user: req.admin })
})

app.post('/api/admin/logout', requireAdmin, (_req, res) => {
  // JWT is stateless; frontend removes token client-side.
  res.json({ ok: true })
})

app.get('/api/admin/products', requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, size, price, image, category,
              is_featured AS featured
       FROM products
       ORDER BY id ASC
       LIMIT 2000`,
    )
    res.json(rows)
  } catch (error) {
    res.status(500).json({ message: 'Failed to load products', error: error.message })
  }
})

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  const body = req.body ?? {}
  if (!body.name || !body.category) {
    return res.status(400).json({ message: 'name and category are required' })
  }

  try {
    const featured = body.featured === true || body.featured === 1 || body.featured === '1' ? 1 : 0
    const [result] = await pool.query(
      'INSERT INTO products (name, size, price, image, category, is_featured) VALUES (?, ?, ?, ?, ?, ?)',
      [
        String(body.name),
        String(body.size ?? ''),
        sanitizePrice(body.price),
        String(body.image ?? ''),
        String(body.category),
        featured,
      ],
    )
    await ensureProductCategoryName(body.category)
    res.status(201).json({ id: result.insertId })
  } catch (error) {
    res.status(500).json({ message: 'Failed to create product', error: error.message })
  }
})

app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const id = toNumber(req.params.id, 0)
  if (!id) return res.status(400).json({ message: 'Invalid product id' })

  const body = req.body ?? {}
  const featured = body.featured === true || body.featured === 1 || body.featured === '1' ? 1 : 0
  try {
    await pool.query(
      'UPDATE products SET name = ?, size = ?, price = ?, image = ?, category = ?, is_featured = ? WHERE id = ?',
      [
        String(body.name ?? ''),
        String(body.size ?? ''),
        sanitizePrice(body.price),
        String(body.image ?? ''),
        String(body.category ?? ''),
        featured,
        id,
      ],
    )
    await ensureProductCategoryName(body.category)
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ message: 'Failed to update product', error: error.message })
  }
})

app.get('/api/admin/product-categories', requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, sort_order AS sortOrder FROM product_categories ORDER BY sort_order ASC, name ASC',
    )
    res.json(rows)
  } catch (error) {
    res.status(500).json({ message: 'Failed to load categories', error: error.message })
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
    res.status(500).json({ message: 'Failed to create category', error: error.message })
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
    res.status(500).json({ message: 'Failed to update category', error: error.message })
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
    res.status(500).json({ message: 'Failed to delete category', error: error.message })
  }
})

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const id = toNumber(req.params.id, 0)
  if (!id) return res.status(400).json({ message: 'Invalid product id' })

  try {
    await pool.query('DELETE FROM products WHERE id = ? LIMIT 1', [id])
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete product', error: error.message })
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
    res.status(500).json({ message: 'Failed to load testimonials', error: error.message })
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
    res.status(500).json({ message: 'Failed to create testimonial', error: error.message })
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
    res.status(500).json({ message: 'Failed to update testimonial', error: error.message })
  }
})

app.delete('/api/admin/testimonials/:id', requireAdmin, async (req, res) => {
  const id = toNumber(req.params.id, 0)
  if (!id) return res.status(400).json({ message: 'Invalid testimonial id' })

  try {
    await pool.query('DELETE FROM testimonials WHERE id = ? LIMIT 1', [id])
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete testimonial', error: error.message })
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
    res.status(500).json({ message: 'Failed to load menu', error: error.message })
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
    res.status(500).json({ message: 'Failed to create menu item', error: error.message })
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
    res.status(500).json({ message: 'Failed to update menu item', error: error.message })
  }
})

app.delete('/api/admin/menu/:id', requireAdmin, async (req, res) => {
  const id = toNumber(req.params.id, 0)
  if (!id) return res.status(400).json({ message: 'Invalid menu id' })

  try {
    await pool.query('DELETE FROM menu_items WHERE id = ? LIMIT 1', [id])
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete menu item', error: error.message })
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
    res.status(500).json({ message: 'Failed to load media library', error: error.message })
  }
})

app.post('/api/admin/media/upload', requireAdmin, (req, res) => {
  upload.single('file')(req, res, (error) => {
    if (error) {
      return res.status(400).json({ message: error.message || 'Upload failed' })
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
    res.status(500).json({ message: 'Failed to delete file', error: error.message })
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
    res.json(rows)
  } catch (error) {
    res.status(500).json({ message: 'Failed to load bookings', error: error.message })
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
    res.status(500).json({ message: 'Failed to update booking', error: error.message })
  }
})

app.get('/api/admin/content/about', requireAdmin, async (_req, res) => {
  try {
    res.json(await getSetting('about_page', DEFAULT_ABOUT_CONTENT))
  } catch (error) {
    res.status(500).json({ message: 'Failed to load about content', error: error.message })
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
    res.status(500).json({ message: 'Failed to update about content', error: error.message })
  }
})

app.get('/api/admin/content/contact', requireAdmin, async (_req, res) => {
  try {
    res.json(await getSetting('contact_details', DEFAULT_CONTACT_CONTENT))
  } catch (error) {
    res.status(500).json({ message: 'Failed to load contact details', error: error.message })
  }
})

app.put('/api/admin/content/contact', requireAdmin, async (req, res) => {
  const nextValue = {
    farmName: String(req.body?.farmName ?? DEFAULT_CONTACT_CONTENT.farmName),
    addressLine1: String(req.body?.addressLine1 ?? DEFAULT_CONTACT_CONTENT.addressLine1),
    addressLine2: String(req.body?.addressLine2 ?? DEFAULT_CONTACT_CONTENT.addressLine2),
    email: String(req.body?.email ?? DEFAULT_CONTACT_CONTENT.email),
    whatsapp: String(req.body?.whatsapp ?? DEFAULT_CONTACT_CONTENT.whatsapp),
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
    res.status(500).json({ message: 'Failed to update contact details', error: error.message })
  }
})

app.get('/api/admin/content/site-settings', requireAdmin, async (_req, res) => {
  try {
    res.json(await getSetting('site_settings', DEFAULT_SITE_SETTINGS))
  } catch (error) {
    res.status(500).json({ message: 'Failed to load site settings', error: error.message })
  }
})

app.put('/api/admin/content/site-settings', requireAdmin, async (req, res) => {
  const nextValue = {
    brandName: String(req.body?.brandName ?? DEFAULT_SITE_SETTINGS.brandName),
    missionText: String(req.body?.missionText ?? DEFAULT_SITE_SETTINGS.missionText),
    footerTagline: String(req.body?.footerTagline ?? DEFAULT_SITE_SETTINGS.footerTagline),
    supportEmail: String(req.body?.supportEmail ?? DEFAULT_SITE_SETTINGS.supportEmail),
    whatsappUrl: String(req.body?.whatsappUrl ?? DEFAULT_SITE_SETTINGS.whatsappUrl),
    instagramUrl: String(req.body?.instagramUrl ?? DEFAULT_SITE_SETTINGS.instagramUrl),
  }

  try {
    await setSetting('site_settings', nextValue)
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ message: 'Failed to update site settings', error: error.message })
  }
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
