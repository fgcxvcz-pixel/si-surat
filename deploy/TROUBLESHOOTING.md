# Troubleshooting Guide for SiSurat Production

Panduan troubleshooting untuk mengatasi masalah umum yang mungkin terjadi pada deployment SiSurat production.

---

## 1. Application Issues

### Problem: API returns 502 Bad Gateway

**Symptoms**:
- Nginx error: "upstream connect() failed"
- Browser shows "502 Bad Gateway"

**Root Causes**:
- Node.js process crashed or not running
- Port 3000 is in use by another process
- API memory leak causing crash

**Solutions**:

`ash
# Check if PM2 process is running
pm2 list

# View error logs
pm2 logs sisurat-api --err --lines 50

# Restart application
pm2 restart sisurat-api

# Check port 3000 is in use
sudo lsof -i :3000

# Kill process on port 3000 (if needed)
sudo kill -9 <PID>

# Check Node.js memory usage
pm2 describe sisurat-api | grep memory

# Restart with memory limit
pm2 restart sisurat-api --max-memory-restart 500M
`

---

### Problem: Login fails with "Password salah" or "Username tidak terdaftar"

**Symptoms**:
- Cannot login even with correct credentials
- Database queries return empty results

**Root Causes**:
- Database connection broken
- User data corrupted or missing
- Database charset issue (UTF-8 encoding)

**Solutions**:

`ash
# Test database connectivity
sudo mysql -u sisurat_app -p -e "SELECT COUNT(*) FROM pengguna;"

# Check default admin user exists
sudo mysql -u root -e "USE sisurat_db; SELECT id, username, email FROM pengguna WHERE username='admin';"

# Verify database charset
sudo mysql -u root -e "USE sisurat_db; SELECT DEFAULT_CHARSET FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='sisurat_db';"

# Reset admin password (if needed)
# 1. Generate new bcrypt hash
# 2. Update directly in database (NOT recommended in production)
`

---

### Problem: File upload returns "Hanya PDF atau gambar yang diizinkan"

**Symptoms**:
- PDF or image files rejected on upload
- Error appears immediately without processing

**Root Causes**:
- File MIME type mismatch
- File corrupted or invalid
- Nginx size limit exceeded

**Solutions**:

`ash
# Check file MIME type
file -i /path/to/file.pdf

# Test upload endpoint directly
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.pdf"

# Check Nginx size limit in config
grep client_max_body_size /etc/nginx/sites-available/sisurat

# Check disk space in uploads folder
df -h /var/www/sisurat/uploads

# Clear corrupted files (if needed)
sudo rm -f /var/www/sisurat/uploads/*.tmp
`

---

### Problem: Export Excel (XLSX) returns error

**Symptoms**:
- "Failed to export logs" message
- Excel file not downloading

**Root Causes**:
- ExcelJS library not installed
- Insufficient memory for large dataset
- File permissions issue

**Solutions**:

`ash
# Verify ExcelJS is installed
npm list exceljs

# Check Node.js memory
pm2 describe sisurat-api | grep memory

# Check /tmp disk space (where ExcelJS writes)
df -h /tmp

# Increase Node.js heap size
pm2 start server/index.js --name sisurat-api --max-memory-restart 1G

# Check application logs
pm2 logs sisurat-api --err --lines 30
`

---

## 2. Database Issues

### Problem: "Cannot connect to database" or "ECONNREFUSED"

**Symptoms**:
- Application fails to start
- Cannot execute queries
- PM2 shows crash immediately

**Root Causes**:
- MariaDB service not running
- Wrong database credentials in .env
- Database user privileges insufficient
- Port 3306 unreachable

**Solutions**:

`ash
# Check MariaDB is running
sudo systemctl status mariadb

# Start MariaDB if stopped
sudo systemctl start mariadb

# Test connection with credentials from .env
sudo mysql -u sisurat_app -p -e "SELECT 1 FROM DUAL;"

# Verify database exists
sudo mysql -u root -e "SHOW DATABASES LIKE 'sisurat_db';"

# Check user privileges
sudo mysql -u root -e "SHOW GRANTS FOR 'sisurat_app'@'localhost';"

# Verify MariaDB is listening on localhost
sudo netstat -tuln | grep 3306
`

