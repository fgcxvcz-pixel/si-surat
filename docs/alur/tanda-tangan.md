# Alur Page: Tanda Tangan

## Tujuan
Kelola tanda tangan digital (gambar) untuk penandatanganan surat keluar.

## Backend
- Express API: `/api/ttd`
- Storage: folder lokal `uploads/` (bukan Supabase Storage)
- File path disimpan absolut: `http://localhost:3000/uploads/<nama>`

## Akses
- Gate in-page: `isKepalaRole(role) || isSuperAdmin(role)` → jika bukan, kartu **"Akses Ditolak"**.
- Menu Sidebar:
  - Super Admin: ada
  - Kepala Bagian: ada
  - Admin lain: **tidak** ada di sidebar
- Owner upload: `getCurrentUserId()` dari localStorage `userInfo` (hasil login JWT).
- Server manage TTD: `requireRole('Kepala Bagian', 'Super Admin')`.

## Data yang dimuat
- `fetchAllTandaTangan()` → `GET /api/ttd/all` — semua TTD + join `id_user: { id, nama }` (termasuk non-aktif untuk list management).
- `fetchTandaTangan()` → `GET /api/ttd` — hanya `is_aktif = true` (dipakai saat approve SK).

## Alur user

### 1. Lihat
- Kartu TTD aktif (`is_aktif=true`): preview gambar via `getFileUrl(file_ttd.path)`.
- List semua TTD.

### 2. Upload
- **Upload form hanya visible jika user belum punya TTD** (`!myTtd`).
- Input file: **image only** (PNG/JPG), ≤2MB.
- `createTandaTangan(userId, file)`:
  1. `uploadFile(file)` → `POST /api/upload` → file di `uploads/`, dapat `{ nama, path, ukuran, mime }`.
  2. `POST /api/ttd` `{ id_user, file_ttd }` — server nonaktifkan TTD lain milik user yang sama lalu insert `is_aktif = 1`.
- Setelah upload sukses → **upload form hidden**, preview ditampilkan.

### 3. Lihat TTD Aktif & Delete
- **Inline preview (centered)** ditampilkan saat TTD sudah ada:
  - Preview image (`max-w-sm`)
  - File metadata: nama, ukuran, tanggal upload (formatted locale: id-ID)
  - Button **"Hapus & Upload Ulang"**
- `confirm()` native dialog untuk konfirmasi delete.
- `deleteTandaTangan(id)` → `DELETE /api/ttd/:id`:
  1. Hapus file dari `uploads/` (berdasarkan `file_ttd.path`).
  2. Delete row `tanda_tangan_digital`.
- Setelah delete sukses → **upload form kembali visible** untuk upload TTD baru.

### 4. Single Active TTD per User
- Hanya **1 TTD aktif per user** (enforced by backend).
- Saat approve Surat Keluar, server otomatis ambil TTD aktif milik approver (`is_aktif=1 AND id_user=approver`, `ORDER BY created_at DESC LIMIT 1`).
- Tidak pakai TTD user lain.

### 5. Preview Modal
- List TTD (history) → klik thumbnail → modal preview (existing behavior).

## Integrasi
- Dipakai di Surat Keluar saat approve → server set `id_ttd` + link ke TTD aktif.
- Preview/cetak: `ModalPreviewSurat`, `PrintPDFPage` render `file_ttd.path`.
- `src/pages/TandaTanganPage.tsx`
- `src/lib/api.ts`: `fetchAllTandaTangan`, `fetchTandaTangan`, `createTandaTangan`, `setTandaTanganActive`, `deleteTandaTangan`, `uploadFile`, `getFileUrl`
- `src/lib/constants.ts`: `getCurrentUserId`

## Catatan / known issue
- Nama penanda di PrintPDFPage sudah menggunakan `params.nama_ttd` dari query string (di-pass dari `id_ttd.id_user.nama`), fallback "Sandya Networks".
- Path file lama Supabase (jika ada sisa data) tidak dimigrasi — hanya file baru di `uploads/`.
- **UI Update (2026-10-09):** Upload form kini hidden saat user sudah punya TTD aktif. Preview ditampilkan centered dengan metadata file (nama, ukuran, tanggal upload). User bisa re-upload via "Hapus & Upload Ulang" button.
