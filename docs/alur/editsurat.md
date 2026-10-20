# Alur Fitur: EditSuratPage & Alur Approve

> Backend: Express + MariaDB. Data lewat `src/lib/api.ts` dan `src/pages/SuratKeluar.tsx:612-656`.

## Tujuan
Fitur edit data surat masuk/keluar beserta alur approve (setujui) oleh Kepala/Super Admin dan linking TTD (tanda tangan digital).

## Akses
- Semua role bisa **edit** form (validasi field)
- Hanya **Kepala/Super Admin** bs **approve** dan **link TTD**
- Menu: Dari halaman SuratMasuk/SuratKeluar → EditSuratPage

## Data yang dimuat

### Edit Surat Masuk (lines 82-85 di EditSuratPage.tsx)
- `pengirim` - pengirim
- `tanggal_terima` - date picker
- `jenis_surat_masuk` - select dari fetched options

### Edit Surat Keluar (lines 78-86 di EditSuratPage.tsx)
- `nomor_surat` - auto-generated, overrideable manually
- `tujuan` - penerima
- `tanggal_kirim` - date picker
- `jenis_surat` - select dari fetched options

## Alur Status (tidak → menunggu → menunggu_approval → selesai)

### 1. Approve Workflow (SuratKeluar.tsx:612-656) — 6 Langkah Luka
1. `updateReminderStatus(reminder.id, "selesai")` — match by `id_surat_masuk_ref` (non-kritis)
2. `updateSuratMasukStatus(smId, "selesai")` — jika ada surat masuk terkait
3. `approveSuratKeluar(s.id, currentUserId)` → set `status_approval: "disetujui"`, `approved_by`, `tanggal_approval`
4. `fetchTandaTangan()` → ambil TTD `is_aktif === true` **milik currentUser.id** → `updateSuratKeluar(s.id, { id_ttd })`. Backend approve juga set `id_ttd` dengan filter yang sama (`id_user = req.user.sub`). Jika approver tidak punya TTD aktif, `id_ttd` tidak ditautkan.
5. UI `justApproved` + refresh data + bell.
6. Selesai jika: `justApproved===s.id || status_approval==="disetujui" || s.id_ttd || reminder.status==="selesai"`

### 2. Status Update Functions (SuratMasuk.tsx)
- `updateSuratMasukStatus(id, "menunggu")` → line 868-869: menandai surat masuk menjadi menunggu (menetapkan reminder)
- `updateSuratMasukStatus(id, "selesai")` → line 680-681: menandai surat masuk menjadi selesai

### 3. TTD Selection During Edit
- `fetchTandaTangan()` → ambil semua records TTD dari database `tanda_tangan_digital`
- Filter: `is_aktif === true` AND `id_user.id === currentUserId` — **hanya TTT Aktif milik user sendiri yg bs dipilih/link**
- Link: `updateSuratKeluar(s.id, { id_ttd: ttd.id })` → menautkan TTT tersebut ke surat keluar
- Display: Tombol "○" atau "✓" dengan badge warna hijau/merah status approval

### 4. Role Restrictions (Critical)
- **Hanya Kepala/Super Admin** bs approve (line 608-610 SuratKeluar.tsx check):
  ```typescript
  if (!isKepalaRole(userInfo?.role) && !isSuperAdmin(userInfo?.role)) {
    // tolak akses tombol approve
  }
  ```
- **File validation** (EditSuratPage:116-124):
  - Type: hanyalah PDF
  - Max size: 1.5MB
- **Field wajib**: `perihal` harus diisi (`required` validation)
- **Status flow**: tidak bisa mundur (only forward: `tidak → menunggu → menunggu_approval → selesai`)

## API Connections (api.ts — 8 endpoint esentil)

- `fetchSuratMasukById(id)` → `GET /surat-masuk/${id}` — ambil data surat masak untuk diform edit
- `fetchSuratKeluarById(id)` → `GET /surat-keluar/${id}` — ambil data surat keluar untuk diform edit
- `updateSuratMasuk(id, updates)` → `PATCH /surat-masuk/${id}` — update data surat masuk
- `updateSuratKeluar(id, updates)` → `PATCH /surat-keluar/${id}` — update data surat keluar (termasuk field `id_ttd`)
- `updateSuratMasukStatus(id, status)` → `PATCH /surat-masuk/${id}/status` — update status status (menunggu/selesai)
- `approveSuratKeluar(id, approvedBy, catatan?)` → `POST /surat-keluar/${id}/approve` — trigger alur approve lengkap 6 langkah
- `uploadFile(file, folder)` → `POST /upload` — validasi: PDF only, max 1.5MB
- `fetchJenisSurat(type)` → `GET /jenis-surat?tipe=${type}` — ambil daftar jenis surat untuk select field
- `fetchKategori()` → `GET /kategori` — ambil daftar kategori untuk select field

