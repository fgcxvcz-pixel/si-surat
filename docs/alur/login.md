# Alur Page: Login

## Tujuan
Halaman autentikasi masuk ke aplikasi SiSurat.

## Akses
- Semua user (entry point).
- Hanya tampil jika `!authed` di `App.tsx`.

## Backend
- API Express: `POST http://localhost:3000/api/auth/login`
- DB: MariaDB `sisurat_db` (tabel `pengguna` + `roles`)
- Password: bcrypt (default seed/migrasi: `qwerasdf`)
- Token: JWT 7 hari → localStorage `token`

## Alur user
1. Isi **Username** dan **Password**.
2. Klik **Masuk**.
3. Client: `login(username, password)` di `src/lib/api.ts` → `POST /api/auth/login`.
4. Server:
   - Cari `pengguna` by username + join `roles`.
   - `bcrypt.compare` password.
   - Response `{ token, user{id,nama,role} }`.
   - Error: username tidak ada / password salah.
5. Client simpan token + `userInfo` → `App.handleLogin` → dashboard.

## State
- `username`, `password`, `showPassword`, `loading`, `error`
- `usePasswordValidation(password)`

## Integrasi
- `src/pages/LoginPage.tsx`
- `src/lib/api.ts` → `login()`
- `src/lib/http.ts` → `setToken`, header `Authorization`
- `server/routes/auth.js`

## Catatan
- **Lupa password dinonaktifkan** — tombol menampilkan pesan hubungi administrator.
- Reset password: Admin → Manajemen Akun → Ganti Password (`PATCH /api/users/:id/password`).
- Default akun: `admin` / `taufik` password `qwerasdf` (setelah migrasi).
