import { Router } from 'express'
import { q } from '../db.js'
import { authRequired, requireRole } from '../middleware/auth.js'
import { mapRows, mapRow } from '../utils/helpers.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'))

const router = Router()
router.use(authRequired)

const MANAGE = requireRole('Kepala Bagian', 'Super Admin')

const SELECT = `
  SELECT t.*, JSON_OBJECT('id', u.id, 'nama', u.nama) AS id_user
  FROM tanda_tangan_digital t
  LEFT JOIN pengguna u ON u.id = t.id_user
`

router.get('/', async (_req, res) => {
  const rows = await q(`${SELECT} WHERE t.is_aktif = 1`)
  res.json(mapRows(rows))
})

router.get('/all', async (_req, res) => {
  const rows = await q(`${SELECT} ORDER BY t.created_at DESC`)
  res.json(mapRows(rows))
})

router.post('/', MANAGE, async (req, res) => {
  const { file_ttd } = req.body || {}
  if (!file_ttd || !file_ttd.path) return res.status(400).json({ error: 'file_ttd wajib' })
  const ownerId = req.user.sub
  await q('UPDATE tanda_tangan_digital SET is_aktif = 0 WHERE id_user = ?', [ownerId])
  const result = await q(
    `INSERT INTO tanda_tangan_digital (id_user, file_ttd, is_aktif) VALUES (?, ?, 1)`,
    [ownerId, JSON.stringify(file_ttd)],
  )
  const rows = await q(`${SELECT} WHERE t.id = ? LIMIT 1`, [result.insertId])
  res.status(201).json(mapRow(rows[0]))
})

router.patch('/:id/active', MANAGE, async (req, res) => {
  const { is_aktif } = req.body || {}
  if (is_aktif) {
    const row = await q('SELECT id_user FROM tanda_tangan_digital WHERE id = ? LIMIT 1', [req.params.id])
    if (row[0]) {
      await q('UPDATE tanda_tangan_digital SET is_aktif = 0 WHERE id_user = ? AND id <> ?', [row[0].id_user, req.params.id])
    }
  }
  await q('UPDATE tanda_tangan_digital SET is_aktif = ? WHERE id = ?', [is_aktif ? 1 : 0, req.params.id])
  res.json({ ok: true })
})

router.delete('/:id', MANAGE, async (req, res) => {
  const rows = await q('SELECT file_ttd FROM tanda_tangan_digital WHERE id = ? LIMIT 1', [req.params.id])
  const raw = rows[0]?.file_ttd
  let fileObj = raw
  if (typeof raw === 'string') {
    try { fileObj = JSON.parse(raw) } catch { fileObj = null }
  }
  const p = fileObj?.path
  if (p) {
    let fileName = ''
    try {
      fileName = String(p).startsWith('http')
        ? decodeURIComponent(new URL(p).pathname.split('/uploads/').pop() || '')
        : path.basename(String(p))
    } catch { fileName = path.basename(String(p)) }
    const full = path.join(UPLOAD_DIR, fileName)
    if (fileName && !fileName.includes('..') && fs.existsSync(full)) fs.unlinkSync(full)
  }
  await q('DELETE FROM tanda_tangan_digital WHERE id = ?', [req.params.id])
  res.json({ ok: true })
})

export default router