## Integrasi
- `src/EditSuratPage.tsx` — form edit beserta validasi field dan state manage
- `src/pages/SuratKeluar.tsx` — alur approve lengkap 6 langkah (lines 612-656) + TTD linking
- `src/pages/SuratMasuk.tsx` — fungsi status update (lines 868-869, 680-681)
- `src/lib/api.ts` — semua endpoint di atas (8 fungsi esensial)
- `App.tsx` → page routing ke `edit-surat` setelah dikirim tindak lanjut

## Catatan / known issue
- ✅ **Sudah ada validasi**: File type hanyalah PDF, max size 1.5MB (EditSuratPage:116-124)
- ✅ **Sudah ada role check**: Hanya Kepala/Super Admin bs approve (SuratKeluar.tsx:608-610)
- ⚠️ **Tidak ada UI reject**: Status flow hanya ke "selesai", tidak ada opsi tolak/catatan revisi di UI
- ⚠️ **Nomor fallback client-side**: bisa race condition (dikenal dari docs/alur/surat-keluar.md)
- ⚠️ **TTD linking hanya untuk user own TTT**: `id_user === currentUserId` — user lain TIDA bisa link TTT mereka ke surat orang lain
- ⚠️ **`justApproved` state mencegah double-approve**: tapi bisa reset jika halaman di-refresh
- ⚠️ **Status flow satu arah**: `tidak → menunggu → menunggu_approval → selesai` — tidak bisa mundur atau di-edit kembali ke status sebelumnya tanpa create surat baru

---
---
### Catatan Khusus mengenai Alur Approve 6 Langkah

Setiap langkah dalam alur approve harus diikuti urutannya:

1. **Update reminder**: Menandai reminder terkait sudah selesai (tidah memengaruhi kritisitas proses)
2. **Update surat masuk**: Menandai surat masuk terkait selesai (jika ada reference)
3. **Approve Surat Keluar**: Fungsi utama yang mengubah `status_approval` menjadi `"disetujui"`, menambah `approved_by` dan `tanggal_approval`
4. **Fetch TTD Aktif**: Mencari TTT yang sedang aktif milik user yang approve — ini krusial, jika user tersebut tidak memiliki TTT aktif, langkah 5 diabaikan (id_ttd tidak ditambahkan)
5. **Link TTD ke Surat Keluar**: Menyimpan `id_ttd` ke database surat keluar — ini adalah bukti bahwa proses approve sudah lengkap dengan tanda tangan digital
6. **Refresh UI State**: Set `justApproved` state untuk mencegah pengguna approve surat yang sama berulang kali tanpa refresh page

Setiap langkah bersifat kumulatif — jika langkah 4 gagal (user tidak punya TTT aktif), langkah 5 tidak akan menambahkan `id_ttd`, tetapi proses approve tetap dapat terus dilakukan dan `status_approval` tetap berubah menjadi `"disetujui"`.

---
---
### Contoh Kasus Pakai

**Kasus 1: Kepala approve Surat Keluar dengan TTTnya Sendiri**
1. Kepala login → halaman SuratKeluar
2. Pilih surat yang akan diapprove
3. Klik tombol **Approve**
4. Sistem:
   - Update reminder status jadi "selesai"
   - Update surat masuk status jadi "selesai" (jika ada reference)
   - Ambil TTT aktif milik Kepala sendiri
   - Link TTT ke surat keluar
  - Set `justApproved` state
   - Refresh data dan bell notification
5. Hasil: Surat keluar status jadi "disetujui", memiliki TTD digital milik Kepala

### Kasus 2: Super Admin approve tanpa TTT Aktif
1. Super Admin login → halaman SuratKeluar
2. Pilih surat yang akan diapprove
3. Klik tombol **Approve**
4. Sistem:
   - Update reminder status jadi "selesai"
   - Update surat masuk status jadi "selesai"
   - Ambil TTT aktif — **tidak ditemukan** (karena Super Admin mungkin punya TTT yang berbeda atau belum pernah activate)
   - Langkah 5: `id_ttd` tidak ditambahkan ke surat keluar
   - Proses approve tetap lanjut — `status_approval` berubah menjadi `"disetujui"`
5. Hasil: Surat keluar status jadi "disetujui", tetapi **tidak ada TTD** yang terlink (field `id_ttd` di database NULL)

---
---
### Integrasi Lanjutan
- `src/EditSuratPage.tsx` — state manajemen form, validasi field, komponen input
- `src/pages/SuratKeluar.tsx` — komponen tombol approve, logika 6 langkah, display TTD
- `src/pages/SuratMasuk.tsx` — komponen update status, fungsi status badge
- `src/lib/api.ts` — seluruh endpoint API yang dibutuhkan
- `App.tsx` — state `editSuratType` (masuk/keluar), `editSuratId`, dan page routing

---
---
### Referensi Tambahan dari Documentation Lain
- **surat-masuk.md**: menyebutkan `updateSuratMasukStatus` dan alur balas/tindak lanjut
- **surat-keluar.md**: menyebutkan `approveSuratKeluar` dan alur approve Kepala/Super
- **tanda-tangan.md**: menyebutkan `fetchTandaTangan` dan logika `is_aktif === true` milik currentUser
- **print-pdf.md**: menyebutkan field `file_final_ttd` yang dipakai saat generate PDF print