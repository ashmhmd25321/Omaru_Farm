import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { pool } from './db.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT ?? 4000)

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'omaru-farm-api' })
})

app.get('/api/products', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, size, price, image, category FROM products ORDER BY id ASC LIMIT 100',
    )
    res.json(rows)
  } catch (error) {
    res.status(500).json({ message: 'Failed to load products', error: error.message })
  }
})

app.get('/api/reviews', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, customer_name, rating, comment, created_at FROM reviews ORDER BY created_at DESC LIMIT 12',
    )
    res.json(rows)
  } catch (error) {
    res.status(500).json({ message: 'Failed to load reviews', error: error.message })
  }
})

app.post('/api/bookings', async (req, res) => {
  const { fullName, email, bookingDate, message } = req.body

  if (!fullName || !email || !bookingDate) {
    return res.status(400).json({ message: 'fullName, email, and bookingDate are required.' })
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO bookings (full_name, email, booking_date, message) VALUES (?, ?, ?, ?)',
      [fullName, email, bookingDate, message ?? null],
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
      [customerName, rating, comment],
    )
    res.status(201).json({ message: 'Review submitted', reviewId: result.insertId })
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit review', error: error.message })
  }
})

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Omaru Farm API running at http://localhost:${port}`)
})
