# Alur Page: Lupa Password

## Tujuan
Reset password mandiri via **OTP email** (Gmail SMTP + App Password).

## Backend
- Express API (public, tanpa JWT):
  - `POST /api/auth/forgot` `{ username }` → kirim OTP 6 digit ke email
  - `POST /api/auth/reset` `{ username, otp, newPassword }` → set bcrypt password
- DB: tabel `password_reset_otps` (hash OTP, expiry, attempts, single-use)
- Email: `nodemailer` + Gmail SMTP (`EMAIL_USER` / `EMAIL_PASSWORD` di `.env`)
- Masa berlaku OTP: **15 menit** (`OTP_EXPIRY_MINUTES`)
- Max percobaan verify: **5** lalu kode basi
- Rate limit `/forgot`: **5x / 15 menit** per username

## Akses
- Tombol **"Lupa Password?"** di Login → halaman `lupa-password` (saat belum login).
- Reset oleh Admin via Manajemen Akun **tetap tersedia** (jalur alternatif).

## Alur user (3 step)

### Step 1 — Username
1. Isi **Username** → **Kirim OTP**.
2. `forgotPassword(username)` → `POST /api/auth/forgot`.
3. Server: cari `pengguna`; jika ada → generate OTP + hash + insert + kirim email.
4. Response **generik** (tidak bocorkan username ada/tidak): "Jika username terdaftar, kode OTP telah dikirim ke email."
5. Jika SMTP gagal: log server; user tetap dapat pesan generik.

### Step 2 — OTP
1. Buka email **SiSurat** → kode 6 digit.
2. Input kode → **Lanjut** (validasi format client).
3. **Kirim ulang** → `POST /auth/forgot` lagi (kena rate limit server bila berlebih).

### Step 3 — Password baru
1. Password baru + konfirmasi (min 8, harus cocok, `usePasswordValidation`).
2. **Ubah Password** → `POST /api/auth/reset`.
3. Server: cek OTP aktif (belum dipakai, belum expired, attempts < 5) → bcrypt compare → `UPDATE pengguna.password` → `used_at`.
4. Sukses → kembali ke Login.

## Email
- Dari: `MAIL_FROM` (default `SiSurat <EMAIL_USER>`)
- Subjek: `Kode Reset Password SiSurat`
- Body: kode besar + catatan berlaku 15 menit + jangan bagikan

## Integrasi
- `src/pages/LupaPasswordPage.tsx`
- `src/pages/LoginPage.tsx` (tombol navigasi)
- `src/App.tsx` (route `lupa-password`)
- `src/lib/api.ts`: `forgotPassword`, `resetPasswordOtp`
- `server/routes/auth.js`, `server/utils/mailer.js`, `server/utils/otp.js`

## Keamanan
- OTP disimpan **bcrypt hash**, bukan plaintext.
- Single-use + expiry 15 menit + max 5 attempts.
- Error generik saat verify gagal (anti-enumeration).
- `.env` (App Password) tidak di-commit.

## Catatan
- Butuh akun Gmail dengan **2-Step Verification** + **App Password**.
- Dev tanpa SMTP: `/forgot` sukses generik + log error — user tidak dapat email (cek `logs/api-err.log`).
- Admin reset di Manajemen Akun tetap jalan sebagai fallback.
