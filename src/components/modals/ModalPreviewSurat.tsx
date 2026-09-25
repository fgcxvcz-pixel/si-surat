import logoSandya from "../../assets/logo-sandya.png"
import { getFileUrl } from "../../lib/api"

export function ModalPreviewSurat({
  surat,
  onClose,
}: {
  surat: any
  onClose: () => void
}) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })
  }

  const handleCetak = () => {
    const params = new URLSearchParams({
      nomor_surat: surat.nomor_surat || '',
      perihal: surat.perihal || '',
      isi_surat: surat.isi_surat || '',
      tanggal_kirim: surat.tanggal_kirim || '',
      tujuan: surat.tujuan || '',
      file_final_ttd: surat.id_ttd && surat.id_ttd.file_ttd ? JSON.stringify(surat.id_ttd.file_ttd) : '',
    })
    window.open(`/print-pdf?${params.toString()}`, '_blank')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-bold text-slate-900">Preview Surat Keluar</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Preview Content - Format Resmi */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto" style={{ maxWidth: "210mm", fontFamily: "'Times New Roman', Times, serif", color: "#111" }}>
            {/* Logo + Company */}
            <div className="flex justify-between items-start mb-8">
              <img src={logoSandya} alt="logo" className="h-16" />
              <div className="text-right text-xs leading-relaxed">
                <p className="font-bold text-sm tracking-wide">SANDYA NETWORKS KANTOR LAYANAN PACITAN</p>
                <p>Jl. Jend. Sudirman No. 3, Bowongan, Arjowinangun, Kecamatan Pacitan</p>
                <p>+62 811-8882-2525 | info@sandya.net | www.sandya.net</p>
              </div>
            </div>

            {/* Meta: Nomor & Perihal */}
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <div className="flex">
                  <span className="w-20">Nomor</span>
                  <span className="mr-1">:</span>
                  <span className="font-normal">{surat.nomor_surat || "-"}</span>
                </div>
                <div className="flex">
                  <span className="w-20">Perihal</span>
                  <span className="mr-1">:</span>
                  <span className="font-bold underline">{surat.perihal || "-"}</span>
                </div>
              </div>
              <div className="text-sm">
                Pacitan, {formatDate(surat.tanggal_kirim)}
              </div>
            </div>

            {/* Tujuan */}
            <div className="mb-4 text-sm">
              Yth. {surat.tujuan || "-"}
            </div>

            {/* Salam */}
            <div className="mb-4 text-sm">Dengan hormat,</div>

            {/* Isi Surat */}
            <div className="mb-6 text-sm leading-relaxed text-justify">
              <p>{surat.isi_surat || "-"}</p>
            </div>

            {/* Tanda Tangan */}
            {surat.id_ttd && surat.id_ttd.file_ttd && (
              <div className="text-right text-sm mt-8">
                <p className="mb-1">Hormat kami,</p>
                <p className="mb-1">Sandya Networks</p>
                <img
                  src={getFileUrl(surat.id_ttd.file_ttd.path)}
                  alt="tanda tangan"
                  className="h-16 ml-auto mb-1"
                />
                <p className="font-bold">{surat.id_ttd.id_user?.nama || "Sandya Networks"}</p>
                <p>Kepala Kantor Layanan Pacitan</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={handleCetak}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ background: "#8B5CF6" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            </svg>
            Cetak PDF
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
