# Alur Page: Master Data (Kelola Data)

> Backend: Express `:3000` + MariaDB `sisurat_db` (bukan Supabase). Data lewat `src/lib/api.ts`.

## Tujuan
Kelola data referensi: jenis surat (masuk/keluar), kategori, folder custom.

## Akses
- Menu Sidebar: **Master Data** (Super Admin & Admin; Kepala tidak punya menu).
- **Tanpa gate in-page** — akses dikontrol visibilitas sidebar saja.

## Data yang dimuat
- Tab Jenis Masuk: `fetchJenisSurat("masuk")`
- Tab Jenis Keluar: `fetchJenisSurat("keluar")`
- Tab Kategori: `fetchKategori()`
- Tab Folder: `fetchCustomFolders("masuk")` + `fetchCustomFolders("keluar")`

## Alur user (per tab)

### Tab switching
- Ganti tab → reset input, search, dan state inline rename.

### Tambah
- Input nama → Enter atau tombol +.
- Guard nama duplikat (client-side).
- Animasi slide-in baris baru.
- API:
  - Jenis: `addJenisSurat(nama, tipe)` — auto `kode` = max kode existing + 1 (pad 2 digit).
  - Kategori: `addKategori(nama)`.
  - Folder: `createCustomFolder(tipe, nama)` (tipe = masuk/keluar; tab Folder punya dual panel).

### Rename (inline)
- Klik baris → input inline → Enter/✓ simpan, Esc batal.
- Update **by name equality** (bukan id):
  - `renameJenisSurat(oldName, newName, tipe)`
  - `renameKategori(oldName, newName)`
  - `renameCustomFolder(oldName, newName, tipe?)` — tanpa tipe: update dua-duanya.

### Delete
- Confirm modal → hapus by name:
  - `deleteJenisSurat(nama, tipe)`
  - `deleteKategori(nama)`
  - `deleteCustomFolderByName(nama, tipe?)` — surat terkait tidak ikut terhapus.

### Search
- Filter client-side per tab.

## State / integrasi
- `src/pages/KelolaData.tsx`
- `src/lib/api.ts` → fungsi master data di atas
- `src/lib/constants.ts` → `loadMasterDataCache()` (dipanggil saat login; **tidak di-refresh otomatis** setelah ubah master data di page ini — opsi cache basi sampai reload/login ulang)

## Catatan / known issue
- Rename/delete by **nama**, bukan id — rusak jika ada nama duplikat (add hanya guard client-side).
- `realIdx` via `indexOf` bisa salah jika duplikat.
- Perubahan master data tidak invalidate `_loaded` cache di constants.ts.
- Gate hanya UI — RLS admin yang menegakkan write di DB.
