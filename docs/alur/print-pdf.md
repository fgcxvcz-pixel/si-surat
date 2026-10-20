# Alur Page: Print PDF (Surat Keluar)

> Route statis `/print-pdf` — query params dari UI Surat Keluar; file TTD dari `uploads/` Express.

## Tujuan
Cetak surat keluar formal (kop surat + isi + tanda tangan) ke PDF via browser print.

## Akses
- Route path check: `window.location.pathname === "/print-pdf"` di `src/main.tsx`.
- Render `PrintPDFPage` **standalone** — tanpa Sidebar, tanpa auth gate, tanpa shell App.
- Dibuka via `window.open('/print-pdf?…')` dari:
  - SuratKeluar (tombol print per-row + detail)
  - `ModalPreviewSurat` ("Cetak PDF")
  - Share WhatsApp (URL print)

## Query params
| Param | Isi |
|---|---|
| `nomor_surat` | nomor surat |
| `perihal` | perihal |
| `isi_surat` | isi body surat |
| `tanggal_kirim` | tanggal (ditampilkan "Pacitan, {tanggal}") |
| `tujuan` | alamat surat ("Yth. {tujuan}") |
| `file_final_ttd` | JSON string `{ path }` → parsed untuk gambar TTD |

## Alur user
1. User klik Cetak PDF di Surat Keluar / Preview.
2. Browser buka `/print-pdf?…` (tab/window baru).
3. `PrintPDFPage` parse query params.
4. Render HTML mandiri:
   - `@page` A4
   - Kop surat Times New Roman: logo `/logo-sandya.png` + blok "SANDYA NETWORKS / KANTOR LAYANAN PACITAN"
   - Meta nomor/perihal, tanggal "Pacitan, …"
   - "Yth. {tujuan}" + isi surat
   - Blok tanda tangan jika `ttdPath`: gambar via `getFileUrl`, nama dari `params.nama_ttd` (query param, di-pass dari `id_ttd.id_user.nama`, fallback "Sandya Networks"), jabatan "a.n. Kepala Kantor Layanan Pacitan"
5. `window.print()` otomatis setelah **500ms** → dialog print browser → simpan PDF / cetak.

## State / integrasi
- `src/main.tsx` (path check → PrintPDFPage)
- `src/PrintPDFPage.tsx`
- `src/lib/api.ts` → `getFileUrl`
- Asset: `public/logo-sandya.png`

## Catatan / known issue
- **Tanpa auth** — siapa pun dengan URL print bisa render surat dari query params (data surat tidak di-fetch dari DB di page ini, hanya dari query string).
- Nama penanda sudah dari `params.nama_ttd` (query param, fallback "Sandya Networks").
- Auto-print 500ms bisa terlalu cepat/slow tergatung load gambar.
- Tidak ada fallback error jika query params kosong — render surat kosong.
