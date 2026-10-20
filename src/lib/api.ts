import { http, resolveFileUrl } from './http'

// ── Surat Masuk ────────────────────────────────────────────────────────────
export async function fetchSuratMasuk() {
  return http<any[]>('/surat-masuk')
}

export async function fetchSuratMasukById(id: string) {
  return http<any>(`/surat-masuk/${id}`)
}

export async function createSuratMasuk(row: any) {
  return http<any>('/surat-masuk', { method: 'POST', body: JSON.stringify(row) })
}

export async function updateSuratMasuk(id: string, updates: any) {
  return http<any>(`/surat-masuk/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
}

export async function deleteSuratMasuk(id: string) {
  return http(`/surat-masuk/${id}`, { method: 'DELETE' })
}

export async function updateSuratMasukStatus(id: string, status: string) {
  return http<any>(`/surat-masuk/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

// ── Surat Keluar ───────────────────────────────────────────────────────────
export async function fetchSuratKeluar() {
  return http<any[]>('/surat-keluar')
}

export async function fetchSuratKeluarById(id: string) {
  return http<any>(`/surat-keluar/${id}`)
}

export async function createSuratKeluar(row: any) {
  return http<any>('/surat-keluar', { method: 'POST', body: JSON.stringify(row) })
}

export async function updateSuratKeluar(id: string, updates: any) {
  return http<any>(`/surat-keluar/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
}

export async function deleteSuratKeluar(id: string) {
  return http(`/surat-keluar/${id}`, { method: 'DELETE' })
}

export async function approveSuratKeluar(id: string, approvedBy: string, catatan?: string) {
  return http<any>(`/surat-keluar/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ approvedBy, catatan }),
  })
}

export async function generateNomorSuratKeluar(jenisSurat: string): Promise<string> {
  const qs = jenisSurat ? `?jenis=${encodeURIComponent(jenisSurat)}` : ''
  const data = await http<{ nomor: string }>(`/surat-keluar/nomor${qs}`)
  return data.nomor
}

// ── Custom Folders ─────────────────────────────────────────────────────────
export async function fetchCustomFolders(tipe: string) {
  const data = await http<any[]>(`/folders?tipe=${tipe}`)
  return (data || []).map((f: any) => f.nama_folder)
}

export async function createCustomFolder(tipe_surat: string, nama_folder: string) {
  return http('/folders', { method: 'POST', body: JSON.stringify({ tipe_surat, nama_folder }) })
}

export async function deleteCustomFolderByName(nama_folder: string, tipe_surat?: string) {
  return http('/folders/by-name', {
    method: 'DELETE',
    body: JSON.stringify({ nama_folder, tipe_surat: tipe_surat || null }),
  })
}

export async function renameCustomFolder(oldName: string, newName: string, tipe_surat?: string) {
  return http('/folders/rename', {
    method: 'PATCH',
    body: JSON.stringify({ oldName, newName, tipe_surat: tipe_surat || null }),
  })
}

// ── Reminders ──────────────────────────────────────────────────────────────
export async function fetchReminders() {
  return http<any[]>('/reminders')
}

export async function createReminder(id_surat_masuk: string, tanggal_batas: string, keterangan?: string) {
  return http('/reminders', {
    method: 'POST',
    body: JSON.stringify({ id_surat_masuk, tanggal_batas, keterangan }),
  })
}

