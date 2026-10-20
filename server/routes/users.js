import { Router } from 'express'
import { q } from '../db.js'
import { authRequired, requireRole } from '../middleware/auth.js'
import { hashPassword } from '../utils/password.js'

const router = Router()
router.use(authRequired)

const ADMIN = requireRole('Admin', 'Super Admin')

router.get('/', ADMIN, async (_req, res) => {
  const rows = await q(
    `SELECT p.id, p.username, p.nama, p.email,
            JSON_OBJECT('id', r.id, 'nama_role', r.nama_role) AS id_role
     FROM pengguna p
     JOIN roles r ON r.id = p.id_role
     ORDER BY p.created_at DESC`,
  )
  const data = rows.map((r) => {
    let role = r.id_role
    if (typeof role === 'string') {
      try { role = JSON.parse(role) } catch { role = null }
    }
    return { ...r, id_role: role }
  })
  res.json(data)
})

router.post('/', ADMIN, async (req, res) => {
  const { nama, username, email, password, id_role } = req.body || {}
  if (!nama || !username || !email || !password || !id_role) {
    return res.status(400).json({ error: 'Field wajib tidak lengkap' })
  }
  const dup = await q('SELECT id FROM pengguna WHERE username = ? OR email = ? LIMIT 1', [username, email])
  if (dup[0]) return res.status(400).json({ error: 'Username atau email sudah digunakan' })
  const roleRows = await q('SELECT id, nama_role FROM roles WHERE id = ? LIMIT 1', [id_role])
  if (!roleRows[0]) return res.status(400).json({ error: 'Role tidak valid' })
  if (roleRows[0].nama_role === 'Super Admin') {
    return res.status(400).json({ error: 'Role Super Admin tidak bisa dibuat lewat form — hanya dari seed' })
  }
  const hashed = await hashPassword(password)
  const result = await q(
    `INSERT INTO pengguna (id_role, nama, username, email, password) VALUES (?, ?, ?, ?, ?)`,
    [id_role, nama, username, email, hashed],
  )
  res.status(201).json({ user: { id: result.insertId, username, nama } })
})

router.patch('/:id', ADMIN, async (req, res) => {
  const b = req.body || {}
  if (b.id_role !== undefined) {
    const roleRows = await q('SELECT nama_role FROM roles WHERE id = ? LIMIT 1', [b.id_role])
    if (!roleRows[0]) return res.status(400).json({ error: 'Role tidak valid' })
    if (roleRows[0].nama_role === 'Super Admin') {
      return res.status(400).json({ error: 'Role Super Admin tidak bisa diubah lewat form' })
    }
  }
  const fields = []
  const params = []
  for (const k of ['nama', 'username', 'email', 'id_role']) {
    if (b[k] !== undefined) {
      fields.push(`${k} = ?`)
      params.push(b[k])
    }
  }
  if (!fields.length) return res.status(400).json({ error: 'Tidak ada perubahan' })
  params.push(req.params.id)
  await q(`UPDATE pengguna SET ${fields.join(', ')} WHERE id = ?`, params)
  res.json({ ok: true })
})

router.patch('/:id/password', ADMIN, async (req, res) => {
  const { newPassword } = req.body || {}
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Password minimal 8 karakter' })
  }
  const hashed = await hashPassword(newPassword)
  await q('UPDATE pengguna SET password = ? WHERE id = ?', [hashed, req.params.id])
  res.json({ ok: true })
})

router.delete('/:id', ADMIN, async (req, res) => {
  await q('DELETE FROM pengguna WHERE id = ?', [req.params.id])
  res.json({ ok: true })
})

export default router
