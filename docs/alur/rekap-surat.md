# Alur Page: Rekap Surat

> Backend: Express `:3000` + MariaDB `sisurat_db` (bukan Supabase). Data lewat `src/lib/api.ts`.

## Tujuan
Kalender rekap bulanan kehadiran surat masuk/keluar per hari + export/print.

## Akses
- Semua role login (tanpa gate).
- Menu Sidebar: **Rekap Surat**.

## Data yang dimuat
- `fetchSuratMasuk()` + `fetchSuratKeluar()` — side effect di `useMemo` (seharusnya `useEffect`).

## Alur user

### 1. Pilih Periode
- Dropdown **bulan** + **tahun** (rentang tahun berjalan −2 … +2).

### 2. Grid Kalender
- Bangun `smByDay` / `skByDay` — boolean per tanggal bulan terpilih (ada surat masuk / keluar di hari itu).
- Render tabel hari 1..N bulan terpilih:
  - ✓ jika ada surat masuk, ✓ jika ada surat keluar (kolom terpisah).
  - Shading weekend.
  - Legenda.
- Totals: jumlah hari yang punya surat masuk / keluar.

### 3. Aksi
- **Ekspor Excel**: `exportRekapToXLSX` — rows ✓/–/total per hari.
- **Print**: `openPrintRekap(data)` (dari `PrintRekapSurat.tsx`):
  1. `window.open("")`
  2. Fetch logo → base64
  3. Tulis HTML landscape `@page` + tabel rekap
  4. `win.print()` setelah 300ms
- Branding print: header **"Inalite"** (tidak konsisten dengan SiSurat/Sandya).

## State / integrasi
- `src/pages/RekapSurat.tsx`
- `src/pages/PrintRekapSurat.tsx` (`openPrintRekap`; komponen `PrintRekapSurat` build HTML lalu return null — **dead code**)
- `src/lib/excelExport.ts` → `exportRekapToXLSX`
- `src/lib/api.ts` → `fetchSuratMasuk`, `fetchSuratKeluar`

## Catatan / known issue
- Side effect fetch di `useMemo` — pindah ke `useEffect` / react-query.
- Branding print "Inalite" vs sidebar "SiSurat" vs letterhead "SANDYA NETWORKS".
- Tidak ada filter role — semua user lihat rekap semua surat (RLS SELECT authenticated).
- Komponen `PrintRekapSurat` unused (return null).
