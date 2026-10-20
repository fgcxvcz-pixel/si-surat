import { Router } from 'express'
import { q } from '../db.js'
import { authRequired } from '../middleware/auth.js'
import { mapRows, mapRow, dt, canModifySurat, canUpdateSuratStatus } from '../utils/helpers.js'
import { logAudit, getClientIp, diffValues } from '../utils/auditLogger.js'
import { deleteAttachmentFiles, parseFileData } from '../utils/fileHelper.js'

const router = Router()
router.use(authRequired)

router.get('/', async (_req, res) => {
  const rows = await q(
    `SELECT sm.*,
            JSON_OBJECT('id', u.id, 'nama', u.nama, 'username', u.username) AS id_user,
            sk.id AS ref_keluar_id, sk.nomor_surat AS ref_keluar_nomor
     FROM surat_masuk sm
     LEFT JOIN pengguna u ON u.id = sm.id_user
     LEFT JOIN surat_keluar sk ON sk.id = sm.id_surat_keluar_ref
     ORDER BY sm.tanggal_terima DESC, sm.created_at DESC`,
  )
  const data = mapRows(rows).map((r) => {
    const out = { ...r }
    out.id_user = typeof r.id_user === 'string' ? JSON.parse(r.id_user) : r.id_user
    if (r.ref_keluar_id) {
      out.id_surat_keluar_ref = { id: r.ref_keluar_id, nomor_surat: r.ref_keluar_nomor }
    } else {
      out.id_surat_keluar_ref = null
    }
    delete out.ref_keluar_id
    delete out.ref_keluar_nomor
    return out
  })
  res.json(data)
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
        const existing = await q('SELECT id, id_user FROM surat_masuk WHERE id = ? LIMIT 1', [id])
        if (!existing[0]) {
          failedIds.push({ id, reason: 'Surat tidak ditemukan' })
          continue
        }

        if (!canModifySurat(req.user, existing[0])) {
          failedIds.push({ id, reason: 'Akses ditolak' })
          continue
        }

        const suratData = await q('SELECT nomor_surat, pengirim, perihal, file_lampiran FROM surat_masuk WHERE id = ? LIMIT 1', [id])
        const surat = suratData[0]

        if (surat?.file_lampiran) {
          const fileData = parseFileData(surat.file_lampiran)
          deleteAttachmentFiles(fileData)
        }

        await q('DELETE FROM surat_masuk WHERE id = ?', [id])

        await logAudit(
          req.user.sub,
          'DELETE',
          'surat_masuk',
          id,
          null,
          null,
          getClientIp(req),
          `Surat masuk dihapus (batch): Pengirim: ${surat?.pengirim || ''} | Perihal: ${surat?.perihal || ''} | Nomor Surat: ${surat?.nomor_surat || ''}`
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
  const rows = await q(
    `SELECT sm.*,
            JSON_OBJECT('id', u.id, 'nama', u.nama, 'username', u.username) AS id_user,
            sk.id AS ref_keluar_id, sk.nomor_surat AS ref_keluar_nomor
     FROM surat_masuk sm
     LEFT JOIN pengguna u ON u.id = sm.id_user
     LEFT JOIN surat_keluar sk ON sk.id = sm.id_surat_keluar_ref
     WHERE sm.id = ? LIMIT 1`,
    [req.params.id],
  )
  if (!rows[0]) return res.status(404).json({ error: 'Surat tidak ditemukan' })
  const r = mapRow(rows[0])
  r.id_user = typeof r.id_user === 'string' ? JSON.parse(r.id_user) : r.id_user
  r.id_surat_keluar_ref = r.ref_keluar_id ? { id: r.ref_keluar_id, nomor_surat: r.ref_keluar_nomor } : null
  delete r.ref_keluar_id
  delete r.ref_keluar_nomor
  res.json(r)
})

router.post('/', async (req, res) => {
  const b = req.body || {}
  if (!b.nomor_surat || !b.pengirim || !b.perihal || !b.tanggal_terima) {
    return res.status(400).json({ error: 'Field wajib tidak lengkap' })
  }
  const result = await q(
    `INSERT INTO surat_masuk
      (id_user, id_surat_keluar_ref, nomor_surat, pengirim, folder, perihal, isi_surat, kategori, jenis_surat, tanggal_terima, status_tindak_lanjut, file_lampiran)
     VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.sub,
      b.nomor_surat,
      b.pengirim,
      b.folder || null,
      b.perihal,
      b.isi_surat || '',
      b.kategori || 'biasa',
      b.jenis_surat || '',
      b.tanggal_terima ? dt(b.tanggal_terima) : b.tanggal_terima,
      b.status_tindak_lanjut || 'tidak',
      b.file_lampiran ? JSON.stringify(b.file_lampiran) : null,
    ],
  )
   const rows = await q('SELECT * FROM surat_masuk WHERE id = ?', [result.insertId])
   const createdSurat = mapRow(rows[0])

   // Log CREATE action
   await logAudit(
     req.user.sub,
     'CREATE',
     'surat_masuk',
     result.insertId,
     null,
     {
       nomor_surat: b.nomor_surat,
       pengirim: b.pengirim,
       perihal: b.perihal,
       jenis_surat: b.jenis_surat,
       kategori: b.kategori,
       tanggal_terima: b.tanggal_terima,
     },
     getClientIp(req),
      `Surat masuk dibuat: Pengirim: ${b.pengirim} | Perihal: ${b.perihal} | Nomor Surat: ${b.nomor_surat}`
   )

  res.status(201).json(createdSurat)
})

router.patch('/:id', async (req, res) => {
  const existing = await q('SELECT id, id_user FROM surat_masuk WHERE id = ? LIMIT 1', [req.params.id])
  if (!existing[0]) return res.status(404).json({ error: 'Surat tidak ditemukan' })
  if (!canModifySurat(req.user, existing[0])) {
    return res.status(403).json({ error: 'Hanya pemilik atau admin yang bisa mengubah surat ini' })
  }

  const oldData = await q('SELECT * FROM surat_masuk WHERE id = ? LIMIT 1', [req.params.id])
  const oldValues = oldData[0] ? mapRow(oldData[0]) : null

  const b = req.body || {}
  const fields = []
  const params = []
  const allow = [
    'nomor_surat', 'pengirim', 'folder', 'perihal', 'isi_surat', 'kategori',
    'jenis_surat', 'tanggal_terima', 'status_tindak_lanjut', 'id_surat_keluar_ref',
  ]
  for (const k of allow) {
    if (b[k] !== undefined) {
      fields.push(`${k} = ?`)
      params.push(k === 'tanggal_terima' ? dt(b[k]) : b[k] === null ? null : b[k])
    }
  }
  if (b.file_lampiran !== undefined) {
    fields.push('file_lampiran = ?')
    params.push(b.file_lampiran ? JSON.stringify(b.file_lampiran) : null)
  }
  if (!fields.length) return res.status(400).json({ error: 'Tidak ada perubahan' })
  params.push(req.params.id)
  await q(`UPDATE surat_masuk SET ${fields.join(', ')} WHERE id = ?`, params)

   const newDataRows = await q('SELECT * FROM surat_masuk WHERE id = ? LIMIT 1', [req.params.id])
   const newValues = newDataRows[0] ? mapRow(newDataRows[0]) : null

   const changes = diffValues(oldValues, newValues, allow.concat(['file_lampiran']))
   if (changes) {
     const pengirim = newValues.pengirim || ''
     const perihal = newValues.perihal || ''
     const nomor_surat = newValues.nomor_surat || ''
     await logAudit(
       req.user.sub,
       'UPDATE',
       'surat_masuk',
       parseInt(req.params.id),
       changes,
       null,
       getClientIp(req),
        `Surat masuk diperbarui: Pengirim: ${pengirim} | Perihal: ${perihal} | Nomor Surat: ${nomor_surat}`
     )
   }

  const rows = await q('SELECT * FROM surat_masuk WHERE id = ? LIMIT 1', [req.params.id])
  if (!rows[0]) return res.status(404).json({ error: 'Surat tidak ditemukan' })
  res.json(mapRow(rows[0]))
})

router.delete('/:id', async (req, res) => {
  const existing = await q('SELECT id, id_user FROM surat_masuk WHERE id = ? LIMIT 1', [req.params.id])
  if (!existing[0]) return res.status(404).json({ error: 'Surat tidak ditemukan' })
  if (!canModifySurat(req.user, existing[0])) {
    return res.status(403).json({ error: 'Hanya pemilik atau admin yang bisa menghapus surat ini' })
  }

   const deletedData = await q('SELECT nomor_surat, pengirim, perihal, file_lampiran FROM surat_masuk WHERE id = ? LIMIT 1', [req.params.id])
   const nomor = deletedData[0]?.nomor_surat || 'unknown'
   const pengirim = deletedData[0]?.pengirim || ''
   const perihal = deletedData[0]?.perihal || ''

   // Delete attachment files before database deletion
   if (deletedData[0]?.file_lampiran) {
     const fileData = parseFileData(deletedData[0].file_lampiran)
     deleteAttachmentFiles(fileData)
   }

   await q('DELETE FROM surat_masuk WHERE id = ?', [req.params.id])

   // Log DELETE action
   await logAudit(
     req.user.sub,
     'DELETE',
     'surat_masuk',
     parseInt(req.params.id),
     null,
     null,
     getClientIp(req),
     `Surat masuk dihapus: Pengirim: ${pengirim} | Perihal: ${perihal} | Nomor Surat: ${nomor}`
   )

  res.json({ ok: true })
})

router.patch('/:id/status', async (req, res) => {
   const existing = await q('SELECT id, id_user, status_tindak_lanjut FROM surat_masuk WHERE id = ? LIMIT 1', [req.params.id])
   if (!existing[0]) return res.status(404).json({ error: 'Surat tidak ditemukan' })
   if (!canUpdateSuratStatus(req.user, existing[0])) {
     return res.status(403).json({ error: 'Tidak berhak mengubah status surat ini' })
   }
   const { status } = req.body || {}
   const allowed = ['tidak', 'menunggu', 'menunggu_approval', 'selesai']
   if (!allowed.includes(status)) return res.status(400).json({ error: 'Status tidak valid' })

   const oldStatus = existing[0].status_tindak_lanjut

   await q('UPDATE surat_masuk SET status_tindak_lanjut = ? WHERE id = ?', [status, req.params.id])

   // Log UPDATE action untuk status change
   await logAudit(
     req.user.sub,
     'UPDATE',
     'surat_masuk',
     parseInt(req.params.id),
     { status_tindak_lanjut: { before: oldStatus, after: status } },
     null,
     getClientIp(req),
     `Status surat masuk diubah: ${oldStatus} → ${status}`
   )

   const rows = await q('SELECT * FROM surat_masuk WHERE id = ?', [req.params.id])
   if (!rows[0]) return res.status(404).json({ error: 'Surat tidak ditemukan' })
   res.json(mapRow(rows[0]))
 })

export default router
