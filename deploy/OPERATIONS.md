# Operations Guide for SiSurat Production Deployment

Panduan operasional harian untuk menjalankan dan memantau SiSurat di production environment. Dokumentasi ini mencakup monitoring, maintenance, dan troubleshooting dasar.

---

## 1. Daily Operations Checklist

### Morning (Start of Day)

`ash
# Check application status
pm2 list
pm2 describe sisurat-api

# Verify API health
curl -s http://127.0.0.1:3000/health

# Check disk space
df -h /var/www/sisurat
df -h /var

# Check database connectivity
sudo mysql -u sisurat_app -p sisurat_db -e "SELECT 1;"

# Review error logs dari malam sebelumnya
pm2 logs sisurat-api --err --lines 50
`

### End of Day

`ash
# Verify backup status
ls -lh /var/backups/sisurat/ | tail -5

# Check PM2 status
pm2 status

# Monitor memory/CPU
pm2 monit

# Review critical errors
pm2 logs sisurat-api --err --lines 20
`

---

## 2. PM2 Monitoring Setup

### 2.1 PM2 Web Dashboard

`ash
# Start PM2 web monitoring (default port 9615)
pm2 web

# Access dashboard at: http://localhost:9615
`

### 2.2 PM2+ (Advanced Monitoring - Optional)

`ash
# Link dengan PM2+ cloud monitoring
pm2 link <secret_key> <public_key>

# Dashboard: https://app.pm2.io
`

### 2.3 PM2 Basic Commands

`ash
# List all processes
pm2 list

# Show detailed process info
pm2 describe sisurat-api

# Real-time monitoring
pm2 monit

# View logs
pm2 logs sisurat-api

# View error logs only
pm2 logs sisurat-api --err

# Clear logs
pm2 flush

# Restart process
pm2 restart sisurat-api

# Stop process
pm2 stop sisurat-api

# Start process
pm2 start server/index.js --name sisurat-api

# Delete process from PM2
pm2 delete sisurat-api
`

---

## 3. Log Management

### 3.1 PM2 Logs Location

`ash
# PM2 default log directory
ls -la ~/.pm2/logs/

# View PM2 logs
cat ~/.pm2/logs/sisurat-api-out.log
cat ~/.pm2/logs/sisurat-api-error.log

# Real-time tail
tail -f ~/.pm2/logs/sisurat-api-out.log
tail -f ~/.pm2/logs/sisurat-api-error.log
`

### 3.2 Nginx Logs

`ash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log

# Check specific domain logs (jika configured)
sudo tail -f /var/log/nginx/sisurat-access.log
sudo tail -f /var/log/nginx/sisurat-error.log
`

### 3.3 MariaDB Logs

`ash
# Slow query log
sudo tail -f /var/log/mysql/slow.log

# Check MariaDB error log
sudo tail -f /var/log/mysql/error.log
`

### 3.4 Log Rotation Configuration

Create /etc/logrotate.d/sisurat:

`
~/.pm2/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 \ \
    sharedscripts
    postrotate
        pm2 reloadLogs > /dev/null || true
    endscript
}
`

Enable:
`ash
sudo logrotate -f /etc/logrotate.d/sisurat
`

---

## 4. Health Checks

### 4.1 API Health Check

`ash
# Simple health check
curl -s http://127.0.0.1:3000/health | jq

# Expected response:
# {
#   "ok": true,
#   "service": "sisurat-api"
# }
`

### 4.2 Database Health Check

`ash
# Check database connectivity
sudo mysql -u sisurat_app -p -e "SELECT 1 FROM dual;"

# Count records in key tables
sudo mysql -u sisurat_app -p sisurat_db -e "
SELECT 'pengguna' as table_name, COUNT(*) as count FROM pengguna
UNION ALL
SELECT 'surat_masuk', COUNT(*) FROM surat_masuk
UNION ALL
SELECT 'surat_keluar', COUNT(*) FROM surat_keluar
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs;
"
`

### 4.3 Nginx Health Check

`ash
# Test nginx configuration
sudo nginx -t

# Check if nginx is running
sudo systemctl status nginx

# Restart nginx
sudo systemctl restart nginx
`

### 4.4 Disk Space Check

`ash
# Check disk usage
df -h

# Check specific directory
du -sh /var/www/sisurat
du -sh /var/www/sisurat/uploads
du -sh /var/backups/sisurat

# Alert if usage > 80%
df -h | awk 'NR>1 {gsub("%",""); if (\+0 > 80) print "WARNING: " \ " is " \ "% full"}'
`

---

## 5. Restart Procedures

### 5.1 Graceful Restart Application

`ash
# Restart with zero downtime (if PM2 cluster mode)
pm2 reload sisurat-api

# Or standard restart
pm2 restart sisurat-api

# Verify restart successful
pm2 logs sisurat-api --lines 5
`

### 5.2 Restart Database

`ash
# Restart MariaDB
sudo systemctl restart mariadb

# Verify
sudo systemctl status mariadb
`

### 5.3 Restart Web Server

`ash
# Reload Nginx (graceful)
sudo systemctl reload nginx

# Or restart (may have brief downtime)
sudo systemctl restart nginx

# Verify
sudo systemctl status nginx
`

### 5.4 Full System Restart

