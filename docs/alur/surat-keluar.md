# Alur Page: Surat Keluar

> Backend: Express `:3000` + MariaDB `sisurat_db` (bukan Supabase). Data lewat `src/lib/api.ts`.

## Tujuan
Kelola surat keluar: list, CRUD, approval Kepala, preview/cetak PDF, export.

## Akses
- Semua role login (menu selalu ada).
- **Approval** hanya untuk role Kepala/Super Admin (tombol di-gate `isKepalaRole||isSuperAdmin` dari localStorage).
- Edit/delete ditampilkan untuk semua role di UI.

## Data yang dimuat
- `fetchSuratKeluar()` — join `id_user`, `approved_by`, `id_ttd:tanda_tangan_digital`(+user), `id_surat_masuk_ref:surat_masuk`
- `fetchCustomFolders("keluar")`
- `fetchReminders()`
- `fetchKategori()`
- `fetchTandaTangan()` (hanya saat approve)

## Alur user

### 1. List & Filter
- Pilih bulan → `dateFrom`/`dateTo`.
- FolderPanel: folder custom; jumlah = SK bulan berjalan dengan `folder` atau fallback `tujuan` = nama folder.
- Search: perihal / tujuan / nomor_surat.
- Filter: kategori, tanggal. **Tidak ada filter status approval.**
- Pagination 10/baris.
- **Export Excel**: `exportSuratToXLSX("Surat_Keluar", …)` termasuk field `status_approval`.
- **WhatsApp**: share URL print + field surat.

### 2. Create (Tambah Surat Keluar)
- Tombol tambah → `ModalTambahSurat type="keluar"`.
- Field: nomor_surat (**auto**), tanggal_kirim, tujuan, folder (opsional), perihal, isi_surat, kategori, jenis_surat, file draft PDF (opsional ≤1.5MB).
- Nomor: `generateNomorSuratKeluar(jenisSurat)` — RPC `generate_next_nomor_surat` dulu; fallback client-side (race-prone).
- Submit:
  1. `uploadFile` jika ada draft.
  2. `createSuratKeluar({ …, status_approval: "menunggu", id_surat_masuk_ref? })`.
  3. Jika `id_surat_masuk_ref` → `updateSuratMasukStatus(ref, "menunggu_approval")`.

### 3. Detail (inline)
- Expand baris: nomor, tujuan, tanggal_kirim, jenis, status approval (badge + approved_by + tanggal_approval jika disetujui), perihal, isi, preview draft file, link "Lihat Surat Masuk Asli" (`ModalViewSurat type="masuk"`), tombol print.

### 4. Approval (Kepala / Super Admin)
Tombol approve hanya jika role Kepala/Super:
1. `updateReminderStatus(reminder.id, "selesai")` — matched by `id_surat_masuk_ref` (non-kritis).
2. `updateSuratMasukStatus(smId, "selesai")`.
3. `approveSuratKeluar(s.id, currentUser.id)` → `status_approval: "disetujui"`, `approved_by`, `tanggal_approval`.
4. `fetchTandaTangan()` → ambil TTD `is_aktif` **milik currentUser.id** → `updateSuratKeluar(s.id, { id_ttd })`. Backend approve juga set `id_ttd` dengan filter yang sama (`id_user = req.user.sub`). Jika approver tidak punya TTD aktif, `id_ttd` tidak ditautkan.
5. UI `justApproved` + refresh data + bell.

Selesai jika: `justApproved===s.id || status_approval==="disetujui" || s.id_ttd || reminder.status==="selesai"`.

### 5. Preview & Cetak
- Per-row preview → `ModalPreviewSurat` (kop surat Times New Roman, logo SANDYA NETWORKS, blok tanda tangan jika `id_ttd.file_ttd`).
- **Cetak PDF** → `window.open('/print-pdf?…')` dengan query: nomor, perihal, isi, tanggal_kirim, tujuan, `file_final_ttd=JSON.stringify(id_ttd.file_ttd)`.

### 6. Edit
- `onEditClick(id)` → `EditSuratPage type="keluar"`.

### 7. Delete
- Confirm → `deleteSuratKeluar(id)`.

## State / status surat_keluar
```
menunggu (default saat create)
  └─ approveSuratKeluar (Kepala/Super) → disetujui (+ id_ttd linked)
```
- **Tidak ada alur "ditolak" di UI** meski schema/trigger DB mendukung (`catatan_revisi` ada di API, tidak pernah dikirim).

## Integrasi
- `src/pages/SuratKeluar.tsx`
- `src/components/modals/ModalTambahSurat.tsx`, `ModalPreviewSurat.tsx`, `ModalViewSurat.tsx`
- `src/PrintPDFPage.tsx` (route `/print-pdf`)
- `App.tsx` → `edit-surat`, `surat-masuk` (setelah tindak lanjut)
- `src/lib/api.ts` → `fetchSuratKeluar`, `createSuratKeluar`, `deleteSuratKeluar`, `approveSuratKeluar`, `generateNomorSuratKeluar`, `fetchTandaTangan`, `updateSuratKeluar`, `updateReminderStatus`, `updateSuratMasukStatus`

## Catatan / known issue
- Duplicate delete-confirm modal (2 render; satu tanpa `deleting` disabled).
- Tidak ada UI reject/catatan revisi.
- Comment header "sementara disembunyikan" stale — komponen aktif.
- Nomor fallback client-side bisa race condition.
- Folder count memperlakukan `folder===null && tujuan===cf` sebagai anggota folder.