---

### Problem: Slow database queries

**Symptoms**:
- Audit log export hangs
- Login page loads slowly
- General application lag

**Root Causes**:
- Missing database indexes
- Large unoptimized tables
- Slow disk I/O

**Solutions**:

`ash
# Enable slow query log
sudo nano /etc/mysql/mariadb.conf.d/50-server.cnf
# Add: slow-query-log = 1
# Add: long-query-time = 2

# View slow queries
sudo tail -100 /var/log/mysql/slow.log

# Analyze query execution
sudo mysql -u sisurat_app -p sisurat_db -e "EXPLAIN SELECT * FROM audit_logs LIMIT 10;"

# Optimize tables
sudo mysql -u sisurat_app -p sisurat_db -e "
OPTIMIZE TABLE surat_masuk;
OPTIMIZE TABLE surat_keluar;
OPTIMIZE TABLE audit_logs;
"

# Check table sizes
sudo mysql -u sisurat_app -p sisurat_db -e "
SELECT TABLE_NAME, ROUND((DATA_LENGTH+INDEX_LENGTH)/1024/1024,2) AS Size_MB
FROM information_schema.TABLES WHERE TABLE_SCHEMA='sisurat_db'
ORDER BY Size_MB DESC;
"
`

---

### Problem: "Disk quota exceeded" during backup

**Symptoms**:
- Backup script fails
- Cannot write to /var/backups/sisurat
- Application works but backup incomplete

**Root Causes**:
- Insufficient disk space
- Old backups not cleaned up
- Database too large

**Solutions**:

`ash
# Check disk space
df -h

# Check backup folder size
du -sh /var/backups/sisurat/

# List backups by size
ls -lhS /var/backups/sisurat/ | head -20

# Delete old backups (keep last 14 days)
find /var/backups/sisurat -type f -mtime +14 -delete

# Compress backups to save space
find /var/backups/sisurat -name "*.sql" -exec gzip {} \;

# Check database size
sudo mysql -u root -e "SELECT SUM(DATA_LENGTH+INDEX_LENGTH)/1024/1024 AS Size_MB FROM information_schema.TABLES WHERE TABLE_SCHEMA='sisurat_db';"
`

---

## 3. Nginx / Web Server Issues

### Problem: 404 Not Found for /api/* endpoints

**Symptoms**:
- Frontend loads but API calls fail with 404
- Network tab shows requests to /api/auth/login returning 404

**Root Causes**:
- Nginx proxy not configured correctly
- Nginx config not reloaded after changes
- API backend not running

**Solutions**:

`ash
# Check Nginx configuration syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Verify API is running
pm2 list

# Check Nginx log for actual request
sudo tail -20 /var/log/nginx/error.log

# Test API directly
curl -i http://127.0.0.1:3000/health

# Verify proxy configuration
grep -A 10 "location /api/" /etc/nginx/sites-available/sisurat
`

---

### Problem: 403 Forbidden when accessing /uploads/

**Symptoms**:
- File upload succeeds but cannot view/download
- 403 Forbidden error in browser
- TTD (digital signature) files not visible

**Root Causes**:
- File/folder permissions incorrect
- Nginx user cannot read files
- SELinux/AppArmor blocking access

**Solutions**:

`ash
# Fix folder permissions
sudo chown -R www-data:www-data /var/www/sisurat/uploads
sudo chmod 755 /var/www/sisurat/uploads
sudo chmod 644 /var/www/sisurat/uploads/*

# Verify permissions
ls -la /var/www/sisurat/uploads/ | head -5

# Test access
curl -i http://localhost/uploads/test-file.pdf

# Check Nginx user
ps aux | grep nginx | grep -v grep
`

---

### Problem: HTTPS certificate expired or invalid

**Symptoms**:
- Browser shows "SSL_ERROR_RX_RECORD_TOO_LONG"
- Browser shows "NET::ERR_CERT_DATE_INVALID"
- Chrome/Firefox blocks access

**Root Causes**:
- Certbot renewal failed
- Certificate file missing or corrupted
- Nginx not reloaded after renewal

**Solutions**:

