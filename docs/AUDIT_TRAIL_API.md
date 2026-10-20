# Audit Trail (Activity Log) - API Documentation

## Overview
Sistem audit trail mencatat semua aksi CRUD (Create, Read, Update, Delete) dan APPROVE pada dokumen surat masuk/keluar dengan informasi lengkap: user, IP address, timestamp, dan perubahan data (before/after untuk UPDATE).

## Database Schema

### `audit_logs` Table
```sql
- id: INT (Primary Key)
- id_user: INT (Foreign Key ke pengguna.id)
- action_type: ENUM('CREATE', 'UPDATE', 'DELETE', 'APPROVE')
- table_name: VARCHAR(100) - nama tabel (surat_masuk, surat_keluar)
- record_id: INT - ID dokumen yang diubah
- ip_address: VARCHAR(45) - IP address user
- user_agent: TEXT - User agent browser (optional)
- old_values: JSON - Nilai sebelum perubahan (untuk UPDATE)
- new_values: JSON - Nilai sesudah perubahan (untuk UPDATE)
- description: TEXT - Deskripsi human-readable
- created_at: DATETIME - Timestamp aksi
```

**Indexes untuk performa:**
- idx_audit_user (id_user)
- idx_audit_action (action_type)
- idx_audit_table (table_name)
- idx_audit_record (record_id)
- idx_audit_created (created_at)
- idx_audit_compound (table_name, record_id, created_at)

## API Endpoints

### 1. GET /api/audit-logs
**Deskripsi:** Master audit log dengan filtering (Super Admin/Admin only)

**Query Parameters:**
- `user_id` (int) - Filter by user
- `action_type` (string) - Filter by action: CREATE, UPDATE, DELETE, APPROVE
- `table_name` (string) - Filter by table: surat_masuk, surat_keluar
- `date_from` (date) - Format: YYYY-MM-DD
- `date_to` (date) - Format: YYYY-MM-DD
- `page` (int, default: 1)
- `limit` (int, default: 50, max: 500)

**Authorization:** Super Admin, Admin

**Example Request:**
```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:3000/api/audit-logs?user_id=2&action_type=UPDATE&table_name=surat_keluar&date_from=2026-10-01&date_to=2026-10-31&page=1&limit=50"
```

**Example Response:**
```json
{
  "data": [
    {
      "id": 1,
      "id_user": 2,
      "user_nama": "Admin User",
      "username": "admin_user",
      "action_type": "UPDATE",
      "table_name": "surat_keluar",
      "record_id": 5,
      "ip_address": "192.168.1.100",
      "old_values": {
        "perihal": {
          "before": "Surat Lama",
          "after": "Surat Baru"
        },
        "status_approval": {
          "before": "menunggu",
          "after": "disetujui"
        }
      },
      "new_values": null,
      "description": "Surat keluar diperbarui",
      "created_at": "2026-10-16 10:30:45"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 120,
    "pages": 3
  }
}
```

---

### 2. GET /api/audit-logs/timeline/:table_name/:record_id
**Deskripsi:** Timeline aktivitas untuk dokumen spesifik (kontekstual di halaman detail)

**Path Parameters:**
- `table_name` (string) - surat_masuk atau surat_keluar
- `record_id` (int) - ID dokumen

**Authorization:** Authenticated (semua user)

**Example Request:**
```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:3000/api/audit-logs/timeline/surat_keluar/5"
```

**Example Response:**
```json
[
  {
    "id": 10,
    "id_user": 1,
    "user_nama": "Super Admin",
    "username": "admin",
    "action_type": "CREATE",
    "table_name": "surat_keluar",
    "record_id": 5,
    "ip_address": "127.0.0.1",
    "old_values": null,
    "new_values": {
      "nomor_surat": "001.00/SSI-PCT/X/2026",
      "tujuan": "PT ABC",
      "perihal": "Surat Tugas",
      "kategori": "biasa"
    },
    "description": "Surat keluar dibuat: 001.00/SSI-PCT/X/2026",
    "created_at": "2026-10-15 09:00:00"
  },
  {
    "id": 11,
    "id_user": 1,
    "user_nama": "Super Admin",
    "username": "admin",
    "action_type": "UPDATE",
    "table_name": "surat_keluar",
    "record_id": 5,
    "ip_address": "127.0.0.1",
    "old_values": {
      "perihal": {
        "before": "Surat Tugas",
        "after": "Surat Tugas Penting"
      }
    },
    "new_values": null,
    "description": "Surat keluar diperbarui",
    "created_at": "2026-10-15 10:15:30"
  },
  {
    "id": 12,
    "id_user": 3,
    "user_nama": "Kepala Bagian",
    "username": "kepala_bagian",
    "action_type": "APPROVE",
    "table_name": "surat_keluar",
    "record_id": 5,
    "ip_address": "192.168.1.50",
    "old_values": {
      "status_approval": "menunggu"
    },
    "new_values": {
      "status_approval": "disetujui",
      "approved_by": 3,
      "catatan_revisi": null
    },
    "description": "Surat keluar disetujui: 001.00/SSI-PCT/X/2026",
    "created_at": "2026-10-15 11:00:00"
  }
]
```

---

