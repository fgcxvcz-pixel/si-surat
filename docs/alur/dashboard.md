# Alur Page: Dashboard

> Backend: Express `:3000` + MariaDB `sisurat_db` (bukan Supabase). Data lewat `src/lib/api.ts`.

## Tujuan
Ringkasan volume surat + rekap periodik.

## Akses
- Semua role login.
- Menu Sidebar: **Dashboard** (selalu ada).
- Default page setelah login.

## Data yang dimuat
- `fetchSuratMasuk()` → semua surat masuk
- `fetchSuratKeluar()` → semua surat keluar (join TTD, ref masuk)

## Alur user

### 1. Stats Grid (3 kartu)
- Hitung di client, filter **bulan ini** (`inMonth`):
  - **Surat Masuk** — jumlah SM `tanggal_terima` bulan ini
  - **Total Surat Keluar** — jumlah SK `tanggal_kirim` bulan ini
  - **Surat Balasan** — SK bulan ini yang punya `id_surat_masuk_ref`
- Subtitle greeting dinamis: nama hari + tanggal + greeting jam (pagi/siang/sore/malam) + nama user dari localStorage.

### 2. Rekap Periodik (tabel)
- Toggle periode: **Minggu Ini | Bulan Ini | Kuartal Ini**
- **Minggu Ini**: baris per hari Senin–Minggu
- **Bulan Ini**: baris per Minggu 1..N bulan berjalan
- **Kuartal Ini**: label tetap Januari–Desember (filter tahun berjalan; nama "kuartal" misleading — isinya setahun)
- Kolom: Periode, Total Surat Masuk, Total Surat Keluar, Total
- "Selesai" dihitung: SM `status_tindak_lanjut==="selesai"` atau SK `status_approval==="disetujui"`
- **Ekspor Excel**: `exportRekapToXLSX("Rekap_Surat_<periode>")` — headers + rows + total row.

## Integrasi
- `src/pages/Dashboard.tsx` (termasuk komponen internal `RekapPeriodik`)
  - `inMonth()` helper function defined locally dalam component (bukan import dari constants.ts)
  - Filter logic: `inMonth(date)` returns boolean untuk tanggal dalam bulan ini
- `src/components/TopBar.tsx` (title, subtitle, notifikasi bell)
- `src/lib/api.ts` (fetch data)
- `src/lib/excelExport.ts`

## Catatan / known issue
- Fetch data dua kali (stats effect + RekapPeriodik effect) — bisa digabung/di-share.
- "Kuartal Ini" menampilkan 12 bulan, bukan 3 bulan kuartal.
- RekapPeriodik mem-fetch ulang hanya saat mount (tidak refresh saat balik dari page lain).
- `inMonth()` helper defined locally di Dashboard.tsx (bukan import dari constants.ts) — DRY violation, pertimbangkan export ke constants untuk reusability.
