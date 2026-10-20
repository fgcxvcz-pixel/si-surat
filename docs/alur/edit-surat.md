# Alur Page: Edit Surat

> Backend: Express `:3000` + MariaDB `sisurat_db` (bukan Supabase). Data lewat `src/lib/api.ts`.

## Tujuan
Full-page edit surat masuk atau surat keluar.

## Akses
- Dari list Surat Masuk / Surat Keluar (tombol Edit).
- **Tanpa role gate di page** — semua role yang bisa membuka list bisa edit surat mana pun di UI (RLS update: owner/admin/kepala).
- Sidebar menyorot page asal (`surat-masuk` atau `surat-keluar`).

## Data yang dimuat
- `fetchSuratMasukById(id)` atau `fetchSuratKeluarById(id)`
- `fetchCustomFolders(tipe)`
- `fetchJenisSurat(tipe)`, `fetchKategori()`
- `generateNomorSuratKeluar(jenis)` (keluar, saat reset auto)

## Field yang bisa diedit

### Keduanya (masuk & keluar)
- `nomor_surat` (editable)
- `kategori` (biasa/penting)
- `perihal` (required)
- `isi_surat`
- `folder` (opsional, select dari master folder)
- File PDF lampiran (opsional, ≤1.5MB) — ganti via upload

### Surat keluar tambahan
- `tujuan`
- `tanggal_kirim`
- `jenis_surat` (select master) — mengganti jenis memicu regenerasi nomor otomatis **kecuali** `nomorManual=true`

### Surat masuk tambahan
- `pengirim`
- `tanggal_terima`
- `jenis_surat` (select master)

### Tidak bisa diedit
- Status (`status_tindak_lanjut` / `status_approval`), approval fields, TTD — by design.

## Alur user
1. Buka dari list (onEditClick) → App set `editSuratType`, `editSuratId`, page=`edit-surat`.
2. Load data by id → form terisi.
3. Ubah field.
4. Nomor (keluar): typing menyet `nomorManual=true`. Tombol **"↻ Reset ke otomatis"** → `generateNomorSuratKeluar(jenisSurat)` isi ulang field.
5. Klik **Simpan**:
   - Validasi: `perihal` wajib; PDF jika ada harus ≤1.5MB.
   - Upload file jika dipilih → `uploadFile`.
   - `updateSuratMasuk` / `updateSuratKeluar` dengan diff updates.
   - Toast "Tersimpan ✓" → 1 detik → `onClose`/`onSaved` → App kembali ke list (refetch via refreshTrigger untuk masuk).
6. Batal/tutup → kembali tanpa simpan (tanpa unsaved-changes guard).

## State / integrasi
- `src/EditSuratPage.tsx`
- App.tsx: state `editSuratType`, `editSuratId`; page switch + `onClose`/`onSaved`
- `src/lib/api.ts`: fetch ById, update, uploadFile, generateNomor, folders, jenis, kategori

## Catatan / known issue
- Tidak ada unsaved-changes warning.
- Error load mengganti seluruh page dengan kartu warning.
- Tidak ada gate role — pertimbangkan untuk batasi edit surat orang lain.
- Nomor auto bisa race jika RPC fallback (lihat Surat Keluar).
