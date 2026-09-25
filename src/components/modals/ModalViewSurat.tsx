import React, { useState } from "react"
import { fetchSuratMasukById, fetchSuratKeluarById } from "../../lib/api"

export function ModalViewSurat({
  type,
  suratId,
  onClose,
}: {
  type: "masuk" | "keluar"
  suratId: string
  onClose: () => void
}) {
  const [surat, setSurat] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  React.useEffect(() => {
    const fetchSurat = async () => {
      try {
        const s = type === "masuk" ? await fetchSuratMasukById(suratId) : await fetchSuratKeluarById(suratId)
        setSurat(s)
      } catch (err) {
        console.error("Error fetching surat:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchSurat()
  }, [type, suratId])

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" style={{ fontFamily: "Inter, sans-serif" }}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {type === "masuk" ? "Detail Surat Masuk" : "Detail Surat Keluar"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {type === "masuk" ? "Surat asli yang dibalas" : "Surat balasan yang dibuat"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Memuat data surat...</p>
          </div>
        ) : surat ? (
          <div className="px-6 py-5 space-y-4">
            {/* No. Surat & Pengirim/Tujuan */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">No. Surat</p>
                <p className="text-sm font-semibold text-slate-800" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                  {surat.nomor_surat}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">{type === "masuk" ? "Pengirim" : "Tujuan"}</p>
                <p className="text-sm font-medium text-slate-800">{type === "masuk" ? surat.pengirim : surat.tujuan}</p>
              </div>
            </div>

            {/* Tanggal & Kategori */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">{type === "masuk" ? "Tanggal Terima" : "Tanggal Kirim"}</p>
                <p className="text-sm font-medium text-slate-800">
                  {formatDate(type === "masuk" ? surat.tanggal_terima : surat.tanggal_kirim)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Kategori</p>
                <span
                  className="text-xs font-medium px-2 py-1 rounded-full capitalize"
                  style={{
                    background: surat.kategori === "penting" ? "#FEF2F2" : "#F1F5F9",
                    color: surat.kategori === "penting" ? "#DC2626" : "#64748B",
                  }}
                >
                  {surat.kategori}
                </span>
              </div>
            </div>

            {/* Jenis & Folder */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">Jenis Surat</p>
                <p className="text-sm font-medium text-slate-800 capitalize">{surat.jenis_surat || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Folder</p>
                <p className="text-sm font-medium text-slate-800">{surat.folder || "-"}</p>
              </div>
            </div>

            {/* Perihal */}
            <div>
              <p className="text-xs text-slate-400 mb-1">Perihal</p>
              <p className="text-sm font-medium text-slate-800">{surat.perihal}</p>
            </div>

            {/* Isi Surat */}
            <div>
              <p className="text-xs text-slate-400 mb-1">Isi Surat</p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {surat.isi_surat || "-"}
              </p>
            </div>

            {/* File */}
            {type === "masuk" && surat.file_lampiran && (
              <div>
                <p className="text-xs text-slate-400 mb-1">File Dokumen</p>
                <p className="text-sm text-slate-600">{surat.file_lampiran.nama}</p>
              </div>
            )}
            {type === "keluar" && surat.file_draft && (
              <div>
                <p className="text-xs text-slate-400 mb-1">File Draft</p>
                <p className="text-sm text-slate-600">{surat.file_draft.nama}</p>
              </div>
            )}

            {/* Status Tindak Lanjut (untuk surat masuk) */}
            {type === "masuk" && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Status Tindak Lanjut</p>
                <span
                  className="text-xs font-medium px-2 py-1 rounded-full capitalize"
                  style={{
                    background: surat.status_tindak_lanjut === "selesai" ? "#ECFDF5" : surat.status_tindak_lanjut === "menunggu" ? "#FEF3C7" : "#FEF2F2",
                    color: surat.status_tindak_lanjut === "selesai" ? "#059669" : surat.status_tindak_lanjut === "menunggu" ? "#D97706" : "#DC2626",
                  }}
                >
                  {surat.status_tindak_lanjut === "selesai" ? "Selesai" : surat.status_tindak_lanjut === "menunggu" ? "Menunggu" : "Belum"}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-sm">
            Surat tidak ditemukan
          </div>
        )}
      </div>
    </div>
  )
}
