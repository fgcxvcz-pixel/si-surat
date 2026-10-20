# Alur Fitur: FolderPanel

> Backend: Express + MariaDB. Data lewat `src/lib/api.ts` (lines 63-84).

## Tujuan
Sistem folder kustom (bukan file tree) untuk mengorganisasi surat masuk/keluar berdasarkan kategori pengguna. Folder dibuat user untuk grouping/tagging surat sesuai kebutuhan.

## Akses
- **Semua role** bisa **lihat** daftar folder
- **Hanya Admin/Super Admin** bs **create/delete** folder
- Fitur ini muncul di halaman **Surat Masuk** (title: "Pengirim") dan **Surat Keluar** (title: "Tujuan")

## Data yang dimuat
- `fetchCustomFolders("masuk")` / `fetchCustomFolders("keluar")`
- Returns: array nama folder dari API endpoint `/folders?tipe=${tipe}`
- `folderColors`: 7 warna predefined, di-rotate berdasarkan index folder

## FolderItem Interface
```typescript
interface FolderItem {
  key: string       // nama_folder (identifier)
  label: string     // display name
  count: number     // jumlah surat di folder ini
  color: string     // hex warna untuk styling
}
```

## Warna System (7 Warna Predefined)
Warna di-assign berdasarkan urutan folder muncul:
- **SuratMasuk warna**: `#2563EB`, `#7C3AED`, `#059669`, `#D97706`, `#DC2626`, `#0891B2`, `#C026D3`
- **SuratKeluar warna**: `#059669`, `#2563EB`, `#DC2626`, `#7C3AED`, `#D97706`, `#0891B2`
- Assignment formula: `color: folderColors[i % folderColors.length]`

### Contoh Penugasan Warna
- Folder ke-1 (index 0): warna pertama array (`0 % 7 = 0`)
- Folder ke-8 (index 7): warna pertama lagi (`7 % 7 = 0`)
- Folder ke-14 (index 13): warna ke-7 (`13 % 7 = 6`, index terakhir)
- **SuratKeluar**: Hanya 6 warna, jadi `i % 6` untuk wrap-around

### Contoh Visual
- Folder "Dinas": warna `#2563EB` (biru)
- Folder "Penting": warna `#D97706` (kuning)
- Folder "Sembako": warna `#059669` (hijau)

## Two Display Modes

| Mode | Width | Fitur |
|------|-------|-------|
| **Collapsed** | 48px | • Icon-only buttons (+ count badge)<br>• Tombol "Semua"<br>• Hover: `#F8FAFC` → `transparent`<br>• Hanya ikon + badge, tanpa label lengkap |
| **Expanded** | 224px | • Label lengkap terlihat<br>• Group expand/collapse (chevron right/left)<br>• Tombol Add/Delete di toolbar<br>• Hover: `#F8FAFC` |

### Mode Collapsed (48px)
- Setiap folder: tombol ikon dengan badge count di samping
- Tombol "Semua" di akhir daftar
- Background hover `#F8FAFC`, `onMouseLeave` → `transparent`
- `onClick={() => onSelect(f.key)}` → filter items by folder

### Mode Expanded (224px)
- Label folder lengkap terlihat di samping count
- Tombol chevron toggle untuk expand/collapse group
- Tombol Add/Delete ditampilkan di toolbar (hanya Admin/Super Admin)
- Background hover `#F8FAFC`, `onMouseLeave` → `transparent`
- `onClick={() => onSelect(f.key)}` → same function, but row now expanded

## "Semua" Folder Behavior
- **Ketika not selected**: menampilkan daftar folder spesifik
- **Ketika selected**: background `#EFF6FF`, text `#2563EB`
- **Toggle**: `onSelect("__all__")` berganti antara "Semua folder" dan "Folder tertentu"
- **Both modes**: `onSelect("__all__")` bekerja sama di collapsed dan expanded

## Interaksi Patterns

