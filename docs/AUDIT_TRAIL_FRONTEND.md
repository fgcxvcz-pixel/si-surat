# Audit Trail - Frontend Implementation Guide

## Overview
Frontend components untuk menampilkan activity log di 2 tempat:
1. **Master Audit Log Page** - Super Admin/Admin untuk melihat semua aktivitas dengan filter & export
2. **Timeline Component** - Embedded di halaman detail surat untuk contextual view

---

## 1. Master Audit Log Page

**Path:** `src/pages/AuditLogsPage.tsx`

**Features:**
- Filter by: user, action type, table name, date range
- Pagination
- Export to CSV
- Real-time search & filtering

### Component Structure

```typescript
export interface AuditLog {
  id: number
  id_user: number
  user_nama: string
  username: string
  action_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE'
  table_name: string
  record_id: number
  ip_address: string
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  description: string
  created_at: string
}

export interface AuditLogsResponse {
  data: AuditLog[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}
```

### Example Implementation

```typescript
import { useState, useEffect } from 'react'
import { format } from 'date-fns'

const AuditLogsPage = () => {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filters, setFilters] = useState({
    user_id: '',
    action_type: '',
    table_name: '',
    date_from: '',
    date_to: '',
    page: 1,
    limit: 50,
  })
  const [pagination, setPagination] = useState({ total: 0, pages: 0 })
  const [loading, setLoading] = useState(false)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value))
      })

      const res = await fetch(`/api/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setLogs(data.data)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [filters])

  const handleExport = async () => {
    try {
      const res = await fetch('/api/audit-logs/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: filters.user_id || undefined,
          action_type: filters.action_type || undefined,
          table_name: filters.table_name || undefined,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
        })
      })
      const { csv } = await res.json()
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting logs:', error)
    }
  }

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      'CREATE': 'bg-green-100 text-green-800',
      'UPDATE': 'bg-blue-100 text-blue-800',
      'DELETE': 'bg-red-100 text-red-800',
      'APPROVE': 'bg-purple-100 text-purple-800',
    }
    return colors[action] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Master Audit Log</h1>

      {/* Filter Section */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div>
          <label className="block text-sm font-medium mb-1">User</label>
          <input
            type="text"
            placeholder="User ID atau nama"
            value={filters.user_id}
            onChange={(e) => setFilters({...filters, user_id: e.target.value, page: 1})}
            className="w-full border px-3 py-2 rounded text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Action Type</label>
          <select
            value={filters.action_type}
            onChange={(e) => setFilters({...filters, action_type: e.target.value, page: 1})}
            className="w-full border px-3 py-2 rounded text-sm"
          >
            <option value="">All</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="APPROVE">APPROVE</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Table</label>
          <select
            value={filters.table_name}
            onChange={(e) => setFilters({...filters, table_name: e.target.value, page: 1})}
            className="w-full border px-3 py-2 rounded text-sm"
          >
            <option value="">All</option>
            <option value="surat_masuk">Surat Masuk</option>
            <option value="surat_keluar">Surat Keluar</option>
          </select>
        </div>

        <div className="col-span-2 md:col-span-1">
          <label className="block text-sm font-medium mb-1">Date From</label>
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters({...filters, date_from: e.target.value, page: 1})}
            className="w-full border px-3 py-2 rounded text-sm"
          />
        </div>

        <div className="col-span-2 md:col-span-1">
          <label className="block text-sm font-medium mb-1">Date To</label>
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters({...filters, date_to: e.target.value, page: 1})}
            className="w-full border px-3 py-2 rounded text-sm"
          />
        </div>

        <button
          onClick={handleExport}
          className="col-span-2 md:col-span-1 bg-green-600 text-white px-4 py-2 rounded font-medium hover:bg-green-700 h-fit"
        >
          Export CSV
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No audit logs found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Timestamp</th>
                    <th className="px-4 py-3 text-left font-medium">User</th>
                    <th className="px-4 py-3 text-left font-medium">Action</th>
                    <th className="px-4 py-3 text-left font-medium">Table</th>
                    <th className="px-4 py-3 text-left font-medium">Record ID</th>
                    <th className="px-4 py-3 text-left font-medium">IP Address</th>
                    <th className="px-4 py-3 text-left font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-medium">{log.user_nama}</div>
                        <div className="text-gray-500">@{log.username}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getActionBadge(log.action_type)}`}>
                          {log.action_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">{log.table_name}</td>
                      <td className="px-4 py-3 text-xs font-mono">{log.record_id}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{log.ip_address || '-'}</td>
                      <td className="px-4 py-3 text-xs max-w-xs truncate" title={log.description}>
                        {log.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 bg-gray-50 border-t">
              <div className="text-sm text-gray-600">
                Showing {logs.length} of {pagination.total} total logs
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters({...filters, page: Math.max(1, filters.page - 1)})}
                  disabled={filters.page === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1">
                  Page {filters.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setFilters({...filters, page: Math.min(pagination.pages, filters.page + 1)})}
                  disabled={filters.page === pagination.pages}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default AuditLogsPage
```

---

## 2. Timeline Component (Contextual in Document Detail)

