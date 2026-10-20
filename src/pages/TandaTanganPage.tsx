import { useState, useEffect, useRef } from "react"
import { fetchAllTandaTangan, createTandaTangan, setTandaTanganActive, deleteTandaTangan, getFileUrl } from "../lib/api"
import { getCurrentUserId, isSuperAdmin, isKepalaRole } from "../lib/constants"

export default function TandaTanganPage() {
  const [ttdList, setTtdList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [myTtd, setMyTtd] = useState<any | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const userInfo = localStorage.getItem("userInfo")
  let userRole = ""
  try { userRole = userInfo ? (JSON.parse(userInfo).role || "") : "" } catch {}
  const isKepala = isKepalaRole(userRole) || isSuperAdmin(userRole)
  const currentUserId = getCurrentUserId()

  const fetchTTD = async () => {
    try {
      const data = await fetchAllTandaTangan()
      setTtdList(data)
      const own = data.find((t: any) => (t.id_user?.id ?? t.id_user) === currentUserId)
      setMyTtd(own)
    } catch (err: any) {
      setError(err.message || "Gagal memuat data TTD")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTTD() }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("File harus berformat gambar (PNG/JPG)")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Ukuran file maksimal 2 MB")
      return
    }

    setUploading(true)
    setError("")
    try {
      const userId = getCurrentUserId()
      if (!userId) throw new Error("User tidak terotentikasi")

      await createTandaTangan(userId, file)
      await fetchTTD()
    } catch (err: any) {
      setError(err.message || "Gagal mengunggah TTD")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await setTandaTanganActive(id, !currentActive)
      await fetchTTD()
    } catch (err: any) {
      setError(err.message || "Gagal mengubah status TTD")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus TTD ini? Tindakan ini tidak dapat dibatalkan.")) return
    setDeleting(id)
    try {
      await deleteTandaTangan(id)
      await fetchTTD()
    } catch (err: any) {
      setError(err.message || "Gagal menghapus TTD")
    } finally {
      setDeleting(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getUploadDate = (timestamp: string): string => {
    return new Date(timestamp).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "#F8FAFC", fontFamily: "Inter, sans-serif" }}>
      <div className="px-8 py-4 bg-white border-b border-slate-200 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Tanda Tangan Digital</h1>
          <p className="text-slate-500 text-xs mt-0.5">Kelola tanda tangan untuk persetujuan surat</p>
        </div>
      </div>

      {!isKepala ? (
        <div className="p-8 max-w-3xl mx-auto">
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Akses Ditolak</h2>
            <p className="text-slate-500 text-sm">Hanya Kepala Bagian yang dapat mengakses halaman ini.</p>
          </div>
        </div>
      ) : (
        <div className="p-8 max-w-3xl mx-auto space-y-6">
        {/* Current Active TTD */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">Tanda Tangan Aktif</h2>
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Memuat...</div>
          ) : myTtd ? (
            <div className="flex items-center gap-6">
              <div className="w-48 h-24 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                <img src={getFileUrl(myTtd.file_ttd?.path || "")} alt="TTD Aktif" className="max-w-full max-h-full object-contain" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{myTtd.file_ttd?.nama}</p>
                <p className="text-xs text-slate-400 mt-0.5">{myTtd.id_user?.nama}</p>
                <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Aktif</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm mb-3">Belum ada tanda tangan aktif</p>
              <p className="text-slate-300 text-xs">Upload gambar tanda tangan di bawah ini</p>
            </div>
          )}
        </div>

        {/* Upload / Already Uploaded Section */}
        {!myTtd ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">Upload TTD Baru</h2>
            <label className="flex flex-col items-center gap-3 px-6 py-8 rounded-xl border-2 border-dashed border-slate-300 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600">
                  {uploading ? "Mengunggah..." : "Klik untuk memilih gambar"}
                </p>
                <p className="text-xs text-slate-400 mt-1">PNG atau JPG, maks. 2 MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
            {error && (
              <div className="mt-3 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200">
                <span className="text-red-600 text-sm">{error}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">✓ TTD Sudah Diunggah</h2>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Aktif</span>
            </div>

            {error && (
              <div className="mb-4 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200">
                <span className="text-red-600 text-sm">{error}</span>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-lg mb-4 border border-slate-200">
              <div className="mb-4">
                <p className="text-xs text-slate-600 mb-2 font-medium">Preview:</p>
                <div className="rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden mx-auto" style={{ maxWidth: "320px", height: "200px" }}>
                  <img
                    src={getFileUrl(myTtd.file_ttd?.path || "")}
                    alt="Tanda Tangan"
                    className="max-w-sm h-auto object-contain"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Nama File:</p>
                  <p className="font-medium text-slate-900 truncate">{myTtd.file_ttd?.nama}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Ukuran:</p>
                  <p className="font-medium text-slate-900">{formatFileSize(myTtd.file_ttd?.ukuran)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500 text-xs">Tanggal Upload:</p>
                  <p className="font-medium text-slate-900">{getUploadDate(myTtd.created_at)}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleDelete(myTtd.id)}
              disabled={deleting === myTtd.id}
              className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-slate-400 transition-colors font-medium text-sm flex items-center justify-center gap-2"
            >
              {deleting === myTtd.id ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Hapus & Upload Ulang
                </>
              )}
            </button>
          </div>
        )}

        {/* All TTDs */}
        {ttdList.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">Tanda Tangan Saya</h2>
            <div className="space-y-3">
              {ttdList.filter((t: any) => (t.id_user?.id ?? t.id_user) === currentUserId).map((ttd) => (
                <div key={ttd.id} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div
                    className="w-20 h-14 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden cursor-pointer shrink-0"
                    onClick={() => ttd.file_ttd?.path && setPreviewUrl(getFileUrl(ttd.file_ttd.path))}
                  >
                    <img src={getFileUrl(ttd.file_ttd?.path || "")} alt="TTD" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{ttd.file_ttd?.nama}</p>
                    <p className="text-xs text-slate-400">{ttd.id_user?.nama} • {new Date(ttd.created_at).toLocaleDateString("id-ID")}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleActive(ttd.id, ttd.is_aktif)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        background: ttd.is_aktif ? "#ECFDF5" : "#F1F5F9",
                        color: ttd.is_aktif ? "#059669" : "#64748B",
                        border: ttd.is_aktif ? "1px solid #A7F3D0" : "1px solid #E2E8F0",
                      }}
                    >
                      {ttd.is_aktif ? "Aktif" : "Nonaktif"}
                    </button>
                    <button
                      onClick={() => handleDelete(ttd.id)}
                      disabled={deleting === ttd.id}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="Hapus"
                    >
                      {deleting === ttd.id ? (
                        <div className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {previewUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setPreviewUrl(null)}>
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900">Preview TTD</h3>
                <button onClick={() => setPreviewUrl(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-center" style={{ minHeight: "200px" }}>
                <img src={previewUrl} alt="Preview TTD" className="max-w-full max-h-96 object-contain" />
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  )
}
