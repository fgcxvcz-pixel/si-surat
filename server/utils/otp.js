import bcrypt from 'bcryptjs'
import { q } from '../db.js'

const OTP_LENGTH = 6
const MAX_ATTEMPTS = 5

export function generateOtp() {
  let code = ''
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += Math.floor(Math.random() * 10).toString()
  }
  return code
}

export async function hashOtp(otp) {
  return bcrypt.hash(otp, 10)
}

export async function verifyOtpHash(otp, hash) {
  return bcrypt.compare(otp, hash)
}

function pad(n) {
  return String(n).padStart(2, '0')
}

// Format datetime lokal MySQL-compatible (bukan UTC)
export function localSql(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function otpExpiryDate(minutes = 15) {
  const d = new Date()
  d.setMinutes(d.getMinutes() + Number(minutes || 15))
  return localSql(d)
}

export function nowSql() {
  return localSql(new Date())
}

export function isExpired(expiresAt) {
  if (!expiresAt) return true
  const s = String(expiresAt).replace('T', ' ').slice(0, 19)
  const [datePart, timePart] = s.split(' ')
  const [y, m, d] = (datePart || '').split('-').map(Number)
  const [hh, mm, ss] = (timePart || '00:00:00').split(':').map(Number)
  if (!y || !m || !d) return true
  const exp = new Date(y, m - 1, d, hh || 0, mm || 0, ss || 0)
  return exp.getTime() < Date.now()
}

export async function invalidateUserOtps(userId) {
  await q(
    `UPDATE password_reset_otps SET used_at = ?
     WHERE id_user = ? AND used_at IS NULL`,
    [nowSql(), userId],
  )
}

export async function createOtpRecord(userId, otp, expiryMinutes = 15) {
  await invalidateUserOtps(userId)
  const otpHash = await hashOtp(otp)
  const expiresAt = otpExpiryDate(expiryMinutes)
  const result = await q(
    `INSERT INTO password_reset_otps (id_user, otp_hash, expires_at, attempts)
     VALUES (?, ?, ?, 0)`,
    [userId, otpHash, expiresAt],
  )
  return result.insertId
}

export async function findActiveOtp(username) {
  const rows = await q(
    `SELECT o.id, o.id_user, o.otp_hash, o.expires_at, o.attempts, o.used_at
     FROM password_reset_otps o
     JOIN pengguna p ON p.id = o.id_user
     WHERE p.username = ? AND o.used_at IS NULL
     ORDER BY o.created_at DESC
     LIMIT 1`,
    [username],
  )
  const row = rows[0]
  if (!row) return null
  if (row.attempts >= MAX_ATTEMPTS) return null
  if (isExpired(row.expires_at)) return null
  return row
}

export async function incrementOtpAttempts(id) {
  await q('UPDATE password_reset_otps SET attempts = attempts + 1 WHERE id = ?', [id])
}

export async function markOtpUsed(id) {
  await q('UPDATE password_reset_otps SET used_at = ? WHERE id = ?', [nowSql(), id])
}

export const OTP_MAX_ATTEMPTS = MAX_ATTEMPTS
