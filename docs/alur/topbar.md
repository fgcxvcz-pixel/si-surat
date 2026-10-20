# Alur Page: TopBar

> Backend: Express + MariaDB. Data lewat `src/lib/api.ts`.

## Tujuan
Menampilkan notifikasi bell dengan daftar tindak lanjut (surat masuk/keluar yang menunggu approval/dibalas) di header aplikasi.

## Akses
- Semua role login
- Menu: Header/TopBar (sempurna di bagian atas halaman)
- Hanya Kepala/Super yang memiliki notifikasi status spesifik

## Data yang dimuat
- `fetchSuratKeluar()` → filter `status_approval === "menunggu"` (hanya Kepala/Super menghasilkan 1 notif)
- `fetchSuratMasuk()` + `fetchReminders()` → filter `status_tindak_lanjut !== "menunggu" && !== "menunggu_approval"` (Admin/non-Kepala menghasilkan 2 notif)
- Status labels: Hardcoded per status type (bukan dynamic `getStatusLabel()` function)

## Alur user
### 1. Load Data pada Mount
- `useEffect(() => { fetchData() }, [refreshTrigger])` di `TopBar.tsx:48`
- Role filtering berdasarkan `isKepalaRole(userInfo?.role)` (constants.ts:37) dan `isSuperAdmin(userInfo?.role)` (constants.ts:34)
- `currentUserId = getCurrentUserId()` (constants.ts:49) digunakan untuk filter `id_user !== userInfo.id` di section surat keluar

### 2. Dropdown Render (tindakLanjutList)
- `tindakLanjutList.map((s, idx) => ...)` di `TopBar.tsx:89`
- Setiap item berisi:
  - **Icon**: `IconMenungguApproval` (untuk `menunggu_approval`), `IconPendingDibalas` (untuk `menunggu`), `IconSelesai` (untuk `selesai`)
  - **Judul**: `{s.tujuan}` (section keluar) atau `{s.pengirim}` (section masuk)
  - **Perihal**: `{s.perihal}`
  - **Status label**: Hardcoded text sesuai status (contoh: "Menunggu Approval" untuk section keluar)
- Badge count di pojok kanan bell: `tindakLanjutList.length`

### 3. Status Per Role (Hasil Akhir)
| Role | Notif di Badge | Label di Setiap Item dropdown |
|------|---------------|------------------------------|
| **Kepala** | 1 notif | "Menunggu Approval" (sumber: `status_approval === "menunggu"` dari data surat keluar) |
| **Admin** | 2 notif | "Menunggu Dibalas" (sumber: `status_tindak_lanjut === "menunggu"`) + "Menunggu Approval" (sumber: `status_approval === "menunggu_approval"`) |

### 4. Icon Display per Section Dropdown
- **Section surat keluar** (baris `if (s.tujuan)` di `TopBar.tsx:90-99`):
  - Baris 93: `<IconMenungguApproval h-3 w-3 mr-1 />` ⏳ — icon untuk section keluar
  - Baris 98: Status label hardcoded "Menunggu Approval"
- **Section surat masuk** (baris `else` di `TopBar.tsx:101-133`):
  - Lines 114-122: Logic badge berdasarkan `s.status_tindak_lanjut`:
    - `menunggu_approval` → `badge = { icon: <IconMenungguApproval />, label: "Menunggu Approval", bg: "#EFF6FF", color: "#2563EB" }`
    - `menunggu` (bukan Kepala) → `badge = { icon: <IconPendingDibalas />, label: "Menunggu Dibalas", bg: "#FEF3C7", color: "#D97706" }`
    - `selesai` → `badge = { icon: <IconSelesai />, label: "Selesai", bg: "#ECFDF5", color: "#059669" }`
    - `tidak` → `badge = { icon: <IconPendingDibalas />, label: "Menunggu", bg: "#FEF3C7", color: "#D97706" }`

### 5. Implementasi Status Labels
- Status labels di section surat keluar: Hardcoded "Menunggu Approval" (tidak menggunakan `getStatusLabel()`)
- Status labels di section surat masuk: Dynamic berdasarkan `status_tindak_lanjut` dengan badge warna/icon sesuai
- Konsistensi: Label berbeda antara keluar (hardcoded) vs masuk (dynamic) — pertimbangkan unifikasi di masa depan

## Integrasi
- `src/components/TopBar.tsx` (lines 1-5: import, lines 92-98: render section keluar)
- `src/lib/constants` (lines 49-55: fungsi `getStatusLabel`)
- `src/pages/SuratMasuk.tsx` — menerima status badges dari bell state
- `src/pages/SuratKeluar.tsx` — menerima status badges dari bell state
- `App.tsx` → state `tindakLanjutData`, refresh bell via `bellRefresh`

## Catatan / known issue
- ⚠️ **Status labels tidak unified**: Section keluar menggunakan hardcoded "Menunggu Approval", sementara section masuk menggunakan dynamic badge labels. Pertimbangkan gunakan `getStatusLabel()` function untuk konsistensi.
- ⚠️ **Pre-existing**: TypeScript error TS6133 `userRole` declared but never read (line 12 TopBar.tsx)
- ⚠️ **Pre-existing**: TypeScript error TS6133 `idx` declared but never read (line 89 TopBar.tsx)
- ⚠️ **Perhatikan**: Warna badge berbeda antara section keluar (`#EFF6FF` biru) vs section masukan (`#FEF3C7` kuning) karena berbeda `status_approval` vs `status_tindak_lanjut`
- ⚠️ **Perhatikan**: `IconMenungguApproval` hanya muncul di section keluar (section masuk menggunakan `IconPendingDibalas` atau `IconSelesai` sesuai status)