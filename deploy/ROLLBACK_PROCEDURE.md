# Rollback Procedure for SiSurat Production Deployment

Panduan untuk rollback deployment jika terjadi masalah setelah update atau deployment baru.

---

## 1. Quick Rollback (Last 5 minutes)

Jika deployment baru sebarusnya langsung dan error langsung terlihat:

`ash
# 1. Stop application
pm2 stop sisurat-api

# 2. Revert code to previous commit
cd /var/www/sisurat
git revert HEAD --no-edit
# atau
git reset --hard HEAD~1

# 3. Clear cache
rm -rf node_modules/.cache

# 4. Restart application
pm2 restart sisurat-api

# 5. Verify
curl -s http://127.0.0.1:3000/health

# 6. If still broken, rollback to known-good commit
git log --oneline -5
git reset --hard <COMMIT_HASH>
pm2 restart sisurat-api
`

---

## 2. Full Rollback Procedure

Untuk rollback yang lebih controlled dengan backup:

### Step 1: Stop Services

`ash
# Stop API
pm2 stop sisurat-api

# Verify stopped
pm2 list
`

### Step 2: Backup Current State

`ash
# Backup current codebase
cd /var/www/sisurat
cp -r . /var/backups/sisurat-rollback-

# Backup current database state
sudo mysqldump -u root sisurat_db | gzip > /var/backups/sisurat/sisurat_db_rollback_.sql.gz
`

### Step 3: Revert Code

`ash
cd /var/www/sisurat

# Option A: Revert to specific commit
git log --oneline -10  # see recent commits
git reset --hard <COMMIT_HASH>

# Option B: Revert to previous stable branch/tag
git checkout stable
# or
git checkout tags/v1.0.0

# Option C: Restore from file backup
cd /var/www
rm -rf sisurat
cp -r /var/backups/sisurat-rollback-20261017_091500 sisurat
`

### Step 4: Verify Code

`ash
# Verify files
ls -la /var/www/sisurat/dist/index.html
ls -la /var/www/sisurat/server/index.js

# Check git status
git status
git log --oneline -5
`

### Step 5: Restore Database (if needed)

`ash
# ONLY if data migration went wrong

# List available backups
ls -lh /var/backups/sisurat/sisurat_db_*.sql.gz

# Restore specific backup
sudo mysql -u root sisurat_db < <(gunzip -c /var/backups/sisurat/sisurat_db_20261016_020000.sql.gz)

# Verify restore
sudo mysql -u root -e "USE sisurat_db; SELECT COUNT(*) FROM surat_masuk; SELECT COUNT(*) FROM surat_keluar;"
`

### Step 6: Reinstall Dependencies

`ash
cd /var/www/sisurat

# Clear node_modules
rm -rf node_modules

# Reinstall
npm ci

# or with pnpm
pnpm install --frozen-lockfile
`

### Step 7: Start Application

`ash
# Start application
pm2 start server/index.js --name sisurat-api

# Verify
pm2 logs sisurat-api --lines 10
pm2 describe sisurat-api

# Health check
curl -s http://127.0.0.1:3000/health
`

### Step 8: Verify Full Stack

`ash
# Check application
pm2 list

# Check database
sudo mysql -u root -e "SELECT COUNT(*) FROM sisurat_db.pengguna;"

# Check web server
sudo systemctl status nginx

# Check access from outside
curl -s http://your-domain.com/health

# Test in browser
# Open http://your-domain.com
# Try login with test account
`

---

## 3. Database-Only Rollback

Jika hanya database yang bermasalah (data corruption, failed migration):

`ash
# 1. Identify issue
sudo mysql -u root sisurat_db -e "
SELECT TABLE_NAME, ROUND((data_free/(data_length+index_length+data_free))*100,2) as frag_percent
FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'sisurat_db';
"

# 2. Restore from backup
sudo mysql -u root sisurat_db < <(gunzip -c /var/backups/sisurat/sisurat_db_YYYYMMDD_HHMMSS.sql.gz)

# 3. Verify
sudo mysql -u root sisurat_db -e "SELECT COUNT(*) FROM surat_masuk; SELECT COUNT(*) FROM surat_keluar;"

# 4. Restart application
pm2 restart sisurat-api

# 5. Check application logs
pm2 logs sisurat-api --err --lines 20
`

---

## 4. Partial Rollback (Frontend or Backend Only)

### Rollback Frontend Only

`ash
# Keep backend running, revert frontend build

cd /var/www/sisurat

# 1. Checkout previous dist version
git checkout HEAD~1 -- dist/

# 2. Reload Nginx
sudo systemctl reload nginx

# 3. Test in browser
# Clear cache (Ctrl+Shift+Del) and refresh
`

