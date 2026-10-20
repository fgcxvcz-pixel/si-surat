# Alur Page: Sidebar

> Backend: Express + MariaDB. Data lewat `src/lib/api.ts` dan `src/lib/constants`.

## Tujuan
Menampilkan navigasi sidebar yang sesuai role user (Super Admin / Kepala / Admin/user) dan menu yang dapat diakses.

## Akses
- Semua role login
- MenuSidebar: posisi kiri halaman aplikasi
- Menyesuaikan dengan `role` dari `localStorage.getItem("userInfo")`

## Data yang dimuat
- `userInfo = JSON.parse(localStorage.getItem("userInfo"))`
- `userRole = (userInfo?.role || "").toLowerCase()`
- `isSuperAdmin = role === "Super Admin"`
- `isKepalaRole = role === "Kepala" || role === "Kepala Bagian"`
- `canManageFolder()` → hanya Admin/Super Admin (constants.ts:68-76)

## Alur user
### 1. Inisialisasi Role
- `useMemo` mendapatkan `userInfo` dari `localStorage` (lines 7-10 contoh di TopBar.tsx)
- `isKepala = isKepalaRole(userInfo?.role)` (constants.ts:37-38)
- `isSuper = isSuperAdmin(userInfo?.role)` (constants.ts:34-35)

### 2. Struktur Menu Navigasi
```typescript
const nav = [
  { id: "dashboard", label: "Dashboard", icon: <IconDashboard /> },
  { id: "surat-masuk", label: "Surat Masuk", icon: <IconInbox /> },
  { id: "surat-keluar", label: "Surat Keluar", icon: <IconPaperPlane /> },
  ...(isSuper ? [
    { id: "manajemen-akun", label: "Manajemen Akun", icon: <IconUsers /> },
    { id: "master-data", label: "Master Data", icon: <IconFolder /> },
    { id: "tanda-tangan", label: "Tanda Tangan", icon: <IconPenTool /> },
  ] : isKepala ? [
    { id: "tanda-tangan", label: "Tanda Tangan", icon: <IconPenTool /> },
  ] : [
    { id: "manajemen-akun", label: "Manajemen Akun", icon: <IconUsers /> },
    { id: "master-data", label: "Master Data", icon: <IconFolder /> },
  ]),
  { id: "rekap-surat", label: "Rekap Surat", icon: <IconAllMail /> },
]
```

### 3. Role-Based Visibility (Final)

| Role | Menu yang Tersedia |
|------|-------------------|
| **Super Admin** | Dashboard, Surat Masuk, Surat Keluar, **Manajemen Akun**, **Master Data**, **Tanda Tangan**, Rekap Surat |
| **Kepala** | Dashboard, Surat Masuk, Surat Keluar, **Tanda Tangan** (hanya), Rekap Surat |
| **Admin/user** | Dashboard, Surat Masuk, Surat Keluar, **Manajemen Akun**, **Master Data**, Rekap Surat |

### 4. Navigasi ke Halaman
- Click menu → `setPage(item.id)` di `App.tsx`
- Page routing menentukan komponen yang dirender
- `collapsed` mode: width 64px, hanya icon + badge
- `expanded` mode: width 224px, icon + label lengkap

### 5. Fungsi Role Check
- `isSuperAdmin(role)` → `role === "Super Admin"` (constants.ts:34)
- `isKepalaRole(role)` → `role === "Kepala"` or `role === "Kepala Bagian"` (constants.ts:37)
- `canManageFolder()` → hanya Admin/Super Admin bs create/delete folder (constants.ts:68-76)

## Integrasi
- `src/components/Sidebar.tsx` (semua line — konstanta `nav` array beserta conditional rendering)
- `src/lib/constants.ts:34-41` (isSuperAdmin, isKepalaRole, canManageFolder)
- `src/App.tsx` (state `page`, routing berdasarkan menu yang dipilih)
- `src/main.tsx` → mount di `#root`, mendeteksi perubahan page

## Catatan / known issue
- **Tidak ada nested routes** (semua flat menu item)
- **Logika kondisi**: `...(isSuper ? [...]: isKepala ? [...]: [...])` — satu baris ternary yang sangat panjang
- **Badge hanya muncul** jika ada `item.badge` property di definisi menu
- **`collapsed` state** hanya affects width (64px vs 224px), tidak menghapus atau menyembunyikan menu
- **Setiap role memiliki jumlah menu yang berbeda**: Super Admin (9 item), Kepala (5 item), Admin (7 item)
- **Menu selalu ada**: Dashboard, Surat Masuk, Surat Keluar, Rekap Surat — selalu terlihat untuk semua role

---
---

### Catatan Khusus mengenai `isKepalaRole` vs `isSuperAdmin`

Fungsi-fungsi role checking ini didefinisikan di `src/lib/constants.ts:34-41`:

```typescript
export const isSuperAdmin = (role: string | null | undefined) =>
  role === "Super Admin" || role?.includes("Super Admin") || false

export const isKepalaRole = (role: string | null | undefined) =>
  role === "Kepala" || role === "Kepala Bagian" || role?.includes("Kepala") || false

export const isAdminRole = (role: string | null | undefined) =>
  role === "Admin" || role === "Super Admin" || role?.includes("Admin") || false
```

- `isSuperAdmin` paling luas: mencakup `Super Admin` lengkap atau sebagian word "Super Admin"
- `isKepalaRole` spesifik: hanya `Kepala` atau `Kepala Bagian`, tetapi juga mencakup word "Kepala" dalam string lain
- Perbedaan ini mempengaruhi menu sidebar: Super Admin memiliki 9 menu, Kepala memiliki 5 menu (hanya Tanda Tangan di antara keduanya), sedangkan Admin/user memiliki 7 menu (tanpa Tanda Tangan)

---
---