import React, { useState } from "react"
import { generateNomorSuratKeluar, uploadFile, createSuratMasuk, createSuratKeluar, updateSuratMasukStatus, createReminder, fetchCustomFolders as apiFetchFolders, fetchJenisSurat, fetchKategori } from "../../lib/api"
import { getCurrentUserId, getKodeMap, BULAN_ROMAWI } from "../../lib/constants"

export function ModalTambahSurat({
  type,
  onClose,
  onSaved,
  folderList,
  initialData,
  inline,
  onTindakLanjut,
}: {
  type: "masuk" | "keluar"
  onClose: () => void
  onSaved?: () => void
  folderList?: string[]
  initialData?: {
    tujuan?: string
    perihal?: string
    isiSurat?: string
    kategori?: string
    id_surat_masuk_ref?: string
  }
  inline?: boolean
  onTindakLanjut?: (data: any) => void
}) {
  const [nomorSurat, setNomorSurat] = useState("")
  const todayStr = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }
  const [tanggal, setTanggal] = useState(type === "masuk" ? todayStr() : type === "keluar" ? todayStr() : "")
  const [pihak, setPihak] = useState("")
  const [perihal, setPerihal] = useState("")
  const [isiSurat, setIsiSurat] = useState("")
  const [kategori, setKategori] = useState("biasa")
  const [jenisSurat, setJenisSurat] = useState("")
  const [folder, setFolder] = useState("")
  const [fileName, setFileName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [folders, setFolders] = useState<string[]>([])
  const [tindakLanjut, setTindakLanjut] = useState(false)
  const [deadline, setDeadline] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  })
  const [idSuratMasukRef, setIdSuratMasukRef] = useState<string | null>(null)
  const [jenisOptions, setJenisOptions] = useState<string[]>([])
  const [kategoriOptions, setKategoriOptions] = useState<string[]>([])

  React.useEffect(() => {
    const load = async () => {
      try {
        const [jenis, kategori] = await Promise.all([
          fetchJenisSurat(type),
          fetchKategori(),
        ])
        setJenisOptions(jenis)
        setKategoriOptions(kategori)
      } catch (err) {
        console.error("Gagal memuat master data:", err)
      }
    }
    load()
  }, [type])

  // Pre-fill data dari surat masuk (tindak lanjut)
  React.useEffect(() => {
    if (initialData) {
      if (initialData.tujuan) setPihak(initialData.tujuan)
      if (initialData.perihal) setPerihal(initialData.perihal)
      if (initialData.isiSurat) setIsiSurat(initialData.isiSurat)
      if (initialData.kategori) setKategori(initialData.kategori)
      if (initialData.id_surat_masuk_ref) setIdSuratMasukRef(initialData.id_surat_masuk_ref)
    }
  }, [initialData])

  // Generate preview nomor surat dengan format: {kodeJenis}.{urutan}/SSI-PCT/{bulanRomawi}/{tahun}
  // Contoh: 04.011/SSI-PCT/V/2026
  const fetchNextNomor = async (jenis: string) => {
    try {
      const nomor = await generateNomorSuratKeluar(jenis)
      setNomorSurat(nomor)
    } catch (err) {
      console.error("Error fetching next nomor:", err)
    }
  }

  React.useEffect(() => {
    if (type === "keluar") {
      fetchNextNomor(jenisSurat)
    }
  }, [type, jenisSurat])

  React.useEffect(() => {
    const fetchFolders = async () => {
      try {
        const names = await apiFetchFolders(type)
        const allFolders = [...new Set([...names, ...(folderList || [])])]
        setFolders(allFolders.sort())
      } catch (err) {
        console.error("Error fetching folders:", err)
      }
    }
    fetchFolders()
  }, [type, folderList])

   const handleSave = async (e: React.FormEvent, gotoKeluar = false) => {
     e.preventDefault()
     setError("")
     console.log("=== DEBUG FORM SUBMIT ===")
     console.log("Form values:")
     console.log("  nomorSurat:", nomorSurat)
     console.log("  tanggal:", tanggal)
     console.log("  pihak:", pihak)
     console.log("  perihal:", perihal)
     console.log("  isiSurat:", JSON.stringify(isiSurat))
     console.log("  isiSurat length:", isiSurat.length)
     console.log("  isiSurat isEmpty:", isiSurat === "")
     console.log("  kategori:", kategori)
     console.log("  type:", type)
     console.log("======================")
      
      if (!initialData) {
        // Validasi ketat untuk surat baru
        if (!nomorSurat || !tanggal || !pihak || !perihal) {
          setError("Semua field wajib diisi")
          return
        }
        if (type === "masuk" && !file) {
          setError("File PDF wajib diunggah untuk surat masuk")
          return
        }
      } else {
        // Mode tindak lanjut: minimal perihal saja
        if (!perihal) {
          setError("Perihal wajib diisi")
          return
        }
      }
      if (file) {
       if (!file.name.toLowerCase().endsWith(".pdf")) {
         setError("File harus berformat PDF")
         return
       }
       if (file.size > 1.5 * 1024 * 1024) {
         setError("Ukuran file maksimal 1,5 MB")
         return
       }
     }

     setLoading(true)
     try {
       let fileLampiran: any = undefined
       if (file) {
         fileLampiran = await uploadFile(file)
       }

       let suratData: any = null
       if (type === "masuk") {
         suratData = await createSuratMasuk({
           id_user: getCurrentUserId(),
           nomor_surat: nomorSurat,
           pengirim: pihak,
           folder: folder || null,
           perihal,
           isi_surat: isiSurat,
           kategori,
           tanggal_terima: new Date(tanggal).toISOString(),
           file_lampiran: fileLampiran,
           jenis_surat: jenisSurat,
             status_tindak_lanjut: "tidak",
         })
       } else {
          let finalNomor = nomorSurat || undefined
          if (!finalNomor && jenisSurat && tanggal) {
           finalNomor = await generateNomorSuratKeluar(jenisSurat)
         }
         suratData = await createSuratKeluar({
           id_user: getCurrentUserId(),
           nomor_surat: finalNomor,
           tujuan: pihak,
           folder: folder || null,
           perihal,
           jenis_surat: jenisSurat,
           isi_surat: isiSurat,
           kategori,
           tanggal_kirim: new Date(tanggal).toISOString(),
           file_draft: fileLampiran,
            status_approval: "menunggu",
            id_surat_masuk_ref: idSuratMasukRef || null,
         })
       }

        if (suratData) {
          // Jika tindak lanjut dicentang, tandai & buat reminder
          if (type === "masuk" && tindakLanjut && suratData?.id) {
            try {
              await updateSuratMasukStatus(suratData.id, "menunggu")
              await createReminder(suratData.id, new Date(deadline).toISOString())
              if (gotoKeluar) {
                onTindakLanjut?.({
                  tujuan: pihak,
                  perihal: `Re: ${perihal}`,
                  isiSurat: isiSurat,
                  kategori: kategori,
                  id_surat_masuk_ref: suratData.id,
                })
              }
            } catch (err) {
              console.error("Error preparing tindak lanjut:", err)
            }
          }

          // Jika surat keluar dibuat sebagai balasan, update status surat masuk ke menunggu_approval
          if (type === "keluar" && idSuratMasukRef) {
            try {
              await updateSuratMasukStatus(idSuratMasukRef, "menunggu_approval")
            } catch (err) {
              console.error("Error updating surat masuk status:", err)
            }
          }

          setSaved(true)
          setTimeout(() => {
            onClose()
            onSaved?.()
          }, 800)
       }
       } catch (err: any) {
        console.error("Error saving surat:", err)
          setError("Gagal menyimpan surat: " + (err?.message || err?.error?.message || JSON.stringify(err)))
       setLoading(false)
      }
  }

  return (
    <div
      className={inline ? "flex-1 flex items-center justify-center p-4 overflow-y-auto" : "fixed inset-0 z-50 flex items-center justify-center p-4"}
      style={inline ? { background: "#F8FAFC" } : { background: "rgba(15,23,42,0.5)", backdropFilter: "blur(2px)" }}
      onClick={(e) => {
        if (!inline && e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-y-auto max-h-[95vh]"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Tambah Surat {type === "masuk" ? "Masuk" : "Keluar"}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
           {/* Nomor Surat */}
           <div>
             <label className="block text-xs font-medium text-slate-600 mb-1">
               Nomor Surat {type === "masuk" && <span className="text-slate-400 font-normal">(dari pengirim)</span>}
             </label>
             {type === "keluar" ? (
               <>
                 <input
                   type="text"
                   value={nomorSurat}
                   readOnly
                   placeholder="Memuat nomor..."
                   className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-slate-50 outline-none"
                   style={{ fontFamily: "JetBrains Mono, monospace" }}
                 />
                 <p className="text-xs text-slate-500 mt-1">
                   <span className="text-green-600">✓ Otomatis</span> — Format: {jenisSurat ? (getKodeMap()[jenisSurat] || "00") : "00"}.###/SSI-PCT/{BULAN_ROMAWI[new Date(tanggal).getMonth()]}/{new Date(tanggal).getFullYear()}
                 </p>
               </>
             ) : (
               <input
                 type="text"
                 value={nomorSurat}
                 onChange={(e) => setNomorSurat(e.target.value)}
                 placeholder="Masukkan nomor surat dari pengirim"
                 className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
               />
             )}
           </div>

          {/* Tanggal */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {type === "masuk" ? "Tanggal Terima" : "Tanggal Kirim"}
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

            {/* Pengirim / Tujuan */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {type === "masuk" ? "Pengirim" : "Tujuan"}
              </label>
              <input
                type="text"
                value={pihak}
                onChange={(e) => setPihak(e.target.value)}
                placeholder={
                  type === "masuk"
                    ? "Nama pengirim"
                    : "Nama tujuan"
                }
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

           {/* Pilih Folder */}
           <div>
             <label className="block text-xs font-medium text-slate-600 mb-1">
               Pilih Folder (Opsional)
             </label>
             <select
               value={folder}
               onChange={(e) => setFolder(e.target.value)}
               className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white appearance-none"
             >
               <option value="">-- Pilih Folder --</option>
               {folders.map((f) => (
                 <option key={f} value={f}>
                   {f}
                 </option>
               ))}
             </select>
           </div>

           {/* Perihal */}
           <div>
             <label className="block text-xs font-medium text-slate-600 mb-1">
               Perihal
             </label>
             <input
               type="text"
               value={perihal}
               onChange={(e) => setPerihal(e.target.value)}
               placeholder="Perihal surat"
               required
               className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
             />
           </div>

           {/* Isi Surat */}
           <div>
             <label className="block text-xs font-medium text-slate-600 mb-1">
               Isi Surat
             </label>
             <textarea
               value={isiSurat}
               onChange={(e) => setIsiSurat(e.target.value)}
               placeholder="Masukkan isi surat..."
               rows={4}
               className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
             />
           </div>

           {/* Kategori */}
           <div>
             <label className="block text-xs font-medium text-slate-600 mb-1">
               Kategori
             </label>
             <div className="relative">
               <select
                 value={kategori}
                 onChange={(e) => setKategori(e.target.value)}
                 className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
               >
                 {kategoriOptions.map((k) => (
                   <option key={k} value={k}>
                     {k.charAt(0).toUpperCase() + k.slice(1)}
                   </option>
                 ))}
               </select>
               <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                 <svg
                   width="12"
                   height="12"
                   viewBox="0 0 24 24"
                   fill="none"
                   stroke="currentColor"
                   strokeWidth="2.5"
                   strokeLinecap="round"
                   strokeLinejoin="round"
                 >
                   <polyline points="6 9 12 15 18 9" />
                 </svg>
               </div>
             </div>
           </div>

             <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">
                 Jenis Surat
               </label>
               <div className="relative">
                 <select
                   value={jenisSurat}
                   onChange={(e) => setJenisSurat(e.target.value)}
                   className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
                 >
                   {[
                     { value: "", label: "-- Pilih Jenis Surat --" },
                      ...jenisOptions.map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) })),
                   ].map((opt) => (
                     <option key={opt.value} value={opt.value}>{opt.label}</option>
                   ))}
                 </select>
                 <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                     <polyline points="6 9 12 15 18 9" />
                   </svg>
                 </div>
               </div>
             </div>

           {/* Unggah File */}
           <div>
             <label className="block text-xs font-medium text-slate-600 mb-1">
               Unggah File PDF {type === "masuk" && <span style={{ color: "#DC2626" }}>*</span>} <span className="text-slate-400 font-normal">(maks. 1,5 MB) {type === "keluar" && "- Opsional"}</span>
             </label>
             <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dashed border-slate-300 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
               <svg
                 width="16"
                 height="16"
                 viewBox="0 0 24 24"
                 fill="none"
                 stroke="#2563EB"
                 strokeWidth="2"
                 strokeLinecap="round"
                 strokeLinejoin="round"
               >
                 <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                 <polyline points="17 8 12 3 7 8" />
                 <line x1="12" y1="3" x2="12" y2="15" />
               </svg>
               <span className="text-sm text-slate-500 flex-1">
                 {fileName || "Pilih File"}
               </span>
               <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                 Browse
               </span>
               <input
                 type="file"
                 accept="application/pdf,.pdf"
                 className="hidden"
                 onChange={(e) => {
                   const f = e.target.files?.[0]
                   setFile(f || null)
                   setFileName(f?.name || "")
                 }}
               />
             </label>
           </div>

          {/* Tindak Lanjut + Set Reminder (hanya untuk surat masuk) */}
          {type === "masuk" && (
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={tindakLanjut}
                    onChange={(e) => setTindakLanjut(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
                    style={{
                      background: tindakLanjut ? "#2563EB" : "white",
                      borderColor: tindakLanjut ? "#2563EB" : "#CBD5E1",
                    }}
                  >
                    {tindakLanjut && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Tindak Lanjut
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {tindakLanjut
                      ? "Atur deadline untuk mengingatkan follow-up surat ini"
                      : "Centang untuk mengatur reminder tindak lanjut"
                    }
                  </p>
                </div>
              </label>
              {tindakLanjut && (
                <div className="ml-7">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Deadline Tindak Lanjut
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-300">
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

           {/* Buttons */}
           <div className="flex gap-3 pt-1">
             <button
               type="submit"
               disabled={saved || loading}
               className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-white text-sm transition-all"
               style={{ background: saved || loading ? "#93C5FD" : "#2563EB" }}
             >
               {loading
                 ? "Menyimpan..."
                 : saved
                   ? "Tersimpan ✓"
                    : `Tambah Surat ${type === "masuk" ? "Masuk" : "Keluar"}`}
             </button>
             {type === "masuk" && tindakLanjut && (
               <button
                 type="button"
                 onClick={(e) => handleSave(e, true)}
                 disabled={saved || loading}
                 className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-white text-sm transition-all"
                 style={{ background: saved || loading ? "#C4B5FD" : "#8B5CF6" }}
               >
                 {loading ? "Memproses..." : saved ? "Tersimpan ✓" : "Buat Surat Keluar →"}
               </button>
             )}
             <button
               type="button"
               onClick={onClose}
               className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm border transition-all"
               style={{
                 color: "#DC2626",
                 borderColor: "#FECACA",
                 background: "#FFF5F5",
               }}
               onMouseEnter={(e) =>
                 (e.currentTarget.style.background = "#FEE2E2")
               }
               onMouseLeave={(e) =>
                 (e.currentTarget.style.background = "#FFF5F5")
               }
             >
               Batal
             </button>
           </div>
        </form>
      </div>
    </div>
  )
}
