# Alur Audit Logs - Activity Trail & Compliance

> Backend: Express `:3000` + MariaDB `sisurat_db`. Audit logging untuk semua CRUD + APPROVE actions.

## Tujuan

Mencatat dan melacak **setiap perubahan data** di sistem untuk keperluan:
- Compliance & audit internal
- Security monitoring
- Change tracking (siapa, kapan, apa)
- Dispute resolution
- Debugging & forensics

---

## Akses

- **Menu Sidebar**: "Audit Logs" (hanya Super Admin & Admin)
- **Page**: `/audit-logs`
- **API**: `/api/audit-logs` (Super Admin & Admin)
- **Fitur**:
  - List logs dengan filter & pagination
  - Timeline view per record
  - Export ke Excel

---

## Database Schema

```sql
CREATE TABLE audit_logs (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  id_user INT UNSIGNED NOT NULL (FK: pengguna.id),
  action_type ENUM('CREATE','UPDATE','DELETE','APPROVE') NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id INT UNSIGNED NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  old_values JSON NULL (previous values saat UPDATE),
  new_values JSON NULL (new values saat CREATE/UPDATE),
  description TEXT NULL (human-readable summary),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk performa query
CREATE INDEX idx_audit_user ON audit_logs(id_user);
CREATE INDEX idx_audit_action ON audit_logs(action_type);
CREATE INDEX idx_audit_table ON audit_logs(table_name);
CREATE INDEX idx_audit_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

---

## Backend Implementation

### Core Functions (server/utils/auditLogger.js)

#### 1. logAudit()

```javascript
async function logAudit(
  userId,           // INT: user ID (dari JWT token)
  actionType,       // ENUM: CREATE, UPDATE, DELETE, APPROVE
  tableName,        // STRING: nama tabel (surat_masuk, surat_keluar, pengguna, dll)
  recordId,         // INT: ID record yang berubah
  oldValues = null, // OBJECT: nilai sebelumnya (saat UPDATE)
  newValues = null, // OBJECT: nilai sesudahnya (saat CREATE/UPDATE)
  ipAddress = null, // STRING: IP client
  description = null // STRING: deskripsi human-readable
)
```

**Implementasi:**
```javascript
await q(
  `INSERT INTO audit_logs (id_user, action_type, table_name, record_id, ip_address, old_values, new_values, description)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    userId,
    actionType,
    tableName,
    recordId,
    ipAddress || null,
    oldValues ? JSON.stringify(oldValues) : null,     // Convert object to JSON string
    newValues ? JSON.stringify(newValues) : null,     // Convert object to JSON string
    description || null
  ]
)
```

**Error Handling:**
```javascript
try {
  await logAudit(...)
} catch (err) {
  console.error('[AuditLogger] Error logging action:', err.message)
  throw err  // Jangan silent fail — error critical untuk audit
}
```

#### 2. getClientIp()

Extract IP client dari HTTP request headers (support proxy):

```javascript
function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||  // Proxy
    req.headers['x-real-ip'] ||                                // Nginx
    req.connection.remoteAddress ||                            // Direct connection
    req.socket.remoteAddress ||                                // Fallback
    null
  )
}
```

**Usage di route:**
```javascript
const ipAddress = getClientIp(req)
await logAudit(req.user.sub, 'DELETE', 'surat_masuk', id, null, null, ipAddress, '...')
```

#### 3. diffValues()

Compare old vs new objects dan return hanya field yang berubah:

```javascript
function diffValues(
  oldObj,              // OBJECT: nilai lama
  newObj,              // OBJECT: nilai baru
  fieldsToTrack = null // ARRAY: field whitelist (opsional, track semua jika null)
)
```

**Logic:**
```javascript
const diff = {}

const keys = fieldsToTrack || Object.keys(new Set([
  ...Object.keys(old),
  ...Object.keys(neu)
]))

for (const k of keys) {
  if (JSON.stringify(old[k]) !== JSON.stringify(neu[k])) {
    diff[k] = { before: old[k], after: neu[k] }
  }
}

return Object.keys(diff).length > 0 ? diff : null
```

**Return Format:**
```json
{
  "perihal": {
    "before": "Permohonan Data Lama",
    "after": "Permohonan Data Baru"
  },
  "status_tindak_lanjut": {
    "before": "tidak",
    "after": "menunggu"
  }
}
```

**Usage:**
```javascript
const changes = diffValues(oldValues, newValues, ['perihal', 'status', 'kategori'])
if (changes) {
  await logAudit(req.user.sub, 'UPDATE', 'surat_masuk', id, changes, null, getClientIp(req), '...')
}
```

---

## Action Types & When Logged

### 1. CREATE

**Kapan dicatat:**
- Surat masuk dibuat
- Surat keluar dibuat
- User akun baru dibuat
- Master data (jenis surat, kategori, folder) ditambah

**Data logged:**
```javascript
logAudit(
  userId,
  'CREATE',
  'surat_masuk',           // table_name
  123,                     // record_id (new record)
  null,                    // oldValues (tidak ada, baru dibuat)
  {                        // newValues (data saat insert)
    nomor_surat: '001/SM/2026',
    pengirim: 'Dinas Perhubungan',
    perihal: 'Permohonan Data',
    tanggal_terima: '2026-10-19'
  },
  ipAddress,
  'Surat masuk dibuat: Dinas Perhubungan | Permohonan Data | 001/SM/2026'
)
```

### 2. UPDATE

**Kapan dicatat:**
- Surat masuk/keluar diedit
- Status surat berubah
- User profil diubah
- Master data direname

**Data logged (dengan diffValues):**
```javascript
const oldData = await q('SELECT * FROM surat_masuk WHERE id=?', [id])
const oldValues = mapRow(oldData[0])
// ... do update ...
const newData = await q('SELECT * FROM surat_masuk WHERE id=?', [id])
const newValues = mapRow(newData[0])

const changes = diffValues(oldValues, newValues, ['perihal', 'status_tindak_lanjut'])

await logAudit(
  userId,
  'UPDATE',
  'surat_masuk',
  id,
  changes,                 // only changed fields
  null,                    // newValues = null (changes sudah cukup)
  ipAddress,
  'Surat masuk diperbarui: ...'
)
```

### 3. DELETE

**Kapan dicatat:**
- Surat masuk/keluar dihapus (single)
- Batch delete surat (per item)
- User akun dihapus
- Master data dihapus

**Data logged:**
```javascript
// Pre-delete: query data yang akan dihapus
const toDelete = await q('SELECT * FROM surat_masuk WHERE id=?', [id])

logAudit(
  userId,
  'DELETE',
  'surat_masuk',
  id,
  {                       // oldValues: capture data sebelum delete
    nomor_surat: toDelete[0].nomor_surat,
    pengirim: toDelete[0].pengirim,
    perihal: toDelete[0].perihal
  },
  null,                   // newValues = null (sudah tidak ada)
  ipAddress,
  'Surat masuk dihapus: Dinas Perhubungan | Permohonan Data | 001/SM/2026'
)

// Delete operasi
await q('DELETE FROM surat_masuk WHERE id=?', [id])
```

**Batch Delete Flow:**
```javascript
for (const id of ids) {
  // Pre-delete query
  const surat = await q('SELECT * FROM surat_masuk WHERE id=?', [id])
  
  // Delete
  await q('DELETE FROM surat_masuk WHERE id=?', [id])
  
  // Log per item
  await logAudit(
    userId,
    'DELETE',
    'surat_masuk',
    id,
    { nomor_surat: surat[0].nomor_surat, ... },
    null,
    ipAddress,
    `Surat masuk dihapus (batch): ${surat[0].pengirim} | ${surat[0].perihal} | ${surat[0].nomor_surat}`
  )
}
```

### 4. APPROVE

**Kapan dicatat:**
- Kepala/Super Admin approve surat keluar

**Data logged:**
```javascript
const oldSk = await q('SELECT * FROM surat_keluar WHERE id=?', [skId])

// Approve operasi
await q(
  'UPDATE surat_keluar SET status_approval=?, approved_by=?, tanggal_approval=?, id_ttd=? WHERE id=?',
  ['disetujui', approverUserId, now, ttdId, skId]
)

const newSk = await q('SELECT * FROM surat_keluar WHERE id=?', [skId])

await logAudit(
  approverUserId,
  'APPROVE',
  'surat_keluar',
  skId,
  {
    status_approval: { before: 'menunggu', after: 'disetujui' },
    approved_by: { before: null, after: approverUserId },
    id_ttd: { before: null, after: ttdId }
  },
  null,
  ipAddress,
  'Surat keluar disetujui: Dinas Perhubungan | Permohonan Data | 001/SK/2026'
)
```

---

## API Endpoints

### GET /api/audit-logs

**Access:** Super Admin & Admin only

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `user_id` | INT | Filter by user ID |
| `action_type` | ENUM | Filter by CREATE, UPDATE, DELETE, APPROVE |
| `table_name` | STRING | Filter by table (surat_masuk, surat_keluar, pengguna, etc) |
| `date_from` | DATE | Filter from date (YYYY-MM-DD) |
| `date_to` | DATE | Filter to date (YYYY-MM-DD) |
| `page` | INT | Page number (default: 1) |
| `limit` | INT | Per page (default: 50, max: 500) |

**Request:**
```bash
GET /api/audit-logs?action_type=DELETE&table_name=surat_masuk&date_from=2026-10-01&date_to=2026-10-31&page=1&limit=50
```

**Response:**
```json
{
  "data": [
    {
      "id": 1234,
      "id_user": 2,
      "user_nama": "Adi Suryanto",
      "username": "admin",
      "action_type": "DELETE",
      "table_name": "surat_masuk",
      "record_id": 123,
      "ip_address": "192.168.1.100",
      "old_values": {
        "nomor_surat": "001/SM/2026",
        "pengirim": "Dinas Perhubungan"
      },
      "new_values": null,
      "description": "Surat masuk dihapus: Dinas Perhubungan | Permohonan Data | 001/SM/2026",
      "created_at": "2026-10-19 10:30:45"
    },
    ...
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 156,
    "pages": 4
  }
}
```

### GET /api/audit-logs/timeline/:table_name/:record_id

**Access:** Authenticated (semua role)

**Description:** Timeline lengkap perubahan 1 record (oldest → newest)

**Request:**
```bash
GET /api/audit-logs/timeline/surat_masuk/123
```

**Response:**
```json
[
  {
    "id": 100,
    "action_type": "CREATE",
    "user_nama": "Adi Suryanto",
    "old_values": null,
    "new_values": {
      "nomor_surat": "001/SM/2026",
      "pengirim": "Dinas Perhubungan"
    },
    "created_at": "2026-10-15 08:00:00"
  },
  {
    "id": 105,
    "action_type": "UPDATE",
    "user_nama": "Taufik Rahman",
    "old_values": {
      "perihal": { "before": "Permohonan", "after": "Permohonan Data Jaringan" }
    },
    "created_at": "2026-10-16 14:30:00"
  },
  {
    "id": 112,
    "action_type": "DELETE",
    "user_nama": "Admin",
    "old_values": { "nomor_surat": "001/SM/2026", ... },
    "created_at": "2026-10-19 10:30:45"
  }
]
```

### POST /api/audit-logs/export

**Access:** Super Admin & Admin only

**Description:** Export audit logs ke Excel sesuai filter

**Request Body:**
```json
{
  "username": "admin",
  "action_type": "DELETE",
  "table_name": "surat_masuk",
  "date_from": "2026-10-01",
  "date_to": "2026-10-31"
}
```

**Response:** Binary file (Excel `.xlsx`)

**Headers:**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="audit-logs-2026-10-19.xlsx"
```

**Excel Content:**
- Header row: Timestamp, User ID, User Name, Username, IP Address, Action Type, Table, Record ID, Description, Old Values, New Values
- Styling: Header bold + blue background
- Auto-fit columns
- Frozen header row
- Urutan: DESC (terbaru dulu)

---

## Frontend Implementation

### AuditLogsPage.tsx

**Access:** Super Admin & Admin only  
**Path:** `/audit-logs`

#### Layout

```
┌──────────────────────────────────────────────────┐
│ AUDIT LOGS                                       │
├──────────────────────────────────────────────────┤
│ Filter Form:                                     │
│ [User] [Action] [Table] [Date From] [Date To]   │
│ [Search] [Export]                                │
│                                                  │
│ Pagination: Page 1 of 4 (156 total)             │
│                                                  │
│ Tabel Audit Logs:                                │
│ ┌──────────────────────────────────────────────┐│
│ │ Timestamp│ User │ Action│ Table│ Record│ ...  ││
│ ├──────────────────────────────────────────────┤│
│ │ 10:30:45 │ Adi  │ DELETE│ SM   │ 123   │ ... ││
│ │ 09:15:20 │ Tauf │UPDATE │ SK   │ 456   │ ... ││
│ └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

#### Features

**1. Filter Form**
- User (autocomplete dropdown)
- Action Type (CREATE, UPDATE, DELETE, APPROVE)
- Table Name (surat_masuk, surat_keluar, pengguna, etc)
- Date Range (from-to)
- Search button

**2. List Tabel**
- Columns: Timestamp, Username, Action, Table, Record ID, Description, IP Address
- Pagination: 50/page
- Sort: DESC (terbaru dulu)
- Styling: Alternating row colors, hover highlight

**3. Row Expand (Detail)**
- Klik row → expand detail
- Tampilkan: old_values & new_values (JSON formatted)
- Button: Timeline view

**4. Timeline View**
- Modal: History lengkap 1 record
- Urutan: ASC (tua ke baru)
- Visual: Timeline UI (vertical line, events)

**5. Export Button**
- Klik → download Excel sesuai filter
- Format: `audit-logs-YYYY-MM-DD.xlsx`

---

## Examples per Operasi

### Example 1: Create Surat Masuk

**User:** Admin (id=2)  
**IP:** 192.168.1.100

**Operasi:**
```javascript
const result = await q(
  `INSERT INTO surat_masuk (id_user, nomor_surat, pengirim, perihal, tanggal_terima, file_lampiran)
   VALUES (?, ?, ?, ?, ?, ?)`,
  [2, '001/SM/2026', 'Dinas Perhubungan', 'Permohonan Data', '2026-10-15', '[{"nama":"surat.pdf",...}]']
)

await logAudit(
  2,
  'CREATE',
  'surat_masuk',
  result.insertId,  // 123
  null,
  {
    nomor_surat: '001/SM/2026',
    pengirim: 'Dinas Perhubungan',
    perihal: 'Permohonan Data',
    tanggal_terima: '2026-10-15'
  },
  '192.168.1.100',
  'Surat masuk dibuat: Dinas Perhubungan | Permohonan Data | 001/SM/2026'
)
```

**Audit Log Entry:**
```json
{
  "id_user": 2,
  "action_type": "CREATE",
  "table_name": "surat_masuk",
  "record_id": 123,
  "ip_address": "192.168.1.100",
  "old_values": null,
  "new_values": "{\"nomor_surat\":\"001/SM/2026\",\"pengirim\":\"Dinas Perhubungan\",\"perihal\":\"Permohonan Data\"}",
  "description": "Surat masuk dibuat: Dinas Perhubungan | Permohonan Data | 001/SM/2026",
  "created_at": "2026-10-15 08:00:00"
}
```

### Example 2: Update Status Surat Masuk

**User:** Taufik (id=3)  
**Change:** Status dari "tidak" → "menunggu"

**Operasi:**
```javascript
const oldData = await q('SELECT * FROM surat_masuk WHERE id=?', [123])
const oldValues = mapRow(oldData[0])  // { status_tindak_lanjut: 'tidak', ... }

await q('UPDATE surat_masuk SET status_tindak_lanjut=? WHERE id=?', ['menunggu', 123])

const newData = await q('SELECT * FROM surat_masuk WHERE id=?', [123])
const newValues = mapRow(newData[0])  // { status_tindak_lanjut: 'menunggu', ... }

const changes = diffValues(oldValues, newValues, ['status_tindak_lanjut'])
// Result: { status_tindak_lanjut: { before: 'tidak', after: 'menunggu' } }

await logAudit(
  3,
  'UPDATE',
  'surat_masuk',
  123,
  changes,
  null,
  getClientIp(req),
  'Status surat masuk diubah: tidak → menunggu'
)
```

**Audit Log Entry:**
```json
{
  "id_user": 3,
  "action_type": "UPDATE",
  "table_name": "surat_masuk",
  "record_id": 123,
  "old_values": "{\"status_tindak_lanjut\":{\"before\":\"tidak\",\"after\":\"menunggu\"}}",
  "new_values": null,
  "description": "Status surat masuk diubah: tidak → menunggu",
  "created_at": "2026-10-16 14:30:00"
}
```

### Example 3: Approve Surat Keluar

**User:** Kepala Bagian (id=1)  
**Approve SK:** id=456

**Operasi:**
```javascript
// Pre-approve query
const oldSk = await q('SELECT * FROM surat_keluar WHERE id=?', [456])

// Find active TTD
const ttd = await q(
  'SELECT id FROM tanda_tangan_digital WHERE is_aktif=1 AND id_user=? LIMIT 1',
  [1]  // Kepala user id
)

// Approve
await q(
  `UPDATE surat_keluar SET status_approval=?, approved_by=?, tanggal_approval=?, id_ttd=? WHERE id=?`,
  ['disetujui', 1, '2026-10-19 14:45:00', ttd[0]?.id, 456]
)

const newSk = await q('SELECT * FROM surat_keluar WHERE id=?', [456])

const changes = diffValues(oldSk[0], newSk[0], ['status_approval', 'approved_by', 'id_ttd'])

await logAudit(
  1,
  'APPROVE',
  'surat_keluar',
  456,
  changes,
  null,
  getClientIp(req),
  'Surat keluar disetujui: Dinas Perhubungan | Permohonan Data | 001/SK/2026'
)
```

**Audit Log Entry:**
```json
{
  "id_user": 1,
  "action_type": "APPROVE",
  "table_name": "surat_keluar",
  "record_id": 456,
  "old_values": "{\"status_approval\":{\"before\":\"menunggu\",\"after\":\"disetujui\"},\"approved_by\":{\"before\":null,\"after\":1},\"id_ttd\":{\"before\":null,\"after\":5}}",
  "description": "Surat keluar disetujui: Dinas Perhubungan | Permohonan Data | 001/SK/2026",
  "created_at": "2026-10-19 14:45:00"
}
```

### Example 4: Batch Delete Surat Masuk

**User:** Admin (id=2)  
**Delete:** 3 surat masuk (ids: 10, 11, 12)

**Operasi:**
```javascript
await q('START TRANSACTION')

for (const id of [10, 11, 12]) {
  const surat = await q('SELECT * FROM surat_masuk WHERE id=?', [id])
  
  await q('DELETE FROM surat_masuk WHERE id=?', [id])
  
  await logAudit(
    2,
    'DELETE',
    'surat_masuk',
    id,
    {
      nomor_surat: surat[0].nomor_surat,
      pengirim: surat[0].pengirim,
      perihal: surat[0].perihal
    },
    null,
    '192.168.1.100',
    `Surat masuk dihapus (batch): ${surat[0].pengirim} | ${surat[0].perihal} | ${surat[0].nomor_surat}`
  )
}

await q('COMMIT')
```

**Audit Log Entries (3 baris):**
```json
[
  {
    "id_user": 2,
    "action_type": "DELETE",
    "table_name": "surat_masuk",
    "record_id": 10,
    "description": "Surat masuk dihapus (batch): Pengirim A | Perihal A | 001/SM/2026",
    "created_at": "2026-10-19 10:30:00"
  },
  {
    "id_user": 2,
    "action_type": "DELETE",
    "table_name": "surat_masuk",
    "record_id": 11,
    "description": "Surat masuk dihapus (batch): Pengirim B | Perihal B | 002/SM/2026",
    "created_at": "2026-10-19 10:30:01"
  },
  {
    "id_user": 2,
    "action_type": "DELETE",
    "table_name": "surat_masuk",
    "record_id": 12,
    "description": "Surat masuk dihapus (batch): Pengirim C | Perihal C | 003/SM/2026",
    "created_at": "2026-10-19 10:30:02"
  }
]
```

---

## Security Considerations

1. **IP Logging**
   - Capture real IP (support proxy dengan x-forwarded-for)
   - Useful untuk detect suspicious activity

2. **User Tracking**
   - Setiap log linked ke user_id
   - Join dengan pengguna table untuk nama/username
   - Tidak bisa anonymize log (intentional)

3. **Data Preservation**
   - old_values & new_values stored as JSON string (immutable)
   - Tidak bisa diubah retrospectively
   - Useful untuk compliance

4. **Immutability**
   - Audit logs **tidak pernah diupdate atau didelete** (by design)
   - Only read-only access via API
   - Database constraints (optional): `ALTER TABLE audit_logs ADD CONSTRAINT no_update CHECK(1=1);`

5. **Access Control**
   - Hanya Super Admin & Admin bisa view audit logs
   - Kepala Bagian tidak punya akses (security best practice)

---

## Monitoring & Compliance

### Monthly Compliance Report

Admin harus generate monthly report:
1. Export all logs per bulan
2. Review: siapa delete surat, approve, dll
3. Identify anomalies
4. Archive untuk compliance

### Red Flags to Watch

| Pattern | Investigation |
|---------|---|
| Multiple DELETE dalam 1 session | Batch operation atau data tampering? |
| DELETE oleh non-owner user | Permission check? Authorized action? |
| UPDATE without prior CREATE | Data inconsistency? |
| DELETE diikuti CREATE dengan nomor sama | Duplicate masking? |
| Approve tanpa TTD set | Process violation? |

---

## Known Issues & Future Improvements

1. **user_agent Field**
   - Capture tapi tidak digunakan di frontend
   - Useful untuk forensics (browser, OS, etc)
   - TODO: Display di detail audit log

2. **Soft Delete Support**
   - Current: hard delete dicatat, record hilang
   - Future: implement soft delete (flag deleted=1)
   - Benefit: easier recovery + audit trail

3. **Retention Policy**
   - Current: unlimited (audit logs forever)
   - Recommend: Archive logs >1 tahun ke separate table
   - Compliance: Some regulations require 7 year retention

4. **Real-time Alerts**
   - Current: manual review di Audit Logs page
   - Future: SMS/email alert untuk suspicious activity
   - Threshold: e.g., 10 DELETE dalam 5 menit

5. **Audit Log Encryption**
   - Current: stored plaintext di database
   - Future: encrypt old_values & new_values (at-rest encryption)
   - Compliance: PII protection

---

## Integration Points

| Feature | Audit Logged |
|---------|---|
| Create Surat Masuk/Keluar | ✅ CREATE |
| Edit Surat | ✅ UPDATE |
| Delete Surat (single) | ✅ DELETE |
| Delete Surat (batch) | ✅ DELETE (per item) |
| Update Status | ✅ UPDATE |
| Approve Surat | ✅ APPROVE |
| Create User | ✅ CREATE |
| Edit User Profile | ✅ UPDATE |
| Reset Password | ✅ UPDATE |
| Delete User | ✅ DELETE |
| Add Master Data | ✅ CREATE |
| Rename Master Data | ✅ UPDATE |
| Delete Master Data | ✅ DELETE |
| Upload TTD | ✅ CREATE |
| Delete TTD | ✅ DELETE |

---

**© 2026 SiSurat - Audit Logs Documentation**