`ash
# Schedule restart (graceful shutdown)
sudo shutdown -r +1  # restart in 1 minute
sudo shutdown -c     # cancel restart

# Immediate restart
sudo reboot

# After reboot, verify all services started
pm2 list
sudo systemctl status mariadb nginx
`

---

## 6. Backup Verification

### 6.1 Check Backup Status

`ash
# List recent backups
ls -lh /var/backups/sisurat/ | tail -10

# Check backup size
du -sh /var/backups/sisurat/

# Verify backup integrity (optional)
gunzip -t /var/backups/sisurat/sisurat_db_*.sql.gz
`

### 6.2 Test Restore Procedure

`ash
# Create test database
sudo mysql -u root -e "CREATE DATABASE IF NOT EXISTS sisurat_db_test;"

# Restore from backup
sudo mysql -u root sisurat_db_test < <(gunzip -c /var/backups/sisurat/sisurat_db_YYYYMMDD_HHMMSS.sql.gz)

# Verify restore
sudo mysql -u root -e "USE sisurat_db_test; SELECT COUNT(*) FROM pengguna;"

# Drop test database
sudo mysql -u root -e "DROP DATABASE sisurat_db_test;"
`

---

## 7. Performance Tuning

### 7.1 Monitor Resource Usage

`ash
# Real-time monitoring
pm2 monit

# CPU usage
top -b -n 1 | head -20

# Memory usage
free -h

# Process-specific
ps aux | grep node
`

### 7.2 Database Performance

`ash
# Check slow queries
sudo tail -50 /var/log/mysql/slow.log

# Analyze table fragmentation
sudo mysql -u sisurat_app -p sisurat_db -e "
SELECT TABLE_NAME, ROUND(((data_free/(data_length+index_length+data_free))*100),2) as frag_percent
FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'sisurat_db';
"

# Optimize table (if fragmentation > 10%)
sudo mysql -u sisurat_app -p sisurat_db -e "OPTIMIZE TABLE surat_masuk; OPTIMIZE TABLE surat_keluar;"
`

### 7.3 Nginx Performance

`ash
# Check active connections
netstat -an | grep ESTABLISHED | wc -l

# Monitor real-time traffic
sudo tail -f /var/log/nginx/access.log | awk '{print \}' | sort | uniq -c | sort -rn
`

---

## 8. Maintenance Tasks

### 8.1 Weekly Tasks

- [ ] Review error logs untuk patterns
- [ ] Verify backup completion
- [ ] Check disk space trending
- [ ] Review audit logs untuk unusual activity
- [ ] Test API endpoints (manual atau automated)

### 8.2 Monthly Tasks

- [ ] Update system packages: sudo apt update && sudo apt upgrade
- [ ] Run security audit (dari SECURITY_HARDENING.md)
- [ ] Database maintenance (check sizes, optimize tables)
- [ ] Review PM2 process memory usage
- [ ] Verify SSL certificate expiry
- [ ] Test restore procedure dengan fresh backup

### 8.3 Quarterly Tasks

- [ ] Full system security audit
- [ ] Database optimization (ANALYZE, OPTIMIZE)
- [ ] Update Node.js packages (check for vulnerabilities)
- [ ] Review and update firewall rules
- [ ] Disaster recovery drills

### 8.4 Annually Tasks

- [ ] SSL certificate renewal verification
- [ ] Major version updates (Node.js, MariaDB)
- [ ] Full disaster recovery test
- [ ] Rotate critical secrets (JWT_SECRET, DB_PASSWORD)

---

## 9. Common Operational Issues

### Issue: Application Memory Growing

`ash
# Check memory usage
pm2 describe sisurat-api | grep memory

# Restart to clear memory
pm2 restart sisurat-api

# Set auto-restart on memory threshold (optional)
pm2 restart sisurat-api --max-memory-restart 500M
`

### Issue: Slow Database Queries

`ash
# Check slow query log
sudo tail -100 /var/log/mysql/slow.log | grep Query_time

# Analyze problematic query
EXPLAIN SELECT ... FROM ...;

# Optimize table
OPTIMIZE TABLE table_name;
`

### Issue: Disk Space Running Low

`ash
# Find large files
du -sh /var/www/sisurat/* | sort -hr

# Clean old uploads (carefully!)
find /var/www/sisurat/uploads -type f -mtime +180 -delete  # files older than 6 months

# Clean old backups
find /var/backups/sisurat -type f -mtime +30 -delete  # backups older than 30 days
`

### Issue: High CPU Usage

`ash
# Identify which process
top -b -n 1 | grep sisurat-api

# Check if database is the culprit
sudo tail -f /var/log/mysql/slow.log

# Restart application
pm2 restart sisurat-api
`

---

## 10. Escalation Path

### When to Alert/Escalate

- API down or responding with 5xx errors
- Database unavailable
- Disk space > 90%
- Memory usage > 80%
- Certificate expiring in < 7 days
- Suspicious security activity in logs
- Multiple failed login attempts from same IP

### Escalation Contacts

- System Administrator: [contact]
- Database Administrator: [contact]
- Security Team: [contact]

---

## 11. Documentation & Runbooks

For more information, see:
- README.md — Main deployment guide
- SECURITY_HARDENING.md — Security best practices
- TROUBLESHOOTING.md — Common problems and solutions

---

**Last Updated**: 2026-10-17  
**Version**: 1.0 - Operations Runbook
