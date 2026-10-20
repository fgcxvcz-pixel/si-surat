# Deploy SiSurat ke VPS

Panduan deploy aplikasi **SiSurat** (Express + MariaDB + React build) ke server perusahaan.

**Target OS:** Ubuntu 22.04 / Debian 12 (paling umum).  
Catatan singkat untuk OS lain ada di bagian **Troubleshooting**.

---

## Arsitektur

```
Internet â†’ Nginx :80/:443
              â”œâ”€â”€ /           â†’ /var/www/sisurat/dist   (React build)
              â”œâ”€â”€ /uploads/   â†’ /var/www/sisurat/uploads
              â””â”€â”€ /api/*      â†’ proxy 127.0.0.1:3000    (Express)
                                    â””â”€â”€ MariaDB 127.0.0.1:3306 (sisurat_db)
```

| Komponen | Port | Keterangan |
|---|---|---|
| Nginx | 80, 443 | Static + reverse proxy |
| Express API | 3000 (lokal) | Jangan expose ke publik |
| MariaDB | 3306 (lokal) | Jangan expose ke publik |

---

## 1. Prasyarat


---

## Tech Stack & Requirements

Dokumentasi deployment ini untuk SiSurat dengan versi dependencies berikut:

### Frontend
- React 19.3.0
- React DOM 19.3.0
- TypeScript 5.9.3
- Vite 8.3.0
- Tailwind CSS 4.3.3
- ExcelJS 4.4.0 (audit logs export ke XLSX)

### Backend
- Node.js 24.14.1 LTS
- Express 5.2.1
- mysql2 3.24.5 (connection pooling)
- bcryptjs 3.0.3 (password hashing)
- jsonwebtoken 9.0.3 (JWT authentication)
- nodemailer 10.0.13 (OTP email)
- multer 2.4.0 (file upload)
- cors 2.8.6

### Database
- MariaDB 10.6+
- Charset: utf8mb4_unicode_ci
- Connection pool: 10 connections

### Package Manager & Tools
- pnpm 12.5.1 (recommended) atau npm 11.11.0
- PM2 (process manager)
- Nginx (reverse proxy)

## 1. Prasyarat

- VPS dengan akses **root** atau sudo
- Domain mengarah ke IP VPS (opsional untuk awal â€” bisa pakai IP)
- Minimal spec: 1 CPU, 1 GB RAM, 10 GB disk (cukup untuk start)

---

## 2. Instal dependensi

Jalankan `deploy/setup-vps.sh` **atau** manual:

```bash
# Update
sudo apt update && sudo apt upgrade -y

# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # harus v24.x

# MariaDB
sudo apt install -y mariadb-server mariadb-client

# Nginx + PM2 + Git + unzip
sudo apt install -y nginx git unzip
sudo npm install -g pm2

# (Optional) pnpm - alternative package manager (recommended untuk production)
sudo npm install -g pnpm@12.5.1
pnpm -v   # verify
```

Jika script `setup-vps.sh` dipakai:
```bash
chmod +x deploy/setup-vps.sh
sudo ./deploy/setup-vps.sh
```

---

## 3. Database

```bash
sudo mysql_secure_installation   # opsional, set root password

sudo mysql -u root <<'SQL'
CREATE DATABASE IF NOT EXISTS sisurat_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'sisurat_app'@'localhost' IDENTIFIED BY 'GANTI_PASSWORD_KUAT';
GRANT ALL PRIVILEGES ON sisurat_db.* TO 'sisurat_app'@'localhost';
FLUSH PRIVILEGES;
SQL
```

Import schema + seed (roles, master data, akun default **admin**):

```bash
# dari root project di server
sudo mysql -u root sisurat_db < database/schema.sql
```

Verifikasi:
```bash
sudo mysql -u root -e "USE sisurat_db; SELECT username FROM pengguna; SELECT nama_role FROM roles;"
```

Harus ada: `admin` (role Super Admin), 3 roles, jenis surat, kategori, folder.

---

## 4. Deploy aplikasi

```bash
# Clone / upload project ke /var/www/sisurat
sudo mkdir -p /var/www/sisurat
# contoh git:
sudo git clone <URL_REPO> /var/www/sisurat
cd /var/www/sisurat

# Install dependensi Node
sudo npm install

# Build frontend â†’ dist/
sudo npm run build
ls dist/   # harus ada index.html
```

Jika deploy manual (zip/tar), extract ke `/var/www/sisurat` lalu `npm install` + `npm run build`.

---

## 5. Konfigurasi `.env`

```bash
cd /var/www/sisurat
sudo cp deploy/.env.example .env
sudo nano .env
```

Isi minimal:

| Key | Nilai contoh |
|---|---|
| NODE_ENV | production |
| `PORT` | `3000` |
| `DB_HOST` | `127.0.0.1` |
| `DB_PORT` | `3306` |
| `DB_USER` | `sisurat_app` |
| `DB_PASSWORD` | password dari langkah 3 |
| `DB_NAME` | `sisurat_db` |
| `JWT_SECRET` | string acak panjang (contoh: `openssl rand -hex 32`) |
| `UPLOAD_DIR` | `/var/www/sisurat/uploads` |
| `VITE_API_URL` | `/api` (path relatif via Nginx) |
| `EMAIL_USER` | Gmail untuk OTP lupa password |
| `EMAIL_PASSWORD` | App Password 16 digit (Google Account â†’ 2-Step â†’ App passwords) |
| `MAIL_FROM` | `SiSurat <EMAIL_USER>` |

