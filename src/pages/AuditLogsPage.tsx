import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { http } from '../lib/http'
import { saveAs } from 'file-saver'
import { IconCreate, IconEdit, IconTrash, IconCheck, IconLoader, IconUsers, IconClipboard, IconHash, IconGlobe } from '../components/Icons'

interface AuditLog {
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

interface AuditLogsResponse {
  data: AuditLog[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

const AuditLogsPage = () => {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filters, setFilters] = useState({
    username: '',
    action_type: '',
    table_name: '',
    date_from: '',
    date_to: '',
    page: 1,
    limit: 50,
  })
  const [pagination, setPagination] = useState({ total: 0, pages: 0 })
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value))
      })

      const data: AuditLogsResponse = await http(`/audit-logs?${params}`)
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

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value, page: 1 })
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/audit-logs/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          username: filters.username || undefined,
          action_type: filters.action_type || undefined,
          table_name: filters.table_name || undefined,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
        })
      })

      if (!response.ok) {
        throw new Error('Failed to export logs')
      }

      const blob = await response.blob()
      const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.xlsx`
      saveAs(blob, filename)
    } catch (error) {
      console.error('Error exporting logs:', error)
      alert('Gagal export logs')
    } finally {
      setExporting(false)
    }
  }

  const getActionBadge = (action: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      'CREATE': { bg: 'bg-green-100', text: 'text-green-800' },
      'UPDATE': { bg: 'bg-blue-100', text: 'text-blue-800' },
      'DELETE': { bg: 'bg-red-100', text: 'text-red-800' },
      'APPROVE': { bg: 'bg-purple-100', text: 'text-purple-800' },
    }
    const color = colors[action] || { bg: 'bg-gray-100', text: 'text-gray-800' }
    return `${color.bg} ${color.text}`
  }

  const getActionIcon = (action: string) => {
    const icons: Record<string, React.ReactNode> = {
      'CREATE': <IconCreate />,
      'UPDATE': <IconEdit />,
      'DELETE': <IconTrash />,
      'APPROVE': <IconCheck />,
    }
    return icons[action] || null
  }

  const renderChanges = (log: AuditLog) => {
    if (!log.old_values && !log.new_values) return null

    return (
      <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
        {log.action_type === 'CREATE' && log.new_values && (
          <div>
            <p className="font-medium text-sm mb-2 text-gray-700">Dibuat dengan:</p>
            <div className="space-y-1 text-xs">
              {Object.entries(log.new_values).map(([key, value]) => (
                <div key={key} className="flex">
                  <span className="font-medium w-32 text-gray-600">{key}:</span>
                  <span className="text-gray-700 break-words flex-1">{JSON.stringify(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(log.action_type === 'UPDATE' || log.action_type === 'APPROVE') && log.old_values && (
          <div>
            <p className="font-medium text-sm mb-2 text-gray-700">Perubahan:</p>
            <div className="space-y-2 text-xs">
              {Object.entries(log.old_values).map(([key, diff]: any) => (
                <div key={key} className="border border-gray-300 rounded p-2">
                  <p className="font-medium text-gray-700 mb-1">{key}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-red-600 text-xs font-medium">Sebelum:</span>
                      <div className="bg-red-50 px-2 py-1 rounded mt-1 border border-red-200 text-xs break-words">
                        {JSON.stringify(diff.before)}
                      </div>
                    </div>
                    <div>
                      <span className="text-green-600 text-xs font-medium">Sesudah:</span>
                      <div className="bg-green-50 px-2 py-1 rounded mt-1 border border-green-200 text-xs break-words">
                        {JSON.stringify(diff.after)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Master Audit Log</h1>
          <p className="text-xs text-slate-500 mt-0.5">Riwayat lengkap semua aktivitas sistem: CREATE, UPDATE, DELETE, dan APPROVE</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                placeholder="Masukkan username"
                value={filters.username}
                onChange={(e) => handleFilterChange('username', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Aksi</label>
              <select
                value={filters.action_type}
                onChange={(e) => handleFilterChange('action_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="APPROVE">APPROVE</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tabel</label>
              <select
                value={filters.table_name}
                onChange={(e) => handleFilterChange('table_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua</option>
                <option value="surat_masuk">Surat Masuk</option>
                <option value="surat_keluar">Surat Keluar</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dari Tanggal</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sampai Tanggal</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilters({
                username: '',
                action_type: '',
                table_name: '',
                date_from: '',
                date_to: '',
                page: 1,
                limit: 50,
              })}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
            >
              Reset Filter
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? 'Mengexport...' : 'Export XLSX'}
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-white rounded-lg shadow">
           {loading ? (
             <div className="p-8 text-center text-gray-500">
               <div className="inline-block animate-spin"><IconLoader /></div> Memuat data...
             </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Tidak ada audit log yang ditemukan
            </div>
          ) : (
            <>
              <div className="space-y-4 p-4 max-h-[calc(100vh-400px)] overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center flex-shrink-0">
                        {getActionIcon(log.action_type)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getActionBadge(log.action_type)}`}>
                            {log.action_type}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{log.description}</span>
                          <span className="text-xs text-gray-500 ml-auto">
                            {format(new Date(log.created_at), 'dd MMM yyyy HH:mm:ss')}
                          </span>
                        </div>

                        <div className="flex gap-4 text-sm text-gray-600 mb-2">
                          <span className="flex items-center gap-1"><IconUsers /> <span className="font-medium">{log.user_nama}</span> (@{log.username})</span>
                          <span className="flex items-center gap-1"><IconClipboard /> {log.table_name}</span>
                          <span className="flex items-center gap-1"><IconHash /> ID: {log.record_id}</span>
                          {log.ip_address && <span className="flex items-center gap-1"><IconGlobe /> {log.ip_address}</span>}
                        </div>

                        {(log.old_values || log.new_values) && (
                          <button
                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {expandedId === log.id ? '▼ Sembunyikan' : '▶ Lihat'} Detail Perubahan
                          </button>
                        )}

                        {expandedId === log.id && renderChanges(log)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between p-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                <div className="text-sm text-gray-600">
                  Menampilkan <span className="font-medium">{logs.length}</span> dari <span className="font-medium">{pagination.total}</span> total logs
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                    disabled={filters.page === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Sebelumnya
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.pages) }).map((_, idx) => {
                      const page = Math.max(1, filters.page - 2) + idx
                      if (page > pagination.pages) return null
                      return (
                        <button
                          key={page}
                          onClick={() => setFilters({ ...filters, page })}
                          className={`w-8 h-8 text-sm rounded ${
                            filters.page === page
                              ? 'bg-blue-600 text-white font-medium'
                              : 'border border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    onClick={() => setFilters({ ...filters, page: Math.min(pagination.pages, filters.page + 1) })}
                    disabled={filters.page === pagination.pages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Berikutnya →
                  </button>

                  <span className="text-sm text-gray-600 ml-4">
                    Halaman <span className="font-medium">{filters.page}</span> dari <span className="font-medium">{pagination.pages}</span>
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuditLogsPage
