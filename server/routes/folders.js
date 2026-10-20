import { Router } from 'express'
import { q } from '../db.js'
import { authRequired, requireRole } from '../middleware/auth.js'
import { mapRows } from '../utils/helpers.js'

const router = Router()
router.use(authRequired)

const ADMIN = requireRole('Admin', 'Super Admin')

const folderTable = (tipe) => (tipe === 'masuk' ? 'custom_folder_surat_masuk' : 'custom_folder_surat_keluar')

router.get('/', async (req, res) => {
  const tipe = req.query.tipe
  if (tipe === 'masuk' || tipe === 'keluar') {
    const rows = await q(`SELECT id, nama_folder FROM ${folderTable(tipe)} ORDER BY created_at ASC`)
    return res.json(mapRows(rows))
  }
  const [m, k] = await Promise.all([
    q('SELECT id, nama_folder FROM custom_folder_surat_masuk ORDER BY created_at ASC'),
    q('SELECT id, nama_folder FROM custom_folder_surat_keluar ORDER BY created_at ASC'),
  ])
  res.json({ masuk: mapRows(m), keluar: mapRows(k) })
})

router.post('/', ADMIN, async (req, res) => {
  const { tipe_surat, nama_folder } = req.body || {}
  if (!nama_folder || !['masuk', 'keluar'].includes(tipe_surat)) {
    return res.status(400).json({ error: 'nama_folder dan tipe_surat wajib' })
  }
  const table = folderTable(tipe_surat)
  const existing = await q(`SELECT id FROM ${table} WHERE nama_folder = ?`, [nama_folder])
  if (existing[0]) return res.status(400).json({ error: 'Nama folder sudah ada' })
  const result = await q(`INSERT INTO ${table} (nama_folder) VALUES (?)`, [nama_folder])
  res.status(201).json({ id: result.insertId, nama_folder })
})

router.patch('/rename', ADMIN, async (req, res) => {
  const { oldName, newName, tipe_surat } = req.body || {}
  if (!oldName || !newName) return res.status(400).json({ error: 'oldName dan newName wajib' })
  const tables = tipe_surat === 'masuk' || tipe_surat === 'keluar'
    ? [folderTable(tipe_surat)]
    : ['custom_folder_surat_masuk', 'custom_folder_surat_keluar']
  for (const t of tables) {
    await q(`UPDATE ${t} SET nama_folder = ? WHERE nama_folder = ?`, [newName, oldName])
  }
  res.json({ ok: true })
})

router.delete('/by-name', ADMIN, async (req, res) => {
  const nama = req.body?.nama_folder || req.query.nama_folder
  const tipe = req.body?.tipe_surat || req.query.tipe_surat
  if (!nama) return res.status(400).json({ error: 'nama_folder wajib' })
  const tables = tipe === 'masuk' || tipe === 'keluar'
    ? [folderTable(tipe)]
    : ['custom_folder_surat_masuk', 'custom_folder_surat_keluar']
  for (const t of tables) {
    await q(`DELETE FROM ${t} WHERE nama_folder = ?`, [nama])
  }
  res.json({ ok: true })
})

router.delete('/:id', ADMIN, async (req, res) => {
  await q('DELETE FROM custom_folder_surat_masuk WHERE id = ?', [req.params.id])
  await q('DELETE FROM custom_folder_surat_keluar WHERE id = ?', [req.params.id])
  res.json({ ok: true })
})

export default router
