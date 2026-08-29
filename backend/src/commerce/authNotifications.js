import nodemailer from 'nodemailer'

const isProduction = process.env.NODE_ENV === 'production'

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM)
}

function twilioConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER)
}

let transporter
function getTransporter() {
  if (!smtpConfigured()) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    })
  }
  return transporter
}

export function authServicesStatus() {
  return {
    emailConfigured: smtpConfigured(),
    smsConfigured: twilioConfigured(),
  }
}

export async function sendEmailVerification({ email, fullName, code }) {
  const subject = 'Verify your Omaru Farm account'
  const text = `Hi ${fullName || 'there'},\n\nYour Omaru Farm verification code is: ${code}\n\nIt expires in 15 minutes.\n\nIf you did not create an account, you can ignore this email.`
  const html = `<p>Hi ${fullName || 'there'},</p><p>Your Omaru Farm verification code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:0.2em">${code}</p><p>This code expires in 15 minutes.</p>`

  if (!smtpConfigured()) {
    if (!isProduction) {
      console.info(`[dev email verify] ${email}: ${code}`)
      return { sent: false, dev: true }
    }
    throw Object.assign(new Error('Email service is not configured'), { status: 503 })
  }

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject,
    text,
    html,
  })
  return { sent: true }
}

export async function sendPhoneVerification({ phone, code }) {
  const body = `Your Omaru Farm verification code is ${code}. It expires in 15 minutes.`

  if (!twilioConfigured()) {
    if (!isProduction) {
      console.info(`[dev sms verify] ${phone}: ${code}`)
      return { sent: false, dev: true }
    }
    throw Object.assign(new Error('SMS service is not configured'), { status: 503 })
  }

  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')
  const params = new URLSearchParams({
    To: phone,
    From: process.env.TWILIO_FROM_NUMBER,
    Body: body,
  })
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw Object.assign(new Error(`SMS failed: ${detail || res.status}`), { status: 502 })
  }
  return { sent: true }
}

export async function sendPasswordResetEmail({ email, fullName, code }) {
  const siteUrl = process.env.PUBLIC_SITE_URL ?? 'http://127.0.0.1:5173'
  const subject = 'Reset your Omaru Farm password'
  const text = `Hi ${fullName || 'there'},\n\nYour password reset code is: ${code}\n\nIt expires in 15 minutes.\n\nYou can also reset at: ${siteUrl}/account\n\nIf you did not request this, ignore this email.`
  const html = `<p>Hi ${fullName || 'there'},</p><p>Your password reset code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:0.2em">${code}</p><p>This code expires in 15 minutes.</p><p><a href="${siteUrl}/account">Open your account</a></p>`

  if (!smtpConfigured()) {
    if (!isProduction) {
      console.info(`[dev password reset] ${email}: ${code}`)
      return { sent: false, dev: true }
    }
    throw Object.assign(new Error('Email service is not configured'), { status: 503 })
  }

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject,
    text,
    html,
  })
  return { sent: true }
}
