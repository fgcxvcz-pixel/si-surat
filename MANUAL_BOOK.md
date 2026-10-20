# SiSurat - Manual Book Sistem Manajemen Surat

**Versi:** 1.0.0  
**Terakhir Update:** Oktober 2026  
**Aplikasi:** Sistem Manajemen Surat Masuk dan Surat Keluar Berbasis Web

---

## Daftar Isi

1. [Pendahuluan](#pendahuluan)
2. [Setup & Instalasi](#setup--instalasi)
3. [Otentikasi & Hak Akses](#otentikasi--hak-akses)
4. [Fitur Utama](#fitur-utama)
5. [Alur Operasional](#alur-operasional)
6. [Audit Logs & Monitoring](#audit-logs--monitoring)
7. [Referensi Teknis](#referensi-teknis)
8. [Troubleshooting](#troubleshooting)
9. [Tips & Best Practices](#tips--best-practices)

---

## Pendahuluan

### Latar Belakang

SiSurat adalah sistem manajemen surat berbasis web yang dikembangkan untuk **Sandya Networks Kantor Layanan Pacitan**. Sistem ini mengatasi masalah pengelolaan surat yang sebelumnya masih terpisah-pisah (menggunakan pengolah kata dan spreadsheet).

### Tujuan Sistem

- ✅ Penomoran surat otomatis (tidak duplikasi)
- ✅ Pengarsipan surat terpusat dengan pencarian efisien
- ✅ Alur persetujuan (approval) surat keluar secara digital
- ✅ Pengingat (reminder) otomatis untuk tindak lanjut
- ✅ Cetak surat resmi dengan tanda tangan digital
- ✅ Berbagi informasi surat via WhatsApp
- ✅ Audit trail lengkap untuk compliance

### Manfaat

| Aspek | Sebelum | Sesudah |
|-------|---------|--------|
| **Penomoran** | Manual, rawan duplikasi | Otomatis, tidak duplikasi |
| **Pencarian** | Sulit, tersebar di banyak lokasi | Cepat, terpusat dengan filter |
| **Approval** | Offline, memakan waktu | Digital, real-time |
| **Reminder** | Tidak ada | Otomatis, tidak ketinggalan |
| **Laporan** | Manual, memakan waktu | Otomatis, real-time |
| **Audit** | Tidak ada | Lengkap & traceable |

---

## Setup & Instalasi

### Prasyarat

- **Node.js** v24.14.1+
- **MariaDB/MySQL** v10.6+
- **npm** atau **yarn**
- **Laragon** (untuk Windows development)

### Langkah Instalasi

#### 1. Clone Repository
```bash
cd C:\laragon\www
git clone <repository-url> eoffices
cd eoffices
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Setup Environment Variables

Edit file `.env`:
```env
# Backend Express
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=sisurat_db
JWT_SECRET=d40589092fdd579ae68b2d22cb6eb009d7c21efc70f721124e805c8176cd575c
UPLOAD_DIR=./uploads

# Frontend Vite
VITE_API_URL=/api

# Email (Gmail SMTP)
EMAIL_USER=cssandya3@gmail.com
EMAIL_PASSWORD=kgwv buwq ptkb rqay
MAIL_FROM=SiSurat <cssandya3@gmail.com>
OTP_EXPIRY_MINUTES=15
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

#### 4. Jalankan Database Schema
```bash
npm run db:schema
```

Output yang diharapkan:
```
Menjalankan database/schema.sql …
Selesai. Seed roles, master data, dan akun admin sudah dibuat ulang.
pengguna: [
  { id: 1, username: 'admin' },
  { id: 2, username: 'taufik' }
]
```

#### 5. Start Development Server

**Terminal 1 (Backend API)**
```bash
npm run dev:api
```

Output:
```
Server running on http://localhost:3000
Connected to MariaDB: sisurat_db
```

**Terminal 2 (Frontend Vite)**
```bash
npm run dev
```

Output:
```
VITE v8.0.0 ready in 123 ms
➜ Local: http://localhost:5173/
```

Buka browser: **http://localhost:5173**

#### 6. Build untuk Production
```bash
npm run build
npm run preview
```

---

## Otentikasi & Hak Akses

### Role-Based Access Control (RBAC)

SiSurat memiliki 3 role dengan hak akses berbeda:

#### 1. **Super Admin**
- Akses penuh ke semua fitur
- Tidak ditampilkan di halaman Manajemen Akun (tidak bisa diedit/dihapus dari UI)
- Bisa manage semua pengguna, master data, tanda tangan
- Bisa approve surat keluar
- Bisa view audit logs lengkap

#### 2. **Admin**
- Akses ke Manajemen Akun, Master Data, Dashboard, Audit Logs
- Tidak bisa approve surat (hanya lihat)
- Bisa manage pengguna dan data referensi
- Bisa view audit logs

#### 3. **Kepala Bagian**
- Akses terbatas: Dashboard, Surat Masuk, Surat Keluar, Tanda Tangan
- Tidak punya akses Manajemen Akun, Master Data, Audit Logs
- Bisa approve surat keluar
- Bisa upload/manage tanda tangan digital

### Login

#### Default Account
```
Username: admin
Password: qwerasdf
```

#### Alur Login

1. Buka halaman **Login** (entry point)
2. Input **Username** dan **Password**
3. Klik **Masuk**
4. Sistem validasi via `POST /api/auth/login`
5. Jika berhasil:
   - Token JWT disimpan di localStorage
   - Redirect ke Dashboard
   - User info ditampilkan di Top Bar

#### Token & Session

- **Token Expiry**: 7 hari
- **Storage**: localStorage (key: `token`)
- **Header**: `Authorization: Bearer <token>`
- **Session Check**: Otomatis saat mount App (call `/api/auth/me`)
- **Logout Otomatis**: Jika token expired atau user dihapus

---

## Fitur Utama

### Dashboard

**Akses:** Semua role login  
**Path:** `/` atau `/dashboard`

**Konten:**
1. **Greeting & Waktu** - Selamat pagi/siang/sore/malam + nama user + tanggal
2. **3 Kartu Statistik** (bulan ini):
   - Surat Masuk: jumlah surat masuk diterima
   - Surat Keluar: total surat keluar dikirim
   - Surat Balasan: surat keluar yg direferensi SM
3. **Rekap Periodik** (tabel):
   - Toggle: Minggu Ini | Bulan Ini | Kuartal Ini
   - Baris per periode dengan count masuk/keluar/total
   - Tombol ekspor ke Excel

**Rekap Periodik:**
- **Minggu Ini**: Baris per hari (Senin-Minggu)
- **Bulan Ini**: Baris per minggu bulan berjalan
- **Kuartal Ini**: Baris per bulan tahun berjalan

**Ekspor Data:**
- Klik **[ Ekspor Excel ]**
- Format: `.xlsx` 
- Nama: `Rekap_Surat_<periode>_<tanggal>.xlsx`

---

### Surat Masuk

**Akses:** Semua role login  
**Path:** `/surat-masuk`

**Komponen:**
1. **Sidebar Folder** (kiri) - Folder custom bulan berjalan
2. **Search & Filter** - Cari, kategori, status, tanggal
3. **Tabel Surat** - List surat masuk dengan pagination

**Aksi Utama:**

| Aksi | Keterangan |
|------|-----------|
| **Tambah** | Form tambah surat masuk (nomor, pengirim, perihal, file PDF) |
| **Lihat Detail** | Expand row → lihat isi lengkap, preview PDF |
| **Balas** | Buat surat keluar sebagai balasan (tindak lanjut) |
| **Edit** | Ubah data surat masuk |
| **Hapus** | Hapus surat + file attachment |
| **Bagikan WhatsApp** | Share ke WhatsApp |
| **Ekspor Excel** | Download surat sesuai filter |

**Status Surat Masuk:**
- **Tidak** (default) - Belum ada tindakan
- **Menunggu** - Sedang dalam proses balasan (punya reminder)
- **Menunggu Approval** - Surat keluar balasan menunggu approval
- **Selesai** - Surat keluar balasan sudah diapprove

**Tindak Lanjut (Balas):**
1. Klik **[ Balas? ]** pada detail surat
2. Input deadline (opsional, default +7 hari)
3. Pilih:
   - **[ Simpan ]** - Simpan deadline, update status ke "menunggu"
   - **[ Lanjut ke Form ]** - Buka form Tambah Surat Keluar (balasan)

---

### Surat Keluar

**Akses:** Semua role login (approval hanya Kepala/Super Admin)  
**Path:** `/surat-keluar`

**Komponen:** Mirip Surat Masuk, dengan fitur tambahan

**Aksi Utama:**

| Aksi | Keterangan | Role |
|------|-----------|------|
| **Tambah** | Form tambah surat keluar (nomor auto, tujuan, perihal) | Semua |
| **Lihat Detail** | Expand row → lihat isi, preview PDF | Semua |
| **Approve** | Setujui surat (set TTD, status disetujui) | Kepala/Super |
| **Preview** | Preview PDF format surat resmi | Semua |
| **Cetak** | Cetak PDF surat | Semua |
| **Edit** | Ubah data surat | Semua |
| **Hapus** | Hapus surat + file | Semua |
| **Bagikan WhatsApp** | Share ke WhatsApp | Semua |
| **Ekspor Excel** | Download surat sesuai filter | Semua |

**Nomor Otomatis:**
- Format: `XXX/SK/YYYY` (XXX = urut 3 digit, YYYY = tahun)
- Contoh: `001/SK/2026`, `002/SK/2026`
- Generated via backend RPC (tidak duplikasi)

**Alur Approval:**
1. Surat dibuat → status: "Menunggu"
2. Kepala buka Surat Keluar
3. Klik **[ Approve ]** pada surat
4. Dialog: Konfirmasi + tampilkan TTD aktif pengguna
5. Klik **[ Setujui ]**
6. Proses:
   - SK status → "Disetujui"
   - SK id_ttd → TTD aktif Kepala
   - SM terkait status → "Selesai"
   - Reminder → "Selesai"
   - Audit log dicatat

**Batch Delete (Fitur Baru):**
- Delete multiple surat sekaligus (max 100)
- Transaction-based (all-or-nothing)
- Auto-delete file attachment
- Permission check per surat
- Audit logging per item

**Endpoint:** `DELETE /api/surat-keluar/batch`
```json
Request: { "ids": [1, 2, 3] }
Response: { "ok": true, "deleted": 3, "message": "..." }
```

---

### Manajemen Akun

**Akses:** Super Admin & Admin  
**Path:** `/manajemen-akun`

**Fitur CRUD User:**

| Aksi | Dialog | Validasi |
|------|--------|----------|
| **Tambah** | Form: username, nama, email, role, password | Unique user/email, password ≥8 kar |
| **Edit** | Form: nama, email, role | Unique email |
| **Ganti Password** | Form: password baru, konfirmasi | ≥8 kar, match |
| **Hapus** | Confirm dialog (cascade surat + TTD) | - |

**Access Control:**
- Super Admin: Filter out dari list (tidak bisa diedit)
- Role Admin: Exclude dari dropdown
- Kepala Bagian: Kartu "Akses Ditolak"

---

### Master Data

**Akses:** Super Admin & Admin  
**Path:** `/master-data`

**Tab Interface (4 Tab):**

1. **Jenis Surat Masuk** - List jenis (tambah/rename/hapus)
2. **Jenis Surat Keluar** - List jenis (auto kode)
3. **Kategori** - Biasa/Penting (tambah/rename/hapus)
4. **Folder Custom** - Dual panel masuk/keluar

**Operasi CRUD:**
- **Tambah:** Input nama → Enter/tombol +
- **Rename:** Klik → inline edit → Enter/✓
- **Delete:** Klik row → confirm → hapus
- **Search:** Client-side filter

**⚠️ Catatan:** Perubahan master data tidak invalidate cache. User perlu reload/logout-login untuk melihat perubahan terbaru.

---

### Tanda Tangan Digital

**Akses:** Kepala Bagian & Super Admin  
**Path:** `/tanda-tangan`

**Fitur:**

| Status | Tampilan | Aksi |
|--------|----------|------|
| **Belum Upload** | Upload form | Pilih file image (PNG/JPG, ≤2MB) → Upload |
| **Sudah Upload** | Preview gambar + metadata | Tombol "Hapus & Upload Ulang" |

**Single Active TTD per User:**
- Hanya 1 TTD aktif per user
- Upload baru → TTD lama otomatis nonaktif
- Digunakan saat approve surat keluar

**Penggunaan:**
- Saat Kepala approve SK → TTD aktif Kepala otomatis linked
- Preview/cetak PDF → render gambar TTD

---

### Audit Logs

**Akses:** Super Admin & Admin  
**Path:** `/audit-logs`

**Tujuan:** Mencatat setiap perubahan data (audit trail)

**Komponen:**

| Fitur | Keterangan |
|-------|-----------|
| **Filter Form** | User, Action Type, Table, Date Range |
| **List Tabel** | Timestamp, Username, Action, Table, Record ID, Description, IP |
| **Row Detail** | Expand → lihat old_values, new_values (JSON) |
| **Timeline** | History lengkap 1 record (oldest → newest) |
| **Export** | Download ke Excel sesuai filter |

**Action Type:**
- **CREATE** - Record dibuat
- **UPDATE** - Record diubah (capture diff)
- **DELETE** - Record dihapus
- **APPROVE** - Surat disetujui

**Data Captured:**
- User ID, Username, IP Address
- Timestamp, Action, Table, Record ID
- Old Values (sebelum perubahan)
- New Values (setelah perubahan)
- Description (human-readable)

**Contoh Log:**
```
DELETE | surat_masuk | 123 | Admin | 192.168.1.100 | 2026-10-19 10:30:45
Description: Surat masuk dihapus: Dinas Perhubungan | Permohonan Data | 001/SM/2026
Old Values: { nomor_surat: "001/SM/2026", pengirim: "Dinas Perhubungan" }
```

**Monitoring:**
- Admin harus review audit logs secara berkala
- Watch for suspicious patterns (multiple DELETE, bulk operations)
- Monthly export untuk compliance

---

### Laporan & Ekspor

#### Export Surat ke Excel

**Tersedia di:** Surat Masuk & Surat Keluar

```
[ Ekspor ]
```

- Format: `.xlsx`
- Nama: `Surat_Masuk_<bulan>_<tahun>.xlsx`
- Konten: Sesuai filter aktif (bukan semua)
- Kolom: No, Nomor, Tanggal, Pengirim/Tujuan, Perihal, Status

#### Export Rekap Dashboard

**Di:** Dashboard

```
[ Ekspor Excel ]
```

- Format: `.xlsx`
- Nama: `Rekap_Surat_<periode>_<tanggal>.xlsx`
- Periode: Minggu/Bulan/Kuartal
- Kolom: Periode, Masuk, Keluar, Total

#### Cetak PDF Surat Keluar

**Di:** Surat Keluar detail

```
[ Cetak ]
```

- Format: A4 PDF
- Konten: Kop surat, nomor, tujuan, perihal, isi, TTD
- Action: Print browser (Ctrl+P) atau save as PDF

---

## Alur Operasional

### Alur Lengkap: Dari Surat Masuk hingga Approval

```
STEP 1: TERIMA SURAT MASUK
├─ Admin/Kepala: Buka Surat Masuk
├─ Klik [ + Tambah Surat ]
├─ Form: nomor, pengirim, perihal, upload PDF
├─ Centang "Perlu Tindak Lanjut" + deadline
└─ Klik [ Simpan ]
   → Surat tercatat, status: "Tidak"
   → Reminder dibuat

STEP 2: BALAS SURAT (CREATE SURAT KELUAR)
├─ Di detail Surat Masuk
├─ Klik [ Balas? ]
├─ Input deadline (opsional)
├─ Klik [ Lanjut ke Form ]
└─ Redirect ke Tambah Surat Keluar
   → Prefill: tujuan, perihal "Re: ...", kategori
   → Status SM: "Menunggu Approval"

STEP 3: INPUT SURAT KELUAR
├─ Modal Tambah Surat Keluar
├─ Nomor auto (readOnly)
├─ Isi: tujuan, perihal, isi, file (opsional)
├─ Klik [ Simpan ]
└─ SK tercipta, status: "Menunggu"
   → Siap untuk approval Kepala

STEP 4: APPROVAL (KEPALA/SUPER ADMIN)
├─ Kepala: Buka Surat Keluar
├─ Cari SK status "Menunggu"
├─ Klik [ Approve ]
├─ Dialog konfirmasi + TTD aktif
├─ Klik [ Setujui ]
└─ Proses:
   → SK: status → "Disetujui", id_ttd set
   → SM: status → "Selesai"
   → Reminder: status → "Selesai"
   → Audit log: dicatat APPROVE

STEP 5: CETAK & BAGIKAN
├─ Kepala/Admin: Di detail SK (diapprove)
├─ Klik [ Preview ] → lihat PDF + TTD
├─ Klik [ Cetak ] → buka halaman cetak
├─ Ctrl+P → cetak/save PDF
└─ Atau Bagikan WhatsApp
   → Surat siap didistribusikan
```

### Alur Batch Delete

```
1. USER PILIH SURAT (max 100)
   └─ Checkbox di list

2. KLIK [ DELETE BATCH ]
   └─ Dialog: "Yakin? File akan dihapus."

3. BACKEND (Transaction)
   ├─ START TRANSACTION
   ├─ Loop per ID:
   │  ├─ Check permission
   │  ├─ Query file attachment
   │  ├─ Delete files dari disk
   │  ├─ Delete record
   │  └─ Log audit
   ├─ Jika ada error: ROLLBACK (semua batal)
   └─ Jika sukses: COMMIT

4. RESPONSE
   └─ Success: { deleted: N, message: "..." }
      OR Error: { error: "...", failed: [...] }

5. UI UPDATE
   ├─ Toast notification
   ├─ Refetch list
   └─ Checkbox reset
```

---

## Audit Logs & Monitoring

### Memahami Audit Logs

**Setiap aksi dicatat:**

| Action | Logged | Contoh |
|--------|--------|--------|
| CREATE Surat | ✅ | Surat masuk dibuat |
| UPDATE Surat | ✅ | Perihal diubah (capture diff) |
| DELETE Surat | ✅ | Surat dihapus + file attachment |
| APPROVE Surat | ✅ | Kepala approve SK + TTD |
| Batch Delete | ✅ | 3 surat dihapus (3 logs) |

**Data Captured:**

```json
{
  "timestamp": "2026-10-19 10:30:45",
  "user": "admin",
  "ip_address": "192.168.1.100",
  "action": "DELETE",
  "table": "surat_masuk",
  "record_id": 123,
  "old_values": {
    "nomor_surat": "001/SM/2026",
    "pengirim": "Dinas Perhubungan"
  },
  "description": "Surat masuk dihapus: Dinas Perhubungan | Permohonan Data | 001/SM/2026"
}
```

### View Audit Logs

**Path:** `/audit-logs` (Super Admin & Admin only)

**Filter:**
- User
- Action Type (CREATE, UPDATE, DELETE, APPROVE)
- Table (surat_masuk, surat_keluar, pengguna, etc)
- Date Range

**Fitur:**
- **List View** - Pagination 50/page
- **Row Detail** - Expand → lihat old_values, new_values
- **Timeline** - History lengkap 1 record
- **Export** - Download ke Excel

### Monthly Compliance Report

Admin harus generate setiap bulan:

1. Buka `/audit-logs`
2. Filter: bulan tertentu
3. Klik **[ Export ]** → `audit-logs-YYYY-MM.xlsx`
4. Review:
   - Siapa delete surat
   - Siapa approve surat
   - Update/perubahan major
5. Archive untuk compliance

### Red Flags

| Pattern | Action |
|---------|--------|
| Multiple DELETE dalam 1 jam | Investigate: bulk operation atau tampering? |
| DELETE oleh non-owner | Check permission: authorized? |
| Approve tanpa TTD | Process violation? |
| DELETE kemudian CREATE nomor sama | Duplicate masking? |

---

## Referensi Teknis

### Architecture

```
┌──────────────────────────────────────────────────┐
│           FRONTEND (React 19 + TypeScript)       │
│          Vite 8.0 + Tailwind CSS 4.3             │
│              http://localhost:5173               │
└─────────────────────┬──────────────────────────┘
                      │ /api
┌──────────────────────▼──────────────────────────┐
│         BACKEND (Express.js Server)             │
│            Port 3000                            │
│    JWT Auth + Parameterized Queries             │
└─────────────────────┬──────────────────────────┘
                      │ MySQL Protocol
┌──────────────────────▼──────────────────────────┐
│      DATABASE (MariaDB 10.6+)                   │
│      Database: sisurat_db                       │
│   Connection Pool (10 connections)              │
└──────────────────────────────────────────────────┘
```

### Database Tables

**Key Tables:**

| Tabel | Purpose |
|-------|---------|
| `pengguna` | User accounts + roles |
| `roles` | Role definitions (Super Admin, Admin, Kepala) |
| `surat_masuk` | Incoming mail |
| `surat_keluar` | Outgoing mail |
| `tanda_tangan_digital` | Digital signatures |
| `reminders` | Tindak lanjut reminders |
| `audit_logs` | Audit trail |
| `jenis_surat_masuk` | Incoming mail types |
| `jenis_surat_keluar` | Outgoing mail types |
| `kategori` | Mail categories (biasa/penting) |
| `custom_folder_surat_masuk` | Custom folders for incoming mail |
| `custom_folder_surat_keluar` | Custom folders for outgoing mail |

### API Endpoints

**Auth:**
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

**Surat Masuk:**
```
GET    /api/surat-masuk
POST   /api/surat-masuk
PATCH  /api/surat-masuk/:id
DELETE /api/surat-masuk/:id
DELETE /api/surat-masuk/batch
PATCH  /api/surat-masuk/:id/status
```

**Surat Keluar:**
```
GET    /api/surat-keluar
POST   /api/surat-keluar
PATCH  /api/surat-keluar/:id
DELETE /api/surat-keluar/:id
DELETE /api/surat-keluar/batch
POST   /api/surat-keluar/:id/approve
GET    /api/surat-keluar/nomor
```

**Users:**
```
GET    /api/users
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id
PATCH  /api/users/:id/password
```

**Audit Logs:**
```
GET    /api/audit-logs
GET    /api/audit-logs/timeline/:table/:record_id
POST   /api/audit-logs/export
```

**Master Data:**
```
GET    /api/master-data/...
POST   /api/master-data/...
PATCH  /api/master-data/...
DELETE /api/master-data/...
```

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 3000 | Express server port |
| `DB_HOST` | 127.0.0.1 | MySQL host |
| `DB_PORT` | 3306 | MySQL port |
| `DB_USER` | root | MySQL user |
| `DB_PASSWORD` | (empty) | MySQL password |
| `DB_NAME` | sisurat_db | Database name |
| `JWT_SECRET` | (required) | JWT signing key |
| `UPLOAD_DIR` | ./uploads | File upload directory |
| `VITE_API_URL` | /api | Frontend API base URL |
| `EMAIL_USER` | (required) | Gmail email |
| `EMAIL_PASSWORD` | (required) | Gmail app password |
| `MAIL_FROM` | SiSurat | Sender name |
| `SMTP_HOST` | smtp.gmail.com | SMTP server |
| `SMTP_PORT` | 587 | SMTP port |

### Security Features

- **Password Hashing:** bcryptjs (12 rounds)
- **JWT Auth:** HS256, 7 days expiry
- **SQL Injection:** Parameterized queries
- **File Upload:** MIME type + size validation
- **Role-Based Access:** Super Admin, Admin, Kepala Bagian
- **Audit Logging:** Immutable, all CRUD + APPROVE
- **IP Logging:** Capture client IP per action

---

## Troubleshooting

### MySQL Connection Failed

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Solusi:**
1. Pastikan MySQL running di Laragon
2. Laragon Control Panel → Start MySQL
3. Cek `.env` host/port sesuai MySQL config
4. Test: `npm run db:schema`

### Token Expired

**Error:**
```
401 Unauthorized - Token Expired
```

**Solusi:**
- Logout → Login kembali
- Token baru valid 7 hari

### File Upload Failed

**Error:**
```
Upload gagal / File tidak tersimpan
```

**Solusi:**
1. Cek ukuran file (≤1.5MB PDF, ≤2MB image)
2. Cek format (PDF/PNG/JPG saja)
3. Cek permission folder `uploads/`
4. Cek disk space

### Nomor Surat Duplikasi

**Error:**
```
Duplicate entry 'XXX/SK/2026' for key 'nomor_surat'
```

**Solusi:**
1. Nomor SK sudah ada
2. Cek database: `SELECT * FROM surat_keluar WHERE nomor_surat='...'`
3. Manual delete atau generate ulang

---

## Tips & Best Practices

### Untuk Admin

1. **Rutin Backup Database**
   ```bash
   mysqldump -u root -p sisurat_db > backup_`date +%Y%m%d`.sql
   ```

2. **Monitor Audit Logs**
   - Audit Logs → filter per bulan
   - Detect suspicious activity
   - Monthly compliance export

3. **Manage Master Data**
   - Update jenis surat/kategori sesuai kebutuhan
   - **Ingat:** Cache perlu refresh (logout-login)

4. **Reset Password**
   - Manajemen Akun → Ganti Password
   - Jangan bagikan password default

5. **Backup File Attachment**
   - Folder: `uploads/`
   - Backup rutin

### Untuk Kepala Bagian

1. **Approval Workflow**
   - Check TopBar bell untuk notifikasi pending SK
   - Approve di halaman Surat Keluar
   - Pastikan TTD aktif sebelum approve

2. **Upload Tanda Tangan**
   - Halaman Tanda Tangan → Upload image
   - Format: PNG/JPG, ≤2MB
   - TTD aktif otomatis digunakan saat approve

3. **Preview Sebelum Cetak**
   - Selalu preview PDF
   - Cek tanda tangan sudah muncul

4. **Tracking Tindak Lanjut**
   - Monitor reminder di TopBar bell
   - Balas surat via "Balas?" button
   - Set deadline

### Untuk User Umum

1. **Input Data Lengkap**
   - Nomor, tanggal, pengirim/tujuan, perihal
   - Upload file PDF (wajib untuk SM)

2. **Pencarian Efisien**
   - Gunakan filter: kategori, status, tanggal
   - Search: nomor, pengirim/tujuan, perihal

3. **Backup Lokal**
   - Export surat ke Excel berkala
   - Export laporan dari dashboard

4. **Perhatian Delete**
   - Delete surat = permanent (tidak bisa restore)
   - File attachment ikut terhapus
   - Confirm sebelum delete

---

## Support & Feedback

Untuk pertanyaan, laporan bug, atau feature request:

- **Email**: support@sisurat.app
- **WhatsApp**: +62 123 456 7890
- **Issue Tracker**: GitHub Issues
- **Documentation**: [Project Wiki]

---

**© 2026 Sandya Networks - Sistem Manajemen Surat (SiSurat)**

Version 1.0.0 | Last Updated: October 19, 2026