export async function updateReminderStatus(id: string, status: string) {
  return http(`/reminders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

export async function deleteReminder(id: string) {
  return http(`/reminders/${id}`, { method: 'DELETE' })
}

// ── Tanda Tangan ───────────────────────────────────────────────────────────
export async function fetchTandaTangan() {
  return http<any[]>('/ttd')
}

export async function fetchAllTandaTangan() {
  return http<any[]>('/ttd/all')
}

export async function createTandaTangan(userId: string, file: File) {
  const fileData = await uploadFile(file, 'ttd')
  return http('/ttd', {
    method: 'POST',
    body: JSON.stringify({ id_user: userId, file_ttd: fileData }),
  })
}

export async function setTandaTanganActive(id: string, is_aktif: boolean) {
  return http(`/ttd/${id}/active`, { method: 'PATCH', body: JSON.stringify({ is_aktif }) })
}

export async function deleteTandaTangan(id: string) {
  return http(`/ttd/${id}`, { method: 'DELETE' })
}

// ── File Upload ────────────────────────────────────────────────────────────
export async function uploadFile(file: File, _folder: string = 'uploads'): Promise<{ nama: string; path: string; ukuran: number; mime: string }> {
  const fd = new FormData()
  fd.append('file', file)
  return http('/upload', { method: 'POST', body: fd })
}

export function getFileUrl(path: string): string {
  return resolveFileUrl(path)
}

export async function deleteFile(path: string) {
  if (!path) return
  return http('/upload', { method: 'DELETE', body: JSON.stringify({ path }) })
}

// ── Roles & Master Data ────────────────────────────────────────────────────
export async function fetchRoles() {
  return http<any[]>('/roles')
}

export async function fetchJenisSurat(tipe: 'masuk' | 'keluar'): Promise<string[]> {
  const data = await http<any[]>(`/jenis-surat?tipe=${tipe}`)
  return (data || []).map((r: any) => r.nama)
}

export async function fetchJenisSuratWithKode(tipe: 'masuk' | 'keluar'): Promise<{ nama: string; kode: string }[]> {
  return http<any[]>(`/jenis-surat?tipe=${tipe}&kode=1`)
}

export async function addJenisSurat(nama: string, tipe: 'masuk' | 'keluar') {
  return http('/jenis-surat', { method: 'POST', body: JSON.stringify({ nama, tipe }) })
}

export async function deleteJenisSurat(nama: string, tipe: 'masuk' | 'keluar') {
  return http(`/jenis-surat?nama=${encodeURIComponent(nama)}&tipe=${tipe}`, { method: 'DELETE' })
}

export async function renameJenisSurat(oldName: string, newName: string, tipe: 'masuk' | 'keluar') {
  return http('/jenis-surat', { method: 'PATCH', body: JSON.stringify({ oldName, newName, tipe }) })
}

export async function fetchKategori(): Promise<string[]> {
  const data = await http<any[]>('/kategori')
  return (data || []).map((r: any) => r.nama)
}

export async function addKategori(nama: string) {
  return http('/kategori', { method: 'POST', body: JSON.stringify({ nama }) })
}

export async function deleteKategori(nama: string) {
  return http(`/kategori?nama=${encodeURIComponent(nama)}`, { method: 'DELETE' })
}

export async function renameKategori(oldName: string, newName: string) {
  return http('/kategori', { method: 'PATCH', body: JSON.stringify({ oldName, newName }) })
}

// ── User Management ────────────────────────────────────────────────────────
export async function fetchUsers() {
  return http<any[]>('/users')
}

export async function deleteUser(userId: string) {
  return http(`/users/${userId}`, { method: 'DELETE' })
}

export async function createUser({ nama, username, email, password, id_role }: {
  nama: string; username: string; email: string; password: string; id_role: string
}) {
  return http<{ user: { id: string; username: string; nama: string } }>('/users', {
    method: 'POST',
    body: JSON.stringify({ nama, username, email, password, id_role }),
  })
}

export async function updateUserProfile(userId: string, updates: { nama?: string; username?: string; email?: string; id_role?: string }) {
  return http(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(updates) })
}

export async function adminUpdatePassword(userId: string, newPassword: string) {
  return http(`/users/${userId}/password`, {
    method: 'PATCH',
    body: JSON.stringify({ newPassword }),
  })
}

export async function login(username: string, password: string) {
  return http<{ token: string; user: { id: string; nama: string; username: string; email: string; role: string } }>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ username, password }) },
  )
}

export async function forgotPassword(username: string) {
  return http<{ ok: boolean; message: string }>('/auth/forgot', {
    method: 'POST',
    body: JSON.stringify({ username }),
  })
}

export async function resetPasswordOtp({ username, otp, newPassword }: {
  username: string
  otp: string
  newPassword: string
}) {
  return http<{ ok: boolean; message: string }>('/auth/reset', {
    method: 'POST',
    body: JSON.stringify({ username, otp, newPassword }),
  })
}
