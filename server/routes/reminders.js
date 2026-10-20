import { Router } from 'express'
import { q } from '../db.js'
import { authRequired } from '../middleware/auth.js'
import { mapRows, mapRow, dt } from '../utils/helpers.js'

const router = Router()
router.use(authRequired)

router.get('/', async (_req, res) => {
  const rows = await q(
    `SELECT r.*,
            JSON_OBJECT(
              'id', sm.id, 'nomor_surat', sm.nomor_surat, 'pengirim', sm.pengirim,
              'perihal', sm.perihal, 'status_tindak_lanjut', sm.status_tindak_lanjut,
              'tanggal_terima', sm.tanggal_terima, 'kategori', sm.kategori,
              'folder', sm.folder, 'isi_surat', sm.isi_surat, 'jenis_surat', sm.jenis_surat,
              'id_user', sm.id_user,
              'id_surat_keluar_ref', sk.id
            ) AS id_surat_masuk
     FROM reminders r
     JOIN surat_masuk sm ON sm.id = r.id_surat_masuk
     LEFT JOIN surat_keluar sk ON sk.id = sm.id_surat_keluar_ref
     ORDER BY r.tanggal_batas ASC`,
  )
  const data = mapRows(rows).map((r) => {
    const out = { ...r }
    out.id_surat_masuk = typeof r.id_surat_masuk === 'string' ? JSON.parse(r.id_surat_masuk) : r.id_surat_masuk
    if (out.id_surat_masuk && !out.id_surat_masuk.id_surat_keluar_ref) {
      out.id_surat_masuk.id_surat_keluar_ref = null
    }
    return out
  })
  res.json(data)
})

router.post('/', async (req, res) => {
  const { id_surat_masuk, tanggal_batas, keterangan } = req.body || {}
  if (!id_surat_masuk || !tanggal_batas) {
    return res.status(400).json({ error: 'id_surat_masuk dan tanggal_batas wajib' })
  }
  let status = 'menunggu'
  if (keterangan) {
    const lowerKet = String(keterangan).toLowerCase()
    if (lowerKet.includes('menunggu_dibuat')) status = 'menunggu_dibuat'
    else if (lowerKet.includes('menunggu_approval')) status = 'menunggu_approval'
    else status = 'menunggu'
  }
  const result = await q(
    `INSERT INTO reminders (id_surat_masuk, tanggal_batas, status, keterangan)
     VALUES (?, ?, ?, ?)`,
    [id_surat_masuk, dt(tanggal_batas), status, keterangan || null],
  )
  const rows = await q('SELECT * FROM reminders WHERE id = ?', [result.insertId])
  res.status(201).json(mapRow(rows[0]))
})

router.patch('/:id/status', async (req, res) => {
  const { status } = req.body || {}
  const allowed = ['menunggu', 'selesai', 'terlewat']
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Status tidak valid' })
  await q('UPDATE reminders SET status = ? WHERE id = ?', [status, req.params.id])
  const rows = await q('SELECT * FROM reminders WHERE id = ?', [req.params.id])
  if (!rows[0]) return res.status(404).json({ error: 'Reminder tidak ditemukan' })
  res.json(mapRow(rows[0]))
})

router.delete('/:id', async (req, res) => {
  await q('DELETE FROM reminders WHERE id = ?', [req.params.id])
  res.json({ ok: true })
})

export default router
