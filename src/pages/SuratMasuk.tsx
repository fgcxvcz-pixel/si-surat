import React, { useState, useCallback } from "react"
import { fetchSuratMasuk, deleteSuratMasuk, updateSuratMasukStatus, createReminder, fetchCustomFolders as apiFetchFolders, createCustomFolder, deleteCustomFolderByName, fetchKategori } from "../lib/api"
import { currentMonthKey, inMonth, fileApiUrl } from "../lib/constants"
import { FolderPanel, type FolderItem } from "../components/FolderPanel"
import { ModalTambahSurat } from "../components/modals/ModalTambahSurat"
import { ModalViewSurat } from "../components/modals/ModalViewSurat"
import { IconSearch, IconFolderOpen, IconPlus, IconEye } from "../components/Icons"
import { TopBar } from "../components/TopBar"
import { exportSuratToCSV } from "./Dashboard"


// ── Surat Masuk ──────────────────────────────────────────────────────────────
export function SuratMasuk({ onEditClick, onTindakLanjut, refreshTrigger, initialDetailId, onNavigate }: { onEditClick?: (id: string) => void; onTindakLanjut?: (data: any) => void; refreshTrigger?: number; initialDetailId?: string | null; onNavigate?: (page: any, suratId?: string) => void }) {
   const [search, setSearch] = useState("")
   const [selectedFolder, setSelectedFolder] = useState("__all__")
   const [openDetailId, setOpenDetailId] = useState<string | null>(null)
   const [showModal, setShowModal] = useState(false)
   const [data, setData] = useState<any[]>([])
   const [loading, setLoading] = useState(true)
   const [filterKategori, setFilterKategori] = useState("semua")
   const [filterStatus, setFilterStatus] = useState("semua")
   const [month, setMonth] = useState(currentMonthKey)
   const [showAddFolder, setShowAddFolder] = useState(false)
   const [newFolderName, setNewFolderName] = useState("")
   const [customFolders, setCustomFolders] = useState<string[]>([])
   const [viewSurat, setViewSurat] = useState<{ type: "masuk" | "keluar"; id: string } | null>(null)
   const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; folder: string }>({
     show: false,
     folder: "",
   })
   const [deleting, setDeleting] = useState(false)
   const [deleteSuratConfirm, setDeleteSuratConfirm] = useState<{
     show: boolean
     id: string
     pihak: string
   }>({ show: false, id: "", pihak: "" })
   const [deletingSurat, setDeletingSurat] = useState(false)
   const [page, setPage] = useState(1)
   const PER_PAGE = 10
   const [previewUrl, setPreviewUrl] = useState<string | null>(null)
   const [kategoriOptions, setKategoriOptions] = useState<string[]>([])
   const [balasPopup, setBalasPopup] = useState<{ show: boolean; data: any }>({ show: false, data: null })
   const [balasDeadline, setBalasDeadline] = useState("")
   const [balasLoading, setBalasLoading] = useState(false)
   const [bellRefresh, setBellRefresh] = useState(0)

  const openPreview = useCallback((url: string) => {
    if (!url) return
    setPreviewUrl(url)
  }, [])

  const closePreview = useCallback(() => {
    setPreviewUrl(null)
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const result = await fetchSuratMasuk()
      setData(result)
    } catch (err) {
      console.error("Error fetching surat masuk:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomFolders = async () => {
    try {
      const names = await apiFetchFolders("masuk")
      setCustomFolders(names)
    } catch (err) {
      console.error("Error fetching custom folders:", err)
    }
  }


  React.useEffect(() => {
    fetchData()
    fetchCustomFolders()
    fetchKategori().then(setKategoriOptions).catch(console.error)
  }, [refreshTrigger])

  // Auto-open detail jika ada initialDetailId
  React.useEffect(() => {
    if (initialDetailId) {
      setOpenDetailId(initialDetailId)
    }
  }, [initialDetailId])

    const monthData = data.filter((s) => inMonth(s.tanggal_terima, month))
   const folderColors = [
     "#2563EB",
     "#7C3AED",
     "#059669",
     "#D97706",
     "#DC2626",
     "#0891B2",
     "#C026D3",
   ]
   const folders: FolderItem[] = [
     ...customFolders.map((cf, i) => ({
       key: cf,
       label: cf,
       count: monthData.filter((s) => (s.folder || s.pengirim) === cf).length,
       color: folderColors[i % folderColors.length],
     })),
   ]

   const byFolder =
     selectedFolder === "__all__"
       ? monthData
       : customFolders.includes(selectedFolder)
       ? monthData.filter((s) => (s.folder || s.pengirim) === selectedFolder)
       : monthData
  const filtered = byFolder.filter(
    (s) =>
      (filterKategori === "semua" || s.kategori === filterKategori) &&
      (filterStatus === "semua" ||
        s.status_tindak_lanjut === filterStatus) &&
      ((s.perihal || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.pengirim || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.nomor_surat || "").toLowerCase().includes(search.toLowerCase()))
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  React.useEffect(() => {
    setPage(1)
  }, [search, filterKategori, filterStatus, selectedFolder, month])

  const folderLabel =
    selectedFolder === "__all__" ? "Semua Surat Masuk" : selectedFolder

  const handleAddFolder = async () => {
    if (newFolderName.trim() && !customFolders.includes(newFolderName.trim())) {
      try {
        await createCustomFolder("masuk", newFolderName.trim())
        const updated = [...customFolders, newFolderName.trim()]
        setCustomFolders(updated)
        setSelectedFolder(newFolderName.trim())
        setNewFolderName("")
        setShowAddFolder(false)
      } catch (err) {
        console.error("Error adding folder:", err)
        alert("Koneksi ke server gagal")
      }
    }
  }

   const handleConfirmDelete = async () => {
     if (!deleteConfirm.folder) return
     setDeleting(true)
     try {
        await deleteCustomFolderByName(deleteConfirm.folder, "masuk")
       const updated = customFolders.filter((f) => f !== deleteConfirm.folder)
       setCustomFolders(updated)
       if (selectedFolder === deleteConfirm.folder) {
         setSelectedFolder("__all__")
       }
     } catch (err) {
       console.error("Error deleting folder:", err)
     } finally {
       setDeleting(false)
       setDeleteConfirm({ show: false, folder: "" })
     }
   }

   const handleConfirmDeleteSurat = async () => {
     if (!deleteSuratConfirm.id) return
     setDeletingSurat(true)
     try {
       await deleteSuratMasuk(deleteSuratConfirm.id)
       setOpenDetailId(null)
       await fetchData()
     } catch (err) {
       console.error("Error deleting surat:", err)
     } finally {
setDeletingSurat(false)
      setDeleteSuratConfirm({ show: false, id: "", pihak: "" })
    }
  }

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
       {showModal && (
         <ModalTambahSurat
           type="masuk"
           onClose={() => setShowModal(false)}
           onSaved={fetchData}
           folderList={customFolders}
           onTindakLanjut={(data) => {
             setShowModal(false)
             onTindakLanjut?.(data)
           }}
         />
        )}
       {showAddFolder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4 text-slate-900">Tambah Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nama folder"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all mb-4"
              onKeyPress={(e) => e.key === "Enter" && handleAddFolder()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddFolder(false)
                  setNewFolderName("")
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAddFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ background: newFolderName.trim() ? "#2563EB" : "#CBD5E1" }}
              >
                Tambah
              </button>
            </div>
          </div>
        </div>
       )}
       {deleteConfirm.show && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
           <div className="bg-white rounded-lg shadow-lg p-6 w-96">
             <h3 className="text-lg font-semibold mb-2 text-slate-900">Hapus Folder?</h3>
             <p className="text-sm text-slate-600 mb-6">
               Apakah Anda yakin ingin menghapus folder "<strong>{deleteConfirm.folder}</strong>"? Tindakan ini tidak dapat dibatalkan.
             </p>
             <div className="flex gap-3 justify-end">
               <button
                 onClick={() => setDeleteConfirm({ show: false, folder: "" })}
                 disabled={deleting}
                 className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
               >
                 Batal
               </button>
               <button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                  style={{ background: deleting ? "#EF4444" : "#DC2626" }}
                >
                  {deleting ? "Menghapus..." : "Hapus Folder"}
                </button>
             </div>
           </div>
         </div>
       )}
       {deleteSuratConfirm.show && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-2 text-slate-900">Hapus Surat?</h3>
              <p className="text-sm text-slate-600 mb-6">
                Apakah Anda yakin ingin menghapus surat dari "<strong>{deleteSuratConfirm.pihak}</strong>"? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteSuratConfirm({ show: false, id: "", pihak: "" })}
                  disabled={deletingSurat}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmDeleteSurat}
                  disabled={deletingSurat}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                  style={{ background: deletingSurat ? "#EF4444" : "#DC2626" }}
                >
                  {deletingSurat ? "Menghapus..." : "Hapus Surat"}
                </button>
              </div>
            </div>
          </div>
        )}
        {previewUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: "rgba(15,23,42,0.6)" }}
            onClick={(e) => { if (e.target === e.currentTarget) closePreview() }}
          >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col overflow-hidden" style={{ height: "85vh" }}>
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Preview PDF</h3>
                <button onClick={closePreview} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <iframe src={previewUrl} title="Preview PDF" className="w-full flex-1" style={{ border: "none", background: "#F1F5F9" }} />
            </div>
          </div>
        )}
        <TopBar
          title="Surat Masuk"
          subtitle={`${data.length} surat terdaftar`}
          onNavigate={onNavigate}
          refreshTrigger={bellRefresh}
        />
      <div
        className="flex flex-1 overflow-hidden"
        style={{ background: "#F8FAFC" }}
      >
        <FolderPanel
          title="Pengirim"
          folders={folders}
          selected={selectedFolder}
          onSelect={setSelectedFolder}
          month={month}
           onMonthChange={setMonth}
           onAddFolder={() => setShowAddFolder(true)}
           onDeleteWithConfirm={(key) => {
             setOpenDetailId(null)
             setDeleteConfirm({ show: true, folder: key })
           }}
           totalCount={monthData.length}
        />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white rounded-xl border border-slate-200">
            {/* Toolbar */}
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <span style={{ color: "#2563EB" }}>
                    <IconFolderOpen />
                  </span>
                  {folderLabel}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-40">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <IconSearch />
                  </div>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari surat masuk..."
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  />
                </div>
                <select
                  value={filterKategori}
                  onChange={(e) => setFilterKategori(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                >
                   <option value="semua">Semua Kategori</option>
                   {kategoriOptions.map(k => (
                     <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>
                   ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                >
                  <option value="semua">Semua Status</option>
                   <option value="tidak">Tidak</option>
                   <option value="menunggu">Menunggu Dibalas</option>
                   <option value="menunggu_approval">Menunggu Approval</option>
                   <option value="selesai">Selesai</option>
                </select>
                <button
                  onClick={() =>
                    exportSuratToCSV("Surat_Masuk", filtered, [
                      "nomor_surat",
                      "pengirim",
                      "perihal",
                      "kategori",
                      "tanggal_terima",
                      "status_tindak_lanjut",
                    ])
                  }
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Export</span>
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
                  style={{ background: "#2563EB" }}
                >
                  <IconPlus />
                  <span>Tambah Surat</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
               <table className="w-full">
                 <thead>
                   <tr style={{ background: "#F8FAFC" }}>
                       {["NO", "No Surat", "Tanggal", "Pengirim", "Perihal", "Kategori", "Aksi"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                   {loading ? (
                    <tr>
                       <td colSpan={8} className="px-6 py-8 text-center text-sm text-slate-500">
                         Memuat data...
                       </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">
                          Tidak ada surat masuk
                        </td>
                      </tr>
                   ) : (
                     paged.map((s) => {
                       const isOpen = openDetailId === s.id
                       const tanggalFormatted = new Date(s.tanggal_terima).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
                       return (
                         <React.Fragment key={s.id}>
                           <tr
                             className="transition-colors border-b border-slate-50"
                             style={{ background: isOpen ? "#F0F7FF" : "white" }}
                             onMouseEnter={(e) => {
                               if (!isOpen)
                                 (e.currentTarget as HTMLElement).style.background =
                                   "#F8FAFC"
                             }}
                             onMouseLeave={(e) => {
                               if (!isOpen)
                                 (e.currentTarget as HTMLElement).style.background =
                                   "white"
                             }}
                            >
                              <td className="px-5 py-3.5 text-sm text-slate-600">
                                {(page - 1) * PER_PAGE + paged.indexOf(s) + 1}
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="text-sm font-semibold text-slate-800" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                                  {s.nomor_surat}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                                {tanggalFormatted}
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="text-sm font-medium text-slate-800">
                                  {s.pengirim}
                                </span>
                              </td>
                             <td className="px-5 py-3.5">
                               <span className="text-sm text-slate-700 line-clamp-1 max-w-xs">
                                 {s.perihal}
                               </span>
                             </td>
                             <td className="px-5 py-3.5">
                               <div className="flex items-center gap-1.5">
                                 <div
                                   className="w-2 h-2 rounded-full"
                                   style={{
                                     background: s.kategori === "penting" ? "#DC2626" : "#94A3B8",
                                   }}
                                 />
                                 <span className="text-xs text-slate-600 capitalize">
                                   {s.kategori}
                                 </span>
                              </div>
                            </td>
                             <td className="px-5 py-3.5">
                               <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setOpenDetailId(isOpen ? null : s.id)
                                    setDeleteConfirm({ show: false, folder: "" })
                                  }}
                                  title={isOpen ? "Tutup detail" : "Lihat detail"}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                style={{
                                  background: isOpen ? "#2563EB" : "transparent",
                                  color: isOpen ? "white" : "#94A3B8",
                                  border: isOpen ? "none" : "1px solid #E2E8F0",
                                }}
                                onMouseEnter={(e) => {
                                  if (!isOpen) {
                                    ;(e.currentTarget as HTMLElement).style.background =
                                      "#F1F5F9"
                                    ;(e.currentTarget as HTMLElement).style.color =
                                      "#2563EB"
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isOpen) {
                                    ;(e.currentTarget as HTMLElement).style.background =
                                      "transparent"
                                    ;(e.currentTarget as HTMLElement).style.color =
                                      "#94A3B8"
                                  }
                                }}
                               >
                                <IconEye open={isOpen} />
                               </button>
                               <button
                                   onClick={() => {
                                     const fileUrl = s.file_lampiran?.path ? fileApiUrl(s.file_lampiran.path) : ''
                                   const message = `Surat Masuk\n\nNo: ${s.nomor_surat}\nDari: ${s.pengirim}\nPerihal: ${s.perihal}\n\nFile Lampiran:\n${fileUrl}`
                                   window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
                                 }}
                                  title="Kirim via WhatsApp"
                                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                                  style={{ background: "#25D366" }}
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.82 13.63c-.24.68-1.19 1.27-1.93 1.44-.52.12-1.2.21-3.48-.73-2.77-1.14-4.54-3.92-4.68-4.11-.13-.19-1.09-1.45-1.09-2.77s.69-1.91.94-2.17c.24-.26.53-.32.71-.32h.51c.16 0 .38-.06.59.45.21.53.72 1.82.78 1.95.06.13.1.28.02.45-.08.17-.12.27-.24.42-.12.15-.25.33-.36.44-.12.12-.24.25-.1.49.14.24.63 1.03 1.35 1.67.93.82 1.71 1.07 1.95 1.2.24.12.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.39.65 1.63.77.24.12.4.18.46.28.06.09.06.55-.18 1.23z"/>
                                  </svg>
                                </button>
                                <button
                                    onClick={() => onEditClick?.(s.id)}
                                    title="Edit Surat"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                    style={{ background: "transparent", color: "#94A3B8", border: "1px solid #E2E8F0" }}
                                    onMouseEnter={(e) => { ;(e.currentTarget as HTMLElement).style.background = "#EFF6FF"; ;(e.currentTarget as HTMLElement).style.color = "#3B82F6" }}
                                    onMouseLeave={(e) => { ;(e.currentTarget as HTMLElement).style.background = "transparent"; ;(e.currentTarget as HTMLElement).style.color = "#94A3B8" }}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                </button>
                                <button
                                    onClick={() => setDeleteSuratConfirm({ show: true, id: s.id, pihak: s.pengirim })}
                                    title="Hapus Surat"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                    style={{ background: "transparent", color: "#94A3B8", border: "1px solid #E2E8F0" }}
                                    onMouseEnter={(e) => { ;(e.currentTarget as HTMLElement).style.background = "#FEF2F2"; ;(e.currentTarget as HTMLElement).style.color = "#DC2626" }}
                                    onMouseLeave={(e) => { ;(e.currentTarget as HTMLElement).style.background = "transparent"; ;(e.currentTarget as HTMLElement).style.color = "#94A3B8" }}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                </button>
                                 </div>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr
                              key={s.id + "-detail"}
                              style={{ background: "#F0F7FF" }}
                            >
                              <td colSpan={7} className="px-6 pb-5 pt-0">
                                <div className="rounded-xl border border-blue-100 bg-white shadow-sm overflow-hidden">
                                  <div className="px-5 py-4 border-b border-slate-100">
                                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">
                                      Detail Surat Masuk
                                    </p>
                                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                                      {s.perihal}
                                    </h4>
                                  </div>

                                   <div className="px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-3 border-b border-slate-50">
                                     <div>
                                       <p className="text-xs text-slate-400 mb-0.5">
                                         No. Surat
                                       </p>
                                       <p
                                         className="text-sm font-semibold text-slate-800"
                                         style={{
                                           fontFamily: "JetBrains Mono, monospace",
                                         }}
                                       >
                                         {s.nomor_surat}
                                       </p>
                                     </div>
                                     <div>
                                       <p className="text-xs text-slate-400 mb-0.5">
                                         Pengirim
                                       </p>
                                       <p className="text-sm font-medium text-slate-800">
                                         {s.pengirim}
                                       </p>
                                     </div>
                                     <div>
                                       <p className="text-xs text-slate-400 mb-0.5">
                                         Tanggal Terima
                                       </p>
                                       <p className="text-sm font-medium text-slate-800">
                                         {tanggalFormatted}
                                       </p>
                                     </div>
                                      <div>
                                        <p className="text-xs text-slate-400 mb-0.5">
                                          Kategori
                                        </p>
                                        <span className="text-xs font-medium px-2 py-1 rounded-full capitalize" style={{ background: s.kategori === "penting" ? "#FEF2F2" : "#F1F5F9", color: s.kategori === "penting" ? "#DC2626" : "#64748B" }}>
                                          {s.kategori}
                                        </span>
                                      </div>
                                      <div>
                                        <p className="text-xs text-slate-400 mb-0.5">
                                          Jenis Surat
                                        </p>
                                        <p className="text-sm font-medium text-slate-800 capitalize">
                                          {s.jenis_surat || "-"}
                                        </p>
                                      </div>
                                      <div>
                                         <p className="text-xs text-slate-400 mb-0.5">
                                           Status Tindak Lanjut
                                         </p>
                                           <div className="flex items-center gap-2 flex-wrap">
                                             <span className="text-xs font-medium px-2 py-1 rounded-full capitalize" style={{ background: s.status_tindak_lanjut === "selesai" ? "#ECFDF5" : s.status_tindak_lanjut === "menunggu" ? "#FEF3C7" : "#FEF2F2", color: s.status_tindak_lanjut === "selesai" ? "#059669" : s.status_tindak_lanjut === "menunggu" ? "#D97706" : "#DC2626" }}>
                                             {s.status_tindak_lanjut === "selesai" ? "Selesai" : s.status_tindak_lanjut === "menunggu" ? "Menunggu" : "Belum"}
                                           </span>
                                            {s.id_surat_keluar_ref && (
                                              <button
                                                onClick={() => setViewSurat({ type: "keluar", id: s.id_surat_keluar_ref?.id || s.id_surat_keluar_ref })}
                                                className="text-xs font-medium px-2 py-1 rounded text-white transition-colors"
                                                style={{ background: "#2563EB" }}
                                                title="Lihat surat keluar terkait"
                                              >
                                                Lihat Surat Keluar →
                                              </button>
                                            )}
                                              {!s.id_surat_keluar_ref && s.status_tindak_lanjut !== "selesai" && (
                                                <button
                                                  onClick={() => {
                                                    const replyData = {
                                                      tujuan: s.pengirim,
                                                      perihal: `Re: ${s.perihal}`,
                                                      isiSurat: s.isi_surat || "",
                                                      kategori: s.kategori || "biasa",
                                                      id_surat_masuk_ref: s.id,
                                                    }
                                                    if (s.status_tindak_lanjut === "menunggu") {
                                                      onTindakLanjut?.(replyData)
                                                    } else {
                                                      setBalasPopup({ show: true, data: replyData })
                                                      setBalasDeadline("")
                                                    }
                                                  }}
                                                 className="text-xs font-medium px-2 py-1 rounded text-white transition-colors"
                                                 style={{ background: "#8B5CF6" }}
                                                 title="Buat surat balasan"
                                               >
                                                 Balas?
                                               </button>
                                             )}
                                         </div>
                                       </div>
                                    </div>

                                   <div className="px-5 py-4 border-b border-slate-50">
                                     <p className="text-xs text-slate-400 mb-2">
                                       Perihal
                                     </p>
                                     <p className="text-sm text-slate-700 font-medium">
                                       {s.perihal}
                                     </p>
                                   </div>

                                    <div className="px-5 py-4 border-b border-slate-50">
                                      <p className="text-xs text-slate-400 mb-2">
                                        Isi Surat
                                      </p>
                                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                        {s.isi_surat || "-"}
                                      </p>
                                    </div>

                                     <div className="px-5 py-4">
                                       <p className="text-xs text-slate-400 mb-3">
                                         File Dokumen
                                       </p>
                                        {s.file_lampiran ? (
                                          <>
                                          <button
                                            onClick={() => {
                                              if (s.file_lampiran.path) {
                                                openPreview(fileApiUrl(s.file_lampiran.path))
                                              }
                                            }}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
                                            style={{ background: "#2563EB" }}
                                          >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                              <polyline points="14 2 14 8 20 8" />
                                              <line x1="12" y1="19" x2="12" y2="11" />
                                              <line x1="9" y1="14" x2="15" y2="14" />
                                            </svg>
                                            Lihat PDF: {s.file_lampiran.nama}
                                          </button>
                                          </>
                                        ) : (
                                          <p className="text-sm text-slate-500">Tidak ada file dokumen</p>
                                        )}
                                     </div>
                                   </div>
                               </td>
                             </tr>
                          )}
                          </React.Fragment>
                       )
                     })
                   )}
                 </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <div
                  className="text-slate-300 mb-3"
                  style={{ fontSize: "2rem" }}
                >
                  📂
                </div>
                <p className="text-slate-400 text-sm">
                  Tidak ada surat di folder ini.
                </p>
              </div>
            )}

            <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Menampilkan {(page - 1) * PER_PAGE + 1}-{Math.min(page * PER_PAGE, filtered.length)} dari {filtered.length} surat
              </span>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className="w-7 h-7 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: n === page ? "#2563EB" : "#F1F5F9",
                      color: n === page ? "white" : "#64748B",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {viewSurat && (
        <ModalViewSurat
          type={viewSurat.type}
          suratId={viewSurat.id}
          onClose={() => setViewSurat(null)}
        />
      )}

      {/* Popup Balas — Set Reminder */}
      {balasPopup.show && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" style={{ fontFamily: "Inter, sans-serif" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#EDE9FE" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Buat Surat Balasan</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Atur deadline tindak lanjut sebelum membuat balasan</p>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="px-6 py-4" style={{ background: "#FAFBFC" }}>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Tujuan</span>
                  <p className="font-medium text-slate-700 mt-0.5">{balasPopup.data?.tujuan}</p>
                </div>
                <div>
                  <span className="text-slate-400">Perihal</span>
                  <p className="font-medium text-slate-700 mt-0.5 truncate">{balasPopup.data?.perihal}</p>
                </div>
              </div>
            </div>

            {/* Deadline Input */}
            <div className="px-6 py-4">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Deadline Tindak Lanjut <span className="text-slate-400 font-normal">(opsional)</span>
              </label>
              <input
                type="date"
                value={balasDeadline}
                onChange={(e) => setBalasDeadline(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
              <p className="text-[11px] text-slate-400 mt-1.5">Jika dikosongkan, reminder tidak akan dibuat</p>
            </div>

            {/* Buttons */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3">
              <button
                onClick={() => setBalasPopup({ show: false, data: null })}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  if (!balasPopup.data?.id_surat_masuk_ref) return
                  setBalasLoading(true)
                  try {
                     await updateSuratMasukStatus(balasPopup.data.id_surat_masuk_ref, "menunggu")
                    if (balasDeadline) {
                      await createReminder(balasPopup.data.id_surat_masuk_ref, new Date(balasDeadline).toISOString())
                      setBellRefresh(n => n + 1)
                    }
                     await fetchData()
                   } catch (err) {
                     console.error("Error saving:", err)
                  }
                  setBalasLoading(false)
                  setBalasPopup({ show: false, data: null })
                }}
                disabled={balasLoading}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
                style={{ background: "#8B5CF6" }}
              >
                {balasLoading ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                onClick={async () => {
                  const popupData = balasPopup.data
                  setBalasPopup({ show: false, data: null })
                  // Simpan reminder dulu jika ada deadline
                  if (popupData?.id_surat_masuk_ref && balasDeadline) {
                    try {
                       await updateSuratMasukStatus(popupData.id_surat_masuk_ref, "menunggu")
                      await createReminder(popupData.id_surat_masuk_ref, new Date(balasDeadline).toISOString())
                      setBellRefresh(n => n + 1)
                    } catch (err) {
                      console.error("Error saving reminder:", err)
                    }
                  }
                  onTindakLanjut?.({
                    ...popupData,
                    deadline: balasDeadline || undefined,
                  })
                }}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ background: "#2563EB" }}
              >
                Lanjut ke Form →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
