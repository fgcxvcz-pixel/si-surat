import { Router } from 'express'
import { q } from '../db.js'
import { authRequired, requireRole } from '../middleware/auth.js'
import { mapRows, mapRow, generateNomorSuratKeluar, dt, canModifySurat } from '../utils/helpers.js'
import { logAudit, getClientIp, diffValues } from '../utils/auditLogger.js'
import { deleteAttachmentFiles, parseFileData } from '../utils/fileHelper.js'

const router = Router()
router.use(authRequired)

const SELECT_SK = `
  SELECT sk.*,
    JSON_OBJECT('id', u.id, 'nama', u.nama, 'username', u.username) AS id_user,
    JSON_OBJECT('id', a.id, 'nama', a.nama) AS approved_by,
    JSON_OBJECT('id', t.id, 'file_ttd', t.file_ttd, 'is_aktif', t.is_aktif,
      'id_user', JSON_OBJECT('id', tu.id, 'nama', tu.nama)) AS id_ttd,
    JSON_OBJECT('id', sm.id, 'nomor_surat', sm.nomor_surat) AS id_surat_masuk_ref
  FROM surat_keluar sk
  LEFT JOIN pengguna u ON u.id = sk.id_user
  LEFT JOIN pengguna a ON a.id = sk.approved_by
  LEFT JOIN tanda_tangan_digital t ON t.id = sk.id_ttd
  LEFT JOIN pengguna tu ON tu.id = t.id_user
  LEFT JOIN surat_masuk sm ON sm.id = sk.id_surat_masuk_ref
`

function hydrate(r) {
  const out = mapRow(r)
  for (const k of ['id_user', 'approved_by', 'id_ttd', 'id_surat_masuk_ref']) {
    if (out[k] != null && typeof out[k] === 'string') {
      try { out[k] = JSON.parse(out[k]) } catch { /* noop */ }
    }
    if (k === 'id_ttd' && out.id_ttd && out.id_ttd.id_user && typeof out.id_ttd.id_user === 'string') {
      try { out.id_ttd.id_user = JSON.parse(out.id_ttd.id_user) } catch { /* noop */ }
    }
  }
  if (!out.approved_by || !out.approved_by.id) out.approved_by = null
  if (!out.id_ttd || !out.id_ttd.id) out.id_ttd = null
  if (!out.id_surat_masuk_ref || !out.id_surat_masuk_ref.id) out.id_surat_masuk_ref = null
  return out
}

router.get('/nomor', async (req, res) => {
  const nomor = await generateNomorSuratKeluar(req.query.jenis || '')
  res.json({ nomor })
})

router.get('/', async (_req, res) => {
  const rows = await q(`${SELECT_SK} ORDER BY sk.tanggal_kirim DESC, sk.created_at DESC`)
  res.json(mapRows(rows).map(hydrate))
})

router.delete('/batch', async (req, res) => {
  const { ids } = req.body || {}

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids harus berupa array yang tidak kosong' })
  }
  if (ids.length > 100) {
    return res.status(400).json({ error: 'Maksimal 100 surat per batch delete' })
  }

  if (!ids.every(id => typeof id === 'number' && id > 0)) {
    return res.status(400).json({ error: 'Semua ids harus berupa angka positif' })
  }

  try {
    await q('START TRANSACTION')

    const deletedCount = { success: 0, failed: 0 }
    const failedIds = []

    for (const id of ids) {
      try {
        const existing = await q('SELECT id, id_user FROM surat_keluar WHERE id = ? LIMIT 1', [id])
        if (!existing[0]) {
          failedIds.push({ id, reason: 'Surat tidak ditemukan' })
          continue
        }

        if (!canModifySurat(req.user, existing[0])) {
          failedIds.push({ id, reason: 'Akses ditolak' })
          continue
        }

        const suratData = await q('SELECT nomor_surat, tujuan, perihal, file_draft, file_final_ttd FROM surat_keluar WHERE id = ? LIMIT 1', [id])
        const surat = suratData[0]

        if (surat?.file_draft) {
          const fileData = parseFileData(surat.file_draft)
          deleteAttachmentFiles(fileData)
        }
        if (surat?.file_final_ttd) {
          const fileData = parseFileData(surat.file_final_ttd)
          deleteAttachmentFiles(fileData)
        }

        await q('DELETE FROM surat_keluar WHERE id = ?', [id])

        await logAudit(
          req.user.sub,
          'DELETE',
          'surat_keluar',
          id,
          null,
          null,
          getClientIp(req),
          `Surat keluar dihapus (batch): Tujuan: ${surat?.tujuan || ''} | Perihal: ${surat?.perihal || ''} | Nomor Surat: ${surat?.nomor_surat || ''}`
        )

        deletedCount.success++
      } catch (err) {
        failedIds.push({ id, reason: err.message })
      }
    }

    if (failedIds.length > 0) {
      await q('ROLLBACK')
      return res.status(400).json({
        error: `${failedIds.length} dari ${ids.length} surat gagal dihapus`,
        failed: failedIds,
        deleted: 0
      })
    }

    await q('COMMIT')

    res.json({
      ok: true,
      deleted: deletedCount.success,
      message: `${deletedCount.success} surat berhasil dihapus`
    })
  } catch (err) {
    await q('ROLLBACK')
    res.status(500).json({
      error: 'Gagal menghapus surat',
      details: err.message
    })
  }
})

