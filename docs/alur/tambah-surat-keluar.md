# Alur Page: Tambah Surat Keluar (Tindak Lanjut)

> Backend: Express `:3000` + MariaDB `sisurat_db` (bukan Supabase). Data lewat `src/lib/api.ts`.

## Tujuan
Halaman pembuatan surat keluar sebagai **tindak lanjut** dari surat masuk (balasan).

## Akses
- Dari alur "Balas?"/"Lanjut ke Form" di Surat Masuk.
- Page: `tambah-surat-keluar` di App.
- Semua role (mengikuti akses Surat Masuk).

## Data yang dimuat
- Prefill dari App state `tindakLanjutData` (bukan fetch ulang SM).
- Modal `ModalTambahSurat type="keluar"` mem-fetch sendiri: folders keluar, jenis surat, kode map, generate nomor.

## Alur user
1. SuratMasuk → BalasPopup → "Lanjut ke Form →" (atau create SM + tombol lanjut).
2. App set `tindakLanjutData` + page=`tambah-surat-keluar`.
3. `TambahSuratKeluarPage` render `ModalTambahSurat` **inline** (full-page shell) dengan `initialData`.
4. Prefill dari data balasan:
   - `tujuan` = pengirim SM
   - `perihal` = "Re: …"
   - `isiSurat`
   - `kategori`
   - `id_surat_masuk_ref` = id SM
   - `deadline` (opsional, dari BalasPopup)
5. Field wajib di mode tindak lanjut: **hanya `perihal`** (mode lain semua field required).
6. Nomor surat keluar auto via RPC (readOnly + hint format).
7. Submit:
   1. `uploadFile` jika ada PDF draft.
   2. `createSuratKeluar({ …, status_approval: "menunggu", id_surat_masuk_ref })`.
   3. `updateSuratMasukStatus(id_surat_masuk_ref, "menunggu_approval")`.
8. `onSaved`/`onClose` → App reset `tindakLanjutData`, page=`surat-masuk`, bump `suratMasukRefresh`.

## Setelah halaman ini
- SM berstatus `menunggu_approval`.
- TopBar bell Kepala menampilkan SK menunggu approval.
- Approval di Surat Keluar → SM→`selesai`, reminder→`selesai`, SK→`disetujui` + TTD.

## State / integrasi
- `src/pages/TambahSuratKeluarPage.tsx` (wrapper tipis)
- `src/components/modals/ModalTambahSurat.tsx` (inline)
- App.tsx: `tindakLanjutData`, `suratMasukRefresh`, page routing
- `src/lib/api.ts`: `createSuratKeluar`, `updateSuratMasukStatus`, folders, jenis, nomor

## Catatan / known issue
- App pass `folderList={[]}` ke page — prop tidak berguna; modal refetch folders sendiri.
- Debug `console.log` tersisa di `ModalTambahSurat.handleSave`.
- Jika master cache belum load, hint nomor bisa `00`.