**Jangan commit `.env` berisi secret ke git.**

### Gmail App Password (lupa password)
1. Akun Gmail â†’ Security â†’ aktifkan **2-Step Verification**.
2. App passwords â†’ buat untuk "Mail" â†’ salin 16 digit ke `EMAIL_PASSWORD` (spasi boleh).
3. Server butuh **outbound SMTP** ke `smtp.gmail.com:587` (biasanya terbuka).

Folder uploads harus writable oleh user Node (biasanya `node` atau user PM2):

```bash
sudo chown -R www-data:www-data /var/www/sisurat/uploads 2>/dev/null || true
sudo chown -R node:node /var/www/sisurat/uploads 2>/dev/null || true
sudo chmod -R 775 /var/www/sisurat/uploads
```

---

## 6. Jalankan API dengan PM2

```bash
cd /var/www/sisurat
pm2 start server/index.js --name sisurat-api
pm2 save
pm2 startup   # ikuti instruksi sudo agar PM2 jalan saat reboot
pm2 logs sisurat-api
```

Cek API lokal:
```bash
curl -s http://127.0.0.1:3000/health
# {"ok":true,"service":"sisurat-api"}
```

---

## 7. Nginx

```bash
sudo cp deploy/nginx-sisurat.conf /etc/nginx/sites-available/sisurat
# Edit server_name â†’ domain atau IP kamu
sudo nano /etc/nginx/sites-available/sisurat

sudo ln -sf /etc/nginx/sites-available/sisurat /etc/nginx/sites-enabled/sisurat
sudo nginx -t
sudo systemctl reload nginx
```

Akses: `http://IP_VPS` atau `http://domain-anda` â†’ halaman login SiSurat.

---

## 8. HTTPS (disarankan)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Ikuti prompt; certbot otomatis mengubah config Nginx + redirect HTTPS.

---

## 9. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

**Jangan** buka 3306 (MariaDB) atau 3000 ke publik.

---

## 10. Backup

```bash
sudo chmod +x deploy/backup.sh
sudo ./deploy/backup.sh
```

Cron harian (contoh jam 02:00):
```bash
sudo crontab -e
# tambahkan:
0 2 * * * /var/www/sisurat/deploy/backup.sh >> /var/log/sisurat-backup.log 2>&1
```

Backup: dump SQL + zip folder `uploads/` ke `/var/backups/sisurat/`.

---

## 11. Checklist QA setelah deploy

- [ ] Buka `http://domain` â†’ halaman login
- [ ] Login `admin` / `qwerasdf` â†’ **ganti password** via Manajemen Akun
- [ ] Tambah akun Admin / Kepala Bagian
- [ ] Buat Surat Masuk + upload PDF â†’ file muncul di `uploads/`
- [ ] Buat Surat Keluar â†’ nomor surat format `001.xx/SSI-PCT/...`
- [ ] Kepala: upload TTD â†’ approve surat
- [ ] Cetak PDF â†’ nama penanda = nama akun kepala
- [ ] Export Excel rekap
- [ ] `pm2 list` â†’ status `sisurat-api` online
- [ ] `curl /health` â†’ ok

---

## Troubleshooting

| Gejala | Cek / solusi |
|---|---|
| 502 Bad Gateway | API mati: `pm2 logs sisurat-api`; port 3000 bentrok |
| 404 `/api/...` | Nginx belum proxy `/api` ke 3000 |
| 403 / file TTD tidak tampil | Permission `uploads/` â€” chown/chmod |
| Login gagal terus | `.env` DB salah; user MySQL beda; password akun |
| `EACCES` saat upload | User PM2 tidak punya akses `uploads/` |
| Build error di server | Pastikan Node 22; `npm ci` bila lockfile ada |
| OS bukan Ubuntu/Debian | Paket: RHEL/CentOS â†’ `dnf install nodejs mariadb-server nginx`; NodeSource tetap bisa |

### CentOS / RHEL (ringkas)
```bash
sudo dnf install -y nodejs npm mariadb-server mariadb nginx git
sudo npm install -g pm2
# MariaDB: systemctl enable --now mariadb
# Firewall: sudo firewall-cmd --permanent --add-service=http --add-service=https && sudo firewall-cmd --reload
```

Sisanya sama: import schema, `.env`, `npm install && npm run build`, PM2, config Nginx.

---

## Update aplikasi (re-deploy)

```bash
cd /var/www/sisurat
sudo git pull
sudo npm install
sudo npm run build
pm2 restart sisurat-api
sudo systemctl reload nginx
```

Jangan jalankan ulang `schema.sql` di production kecuali memang mau reset (DROP TABLE di script).

---

## Catatan keamanan production

1. **Ganti password** `admin` setelah deploy pertama.
2. Gunakan **user MySQL khusus** (`sisurat_app`), bukan `root`.
3. `JWT_SECRET` harus **acak dan unik** per environment.
4. `.env` tidak masuk git; simpan di server saja.
5. Backup terjadwal (DB + uploads).
6. HTTPS wajib sebelum data surat dipakai produksi.