`ash
# Check certificate expiry
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal

# Manual renewal (if auto fails)
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Test certificate
sudo openssl x509 -in /etc/letsencrypt/live/your-domain.com/fullchain.pem -text -noout | grep -A 2 "Not"

# Reload Nginx after renewal
sudo systemctl reload nginx
`

---

## 4. Security & Rate Limiting Issues

### Problem: "429 Too Many Requests"

**Symptoms**:
- Login repeatedly fails with 429
- API calls throttled/rate limited

**Root Causes**:
- Legitimate traffic exceeds rate limit
- DDoS attack or bot activity
- Rate limit threshold too low

**Solutions**:

`ash
# Check rate limiting config in Nginx
grep -A 3 "limit_req_zone" /etc/nginx/sites-available/sisurat

# Identify source IP making requests
sudo tail -100 /var/log/nginx/access.log | awk '{print }' | sort | uniq -c | sort -rn

# Temporarily disable rate limiting (not recommended)
# Comment out "limit_req zone=" lines in Nginx config
sudo nano /etc/nginx/sites-available/sisurat
sudo nginx -t
sudo systemctl reload nginx

# Whitelist trusted IP
# Add before limit_req directive:
# geo  {
#   default 1;
#   192.168.1.0/24 0;
# }
`

---

## 5. System / Infrastructure Issues

### Problem: Disk space running low (>90%)

**Symptoms**:
- Application becomes slow
- Backups fail
- Database write errors

**Root Causes**:
- Uploads folder growing too large
- Old backups not cleaned
- Log files not rotated

**Solutions**:

`ash
# Check disk usage
df -h

# Find largest directories
du -sh /var/www/sisurat/* | sort -hr

# Clean old uploads (careful!)
find /var/www/sisurat/uploads -type f -mtime +180 -delete

# Clean old backups
find /var/backups/sisurat -type f -mtime +30 -delete

# Rotate logs
sudo logrotate -f /etc/logrotate.d/sisurat

# Monitor in real time
watch -n 5 'df -h | grep /dev/sda'
`

---

### Problem: High memory usage causing OOM kill

**Symptoms**:
- PM2 process killed unexpectedly
- "Out of memory" error
- Server becomes unresponsive

**Root Causes**:
- Memory leak in application
- Database query consuming too much memory
- Large file processing

**Solutions**:

`ash
# Check memory usage
pm2 monit

# Get detailed memory info
pm2 describe sisurat-api | grep memory

# Set memory limit and auto-restart
pm2 restart sisurat-api --max-memory-restart 512M

# Monitor system memory
free -h
watch -n 1 'free -h'

# Check for memory leaks in application logs
pm2 logs sisurat-api | grep -i "memory\|leak\|warning"

# Increase server RAM or optimize application
`

---

## 6. Recovery Procedures

### Quick Recovery from Application Crash

`ash
# 1. Check status
pm2 list

# 2. View error logs
pm2 logs sisurat-api --err --lines 100

# 3. Restart application
pm2 restart sisurat-api

# 4. Verify
curl -s http://127.0.0.1:3000/health

# 5. Monitor
pm2 monit
`

### Database Recovery from Corruption

`ash
# 1. Stop application
pm2 stop sisurat-api

# 2. Backup current database
sudo mysqldump -u root sisurat_db | gzip > /tmp/sisurat_corrupted_\.sql.gz

# 3. Restore from backup
sudo mysql -u root sisurat_db < /var/backups/sisurat/sisurat_db_YYYYMMDD_HHMMSS.sql

# 4. Verify
sudo mysql -u root -e "USE sisurat_db; SELECT COUNT(*) FROM surat_masuk;"

# 5. Restart application
pm2 restart sisurat-api
`

---

## 7. Getting Help

For issues not covered here:
1. Check application logs: pm2 logs sisurat-api
2. Check Nginx logs: sudo tail -f /var/log/nginx/error.log
3. Check database logs: sudo tail -f /var/log/mysql/error.log
4. Review SECURITY_HARDENING.md for security-related issues
5. Review OPERATIONS.md for maintenance procedures

---

**Last Updated**: 2026-10-17  
**Version**: 1.0 - Troubleshooting Guide
