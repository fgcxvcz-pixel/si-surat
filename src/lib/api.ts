import { supabase } from './supabase'

// ── Surat Masuk ────────────────────────────────────────────────────────────
export async function fetchSuratMasuk() {
  const { data, error } = await supabase
    .from('surat_masuk')
    .select('*, id_user:pengguna(id, nama, username)')
    .order('tanggal_terima', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchSuratMasukById(id: string) {
  const { data, error } = await supabase
    .from('surat_masuk')
    .select('*, id_user:pengguna!id_user(id, nama, username), id_surat_keluar_ref:surat_keluar!id_surat_keluar_ref(id, nomor_surat)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createSuratMasuk(row: any) {
  const { data, error } = await supabase
    .from('surat_masuk')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSuratMasuk(id: string, updates: any) {
  const { data, error } = await supabase
    .from('surat_masuk')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSuratMasuk(id: string) {
  const { error } = await supabase
    .from('surat_masuk')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function updateSuratMasukStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('surat_masuk')
    .update({ status_tindak_lanjut: status })
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

// ── Surat Keluar ───────────────────────────────────────────────────────────
export async function fetchSuratKeluar() {
  const { data, error } = await supabase
    .from('surat_keluar')
    .select('*, id_user:pengguna!id_user(id, nama, username), approved_by:pengguna!approved_by(id, nama), id_ttd:tanda_tangan_digital!id_ttd(id, file_ttd, is_aktif, id_user:pengguna(id, nama)), id_surat_masuk_ref:surat_masuk!id_surat_masuk_ref(id, nomor_surat)')
    .order('tanggal_kirim', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchSuratKeluarById(id: string) {
  const { data, error } = await supabase
    .from('surat_keluar')
    .select('*, id_user:pengguna!id_user(id, nama, username), approved_by:pengguna!approved_by(id, nama), id_ttd:tanda_tangan_digital!id_ttd(id, file_ttd, is_aktif, id_user:pengguna(id, nama)), id_surat_masuk_ref:surat_masuk!id_surat_masuk_ref(id, nomor_surat)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createSuratKeluar(row: any) {
  const { data, error } = await supabase
    .from('surat_keluar')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSuratKeluar(id: string, updates: any) {
  const { data, error } = await supabase
    .from('surat_keluar')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSuratKeluar(id: string) {
  const { error } = await supabase
    .from('surat_keluar')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function approveSuratKeluar(id: string, approvedBy: string, catatan?: string) {
  const { data, error } = await supabase
    .from('surat_keluar')
    .update({
      status_approval: 'disetujui',
      approved_by: approvedBy,
      tanggal_approval: new Date().toISOString(),
      catatan_revisi: catatan || null,
    })
    .eq('id', id)
    .select()
  if (error) throw error
  return data
}

export async function generateNomorSuratKeluar(jenisSurat: string): Promise<string> {
  const BULAN_ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
  const now = new Date()
  const bulanRomawi = BULAN_ROMAWI[now.getMonth()]
  const tahun = now.getFullYear()

  let kodeJenis = "00"
  if (jenisSurat) {
    const { data: jenisData } = await supabase
      .from('jenis_surat_keluar').select('kode').eq('nama', jenisSurat).maybeSingle()
    if (jenisData?.kode) kodeJenis = jenisData.kode
  }

  // Try RPC first (requires generate_next_nomor_surat function deployed in Supabase)
  const { data: rpcData, error: rpcError } = await supabase.rpc('generate_next_nomor_surat', {
    p_jenis_kode: kodeJenis,
    p_tipe: 'keluar',
  })
  if (!rpcError && rpcData) return rpcData as string

  // Fallback: client-side generation (race-prone, use only when RPC unavailable)
  const nowDate = new Date()
  const { data } = await supabase
    .from('surat_keluar')
    .select('nomor_surat')
    .gte('tanggal_kirim', `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}-01`)
    .order('created_at', { ascending: false })

  const matching = (data || []).filter((r: any) => {
    const kode = r.nomor_surat?.split('.')?.[1]?.substring(0, 2)
    return kode === kodeJenis.padStart(2, '0')
  })

  let urutan = 1
  if (matching.length > 0 && matching[0].nomor_surat) {
    const urutanPart = matching[0].nomor_surat.split('.')[0]
    const lastNum = parseInt(urutanPart)
    if (!isNaN(lastNum)) urutan = lastNum + 1
  }

  return `${String(urutan).padStart(3, '0')}.${String(parseInt(kodeJenis)).padStart(2, '0')}/SSI-PCT/${bulanRomawi}/${tahun}`
}

// ── Custom Folders ─────────────────────────────────────────────────────────
const folderTable = (tipe: string) => tipe === 'masuk' ? 'custom_folder_surat_masuk' : 'custom_folder_surat_keluar'

export async function fetchCustomFolders(tipe: string) {
  const { data, error } = await supabase
    .from(folderTable(tipe))
    .select('id, nama_folder')
  if (error) throw error
  return (data || []).map((f: any) => f.nama_folder)
}

export async function createCustomFolder(tipe_surat: string, nama_folder: string) {
  const { data, error } = await supabase
    .from(folderTable(tipe_surat))
    .insert({ nama_folder })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCustomFolderByName(nama_folder: string, tipe_surat?: string) {
  if (tipe_surat) {
    const { error } = await supabase.from(folderTable(tipe_surat)).delete().eq('nama_folder', nama_folder)
    if (error) throw error
  } else {
    await Promise.all([
      supabase.from('custom_folder_surat_masuk').delete().eq('nama_folder', nama_folder),
      supabase.from('custom_folder_surat_keluar').delete().eq('nama_folder', nama_folder),
    ])
  }
}

export async function renameCustomFolder(oldName: string, newName: string, tipe_surat?: string) {
  if (tipe_surat) {
    const { error } = await supabase.from(folderTable(tipe_surat)).update({ nama_folder: newName }).eq('nama_folder', oldName)
    if (error) throw error
  } else {
    await Promise.all([
      supabase.from('custom_folder_surat_masuk').update({ nama_folder: newName }).eq('nama_folder', oldName),
      supabase.from('custom_folder_surat_keluar').update({ nama_folder: newName }).eq('nama_folder', oldName),
    ])
  }
}

// ── Reminders ──────────────────────────────────────────────────────────────
export async function fetchReminders() {
  const { data, error } = await supabase
    .from('reminders')
    .select('*, id_surat_masuk:surat_masuk!id_surat_masuk(*, id_surat_keluar_ref:surat_keluar!id_surat_keluar_ref(id, nomor_surat))')
    .order('tanggal_batas', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createReminder(id_surat_masuk: string, tanggal_batas: string, keterangan?: string) {
  const { data, error } = await supabase
    .from('reminders')
    .insert({ id_surat_masuk, tanggal_batas, status: 'menunggu', keterangan: keterangan || null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateReminderStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('reminders')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteReminder(id: string) {
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Tanda Tangan ───────────────────────────────────────────────────────────
export async function fetchTandaTangan() {
  const { data, error } = await supabase
    .from('tanda_tangan_digital')
    .select('*, id_user:pengguna(id, nama)')
    .eq('is_aktif', true)
  if (error) throw error
  return data || []
}

export async function fetchAllTandaTangan() {
  const { data, error } = await supabase
    .from('tanda_tangan_digital')
    .select('*, id_user:pengguna(id, nama)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createTandaTangan(userId: string, file: File) {
  const fileData = await uploadFile(file)

  const { data, error } = await supabase
    .from('tanda_tangan_digital')
    .insert({
      id_user: userId,
      file_ttd: fileData,
      is_aktif: true,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function setTandaTanganActive(id: string, is_aktif: boolean) {
  const { error } = await supabase
    .from('tanda_tangan_digital')
    .update({ is_aktif, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteTandaTangan(id: string) {
  const { error } = await supabase
    .from('tanda_tangan_digital')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── File Upload ────────────────────────────────────────────────────────────
const FILE_SERVER = `http://${window.location.hostname}:5000`

async function hashPassword(pw: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("")
}

export async function uploadFile(file: File): Promise<{ nama: string; path: string; ukuran: number; mime: string }> {
  const fd = new FormData()
  fd.append('file', file)

  const res = await fetch(`${FILE_SERVER}/api/upload`, { method: 'POST', body: fd })
  const json = await res.json()
  if (!res.ok || !json.success) throw new Error(json.error || 'Upload gagal')
  return json.file
}

export function getFileUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${FILE_SERVER}/uploads/${encodeURIComponent(path)}`
}

// ── Roles ──────────────────────────────────────────────────────────────────
export async function fetchRoles() {
  const { data, error } = await supabase.from('roles').select('id, nama_role, keterangan')
  if (error) throw error
  return data || []
}

const jenisSuratTable = (tipe: string) => tipe === 'masuk' ? 'jenis_surat_masuk' : 'jenis_surat_keluar'

// ── Master Data: Jenis Surat ───────────────────────────────────────────────
export async function fetchJenisSurat(tipe: 'masuk' | 'keluar'): Promise<string[]> {
  const { data, error } = await supabase
    .from(jenisSuratTable(tipe))
    .select('nama')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map((r: any) => r.nama)
}

export async function fetchJenisSuratWithKode(tipe: 'masuk' | 'keluar'): Promise<{ nama: string; kode: string }[]> {
  const { data, error } = await supabase
    .from(jenisSuratTable(tipe))
    .select('nama, kode')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map((r: any) => ({ nama: r.nama, kode: r.kode }))
}

export async function addJenisSurat(nama: string, tipe: 'masuk' | 'keluar') {
  const { data: existing } = await supabase
    .from(jenisSuratTable(tipe)).select('kode')
  const maxKode = (existing || []).reduce((max, r) => {
    const num = parseInt(r.kode)
    return !isNaN(num) && num > max ? num : max
  }, 0)
  const newKode = String(maxKode + 1).padStart(2, '0')

  const { data, error } = await supabase
    .from(jenisSuratTable(tipe))
    .insert({ nama, kode: newKode })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteJenisSurat(nama: string, tipe: 'masuk' | 'keluar') {
  const { error } = await supabase
    .from(jenisSuratTable(tipe))
    .delete()
    .eq('nama', nama)
  if (error) throw error
}

export async function renameJenisSurat(oldName: string, newName: string, tipe: 'masuk' | 'keluar') {
  const { error } = await supabase
    .from(jenisSuratTable(tipe))
    .update({ nama: newName })
    .eq('nama', oldName)
  if (error) throw error
}

// ── Master Data: Kategori ──────────────────────────────────────────────────
export async function fetchKategori(): Promise<string[]> {
  const { data, error } = await supabase
    .from('kategori')
    .select('nama')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map((r: any) => r.nama)
}

export async function addKategori(nama: string) {
  const { data, error } = await supabase
    .from('kategori')
    .insert({ nama })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteKategori(nama: string) {
  const { error } = await supabase
    .from('kategori')
    .delete()
    .eq('nama', nama)
  if (error) throw error
}

export async function renameKategori(oldName: string, newName: string) {
  const { error } = await supabase
    .from('kategori')
    .update({ nama: newName })
    .eq('nama', oldName)
  if (error) throw error
}

// ── User Management ─────────────────────────────────────────────────────────
export async function createUser({ nama, username, email, password, id_role }: {
  nama: string; username: string; email: string; password: string; id_role: string
}) {
  // Save current admin session
  const { data: { session: adminSession } } = await supabase.auth.getSession()

  // Create auth user via signUp
  const { data, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nama, username } },
  })

  // Restore admin session FIRST (before any throw)
  if (adminSession) {
    await supabase.auth.setSession(adminSession)
  }

  if (authError) throw authError
  if (!data.user) throw new Error("Gagal membuat user")

  // Insert profile into pengguna
  const hashedPw = await hashPassword(password)
  const { error: profileError } = await supabase
    .from("pengguna")
    .insert({ id: data.user.id, nama, username, email, password: hashedPw, id_role })
  if (profileError) {
    throw new Error(profileError.message)
  }

  return { user: { id: data.user.id, username, nama } }
}

export async function updateUserProfile(userId: string, updates: { nama?: string; username?: string; email?: string; id_role?: string }) {
  const { error } = await supabase
    .from("pengguna")
    .update(updates)
    .eq("id", userId)
  if (error) throw error
}

export async function adminUpdatePassword(userId: string, newPassword: string) {
  const { error } = await supabase.rpc('admin_set_password', {
    p_user_id: userId,
    p_new_password: newPassword,
  })
  if (error) throw error
  const hashedPw = await hashPassword(newPassword)
  await supabase.from("pengguna").update({ password: hashedPw }).eq("id", userId)
}

export async function sendOtpByEmail(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email })
  if (error) throw error
}

export async function verifyOtp(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" })
  if (error) throw error
}

export async function resetPassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export async function fetchUserByUsername(username: string) {
  const { data, error } = await supabase
    .from("pengguna")
    .select("id, username, email")
    .eq("username", username)
    .single()
  if (error) throw error
  return data
}
