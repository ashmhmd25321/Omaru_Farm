import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import verifyAppleToken from 'verify-apple-id-token'
import { pool } from '../db.js'
import { authServicesStatus, sendEmailVerification, sendPasswordResetEmail, sendPhoneVerification } from './authNotifications.js'

export const CUSTOMER_PROFILE_SQL = `
  SELECT id, email, full_name AS fullName, phone,
         delivery_line1 AS deliveryLine1, delivery_line2 AS deliveryLine2,
         delivery_city AS deliveryCity, delivery_state AS deliveryState,
         delivery_postcode AS deliveryPostcode, stripe_customer_id AS stripeCustomerId,
         email_verified AS emailVerified, phone_verified AS phoneVerified,
         auth_provider AS authProvider
  FROM customers WHERE id = ? LIMIT 1`

export function generateVerifyCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function verifyExpiry(minutes = 15) {
  return new Date(Date.now() + minutes * 60 * 1000)
}

export function serializeCustomer(row) {
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    phone: row.phone ?? '',
    deliveryLine1: row.deliveryLine1 ?? '',
    deliveryLine2: row.deliveryLine2 ?? '',
    deliveryCity: row.deliveryCity ?? '',
    deliveryState: row.deliveryState ?? '',
    deliveryPostcode: row.deliveryPostcode ?? '',
    stripeCustomerId: row.stripeCustomerId ?? null,
    emailVerified: Boolean(row.emailVerified),
    phoneVerified: Boolean(row.phoneVerified),
    authProvider: row.authProvider ?? 'local',
  }
}

export function needsVerification(user) {
  return !user?.emailVerified || !user?.phoneVerified
}

export async function loadCustomerById(id) {
  const [rows] = await pool.query(CUSTOMER_PROFILE_SQL, [id])
  return serializeCustomer(rows[0])
}

export function issueCustomerToken(customerId, email, jwtSecret) {
  return jwt.sign({ sub: customerId, email, role: 'customer' }, jwtSecret, { expiresIn: '30d' })
}

export async function queueVerificationCodes(customerId, { email, phone, fullName }) {
  const emailCode = generateVerifyCode()
  const phoneCode = generateVerifyCode()
  const expires = verifyExpiry()
  await pool.query(
    `UPDATE customers SET
       email_verify_code = ?, email_verify_expires = ?,
       phone_verify_code = ?, phone_verify_expires = ?
     WHERE id = ?`,
    [emailCode, expires, phoneCode, expires, customerId],
  )

  const emailResult = await sendEmailVerification({ email, fullName, code: emailCode })
  const phoneResult = await sendPhoneVerification({ phone, code: phoneCode })
  return buildDeliveryResult(emailResult, phoneResult, { email: emailCode, phone: phoneCode })
}

function buildDeliveryResult(emailResult, phoneResult, devCodes) {
  const dev = process.env.NODE_ENV !== 'production'
  return {
    emailSent: emailResult.sent,
    smsSent: phoneResult.sent,
    devCodes: dev && (!emailResult.sent || !phoneResult.sent) ? devCodes : undefined,
  }
}

export async function resendEmailVerification(customerId, { email, fullName }) {
  const emailCode = generateVerifyCode()
  const expires = verifyExpiry()
  await pool.query(
    `UPDATE customers SET email_verify_code = ?, email_verify_expires = ? WHERE id = ?`,
    [emailCode, expires, customerId],
  )
  const emailResult = await sendEmailVerification({ email, fullName, code: emailCode })
  return buildDeliveryResult(emailResult, { sent: true }, { email: emailCode })
}

export async function resendPhoneVerification(customerId, { phone }) {
  const phoneCode = generateVerifyCode()
  const expires = verifyExpiry()
  await pool.query(
    `UPDATE customers SET phone_verify_code = ?, phone_verify_expires = ? WHERE id = ?`,
    [phoneCode, expires, customerId],
  )
  const phoneResult = await sendPhoneVerification({ phone, code: phoneCode })
  return buildDeliveryResult({ sent: true }, phoneResult, { phone: phoneCode })
}