**Path:** `src/components/AuditTimeline.tsx`

**Usage:** Di halaman detail surat masuk/keluar untuk menampilkan riwayat perubahan

### Component Implementation

```typescript
import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface TimelineEvent {
  id: number
  action_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE'
  user_nama: string
  username: string
  description: string
  created_at: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
}

interface AuditTimelineProps {
  tableName: 'surat_masuk' | 'surat_keluar'
  recordId: number
}

const AuditTimeline = ({ tableName, recordId }: AuditTimelineProps) => {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    const fetchTimeline = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/audit-logs/timeline/${tableName}/${recordId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        setTimeline(data)
      } catch (error) {
        console.error('Error fetching timeline:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTimeline()
  }, [tableName, recordId])

  const getIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return '✨'
      case 'UPDATE': return '✏️'
      case 'DELETE': return '🗑️'
      case 'APPROVE': return '✅'
      default: return '📝'
    }
  }

  const getColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-700'
      case 'UPDATE': return 'bg-blue-100 text-blue-700'
      case 'DELETE': return 'bg-red-100 text-red-700'
      case 'APPROVE': return 'bg-purple-100 text-purple-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const renderChanges = (event: TimelineEvent) => {
    if (event.action_type === 'CREATE') {
      return (
        <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
          <p className="font-medium mb-2">Created with:</p>
          {event.new_values && Object.entries(event.new_values).map(([key, value]) => (
            <div key={key} className="mb-1">
              <span className="font-medium">{key}:</span> {JSON.stringify(value)}
            </div>
          ))}
        </div>
      )
    }

    if (event.action_type === 'UPDATE' || event.action_type === 'APPROVE') {
      return (
        <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
          {event.old_values && Object.entries(event.old_values).map(([key, diff]: any) => (
            <div key={key} className="mb-2 pb-2 border-b last:border-b-0">
              <span className="font-medium text-gray-700">{key}:</span>
              <div className="flex gap-2 mt-1">
                <div className="flex-1">
                  <span className="text-xs text-red-600">Before:</span>
                  <div className="bg-red-50 px-2 py-1 rounded mt-1 break-words">
                    {JSON.stringify(diff.before)}
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-xs text-green-600">After:</span>
                  <div className="bg-green-50 px-2 py-1 rounded mt-1 break-words">
                    {JSON.stringify(diff.after)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }

    return null
  }

  if (loading) return <div className="p-4 text-center text-gray-500">Loading timeline...</div>
  if (timeline.length === 0) return <div className="p-4 text-center text-gray-500">No activity yet</div>

  return (
    <div className="mt-6 p-4 bg-white rounded-lg border">
      <h3 className="font-bold text-lg mb-4">Activity Timeline</h3>
      
      <div className="space-y-4">
        {timeline.map((event, idx) => (
          <div key={event.id} className="flex gap-4">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getColor(event.action_type)} text-lg`}>
                {getIcon(event.action_type)}
              </div>
              {idx < timeline.length - 1 && (
                <div className="w-1 h-12 bg-gray-300 mt-2"></div>
              )}
            </div>

            {/* Event content */}
            <div className="flex-1 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">
                    {event.description}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {event.user_nama} (@{event.username})
                  </p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                  {format(new Date(event.created_at), 'dd/MM/yyyy HH:mm:ss')}
                </span>
              </div>

              {/* Expandable changes */}
              {(event.old_values || event.new_values) && (
                <button
                  onClick={() => setExpanded(expanded === event.id ? null : event.id)}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-2 underline"
                >
                  {expanded === event.id ? 'Hide' : 'Show'} details
                </button>
              )}

              {expanded === event.id && renderChanges(event)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AuditTimeline
```

---

## 3. Integration ke Halaman Detail Surat

### Contoh: SuratKeluarDetail.tsx

```typescript
import { useState, useEffect } from 'react'
import AuditTimeline from '../components/AuditTimeline'

const SuratKeluarDetail = ({ id }: { id: number }) => {
  const [surat, setSurat] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSurat()
  }, [id])

  const fetchSurat = async () => {
    try {
      const res = await fetch(`/api/surat-keluar/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setSurat(data)
    } catch (error) {
      console.error('Error fetching surat:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>
  if (!surat) return <div>Surat not found</div>

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Main content */}
      <div className="col-span-2">
        <div className="bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-4">{surat.perihal}</h1>
          <p className="text-gray-600 mb-4">No. {surat.nomor_surat}</p>
          {/* ... more surat details */}
        </div>
      </div>

      {/* Sidebar with timeline */}
      <div className="col-span-1">
        <AuditTimeline tableName="surat_keluar" recordId={id} />
      </div>
    </div>
  )
}

export default SuratKeluarDetail
```

---

## Access Control

**Master Audit Log Page Access:**
- Super Admin ✅
- Admin ✅
- Kepala Bagian ❌
- User ❌

**Timeline in Document Detail:**
- All authenticated users ✅

Add this check in your page component:
```typescript
if (!['Super Admin', 'Admin'].includes(user.role)) {
  return <div className="p-6 text-center text-red-600">Access Denied</div>
}
```