| Aksi | Hasil |
|------|-------|
| **Click folder** | `onSelect(f.key)` → filter items di halaman Surat Masuk/Keluar oleh folder name |
| **Click "Semua"** | `onSelect("__all__")` → tampilkan semua surat (tanpa filter folder) |
| **Hover** | Background `#F8FAFC`, `onMouseLeave` → `transparent` |
| **Expand/Collapse group** | Ikon chevron toggle (→ untuk collapse, ← untuk expand) |
| **Add folder** | Hanya Admin/Super Admin (`canManageFolder()`) → membuka modal/form input nama folder |
| **Delete folder** | Hanya Admin/Super Admin, konfirmasi dulu sebelum menghapus |

## Role-Based Access (`canManageFolder()`)
```typescript
export function canManageFolder(): boolean {
  try {
    const saved = localStorage.getItem("userInfo")
    const role: string = saved ? JSON.parse(saved).role : ""
    return role === "Admin" || role === "Super Admin" || role.includes("Super Admin")
  } catch {
    return false
  }
```
- **Hanya Admin/Super Admin** bs create/delete folder
- **Semua role** bs lihat folder dan memilih folder
- Returns `false` jika tidak ada userInfo di localStorage

## API Endpoints (api.ts:63-84)

| Fungsi | Method | Endpoint | Deskripsi |
|--------|--------|----------|-----------|
| `fetchCustomFolders(tipe)` | GET | `/folders?tipe=${tipe}` | Daftar folder berdasarkan tipe (masuk/keluar) |
| `createCustomFolder(tipe_surat, nama_folder)` | POST | `/folders` | Create folder baru |
| `deleteCustomFolderByName(nama_folder, tipe_surat?)` | DELETE | `/folders/by-name` | Hapus folder berdasarkan nama |
| `renameCustomFolder(oldName, newName, tipe_surat?)` | PATCH | `/folders/rename` | Rename folder |

### SuratMasuk.tsx Usage
```typescript
<FolderPanel title="Pengirim"
  :folders={customFolders}
  :selected={selectedFolder}
  :onSelect={onFolderSelect}
  :onMonthChange={onMonthChange}
  :onAddFolder={canManageFolder() ? () => setShowAddFolder(true) : undefined}
  :onDeleteWithConfirm={canManageFolder() ? (key) => { setOpenDetailId(null); setDeleteConfirm({ show: true, folder: key }) } : undefined}
  :totalCount={totalCount}
/>
```

### SuratKeluar.tsx Usage
```typescript
<FolderPanel title="Tujuan"
  :folders={customFolders}
  :selected={selectedFolder}
  :onSelect={onFolderSelect}
  :onMonthChange={onMonthChange}
  :onAddFolder={canManageFolder() ? () => setShowAddFolder(true) : undefined}
  :onDeleteWithConfirm={canManageFolder() ? (key) => { setOpenDetailId(null); setDeleteConfirm({ show: true, folder: key }) } : undefined}
  :totalCount={totalCount}
/>
```
- Both pages pass: `title`, `folders`, `selected`, `onSelect`, `month`, `onMonthChange`, `onAddFolder`, `onDeleteWithConfirm`, `totalCount`
- Warna array berbeda: SuratMasuk pakai warna array `#2563EB...`, SuratKeluar pakai `#059669...`

## Catatan / known issue
- `folder count` memperlakukan `folder===null && tujuan===cf` sebagai anggota folder (known issue dari dokumentasi sebelumnya)
- Warna array berbeda antara SuratMasuk vs SuratKeluar — perhatikan index mulai berbeda
- `canManageFolder()` hanya Admin/Super Admin — role check critical sebelum add/delete
- Duplicate delete-confirm modal bisa muncul (2 render cycle dengan state berbeda)
- Folder nama duplikat bisa terjadi jika user create folder dengan nama yang sama
- Warna harus konsisten jika folder sama muncul di kedua halaman (SuratMasuk dan SuratKeluar)

---
---
### Riwayat Perubahan
- **Versi 1.0**: Dokumentasi FolderPanel fitur lengkap beserta API, interaksi, dan role-based access
- **Catatan Penting**: Folder system ini bersifat *tag/filter* bukan *file tree* — tidak ada konsep parent/child hierarchy atau direktori struktur. Setiap folder adalah entitas independen dengan nama dan warna masing-masing.

---
---