export async function verifyEmailCode(customerId, code) {
  const [rows] = await pool.query(
    `SELECT email_verify_code AS emailCode, email_verify_expires AS emailExpires
     FROM customers WHERE id = ? LIMIT 1`,
    [customerId],
  )
  const row = rows[0]
  if (!row?.emailCode) {
    throw Object.assign(new Error('No email verification pending'), { status: 400 })
  }
  if (String(row.emailCode) !== String(code).trim()) {
    throw Object.assign(new Error('Invalid email verification code'), { status: 400 })
  }
  if (row.emailExpires && new Date(row.emailExpires) < new Date()) {
    throw Object.assign(new Error('Email verification code expired'), { status: 400 })
  }
  await pool.query(
    `UPDATE customers SET email_verified = 1, email_verify_code = NULL, email_verify_expires = NULL WHERE id = ?`,
    [customerId],
  )
}

export async function verifyPhoneCode(customerId, code) {
  const [rows] = await pool.query(
    `SELECT phone_verify_code AS phoneCode, phone_verify_expires AS phoneExpires, phone
     FROM customers WHERE id = ? LIMIT 1`,
    [customerId],
  )
  const row = rows[0]
  if (!row?.phoneCode) {
    throw Object.assign(new Error('No phone verification pending'), { status: 400 })
  }
  if (String(row.phoneCode) !== String(code).trim()) {
    throw Object.assign(new Error('Invalid phone verification code'), { status: 400 })
  }
  if (row.phoneExpires && new Date(row.phoneExpires) < new Date()) {
    throw Object.assign(new Error('Phone verification code expired'), { status: 400 })
  }
  if (!String(row.phone ?? '').trim()) {
    throw Object.assign(new Error('Add a mobile number before verifying phone'), { status: 400 })
  }
  await pool.query(
    `UPDATE customers SET phone_verified = 1, phone_verify_code = NULL, phone_verify_expires = NULL WHERE id = ?`,
    [customerId],
  )
}

export function authConfig() {
  return {
    verificationEnabled: customerVerificationEnabled(),
    googleEnabled: Boolean(process.env.GOOGLE_CLIENT_ID),
    appleEnabled: Boolean(process.env.APPLE_CLIENT_ID),
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
    appleClientId: process.env.APPLE_CLIENT_ID ?? '',
    ...authServicesStatus(),
  }
}

export function customerVerificationEnabled() {
  return process.env.CUSTOMER_VERIFICATION_ENABLED === 'true'
}

export async function loginWithGoogleCredential(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) throw Object.assign(new Error('Google sign-in is not configured'), { status: 503 })
  const client = new OAuth2Client(clientId)
  const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId })
  const payload = ticket.getPayload()
  if (!payload?.email) throw Object.assign(new Error('Google account has no email'), { status: 400 })

  const email = String(payload.email).trim().toLowerCase()
  const googleId = String(payload.sub)
  const fullName = String(payload.name ?? email.split('@')[0]).trim()
  const emailVerified = Boolean(payload.email_verified)

  const [existingByGoogle] = await pool.query(`SELECT id FROM customers WHERE google_id = ? LIMIT 1`, [googleId])
  if (existingByGoogle[0]) {
    return loadCustomerById(existingByGoogle[0].id)
  }

  const [existingByEmail] = await pool.query(`SELECT id, google_id AS googleId FROM customers WHERE email = ? LIMIT 1`, [email])
  if (existingByEmail[0]) {
    await pool.query(
      `UPDATE customers SET google_id = ?, auth_provider = 'google', email_verified = GREATEST(email_verified, ?) WHERE id = ?`,
      [googleId, emailVerified ? 1 : 0, existingByEmail[0].id],
    )
    return loadCustomerById(existingByEmail[0].id)
  }

  const [result] = await pool.query(
    `INSERT INTO customers (email, password_hash, full_name, auth_provider, google_id, email_verified, phone_verified)
     VALUES (?, NULL, ?, 'google', ?, ?, 0)`,
    [email, fullName, googleId, emailVerified ? 1 : 0],
  )
  return loadCustomerById(result.insertId)
}

