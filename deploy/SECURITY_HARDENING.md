# Security Hardening Guide for SiSurat Production Deployment

Panduan keamanan untuk production deployment SiSurat di infrastruktur VPS lokal. Dokumentasi ini mencakup best practices security untuk melindungi data surat dan sistem yang sensitive.

---

## 1. Pre-Deployment Security Checklist

Pastikan semua item di bawah sudah selesai sebelum production deployment:

- [ ] **Environment Variables**
  - [ ] NODE_ENV=production sudah di-set
  - [ ] JWT_SECRET adalah string random 64 karakter (gunakan openssl rand -hex 32)
  - [ ] DB_PASSWORD minimal 16 karakter, kombinasi upper/lower/number/special
  - [ ] .env file **tidak** di-commit ke git
  - [ ] EMAIL_PASSWORD menggunakan Google App Password, bukan password akun Gmail
  - [ ] Semua secret values di-store di .env saja, tidak di-hardcode

- [ ] **Database Security**
  - [ ] Gunakan user sisurat_app dengan privilege LIMITED (hanya ke sisurat_db)
  - [ ] Jalankan mysql_secure_installation untuk set root password
  - [ ] Disable MySQL anonymous login
  - [ ] Disable MySQL remote root login (bind only to 127.0.0.1)

- [ ] **Firewall**
  - [ ] UFW aktif dengan rules:
    - OpenSSH (22) — allow dari admin network
    - Nginx Full (80, 443) — allow dari publik
    - 3000 (Node.js) — DENY (localhost only via Nginx proxy)
    - 3306 (MariaDB) — DENY (localhost only)