### Rollback Backend Only

`ash
# Keep frontend as-is, revert backend code

cd /var/www/sisurat

# 1. Revert server files
git checkout HEAD~1 -- server/

# 2. Check if package.json changed
git diff HEAD~1 package.json

# If package.json changed:
npm ci

# 3. Restart PM2
pm2 restart sisurat-api

# 4. Verify API
curl -s http://127.0.0.1:3000/health
`

---

## 5. Emergency Rollback (Production Down)

Jika sistem fully down dan perlu recovery cepat:

`ash
# 1. Check what's running
pm2 list
sudo systemctl status nginx
sudo systemctl status mariadb

# 2. Try quick restart first
pm2 restart sisurat-api

# 3. If restart doesn't work
# View latest error
pm2 logs sisurat-api --err --lines 50

# 4. Emergency revert to last known good
cd /var/www/sisurat
git reset --hard origin/stable
npm ci
pm2 restart sisurat-api

# 5. If still down, restore from VM backup
# (coordinate with infrastructure team)
`

---

## 6. Verifying Rollback Success

After any rollback, verify:

`ash
# 1. Application health
curl -s http://127.0.0.1:3000/health | jq

# 2. Database integrity
sudo mysql -u root sisurat_db -e "
SELECT 'surat_masuk' as tbl, COUNT(*) as cnt FROM surat_masuk
UNION ALL
SELECT 'surat_keluar', COUNT(*) FROM surat_keluar
UNION ALL
SELECT 'pengguna', COUNT(*) FROM pengguna
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs;
"

# 3. Frontend loads
curl -s http://localhost/index.html | head -20

# 4. Login works
curl -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"test"}' | jq

# 5. File uploads work
# Test via browser: Upload surat

# 6. Nginx healthy
sudo nginx -t
sudo systemctl status nginx

# 7. No errors in logs
pm2 logs sisurat-api --err | head -10
sudo tail -20 /var/log/nginx/error.log
`

---

## 7. Preventing Rollback Scenarios

Best practices to avoid needing rollback:

`ash
# 1. Test in staging first
# Deploy to staging environment
# Run full test suite
# Get approval from team

# 2. Tag releases
git tag -a v1.2.3 -m "Release 1.2.3 - stable"
git push origin v1.2.3

# 3. Keep backups
# Database: daily
# Codebase: at each release tag
# Uploads: weekly

# 4. Monitor deployment
# Watch PM2 logs in real-time
# Monitor HTTP status codes
# Check database performance

# 5. Gradual rollout
# Deploy to canary instance first
# Run smoke tests
# Then deploy to production

# 6. Blue-green deployment
# Keep old version running
# Deploy new version in parallel
# Switch traffic after verification
# Keep old version for quick rollback
`

---

## 8. Post-Rollback Checklist

After successful rollback:

- [ ] All services running (PM2, Nginx, MariaDB)
- [ ] Application responding to health checks
- [ ] Database integrity verified
- [ ] Users can login successfully
- [ ] File upload/download working
- [ ] Audit logs recording correctly
- [ ] No errors in application logs
- [ ] Backup of failed version created
- [ ] Document what went wrong
- [ ] Plan fix before next deployment
- [ ] Notify stakeholders/users if applicable
- [ ] Schedule post-mortem if critical failure

---

## 9. Automation (Optional)

Create rollback script for faster recovery:

`ash
#!/bin/bash
# File: /usr/local/bin/rollback-sisurat.sh

set -e

echo "Starting SiSurat rollback..."

# 1. Stop application
pm2 stop sisurat-api

# 2. Backup current state
cp -r /var/www/sisurat /var/backups/sisurat-failed-

# 3. Revert code
cd /var/www/sisurat
git reset --hard origin/stable

# 4. Reinstall
rm -rf node_modules
npm ci

# 5. Start
pm2 restart sisurat-api

# 6. Verify
sleep 2
curl -s http://127.0.0.1:3000/health || exit 1

echo "Rollback completed successfully!"
`

Make executable:
`ash
sudo chmod +x /usr/local/bin/rollback-sisurat.sh
`

Use:
`ash
sudo /usr/local/bin/rollback-sisurat.sh
`

---

## 10. Support & Escalation

If rollback doesn't restore functionality:

1. Contact system administrator
2. Escalate to infrastructure team
3. Consider restoring from VM snapshot
4. Prepare incident report

**Last Updated**: 2026-10-17  
**Version**: 1.0 - Rollback Procedures