### 3. POST /api/audit-logs/export
**Deskripsi:** Export audit logs ke format CSV

**Authorization:** Super Admin, Admin

**Request Body:**
```json
{
  "user_id": 2,
  "action_type": "UPDATE",
  "table_name": "surat_keluar",
  "date_from": "2026-10-01",
  "date_to": "2026-10-31"
}
```

**Example Response:**
```json
{
  "csv": "timestamp,user_id,user_name,username,ip_address,action_type,table_name,record_id,description,old_values,new_values\n2026-10-15 10:15:30,1,Super Admin,admin,127.0.0.1,UPDATE,surat_keluar,5,Surat keluar diperbarui,\"{\"perihal\":{\"before\":\"Surat Tugas\",\"after\":\"Surat Tugas Penting\"}}\",\"\"\n..."
}
```

**Client-side Download (JavaScript):**
```javascript
const response = await fetch('/api/audit-logs/export', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    user_id: 2,
    action_type: 'UPDATE',
    table_name: 'surat_keluar',
    date_from: '2026-10-01',
    date_to: '2026-10-31'
  })
})

const data = await response.json()
const blob = new Blob([data.csv], { type: 'text/csv' })
const url = window.URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
a.click()
```

---

## Integration Points

### Surat Keluar Routes
- **POST /api/surat-keluar** → Logs CREATE action
- **PATCH /api/surat-keluar/:id** → Logs UPDATE action with before/after
- **DELETE /api/surat-keluar/:id** → Logs DELETE action
- **POST /api/surat-keluar/:id/approve** → Logs APPROVE action

### Surat Masuk Routes
- **POST /api/surat-masuk** → Logs CREATE action
- **PATCH /api/surat-masuk/:id** → Logs UPDATE action with before/after
- **DELETE /api/surat-masuk/:id** → Logs DELETE action
- **PATCH /api/surat-masuk/:id/status** → Logs UPDATE action for status change

---

## Backend Helper Functions

### `logAudit(userId, actionType, tableName, recordId, oldValues, newValues, ipAddress, description)`

**Location:** `server/utils/auditLogger.js`

**Synchronous logging** - Blocking sampai data berhasil ditulis ke database.

**Parameters:**
- `userId` (int, required) - ID user yang melakukan aksi
- `actionType` (string, required) - CREATE, UPDATE, DELETE, APPROVE
- `tableName` (string, required) - Nama tabel
- `recordId` (int, required) - ID record yang diubah
- `oldValues` (object, optional) - Data sebelum perubahan (untuk UPDATE)
- `newValues` (object, optional) - Data sesudah perubahan (untuk UPDATE)
- `ipAddress` (string, optional) - IP address user
- `description` (string, optional) - Deskripsi human-readable

**Example Usage:**
```javascript
import { logAudit, getClientIp, diffValues } from '../utils/auditLogger.js'

// CREATE
await logAudit(
  req.user.sub,
  'CREATE',
  'surat_keluar',
  suratId,
  null,
  { nomor_surat, tujuan, perihal },
  getClientIp(req),
  `Surat keluar dibuat: ${nomor_surat}`
)

// UPDATE with diff
const oldValues = { ...previousData }
const newValues = { ...currentData }
const changes = diffValues(oldValues, newValues)
if (changes) {
  await logAudit(
    req.user.sub,
    'UPDATE',
    'surat_keluar',
    suratId,
    changes,
    null,
    getClientIp(req),
    `Surat keluar diperbarui`
  )
}

// APPROVE
await logAudit(
  req.user.sub,
  'APPROVE',
  'surat_keluar',
  suratId,
  { status_approval: 'menunggu' },
  { status_approval: 'disetujui', approved_by: userId },
  getClientIp(req),
  `Surat keluar disetujui: ${nomor_surat}`
)
```

### Helper Functions

**`getClientIp(req)`**
Ekstrak IP address dari request headers (dengan support untuk proxy).

**`diffValues(oldObj, newObj, fieldsToTrack)`**
Membandingkan 2 object dan mengembalikan hanya field yang berubah dalam format:
```json
{
  "field_name": {
    "before": "nilai lama",
    "after": "nilai baru"
  }
}
```

---

## Performance Considerations

1. **Sync Logging**: Semua log ditulis secara sinkronus (blocking) untuk memastikan data tidak hilang saat crash
2. **Indexes**: Tabel audit_logs memiliki 6 indexes untuk query filtering yang cepat
3. **No READ logs**: READ actions tidak dilog untuk menjaga performa sistem
4. **Paginated API**: Master log endpoint menggunakan pagination (default 50, max 500) untuk menghindari query besar
5. **JSON Storage**: old_values/new_values disimpan sebagai JSON untuk fleksibilitas field tracking

---

## RBAC (Role-Based Access Control)

| Role | GET /api/audit-logs | GET /timeline | POST /export |
|------|-------------------|--------------|-------------|
| Super Admin | ✅ (all data) | ✅ | ✅ |
| Admin | ✅ (all data) | ✅ | ✅ |
| Kepala Bagian | ❌ | ✅ | ❌ |
| User (biasa) | ❌ | ✅ | ❌ |

Timeline endpoint dapat diakses oleh semua user yang authenticated untuk melihat riwayat dokumen spesifik.
