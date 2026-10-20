import { Router } from 'express'
import { q } from '../db.js'
import { authRequired, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(authRequired)

const ADMIN = requireRole('Admin', 'Super Admin')
const jenisTable = (tipe) => (tipe === 'masuk' ? 'jenis_surat_masuk' : 'jenis_surat_keluar')

router.get('/jenis-surat', async (req, res) => {
  const tipe = req.query.tipe
  if (tipe !== 'masuk' && tipe !== 'keluar') {
    return res.status(400).json({ error: 'tipe wajib: masuk|keluar' })
  }
  const withKode = req.query.kode === '1'
  const cols = withKode ? 'nama, kode' : 'nama'
  const rows = await q(`SELECT ${cols} FROM ${jenisTable(tipe)} ORDER BY created_at ASC`)
  res.json(rows)
})

router.post('/jenis-surat', ADMIN, async (req, res) => {
  const { nama, tipe } = req.body || {}
  if (!nama || !['masuk', 'keluar'].includes(tipe)) {
    return res.status(400).json({ error: 'nama dan tipe wajib' })
  }
  const table = jenisTable(tipe)
  const existing = await q(`SELECT kode FROM ${table}`)
  let max = 0
  for (const r of existing) {
    const n = parseInt(r.kode, 10)
    if (!isNaN(n) && n > max) max = n
  }
  const kode = String(max + 1).padStart(2, '0')
  const result = await q(`INSERT INTO ${table} (nama, kode) VALUES (?, ?)`, [nama, kode])
  res.status(201).json({ id: result.insertId, nama, kode })
})

router.patch('/jenis-surat', ADMIN, async (req, res) => {
  const { oldName, newName, tipe } = req.body || {}
  if (!oldName || !newName || !['masuk', 'keluar'].includes(tipe)) {
    return res.status(400).json({ error: 'oldName, newName, tipe wajib' })
  }
  await q(`UPDATE ${jenisTable(tipe)} SET nama = ? WHERE nama = ?`, [newName, oldName])
  res.json({ ok: true })
})

router.delete('/jenis-surat', ADMIN, async (req, res) => {
  const nama = req.body?.nama || req.query.nama
  const tipe = req.body?.tipe || req.query.tipe
  if (!nama || !['masuk', 'keluar'].includes(tipe)) {
    return res.status(400).json({ error: 'nama dan tipe wajib' })
  }
  await q(`DELETE FROM ${jenisTable(tipe)} WHERE nama = ?`, [nama])
  res.json({ ok: true })
})

router.get('/kategori', async (_req, res) => {
  const rows = await q('SELECT nama FROM kategori ORDER BY created_at ASC')
  res.json(rows)
})

router.post('/kategori', ADMIN, async (req, res) => {
  const { nama } = req.body || {}
  if (!nama) return res.status(400).json({ error: 'nama wajib' })
  if (!['biasa', 'penting'].includes(String(nama).toLowerCase())) {
    return res.status(400).json({ error: 'Kategori hanya boleh: biasa atau penting' })
  }
  const namaFinal = String(nama).toLowerCase()
  const existing = await q('SELECT id FROM kategori WHERE nama = ?', [namaFinal])
  if (existing[0]) return res.status(400).json({ error: 'Kategori sudah ada' })
  const result = await q('INSERT INTO kategori (nama) VALUES (?)', [namaFinal])
  res.status(201).json({ id: result.insertId, nama: namaFinal })
})

router.patch('/kategori', ADMIN, async (req, res) => {
  const { oldName, newName } = req.body || {}
  if (!oldName || !newName) return res.status(400).json({ error: 'oldName dan newName wajib' })
  await q('UPDATE kategori SET nama = ? WHERE nama = ?', [newName, oldName])
  res.json({ ok: true })
})

router.delete('/kategori', ADMIN, async (req, res) => {
  const nama = req.body?.nama || req.query.nama
  if (!nama) return res.status(400).json({ error: 'nama wajib' })
  await q('DELETE FROM kategori WHERE nama = ?', [nama])
  res.json({ ok: true })
})

router.get('/roles', async (_req, res) => {
  const rows = await q('SELECT id, nama_role, keterangan FROM roles ORDER BY created_at ASC')
  res.json(rows)
})

export default router
