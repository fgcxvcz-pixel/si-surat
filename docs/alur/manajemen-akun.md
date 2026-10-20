# Alur Page: Manajemen Akun

## Tujuan
CRUD pengguna (akun), reset password admin, tampilan hak akses per role.

## Backend
- Express API: `/api/users` (JWT Admin / Super Admin)
- DB: MariaDB `sisurat_db` — tabel `pengguna` + `roles`
- Password: bcrypt (default seed/migrasi: `qwerasdf`)

## Akses
- Menu Sidebar:
  - **Super Admin**: terlihat
  - **Admin**: terlihat
  - **Kepala Bagian**: **tidak** ada di sidebar
- In-page: jika role Kepala → kartu **"Akses Ditolak"**.
- Super Admin users **difilter keluar** dari list (tidak bisa diedit/dihapus dari UI).
- Server: `requireRole('Admin', 'Super Admin')` untuk semua route `/api/users`.

## Data yang dimuat
- `fetchUsers()` → `GET /api/users` (join roles → `id_role: { id, nama_role }`)
- `fetchRoles()` → `GET /api/roles` (dropdown modal edit/tambah)
- Delete: `deleteUser(id)` → `DELETE /api/users/:id` (cascade surat + TTD via FK)

## Alur user

### 1. List
- Tabel pengguna: nama, username, email, role.
- Filter out role "Super Admin".
- Kartu penjelas role statis (Admin / Kepala Bagian).

### 2. Tambah Akun
- `ModalTambahAkun`: username, nama, email, role (list **tanpa** "Super Admin"), password (+ `usePasswordValidation`).
- Save → `createUser` → `POST /api/users`:
  1. Validasi field + duplikat username/email.
  2. Insert `pengguna` dengan **bcrypt** hash password + `id_role`.
- Response: `{ user: { id, username, nama } }` → toast + refetch list.

### 3. Edit
- `ModalEditUser`: nama, username, email, role.
- Deteksi perubahan → tolak jika "Tidak ada perubahan data".
- Save → `updateUserProfile` → `PATCH /api/users/:id` (**diff-only**, hanya key berubah).
- **Tanpa field password** di modal ini.

### 4. Ganti Password
- `ModalGantiPassword`: password baru + konfirmasi, ≥8 karakter, harus cocok.
- Save → `adminUpdatePassword` → `PATCH /api/users/:id/password` `{ newPassword }`:
  1. Hash bcrypt di server.
  2. Update kolom `pengguna.password`.

### 5. Hapus
- Confirm modal (peringatan cascade surat + TTD).
- `DELETE /api/users/:id` — FK `ON DELETE CASCADE` pada surat + TTD; `approved_by` → NULL.
- Toast + refetch.

## State / integrasi
- `src/pages/ManajemenAkun.tsx`
- `src/components/modals/ModalTambahAkun.tsx`, `ModalEditUser.tsx`, `ModalGantiPassword.tsx`
- `src/lib/api.ts`: `fetchUsers`, `deleteUser`, `createUser`, `updateUserProfile`, `adminUpdatePassword`, `fetchRoles`
- `src/lib/http.ts` → header JWT `Authorization: Bearer …`
- `src/hooks/usePasswordValidation.ts`

## Catatan / known issue
- Role gate: UI (sidebar + kartu akses ditolak) + server `requireRole`.
- **Lupa password dinonaktifkan** — reset hanya via Admin di halaman ini.
- Password default user hasil migrasi/seed: `qwerasdf`.
