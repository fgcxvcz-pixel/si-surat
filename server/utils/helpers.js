import { q } from '../db.js'

const BULAN_ROMAWI = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII']

export async function generateNomorSuratKeluar(jenisNama) {
  let kode = '01'
  if (jenisNama) {
    const rows = await q('SELECT kode FROM jenis_surat_keluar WHERE nama = ? LIMIT 1', [jenisNama])
    if (rows[0]?.kode) kode = String(rows[0].kode).padStart(2, '0')
  } else {
    kode = '01'
  }

  const now = new Date()
  const bulan = now.getMonth() + 1
  const tahun = now.getFullYear()
  const lockKey = `nomor:${kode.padStart(2, '0')}:keluar`

  await q('SELECT GET_LOCK(?, 10) AS l', [lockKey])
  try {
    const rows = await q(
      `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(nomor_surat, '.', 1) AS UNSIGNED)), 0) + 1 AS next_num
       FROM surat_keluar
       WHERE SUBSTRING_INDEX(SUBSTRING_INDEX(nomor_surat, '/', 1), '.', -1) = ?
         AND MONTH(tanggal_kirim) = ?
         AND YEAR(tanggal_kirim) = ?`,
      [String(parseInt(kode, 10) || 0).padStart(2, '0'), bulan, tahun],
    )
    const urutan = Number(rows[0]?.next_num || 1)
    const kodeOut = String(parseInt(kode, 10) || 0).padStart(2, '0')
    return `${String(urutan).padStart(3, '0')}.${kodeOut}/SSI-PCT/${BULAN_ROMAWI[bulan - 1]}/${tahun}`
  } finally {
    await q('SELECT RELEASE_LOCK(?)', [lockKey])
  }
}

export function mapRow(row) {
  if (!row) return row
  const out = { ...row }
  for (const k of ['file_lampiran', 'file_draft', 'file_final_ttd', 'file_ttd']) {
    if (out[k] != null && typeof out[k] === 'string') {
      try { out[k] = JSON.parse(out[k]) } catch { /* keep raw */ }
    }
  }
  for (const k of ['is_aktif']) {
    if (k in out) out[k] = out[k] ? true : false
  }
  return out
}

export function mapRows(rows) {
  return (rows || []).map(mapRow)
}

export function isAdminRole(role) {
  return role === 'Admin' || role === 'Super Admin'
}

export function canModifySurat(user, row) {
  if (!user || !row) return false
  if (isAdminRole(user.role)) return true
  return Number(row.id_user) === Number(user.sub)
}

export function canUpdateSuratStatus(user, row) {
  if (!user || !row) return false
  if (isAdminRole(user.role)) return true
  if (user.role === 'Kepala Bagian') return true
  return Number(row.id_user) === Number(user.sub)
}

export function dt(v) {
  if (v == null || v === '') {
    throw new Error('Tanggal wajib diisi dengan format valid')
  }
  const s = String(v).trim()
  // date-only YYYY-MM-DD → jam 00:00:00 server-local (tanpa geser hari via UTC)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s} 00:00:00`
  // datetime MySQL/ISO yang sudah valid
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(s)) {
    return s.replace('T', ' ').slice(0, 19)
  }
  const d = new Date(s)
  if (isNaN(d.getTime())) {
    throw new Error('Tanggal tidak valid')
  }
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