- [ ] **Nginx Configuration**
  - [ ] Security headers sudah di-konfigurasi
  - [ ] Rate limiting aktif untuk /api endpoints
  - [ ] Gzip compression aktif
  - [ ] Dotfiles (.htaccess, .env, dll) di-block
  - [ ] HTTPS aktif (Let's Encrypt certificate)

- [ ] **File Permissions**
  - [ ] /var/www/sisurat/ — 755 (readable by web server)
  - [ ] /var/www/sisurat/uploads/ — 775 (writable by PM2 process)
  - [ ] /var/www/sisurat/.env — 600 (readable only by owner)
  - [ ] /var/www/sisurat/database/ — 700 (backup scripts writable)

- [ ] **Default Account**
  - [ ] Default password untuk akun dmin **sudah diganti** di production
  - [ ] Password baru **minimal 12 karakter** dengan kombinasi kompleks
  - [ ] Password stored hashed (bcryptjs 12 rounds)

- [ ] **Backup & Recovery**
  - [ ] Backup script berjalan terjadwal (daily)
  - [ ] Backup files encrypted atau hanya accessible dari server
  - [ ] Restore procedure sudah di-test
  - [ ] Backup retention policy di-enforce (e.g., 14 hari)

---

## 2. Nginx Security Headers Configuration

Tambahkan ke 
ginx-sisurat.conf di dalam server {} block:

\\\
ginx
# Security Headers
add_header X-Frame-Options \"SAMEORIGIN\" always;
add_header X-Content-Type-Options \"nosniff\" always;
add_header X-XSS-Protection \"1; mode=block\" always;
add_header Referrer-Policy \"strict-origin-when-cross-origin\" always;
add_header Permissions-Policy \"geolocation=(), microphone=(), camera=()\" always;

# HTTPS only (uncomment setelah SSL aktif)
# add_header Strict-Transport-Security \"max-age=31536000; includeSubDomains; preload\" always;
\\\

---

## 3. Database Security & Access Control

### 3.1 Create Restricted Database User

\\\ash
sudo mysql -u root <<'SQL'
CREATE USER IF NOT EXISTS 'sisurat_app'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD_HERE';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX ON sisurat_db.* TO 'sisurat_app'@'localhost';
FLUSH PRIVILEGES;
SHOW GRANTS FOR 'sisurat_app'@'localhost';
SQL
\\\

### 3.2 Secure MariaDB Configuration

Edit /etc/mysql/mariadb.conf.d/50-server.cnf:

\\\ini
bind-address = 127.0.0.1
skip-symbolic-links
slow-query-log = 1
slow-query-log-file = /var/log/mysql/slow.log
long-query-time = 2
\\\

---

## 4. File Upload Validation & Security

Application level validation sudah di-implement:
- Allowed MIME types: PDF, PNG, JPEG, WebP
- File size limit: 2MB
- Files stored di /var/www/sisurat/uploads/

File permissions:
\\\ash
sudo chown -R node:node /var/www/sisurat/uploads
sudo chmod 755 /var/www/sisurat/uploads
sudo chmod 644 /var/www/sisurat/uploads/*
\\\

---

## 5. API Rate Limiting (Nginx Level)

Di 
ginx-sisurat.conf http block:

\\\
ginx
limit_req_zone \ zone=general_limit:10m rate=10r/s;
limit_req_zone \ zone=auth_limit:10m rate=5r/m;
limit_req_zone \ zone=upload_limit:10m rate=2r/m;
\\\

Di server block:

\\\
ginx
location /api/auth/ {
    limit_req zone=auth_limit burst=10 nodelay;
    proxy_pass http://127.0.0.1:3000;
}

location /api/upload {
    limit_req zone=upload_limit burst=3 nodelay;
    proxy_pass http://127.0.0.1:3000;
}

location /api/ {
    limit_req zone=general_limit burst=50 nodelay;
    proxy_pass http://127.0.0.1:3000;
}
\\\

---

## 6. SSL/TLS Configuration (Let's Encrypt)

\\\ash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
sudo certbot certificates
sudo certbot renew --dry-run
\\\

---

## 7. Firewall Rules (UFW)

\\\ash
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status verbose
\\\

**JANGAN allow port 3000 atau 3306 ke publik**

---

## 8. Environment Variables & Secrets Management

\\\ash
sudo chmod 600 /var/www/sisurat/.env
cat /var/www/sisurat/.gitignore | grep .env
\\\

---

## 9. Monitoring & Alerting

### PM2 Monitoring

\\\ash
pm2 web
# Akses: http://localhost:9615
\\\

### Check Logs

\\\ash
pm2 logs sisurat-api | grep \"Token tidak valid\|Password salah\"
pm2 logs sisurat-api | grep \"Hanya PDF\|file tidak diizinkan\"
\\\

### Log Rotation

\\\ash
sudo nano /etc/logrotate.d/sisurat
\\\

\\\
/var/www/sisurat/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 node node
    sharedscripts
}
\\\

---

## 10. Common Security Vulnerabilities & Mitigations

| Vulnerability | Mitigation |
|---|---|
| SQL Injection | Parameterized queries (implemented) |
| XSS | Content Security Policy + Output escaping |
| CSRF | CORS properly configured |
| Weak Passwords | Enforce min 12 chars + complexity |
| Exposed Secrets | .env in .gitignore + 600 permissions |
| DDoS | Rate limiting (Nginx + app level) |
| Brute Force | Rate limiting 5 attempts/15 min |
| Expired SSL | Certbot auto-renewal |

---

## 11. Regular Security Audits

### Monthly
- [ ] Review access logs untuk suspicious activity
- [ ] Check failed login attempts
- [ ] Verify backup files exist
- [ ] Update system packages: sudo apt update && sudo apt upgrade
- [ ] Verify SSL certificate valid

### Quarterly
- [ ] Security header review
- [ ] Firewall rules review
- [ ] Database user privileges review
- [ ] Rotate non-critical secrets

### Annually
- [ ] Full security audit
- [ ] Update dependencies ke latest LTS
- [ ] Disaster recovery test
- [ ] Rotate critical secrets

---

## 12. Incident Response

### Suspicious Activity

\\\ash
pm2 logs sisurat-api
grep \"SUSPICIOUS\" /var/www/sisurat/logs/error.log | awk '{print \}' | sort | uniq -c
sudo ufw insert 1 deny from 192.168.1.100
\\\

### Suspected Breach

1. Stop application: pm2 stop sisurat-api
2. Backup current state
3. Review logs
4. Change all secrets
5. Update application
6. Restore clean backup
7. Restart services

---

**Last Updated**: 2026-10-17  
**Version**: 1.0 - General Security Hardening Guide
