import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { IconCreate, IconEdit, IconTrash, IconCheck, IconDocument, IconChart, IconX, IconLoader, IconAuditLog } from './Icons'

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

  const token = localStorage.getItem('token')

  useEffect(() => {
    fetchTimeline()
  }, [tableName, recordId])

  const fetchTimeline = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/audit-logs/timeline/${tableName}/${recordId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data: TimelineEvent[] = await res.json()
      setTimeline(data)
    } catch (error) {
      console.error('Error fetching timeline:', error)
    } finally {
      setLoading(false)
    }
  }

  const getIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <IconCreate />
      case 'UPDATE':
        return <IconEdit />
      case 'DELETE':
        return <IconTrash />
      case 'APPROVE':
        return <IconCheck />
      default:
        return <IconDocument />
    }
  }

  const getColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-700 border-green-300'
      case 'UPDATE':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'DELETE':
        return 'bg-red-100 text-red-700 border-red-300'
      case 'APPROVE':
        return 'bg-purple-100 text-purple-700 border-purple-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const renderChanges = (event: TimelineEvent) => {
    if (event.action_type === 'CREATE') {
      return (
        <div className="mt-3 p-3 bg-gray-50 rounded text-xs space-y-1 border border-gray-200">
          <p className="font-medium text-gray-700 mb-2 flex items-center gap-1"><IconDocument /> Dibuat dengan nilai:</p>
          {event.new_values &&
            Object.entries(event.new_values).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="font-medium text-gray-600 min-w-28">{key}:</span>
                <span className="text-gray-700 break-words">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
        </div>
      )
    }

    if (event.action_type === 'UPDATE' || event.action_type === 'APPROVE') {
      return (
        <div className="mt-3 p-3 bg-gray-50 rounded text-xs border border-gray-200 space-y-2">
          <p className="font-medium text-gray-700 mb-2 flex items-center gap-1"><IconChart /> Perubahan Data:</p>
          {event.old_values &&
            Object.entries(event.old_values).map(([key, diff]: any) => (
              <div key={key} className="border border-gray-300 rounded p-2 bg-white">
                <p className="font-medium text-gray-700 mb-1">{key}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs font-medium text-red-600 mb-1 flex items-center gap-1"><IconX /> Sebelum:</p>
                    <div className="bg-red-50 px-2 py-1 rounded border border-red-200 text-xs break-all">
                      {typeof diff.before === 'object' ? JSON.stringify(diff.before) : String(diff.before)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-green-600 mb-1 flex items-center gap-1"><IconCheck /> Sesudah:</p>
                    <div className="bg-green-50 px-2 py-1 rounded border border-green-200 text-xs break-all">
                      {typeof diff.after === 'object' ? JSON.stringify(diff.after) : String(diff.after)}
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

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <span className="inline-block"><IconLoader /></span> Memuat timeline...
      </div>
    )
  }

  if (timeline.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 bg-gray-50 rounded border border-gray-200">
        Belum ada aktivitas
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
        <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><IconAuditLog /> Riwayat Aktivitas</h3>
        <p className="text-xs text-gray-600 mt-1">{timeline.length} aksi tercatat</p>
      </div>

      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {timeline.map((event, idx) => (
          <div key={event.id} className="flex gap-3">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold border-2 ${getColor(event.action_type)} flex-shrink-0`}
              >
                {getIcon(event.action_type)}
              </div>
              {idx < timeline.length - 1 && (
                <div className="w-1 h-12 bg-gradient-to-b from-gray-300 to-gray-200 mt-2"></div>
              )}
            </div>

            {/* Event content */}
            <div className="flex-1 pb-2">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900">{event.description}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    👤 {event.user_nama}
                    <span className="text-gray-400 mx-1">•</span>
                    <span className="font-mono text-gray-500">@{event.username}</span>
                  </p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                  {format(new Date(event.created_at), 'dd/MM/yyyy')}
                  <br />
                  {format(new Date(event.created_at), 'HH:mm:ss')}
                </span>
              </div>

              {/* Expandable details */}
              {(event.old_values || event.new_values) && (
                <>
                  <button
                    onClick={() => setExpanded(expanded === event.id ? null : event.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-2 inline-flex items-center gap-1"
                  >
                    {expanded === event.id ? '▼' : '▶'} {expanded === event.id ? 'Sembunyikan' : 'Lihat'} detail
                  </button>

                  {expanded === event.id && renderChanges(event)}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AuditTimeline