router.get('/:id', async (req, res) => {
  const rows = await q(`${SELECT_SK} WHERE sk.id = ? LIMIT 1`, [req.params.id])
  if (!rows[0]) return res.status(404).json({ error: 'Surat tidak ditemukan' })
  res.json(hydrate(rows[0]))
})

router.post('/', async (req, res) => {
  const b = req.body || {}
  if (!b.tujuan || !b.perihal || !b.tanggal_kirim) {
    return res.status(400).json({ error: 'Field wajib tidak lengkap' })
  }
  // Nomor selalu digenerate server-side di bawah lock (hindari race)
  const nomor = await generateNomorSuratKeluar(b.jenis_surat || '')
  const result = await q(
    `INSERT INTO surat_keluar
      (id_user, id_ttd, id_surat_masuk_ref, nomor_surat, tujuan, folder, perihal, jenis_surat, isi_surat, kategori, tanggal_kirim, status_approval, file_draft, file_final_ttd)
     VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'menunggu', ?, NULL)`,
    [
      req.user.sub,
      b.id_surat_masuk_ref || null,
      nomor,
      b.tujuan,
      b.folder || null,
      b.perihal,
      b.jenis_surat || 'surat tugas',
      b.isi_surat || '',
      b.kategori || 'biasa',
      b.tanggal_kirim ? dt(b.tanggal_kirim) : b.tanggal_kirim,
      b.file_draft ? JSON.stringify(b.file_draft) : null,
    ],
  )
  // Update surat_masuk status to menunggu_approval when surat_keluar created with reference
  if (b.id_surat_masuk_ref) {
    await q('UPDATE surat_masuk SET status_tindak_lanjut = ? WHERE id = ?', ['menunggu_approval', b.id_surat_masuk_ref])
  }
  
   const rows = await q(`${SELECT_SK} WHERE sk.id = ? LIMIT 1`, [result.insertId])
   const createdSurat = hydrate(rows[0])

   // Log CREATE action
   await logAudit(
     req.user.sub,
     'CREATE',
     'surat_keluar',
     result.insertId,
     null,
     {
       nomor_surat: nomor,
       tujuan: b.tujuan,
       perihal: b.perihal,
       jenis_surat: b.jenis_surat,
       kategori: b.kategori,
       tanggal_kirim: b.tanggal_kirim,
     },
     getClientIp(req),
      `Surat keluar dibuat: Tujuan: ${b.tujuan} | Perihal: ${b.perihal} | Nomor Surat ${nomor}`
   )

  res.status(201).json(createdSurat)
})

router.patch('/:id', async (req, res) => {
  const existing = await q('SELECT id, id_user FROM surat_keluar WHERE id = ? LIMIT 1', [req.params.id])
  if (!existing[0]) return res.status(404).json({ error: 'Surat tidak ditemukan' })
  if (!canModifySurat(req.user, existing[0])) {
    return res.status(403).json({ error: 'Hanya pemilik atau admin yang bisa mengubah surat ini' })
  }

  const oldData = await q('SELECT * FROM surat_keluar WHERE id = ? LIMIT 1', [req.params.id])
  const oldValues = oldData[0] ? mapRow(oldData[0]) : null

  const b = req.body || {}
  const fields = []
  const params = []
  const allow = [
    'nomor_surat', 'tujuan', 'folder', 'perihal', 'jenis_surat', 'isi_surat',
    'kategori', 'tanggal_kirim', 'id_surat_masuk_ref', 'id_ttd', 'approved_by',
    'tanggal_approval', 'catatan_revisi', 'status_approval',
  ]
  for (const k of allow) {
    if (b[k] !== undefined) {
      const val = ['tanggal_kirim', 'tanggal_approval'].includes(k) ? dt(b[k]) : b[k] === null ? null : b[k]
      fields.push(`${k} = ?`)
      params.push(val)
    }
  }
  if (b.file_draft !== undefined) {
    fields.push('file_draft = ?')
    params.push(b.file_draft ? JSON.stringify(b.file_draft) : null)
  }
  if (b.file_final_ttd !== undefined) {
    fields.push('file_final_ttd = ?')
    params.push(b.file_final_ttd ? JSON.stringify(b.file_final_ttd) : null)
  }
  if (!fields.length) return res.status(400).json({ error: 'Tidak ada perubahan' })
  params.push(req.params.id)
  await q(`UPDATE surat_keluar SET ${fields.join(', ')} WHERE id = ?`, params)

   const newDataRows = await q('SELECT * FROM surat_keluar WHERE id = ? LIMIT 1', [req.params.id])
   const newValues = newDataRows[0] ? mapRow(newDataRows[0]) : null

   const changes = diffValues(oldValues, newValues, allow.concat(['file_draft', 'file_final_ttd']))
   if (changes) {
     const tujuan = newValues.tujuan || ''
     const perihal = newValues.perihal || ''
     const nomor_surat = newValues.nomor_surat || ''
     await logAudit(
       req.user.sub,
       'UPDATE',
       'surat_keluar',
       parseInt(req.params.id),
       changes,
       null,
       getClientIp(req),
        `Surat keluar diperbarui: Tujuan: ${tujuan} | Perihal: ${perihal} | Nomor Surat: ${nomor_surat}`
     )
   }

  const rows = await q(`${SELECT_SK} WHERE sk.id = ? LIMIT 1`, [req.params.id])
  if (!rows[0]) return res.status(404).json({ error: 'Surat tidak ditemukan' })
  res.json(hydrate(rows[0]))
})