export async function loginWithAppleCredential(credential, profileName) {
  const clientId = process.env.APPLE_CLIENT_ID
  if (!clientId) throw Object.assign(new Error('Apple sign-in is not configured'), { status: 503 })

  const payload = await verifyAppleToken({
    idToken: credential,
    clientId,
  })
  const appleId = String(payload.sub)
  const email = payload.email ? String(payload.email).trim().toLowerCase() : ''
  const fullName = String(profileName ?? (email ? email.split('@')[0] : 'Apple user')).trim()

  const [existingByApple] = await pool.query(`SELECT id FROM customers WHERE apple_id = ? LIMIT 1`, [appleId])
  if (existingByApple[0]) {
    return loadCustomerById(existingByApple[0].id)
  }

  if (email) {
    const [existingByEmail] = await pool.query(`SELECT id FROM customers WHERE email = ? LIMIT 1`, [email])
    if (existingByEmail[0]) {
      await pool.query(
        `UPDATE customers SET apple_id = ?, auth_provider = 'apple', email_verified = GREATEST(email_verified, 1) WHERE id = ?`,
        [appleId, existingByEmail[0].id],
      )
      return loadCustomerById(existingByEmail[0].id)
    }
  }

  if (!email) {
    throw Object.assign(new Error('Apple did not share an email. Use email registration or try again.'), { status: 400 })
  }

  const [result] = await pool.query(
    `INSERT INTO customers (email, password_hash, full_name, auth_provider, apple_id, email_verified, phone_verified)
     VALUES (?, NULL, ?, 'apple', ?, 1, 0)`,
    [email, fullName, appleId],
  )
  return loadCustomerById(result.insertId)
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

export async function requestPasswordReset(email) {
  const normalized = String(email ?? '').trim().toLowerCase()
  if (!normalized) throw Object.assign(new Error('Email is required'), { status: 400 })

  const [rows] = await pool.query(
    `SELECT id, email, full_name AS fullName, password_hash AS passwordHash FROM customers WHERE email = ? LIMIT 1`,
    [normalized],
  )
  const user = rows[0]
  if (!user?.passwordHash) {
    return { devCode: undefined }
  }

  const code = generateVerifyCode()
  const expires = verifyExpiry()
  await pool.query(
    `UPDATE customers SET password_reset_code = ?, password_reset_expires = ? WHERE id = ?`,
    [code, expires, user.id],
  )
  const result = await sendPasswordResetEmail({ email: user.email, fullName: user.fullName, code })
  const dev = process.env.NODE_ENV !== 'production'
  return {
    devCode: dev && !result.sent ? code : undefined,
  }
}

export async function resetPasswordWithCode(email, code, newPassword) {
  const normalized = String(email ?? '').trim().toLowerCase()
  const resetCode = String(code ?? '').trim()
  const password = String(newPassword ?? '')
  if (!normalized || !resetCode) throw Object.assign(new Error('Email and reset code are required'), { status: 400 })
  if (password.length < 8) throw Object.assign(new Error('Password must be at least 8 characters'), { status: 400 })

  const [rows] = await pool.query(
    `SELECT id, password_reset_code AS resetCode, password_reset_expires AS resetExpires
     FROM customers WHERE email = ? LIMIT 1`,
    [normalized],
  )
  const user = rows[0]
  if (!user?.resetCode || String(user.resetCode) !== resetCode) {
    throw Object.assign(new Error('Invalid reset code'), { status: 400 })
  }
  if (user.resetExpires && new Date(user.resetExpires) < new Date()) {
    throw Object.assign(new Error('Reset code expired'), { status: 400 })
  }

  const hash = await hashPassword(password)
  await pool.query(
    `UPDATE customers SET password_hash = ?, password_reset_code = NULL, password_reset_expires = NULL, auth_provider = 'local' WHERE id = ?`,
    [hash, user.id],
  )
}

export async function changeCustomerPassword(customerId, currentPassword, newPassword) {
  const current = String(currentPassword ?? '')
  const next = String(newPassword ?? '')
  if (next.length < 8) throw Object.assign(new Error('New password must be at least 8 characters'), { status: 400 })

  const [rows] = await pool.query(
    `SELECT password_hash AS passwordHash, auth_provider AS authProvider FROM customers WHERE id = ? LIMIT 1`,
    [customerId],
  )
  const user = rows[0]
  if (!user?.passwordHash) {
    throw Object.assign(new Error('Password sign-in is not enabled for this account'), { status: 400 })
  }
  if (!(await bcrypt.compare(current, user.passwordHash))) {
    throw Object.assign(new Error('Current password is incorrect'), { status: 400 })
  }
  const hash = await hashPassword(next)
  await pool.query(`UPDATE customers SET password_hash = ? WHERE id = ?`, [hash, customerId])
}
