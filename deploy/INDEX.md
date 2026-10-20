# SiSurat Deployment Documentation Index

Complete guide untuk semua dokumentasi deployment SiSurat production.

---

## Quick Navigation

| Document | Purpose | Audience |
|---|---|---|
| **README.md** | Main deployment guide dengan step-by-step instructions | DevOps, System Admin |
| **SECURITY_HARDENING.md** | Security best practices dan hardening checklist | Security Team, DevOps |
| **OPERATIONS.md** | Daily operations, monitoring, maintenance procedures | Operations Team |
| **TROUBLESHOOTING.md** | Common problems dan solutions | Support Team, DevOps |
| **ROLLBACK_PROCEDURE.md** | Emergency rollback procedures | DevOps, On-call Engineer |
| **.github/workflows/deploy.yml** | CI/CD automation dengan GitHub Actions | DevOps, Developers |

---

## Tech Stack Summary

**Frontend**: React 19.3.0, TypeScript 5.9.3, Vite 8.3.0, Tailwind CSS 4.3.3  
**Backend**: Node.js 24.14.1 LTS, Express 5.2.1  
**Database**: MariaDB 10.6+  
**Runtime**: pnpm 12.5.1 / npm 11.11.0  
**Process Manager**: PM2  
**Web Server**: Nginx  
**Deployment**: VPS Local Infrastructure (Sandya Networks / InaLite)

---

## Deployment Checklist

### Pre-Deployment (Staging Environment)

- [ ] Code reviewed and approved
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Performance tested
- [ ] Database migrations tested
- [ ] Backup created

### Deployment (Production)

1. **Preparation** (see README.md)
   - [ ] Clone repository
   - [ ] Install dependencies
   - [ ] Build frontend
   - [ ] Configure .env

2. **Security** (see SECURITY_HARDENING.md)
   - [ ] Setup Nginx security headers
   - [ ] Enable rate limiting
   - [ ] Configure firewall (UFW)
   - [ ] Setup SSL/TLS certificates

3. **Operations Setup** (see OPERATIONS.md)
   - [ ] Setup PM2 monitoring
   - [ ] Configure log rotation
   - [ ] Setup backup schedule
   - [ ] Configure health checks

4. **Verification**
   - [ ] API health endpoint responds
   - [ ] Database connectivity verified
   - [ ] Frontend loads correctly
   - [ ] Login functionality works
   - [ ] File upload/download works
   - [ ] Audit logs recording

### Post-Deployment

- [ ] Monitor application for 24 hours
- [ ] Verify all features working
- [ ] Check error logs daily
- [ ] Performance baseline documented
- [ ] Team notified of deployment

---

## Document Descriptions

### README.md (Main Deployment Guide)

**Contents**:
- Architecture overview
- Tech stack and versions
- 11-step deployment process
- Firewall configuration
- Backup setup
- QA checklist
- Troubleshooting quick-ref
- Re-deployment procedures

**Use when**: First-time deployment or setting up new environment

**Key sections**:
1. Architecture diagram
2. Tech Stack & Requirements (Node.js 24.14.1, React 19.3.0, etc)
3. Prasyarat (prerequisites)
4. Instal dependensi (dependency installation)
5. Database setup
6. Application deployment
7. .env configuration
8. PM2 setup
9. Nginx configuration
10. HTTPS setup
11. Firewall

---

### SECURITY_HARDENING.md (Security Best Practices)

**Contents**:
- Pre-deployment security checklist (12 items)
- Nginx security headers configuration
- Database security & access control
- File upload validation & security
- API rate limiting (Nginx level)
- SSL/TLS configuration
- UFW firewall rules
- Environment variables & secrets management
- Monitoring & alerting setup
- Common vulnerabilities & mitigations
- Regular security audits schedule
- Incident response procedures

**Use when**: 
- Deploying to production for first time
- Hardening existing deployment
- Security audit required
- Incident response needed

**Key checklist items**:
- Environment variables secured
- Database user with limited privileges
- Firewall properly configured
- Nginx security headers enabled
- File upload validation active
- SSL/TLS enabled
- Backup strategy in place

---

### OPERATIONS.md (Daily Operations Runbook)

**Contents**:
- Daily operations checklist (morning & end-of-day)
- PM2 monitoring setup
- Log management (PM2, Nginx, MariaDB)
- Health checks (API, database, web server, disk)
- Restart procedures (graceful & emergency)
- Backup verification & restore testing
- Performance tuning & monitoring
- Maintenance tasks (weekly, monthly, quarterly, annually)
- Common operational issues
- Escalation path

**Use when**:
- Day-to-day operations
- Monitoring and health checks
- Maintenance tasks
- Performance issues
- Operational troubleshooting

**Key commands**:
- pm2 list - check process status
- pm2 monit - real-time monitoring
- pm2 logs sisurat-api - view application logs
- curl http://127.0.0.1:3000/health - health check
- df -h - disk space check

---

### TROUBLESHOOTING.md (Problem Solving)

**Contents**:
- 15+ common issues with root causes
- Application issues (502, login fails, file upload, Excel export)
- Database issues (connection, slow queries, disk quota)
- Nginx/web server issues (404, 403, HTTPS)
- Security issues (429 rate limiting)
- System issues (disk space, memory)
- Recovery procedures
- Getting help resources

**Use when**:
- Application not working
- Users reporting issues
- Deployment failed
- Performance problems
- Need to diagnose issue

