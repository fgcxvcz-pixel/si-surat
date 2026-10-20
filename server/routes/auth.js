import { Router } from 'express'
import { q } from '../db.js'
import { signToken, authRequired } from '../middleware/auth.js'
import { verifyPassword, hashPassword } from '../utils/password.js'
import { sendOtpEmail, isSmtpConfigured } from '../utils/mailer.js'
import { generateOtp, createOtpRecord, findActiveOtp, incrementOtpAttempts, markOtpUsed, verifyOtpHash, OTP_MAX_ATTEMPTS } from '../utils/otp.js'

const router = Router()

// In-memory rate limit: username -> [timestamps]
const forgotAttempts = new Map()
const FORGET_LIMIT = 5
const FORGET_WINDOW_MS = 15 * 60 * 1000

function rateLimited(key) {
  const now = Date.now()
  const list = (forgotAttempts.get(key) || []).filter((t) => now - t < FORGET_WINDOW_MS)
  if (list.length >= FORGET_LIMIT) {
    forgotAttempts.set(key, list)
    return true
  }
  list.push(now)
  forgotAttempts.set(key, list)
  return false
}

function expiryMinutes() {
  return Number(process.env.OTP_EXPIRY_MINUTES || 15)
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' })
    }
    const rows = await q(
      `SELECT p.id, p.nama, p.username, p.email, p.password, r.nama_role AS role
       FROM pengguna p
       JOIN roles r ON r.id = p.id_role
       WHERE p.username = ? LIMIT 1`,
      [username],
    )
    const user = rows[0]
    if (!user) return res.status(401).json({ error: 'Username tidak terdaftar.' })
    const ok = await verifyPassword(password, user.password)
    if (!ok) return res.status(401).json({ error: 'Password salah.' })
    const token = signToken({ id: user.id, nama: user.nama, username: user.username, role: user.role })
    return res.json({
      token,
      user: { id: user.id, nama: user.nama, username: user.username, email: user.email, role: user.role },
    })
  } catch (err) {
    console.error('login error', err)
    return res.status(500).json({ error: 'Koneksi ke server gagal.' })
  }
})

router.get('/me', authRequired, async (req, res) => {
  const rows = await q(
    `SELECT p.id, p.nama, p.username, p.email, r.nama_role AS role
     FROM pengguna p JOIN roles r ON r.id = p.id_role WHERE p.id = ? LIMIT 1`,
    [req.user.sub],
  )
  if (!rows[0]) return res.status(404).json({ error: 'User tidak ditemukan' })
  res.json({ user: rows[0] })
})

router.post('/logout', authRequired, (_req, res) => {
  res.json({ ok: true })
})

// ── Lupa password: kirim OTP ke email ─────────────────────────────────────
router.post('/forgot', async (req, res) => {
  try {
    const { username } = req.body || {}
    const generic = { ok: true, message: 'Jika username terdaftar, kode OTP telah dikirim ke email.' }
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username wajib diisi' })
    }
    const key = username.trim().toLowerCase()
    if (rateLimited(key)) {
      return res.status(429).json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' })
    }

    const rows = await q(
      `SELECT id, nama, username, email FROM pengguna WHERE username = ? LIMIT 1`,
      [username.trim()],
    )
    const user = rows[0]
    if (!user?.email) {
      return res.json(generic)
    }

    const otp = generateOtp()
    await createOtpRecord(user.id, otp, expiryMinutes())

    try {
      await sendOtpEmail(user.email, otp, expiryMinutes())
    } catch (mailErr) {
      console.error('SMTP gagal kirim OTP:', mailErr.message)
      // Dev only: log OTP supaya bisa test tanpa email (hapus di production)
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[DEV] OTP untuk ${user.username} (${user.email}): ${otp}`)
      }
      return res.json(generic)
    }

    return res.json(generic)
  } catch (err) {
    console.error('forgot error', err)
    return res.status(500).json({ error: 'Terjadi kesalahan. Coba lagi nanti.' })
  }
})

// ── Lupa password: verifikasi OTP + set password baru ─────────────────────
router.post('/reset', async (req, res) => {
  try {
    const { username, otp, newPassword } = req.body || {}
    const invalid = { error: 'Username, kode, atau password tidak valid' }
    if (!username || !otp || !newPassword) {
      return res.status(400).json({ error: 'Username, kode, dan password baru wajib diisi' })
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'Password minimal 8 karakter' })
    }

    const rows = await q(
      `SELECT id FROM pengguna WHERE username = ? LIMIT 1`,
      [String(username).trim()],
    )
    if (!rows[0]) return res.status(400).json(invalid)

    const active = await findActiveOtp(String(username).trim())
    if (!active) return res.status(400).json(invalid)

    const otpStr = String(otp).trim()
    if (!/^\d{6}$/.test(otpStr)) {
      await incrementOtpAttempts(active.id)
      return res.status(400).json(invalid)
    }

    const ok = await verifyOtpHash(otpStr, active.otp_hash)
    if (!ok) {
      await incrementOtpAttempts(active.id)
      return res.status(400).json(invalid)
    }

    const hashed = await hashPassword(newPassword)
    await q('UPDATE pengguna SET password = ? WHERE id = ?', [hashed, active.id_user])
    await markOtpUsed(active.id)

    return res.json({ ok: true, message: 'Password berhasil diubah. Silakan login.' })
  } catch (err) {
    console.error('reset error', err)
    return res.status(500).json({ error: 'Terjadi kesalahan. Coba lagi nanti.' })
  }
})

export default router
