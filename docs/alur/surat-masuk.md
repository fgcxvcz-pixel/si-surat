# Alur Page: Surat Masuk

> Backend: Express `:3000` + MariaDB `sisurat_db` (bukan Supabase). Data lewat `src/lib/api.ts`.

## Tujuan
Kelola surat masuk: list, CRUD, tindak lanjut (balas) ke surat keluar, reminder, export.

## Akses
- Semua role login (tanpa gate in-page).
- Menu Sidebar: **Surat Masuk**.
- Edit/delete ditampilkan untuk semua role di UI (RLS di DB: update owner/admin/kepala; delete owner/admin).

## Data yang dimuat
- `fetchSuratMasuk()` — `surat_masuk` + join `id_user:pengguna`
  - **Catatan:** tidak join `id_surat_keluar_ref` → link "Lihat Surat Keluar" dari list tidak pernah render.
- `fetchCustomFolders("masuk")`
- `fetchKategori()`
- `fetchReminders()` (untuk status badge di detail/bell)

## Alur user

### 1. List & Filter
- Pilih bulan → set `dateFrom`/`dateTo`.
- FolderPanel (kiri): folder custom + jumlah surat bulan berjalan yang `folder` atau `pengirim` = nama folder.
- Search: perihal / pengirim / nomor_surat.
- Filter: kategori (biasa/penting), status (`tidak|menunggu|menunggu_approval|selesai`), range tanggal.
- Pagination client-side (10/baris).
- Filter di-reset ke page 1 saat berubah.
- **Export Excel**: data yang sudah difilter (`exportSuratToXLSX("Surat_Masuk", …)`).
- **WhatsApp**: buka wa.me dengan nomor/pengirim/perihal + URL lampiran.

### 2. Create (Tambah Surat)
- Tombol tambah → `ModalTambahSurat type="masuk"`.
- Field: nomor_surat, tanggal_terima, pengirim, folder (opsional), perihal, isi_surat, kategori, jenis_surat, file PDF (**wajib**, ≤1.5MB).
- Checkbox **Tindak Lanjut** + tanggal deadline (default +7 hari).
- Submit:
  1. `uploadFile(file)` jika ada PDF.
  2. `createSuratMasuk({ id_user, …, status_tindak_lanjut: "tidak" })`.
  3. Jika tindak lanjut dicentang:
     - `updateSuratMasukStatus(id, "menunggu")`
     - `createReminder(id, tanggal_batas, keterangan?)`
     - Opsional tombol "Buat Surat Keluar →" → `onTindakLanjut` (lihat alur tindak lanjut).

### 3. Detail (inline)
- Klik baris → expand `openDetailId`.
- Tampilkan: perihal, isi, preview file (iframe modal), status badge.
- Link "Lihat Surat Keluar →" jika `id_surat_keluar_ref` (tidak pernah muncul dari list — query tidak join).
- Tombol "Balas?" untuk status ≠ `selesai`.

### 4. Balas / Tindak Lanjut
Data reply dibangun: `{ tujuan: pengirim, perihal: "Re: …", isiSurat, kategori, id_surat_masuk_ref }`.

- Tombol "Balas?" hanya tampil untuk status `tidak` atau `menunggu` (hidden untuk `menunggu_approval` atau `selesai`).
- Status `menunggu` → langsung `onTindakLanjut(replyData)`.
- Status `tidak` → **BalasPopup**:
  - Input deadline (opsional).
  - **Simpan**: `updateSuratMasukStatus(id, "menunggu")` + optional `createReminder` → refresh bell.
  - **Lanjut ke Form →**: simpan (jika deadline) lalu `onTindakLanjut({…data, deadline})` → App → `tambah-surat-keluar`.

### 5. Edit
- `onEditClick(id)` → App set `editSuratType="masuk"`, `editSuratId` → page `edit-surat` → `EditSuratPage`.

### 6. Delete
- Confirm dialog → `deleteSuratMasuk(id)` → refetch.

### 7. Folder CRUD (di panel)
- Tambah folder: `createCustomFolder("masuk", nama)`.
- Hapus folder: `deleteCustomFolderByName(nama, "masuk")` — surat tidak ikut terhapus (hanya nama folder master).

## State / status surat_masuk
```
tidak (default saat create)
  ├─ Balas? / checkbox Tindak Lanjut / Simpan
  │     → menunggu (+ reminder)
  └─ setelah surat keluar dibuat dgn id_surat_masuk_ref
        → menunggu_approval
            └─ saat Kepala approve SK → selesai (+ reminder selesai)
```

## Integrasi
- `src/pages/SuratMasuk.tsx`
- `src/components/FolderPanel.tsx`
- `src/components/modals/ModalTambahSurat.tsx`, `ModalViewSurat.tsx`
- `src/components/TopBar.tsx` (refresh bell via `bellRefresh`)
- `App.tsx` → state `tindakLanjutData`, page `tambah-surat-keluar`
- `src/lib/api.ts` → `fetchSuratMasuk`, `deleteSuratMasuk`, `updateSuratMasukStatus`, `createReminder`, folders, kategori

## Catatan / known issue
- `fetchSuratMasuk()` list tidak join `id_surat_keluar_ref` → "Lihat Surat Keluar" tidak pernah render dari list.
- Status `menunggu_approval` dirender badge "Belum" (merah) di detail.
- `ModalViewSurat` hampir tidak terpakai dari list.
- Duplikat markup preview PDF inline.
- Tidak ada role gate edit/delete di UI.
- `colSpan` empty-state off-by-one (cosmetic).