**Issues covered**:
1. API returns 502 Bad Gateway
2. Login fails
3. File upload rejected
4. Excel export error
5. Cannot connect to database
6. Slow queries
7. 404 Not Found
8. 403 Forbidden
9. SSL certificate expired
10. 429 Too Many Requests
11. Disk space full
12. Out of memory
13. And more...

---

### ROLLBACK_PROCEDURE.md (Emergency Procedures)

**Contents**:
- Quick rollback (5 minutes)
- Full rollback procedure (8 steps)
- Database-only rollback
- Partial rollback (frontend/backend)
- Emergency rollback (production down)
- Verification checklist
- Prevention best practices
- Automation scripts
- Post-rollback checklist
- Escalation procedures

**Use when**:
- Critical bug discovered post-deployment
- Data corruption found
- Need to revert to previous version
- Production incident requires recovery

**Rollback types**:
1. Quick (code revert only)
2. Full (code + database)
3. Database-only (data rollback)
4. Partial (frontend or backend)
5. Emergency (production down)

---

### .github/workflows/deploy.yml (CI/CD Automation)

**Contents**:
- GitHub Actions workflow definition
- Build stage (Node.js 24, build frontend)
- Deploy stage (SSH to VPS, deploy)
- Verification steps
- Error handling

**Use when**:
- Automated deployment from GitHub
- CI/CD pipeline setup
- GitHub Actions integration

**Setup**:
1. Add secrets to GitHub repository:
   - DEPLOY_HOST: VPS IP/domain
   - DEPLOY_USER: SSH username
   - DEPLOY_KEY: SSH private key
   - DEPLOY_PORT: SSH port (optional)
2. Push code to main or production branch
3. Workflow automatically triggers

---

## Common Workflows

### First-Time Deployment

1. Read **README.md** sections 1-11
2. Review **SECURITY_HARDENING.md** checklist
3. Follow deployment steps in README.md
4. Verify using checklist in README.md section 11

### Daily Operations

1. Check **OPERATIONS.md** daily checklist
2. Monitor with PM2: pm2 monit
3. Review logs: pm2 logs sisurat-api
4. Verify health: curl http://127.0.0.1:3000/health

### Troubleshooting Issue

1. Search **TROUBLESHOOTING.md** for similar issue
2. Follow solution steps
3. Verify resolution
4. If not resolved, escalate per OPERATIONS.md section 10

### Emergency Recovery

1. Check **ROLLBACK_PROCEDURE.md** for appropriate scenario
2. Follow step-by-step procedures
3. Verify rollback success using checklist
4. Monitor application closely

### Regular Maintenance

1. Follow **OPERATIONS.md** maintenance schedule
2. Weekly: review logs, verify backups
3. Monthly: security audit, database optimization
4. Quarterly: full security audit, backup testing
5. Annually: major updates, disaster recovery drill

---

## File Locations

`
deploy/
├── README.md                    # Main deployment guide
├── SECURITY_HARDENING.md       # Security best practices
├── OPERATIONS.md               # Operations runbook
├── TROUBLESHOOTING.md          # Problem solving guide
├── ROLLBACK_PROCEDURE.md       # Emergency procedures
├── .env.example                # Environment variables template
├── setup-vps.sh                # Automated setup script
├── nginx-sisurat.conf          # Nginx configuration
├── backup.sh                   # Backup automation script
└── INDEX.md                    # This file

.github/workflows/
└── deploy.yml                  # GitHub Actions CI/CD
`

---

## Key Metrics & SLOs

**Deployment**:
- Time to deploy: < 5 minutes
- Rollback time: < 2 minutes
- Success rate: 99%+

**Operations**:
- API uptime target: 99.9%
- Response time: < 500ms p95
- Error rate: < 0.1%

**Backups**:
- Frequency: Daily at 2 AM
- Retention: 14 days
- RTO (Recovery Time Objective): < 15 minutes
- RPO (Recovery Point Objective): < 1 day

**Security**:
- SSL certificate renewal: Automatic
- Security patches: Within 7 days
- Backup encryption: Yes
- Rate limiting: 10 req/sec general, 5 req/min auth

---

## Support & Escalation

### Level 1 Support (On-Call Engineer)

Use: TROUBLESHOOTING.md, OPERATIONS.md  
Can resolve: Most operational issues, common problems

### Level 2 Support (Senior DevOps)

Use: ROLLBACK_PROCEDURE.md, SECURITY_HARDENING.md  
Can resolve: Complex issues, security incidents, database problems

### Level 3 Support (System Architect)

Use: All documentation + system design knowledge  
Can resolve: Infrastructure changes, major incidents, architectural issues

### Escalation Path

Operations Issue → TROUBLESHOOTING.md → Level 1  
↓ (if not resolved)  
ROLLBACK_PROCEDURE.md → Level 2  
↓ (if still not resolved)  
System review → Level 3

---

## Updates & Versions

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-10-17 | Initial documentation set with all 6 guides |

---

## Quick Reference Commands

`ash
# Health checks
curl -s http://127.0.0.1:3000/health | jq

# Monitor
pm2 monit
pm2 logs sisurat-api

# Restart
pm2 restart sisurat-api

# Database
sudo mysql -u sisurat_app -p sisurat_db -e "SELECT 1;"

# Disk
df -h

# Backup
sudo ./deploy/backup.sh

# Rollback
cd /var/www/sisurat && git reset --hard origin/stable && pm2 restart sisurat-api
`

---

**Last Updated**: 2026-10-17  
**Documentation Version**: 1.0  
**Tech Stack Version**: React 19.3.0, Node.js 24.14.1, MariaDB 10.6+
