import React, { useState } from "react"
import { fetchSuratMasukById, fetchSuratKeluarById, fetchCustomFolders as apiFetchFolders, uploadFile, generateNomorSuratKeluar, updateSuratMasuk, updateSuratKeluar, fetchJenisSurat, fetchKategori } from "./lib/api"

interface EditSuratPageProps {
  type: "masuk" | "keluar"
  suratId: string
  onClose: () => void
  onSaved?: () => void
}

export function EditSuratPage({ type, suratId, onClose, onSaved }: EditSuratPageProps) {
  const [perihal, setPerihal] = useState("")
  const [isiSurat, setIsiSurat] = useState("")
  const [kategori, setKategori] = useState("biasa")
  const [folder, setFolder] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [folders, setFolders] = useState<string[]>([])
  const [nomorSurat, setNomorSurat] = useState("")
  const [tujuan, setTujuan] = useState("")
  const [tanggalKirim, setTanggalKirim] = useState("")
  const [jenisSurat, setJenisSurat] = useState("surat tugas")
  const [pengirim, setPengirim] = useState("")
  const [tanggalTerima, setTanggalTerima] = useState("")
  const [jenisSuratMasuk, setJenisSuratMasuk] = useState("")
  const [suratLoaded, setSuratLoaded] = useState(false)
  const [jenisOptions, setJenisOptions] = useState<string[]>([])
  const [kategoriOptions, setKategoriOptions] = useState<string[]>([])
  const [isFirstLoad, setIsFirstLoad] = useState(true)

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

  const fetchNextNomor = async (jenis: string) => {
    try {
      const nomor = await generateNomorSuratKeluar(jenis)
      setNomorSurat(nomor)
    } catch (err) {
      console.error("Error fetching next nomor:", err)
    }
  }

  // Fetch next nomor saat user UBAH jenis surat (hanya setelah form load pertama kali)
  React.useEffect(() => {
    if (type === "keluar" && suratLoaded && !isFirstLoad) {
      fetchNextNomor(jenisSurat)
    }
  }, [jenisSurat, suratLoaded, isFirstLoad])

  // Mark selesai first load (jangan generate nomor saat form load)
  React.useEffect(() => {
    if (type === "keluar" && suratLoaded && isFirstLoad) {
      setIsFirstLoad(false)
    }
  }, [suratLoaded, type, isFirstLoad])

  React.useEffect(() => {
    const fetchSurat = async () => {
      try {
        setLoading(true)
        const s = type === "masuk" ? await fetchSuratMasukById(suratId) : await fetchSuratKeluarById(suratId)
        setPerihal(s.perihal || "")
        setIsiSurat(s.isi_surat || "")
        setKategori(s.kategori || "biasa")
        setFolder(s.folder || "")
        setNomorSurat(s.nomor_surat || "")
        
        if (type === "keluar") {
          setTujuan(s.tujuan || "")
          setTanggalKirim(s.tanggal_kirim ? String(s.tanggal_kirim).slice(0, 10) : "")
          setJenisSurat(s.jenis_surat || "surat tugas")
        } else {
          setPengirim(s.pengirim || "")
          setTanggalTerima(s.tanggal_terima ? String(s.tanggal_terima).slice(0, 10) : "")
          setJenisSuratMasuk(s.jenis_surat || "")
        }
      } catch (err) {
        console.error("Error fetching surat:", err)
        setError(`Gagal memuat data surat: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
        setSuratLoaded(true)
      }
    }

    const fetchFolders = async () => {
      try {
        const names = await apiFetchFolders(type)
        setFolders(names.sort())
      } catch (err) {
        console.error("Error fetching folders:", err)
      }
    }

    fetchSurat()
    fetchFolders()
  }, [type, suratId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!perihal) {
      setError("Perihal wajib diisi")
      return
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

    setSaving(true)
    try {
      let fileData: any = undefined
      if (file) {
        fileData = await uploadFile(file)
      }

      const updates: any = {
        nomor_surat: nomorSurat,
        tujuan: tujuan,
        pengirim: pengirim,
        perihal,
        isi_surat: isiSurat,
        kategori,
        folder: folder || null,
      }

      if (type === "keluar") {
        updates.nomor_surat = nomorSurat
        updates.tujuan = tujuan
        updates.tanggal_kirim = tanggalKirim
        updates.jenis_surat = jenisSurat
        if (fileData) {
          updates.file_draft = fileData
        }
        await updateSuratKeluar(suratId, updates)
      } else {
        updates.nomor_surat = nomorSurat
        updates.pengirim = pengirim
        updates.tanggal_terima = tanggalTerima
        updates.jenis_surat = jenisSuratMasuk
        if (fileData) {
          updates.file_lampiran = fileData
        }
        await updateSuratMasuk(suratId, updates)
      }

      setSaved(true)
      setTimeout(() => {
        onClose()
        onSaved?.()
      }, 1000)
    } catch (err) {
      setError("Gagal menyimpan: " + (err instanceof Error ? err.message : String(err)))
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ background: "#F8FAFC", fontFamily: "Inter, sans-serif" }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Memuat data surat...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="flex-1 flex items-center justify-center p-6"
        style={{ background: "#F8FAFC", fontFamily: "Inter, sans-serif" }}
      >
        <div className="max-w-md text-center bg-white rounded-xl border border-red-200 p-8">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Gagal Memuat Surat</h2>
          <p className="text-slate-600 text-sm mb-6">{error}</p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors font-medium"
          >
            Kembali
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ background: "#F8FAFC", fontFamily: "Inter, sans-serif" }}
    >
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Edit Surat {type === "masuk" ? "Masuk" : "Keluar"}
              </h1>
              <p className="text-sm text-slate-400 mt-1">Perbarui data surat Anda</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
              title="Kembali"
            >
              <svg
                width="16"
                height="16"
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

          <form onSubmit={handleSave} className="px-6 py-6 space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Nomor Surat {type === "keluar" && <span className="text-slate-400 font-normal">(otomatis, ubah via jenis surat)</span>}
                </label>
                {type === "keluar" ? (
                  <div
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 flex items-center"
                    style={{ fontFamily: "JetBrains Mono, monospace" }}
                  >
                    {nomorSurat || "Nomor akan otomatis digenerate..."}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={nomorSurat}
                    onChange={(e) => setNomorSurat(e.target.value)}
                    placeholder="Contoh: 04.011/SSI-PCT/V/2026"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Kategori
                </label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                >
                   {kategoriOptions.map(k => (
                    <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Perihal
              </label>
              <input
                type="text"
                value={perihal}
                onChange={(e) => setPerihal(e.target.value)}
                placeholder="Perihal surat"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Isi Surat
              </label>
              <textarea
                name="isiSurat"
                value={isiSurat}
                onChange={(e) => setIsiSurat(e.target.value)}
                placeholder="Masukkan isi surat..."
                rows={6}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
              />
            </div>

            {type === "keluar" && (
              <>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Tujuan
                    </label>
                    <input
                      type="text"
                      value={tujuan}
                      onChange={(e) => setTujuan(e.target.value)}
                      placeholder="Tujuan surat"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Tanggal Kirim
                    </label>
                    <input
                      type="date"
                      value={tanggalKirim}
                      onChange={(e) => setTanggalKirim(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Jenis Surat
                  </label>
                  <select
                    value={jenisSurat}
                    onChange={(e) => {
                      const newJenis = e.target.value
                      setJenisSurat(newJenis)
                      setIsFirstLoad(false)
                      fetchNextNomor(newJenis)
                    }}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                  >
                     {jenisOptions.map(v => (
                      <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {type === "masuk" && (
              <>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Pengirim
                    </label>
                    <input
                      type="text"
                      value={pengirim}
                      onChange={(e) => setPengirim(e.target.value)}
                      placeholder="Pengirim surat"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Tanggal Terima
                    </label>
                    <input
                      type="date"
                      value={tanggalTerima}
                      onChange={(e) => setTanggalTerima(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Jenis Surat
                  </label>
                  <div className="relative">
                    <select
                      value={jenisSuratMasuk}
                      onChange={(e) => setJenisSuratMasuk(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all appearance-none bg-white"
                    >
                      <option value="">-- Pilih Jenis Surat --</option>
                       {jenisOptions.map(v => (
                        <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Pilih Folder (Opsional)
              </label>
              <select
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
              >
                <option value="">-- Pilih Folder --</option>
                {folders.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Unggah File PDF <span className="text-slate-400 font-normal">(maks. 1,5 MB) - Opsional</span>
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

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-300">
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={saved || saving}
                className="flex-1 py-2.5 rounded-lg font-semibold text-white text-sm transition-all"
                style={{ background: saved || saving ? "#93C5FD" : "#2563EB" }}
              >
                {saving ? "Menyimpan..." : saved ? "Tersimpan ✓" : "Simpan Perubahan"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg font-semibold text-sm border transition-all"
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
    </div>
  )
}