router.delete('/:id', async (req, res) => {
  const existing = await q('SELECT id, id_user FROM surat_keluar WHERE id = ? LIMIT 1', [req.params.id])
  if (!existing[0]) return res.status(404).json({ error: 'Surat tidak ditemukan' })
  if (!canModifySurat(req.user, existing[0])) {
    return res.status(403).json({ error: 'Hanya pemilik atau admin yang bisa menghapus surat ini' })
  }

   const deletedData = await q('SELECT nomor_surat, tujuan, perihal, file_draft, file_final_ttd FROM surat_keluar WHERE id = ? LIMIT 1', [req.params.id])
   const nomor = deletedData[0]?.nomor_surat || 'unknown'
   const tujuan = deletedData[0]?.tujuan || ''
   const perihal = deletedData[0]?.perihal || ''

   // Delete attachment files before database deletion
   if (deletedData[0]?.file_draft) {
     const fileData = parseFileData(deletedData[0].file_draft)
     deleteAttachmentFiles(fileData)
   }
   if (deletedData[0]?.file_final_ttd) {
     const fileData = parseFileData(deletedData[0].file_final_ttd)
     deleteAttachmentFiles(fileData)
   }

   await q('DELETE FROM surat_keluar WHERE id = ?', [req.params.id])

   // Log DELETE action
   await logAudit(
     req.user.sub,
     'DELETE',
     'surat_keluar',
     parseInt(req.params.id),
     null,
     null,
     getClientIp(req),
     `Surat keluar dihapus: Tujuan: ${tujuan} | Perihal: ${perihal} | Nomor Surat: ${nomor}`
   )

  res.json({ ok: true })
})

router.post('/:id/approve', requireRole('Kepala Bagian', 'Super Admin'), async (req, res) => {
   const rows = await q('SELECT id, status_approval, id_surat_masuk_ref, nomor_surat FROM surat_keluar WHERE id = ? LIMIT 1', [req.params.id])
   const sk = rows[0]
   if (!sk) return res.status(404).json({ error: 'Surat tidak ditemukan' })
   if (sk.status_approval !== 'menunggu') {
     return res.status(400).json({ error: 'Hanya surat berstatus menunggu yang bisa disetujui' })
   }
   const { catatan } = req.body || {}
   const nowStr = dt(new Date())

   if (sk.id_surat_masuk_ref) {
     await q('UPDATE surat_masuk SET status_tindak_lanjut = ? WHERE id = ?', ['selesai', sk.id_surat_masuk_ref])
     await q(
       `UPDATE reminders SET status = 'selesai'
        WHERE id_surat_masuk = ? AND status <> 'selesai'`,
       [sk.id_surat_masuk_ref],
     )
   }

   await q(
     `UPDATE surat_keluar
      SET status_approval = 'disetujui', approved_by = ?, tanggal_approval = ?, catatan_revisi = ?
      WHERE id = ?`,
     [req.user.sub, nowStr, catatan || null, req.params.id],
   )

   // TTD harus milik approver sendiri (bukan TTD aktif global user lain)
   const ttdRows = await q(
     `SELECT id, file_ttd FROM tanda_tangan_digital
      WHERE is_aktif = 1 AND id_user = ? ORDER BY created_at DESC LIMIT 1`,
     [req.user.sub],
   )
   if (ttdRows[0]) {
     await q('UPDATE surat_keluar SET id_ttd = ? WHERE id = ?', [ttdRows[0].id, req.params.id])
   }

    // Log APPROVE action
    await logAudit(
      req.user.sub,
      'APPROVE',
      'surat_keluar',
      parseInt(req.params.id),
      { status_approval: 'menunggu' },
      { status_approval: 'disetujui', approved_by: req.user.sub, catatan_revisi: catatan || null },
      getClientIp(req),
       `Surat keluar disetujui: Tujuan: ${sk.tujuan} | Perihal: ${sk.perihal} | Nomor Surat: ${sk.nomor_surat}`
    )

   const finalRows = await q(`${SELECT_SK} WHERE sk.id = ? LIMIT 1`, [req.params.id])
   res.json(hydrate(finalRows[0]))
 })

export default router
