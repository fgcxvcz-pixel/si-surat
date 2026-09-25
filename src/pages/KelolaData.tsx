import { useState, useEffect, useCallback, useRef } from "react"
import { TopBar } from "../components/TopBar"
import { IconMailIn, IconMailOut, IconFolder, IconTag } from "../components/Icons"
import {
  fetchCustomFolders, createCustomFolder, deleteCustomFolderByName, renameCustomFolder,
  fetchJenisSurat, addJenisSurat, deleteJenisSurat, renameJenisSurat,
  fetchKategori, addKategori, deleteKategori, renameKategori,
} from "../lib/api"

type TabKey = "jenis-masuk" | "jenis-keluar" | "kategori" | "folder"

type EditTarget = { panel: "main" | "masuk" | "keluar"; idx: number } | null

const TAB_CONFIG: Record<TabKey, {
  label: string
  icon: React.ReactNode
  activeBg: string
  activeShadow: string
  badgeBg: string
  badgeText: string
  empty: { icon: React.ReactNode; title: string; desc: string }
}> = {
  "jenis-masuk": {
    label: "Jenis Surat Masuk", icon: <IconMailIn />,
    activeBg: "bg-blue-600", activeShadow: "shadow-blue-200",
    badgeBg: "bg-blue-100", badgeText: "text-blue-700",
    empty: { icon: <IconMailIn />, title: "Belum ada jenis surat masuk", desc: "Tambah jenis surat masuk untuk mengkategorikan surat yang diterima" },
  },
  "jenis-keluar": {
    label: "Jenis Surat Keluar", icon: <IconMailOut />,
    activeBg: "bg-emerald-600", activeShadow: "shadow-emerald-200",
    badgeBg: "bg-emerald-100", badgeText: "text-emerald-700",
    empty: { icon: <IconMailOut />, title: "Belum ada jenis surat keluar", desc: "Tambah jenis surat keluar untuk mengkategorikan surat yang dikirim" },
  },
  kategori: {
    label: "Kategori", icon: <IconTag />,
    activeBg: "bg-amber-500", activeShadow: "shadow-amber-200",
    badgeBg: "bg-amber-100", badgeText: "text-amber-700",
    empty: { icon: <IconTag />, title: "Belum ada kategori", desc: "Tambah kategori untuk menandai tingkat prioritas surat" },
  },
  folder: {
    label: "Folder", icon: <IconFolder />,
    activeBg: "bg-violet-600", activeShadow: "shadow-violet-200",
    badgeBg: "bg-violet-100", badgeText: "text-violet-700",
    empty: { icon: <IconFolder />, title: "Belum ada folder", desc: "Buat folder untuk mengorganisir surat masuk dan keluar" },
  },
}

export function KelolaData({ onNavigate }: { onNavigate?: (page: any, suratId?: string) => void }) {
  const [activeTab, setActiveTab] = useState<TabKey>("jenis-masuk")
  const [jenisMasuk, setJenisMasuk] = useState<string[]>([])
  const [jenisKeluar, setJenisKeluar] = useState<string[]>([])
  const [kategori, setKategori] = useState<string[]>([])
  const [folderMasuk, setFolderMasuk] = useState<string[]>([])
  const [folderKeluar, setFolderKeluar] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const [newItem, setNewItem] = useState("")
  const [newFolderMasuk, setNewFolderMasuk] = useState("")
  const [newFolderKeluar, setNewFolderKeluar] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const [editTarget, setEditTarget] = useState<EditTarget>(null)
  const [editValue, setEditValue] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<{ tab: string; idx: number; name: string; panel?: "masuk" | "keluar" } | null>(null)
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  const [animatingAdd, setAnimatingAdd] = useState<string | null>(null)
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const animateAdd = (key: string) => {
    setAnimatingAdd(key)
    if (animTimerRef.current) clearTimeout(animTimerRef.current)
    animTimerRef.current = setTimeout(() => setAnimatingAdd(null), 400)
  }

  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 2500)
  }, [])

  const showSuccess = useCallback((msg: string) => showToast("success", msg), [showToast])
  const showError = useCallback((msg: string) => showToast("error", msg), [showToast])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && editTarget) cancelEdit()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [editTarget])

  const getItems = () => {
    if (activeTab === "jenis-masuk") return jenisMasuk
    if (activeTab === "jenis-keluar") return jenisKeluar
    return kategori
  }

  const setItems = (items: string[]) => {
    if (activeTab === "jenis-masuk") setJenisMasuk(items)
    else if (activeTab === "jenis-keluar") setJenisKeluar(items)
    else setKategori(items)
  }

  const counts: Record<TabKey, number> = {
    "jenis-masuk": jenisMasuk.length,
    "jenis-keluar": jenisKeluar.length,
    kategori: kategori.length,
    folder: folderMasuk.length + folderKeluar.length,
  }

  useEffect(() => {
    setLoading(true)
    const load = async () => {
      try {
        const [jm, jk, k, fm, fk] = await Promise.all([
          fetchJenisSurat("masuk"),
          fetchJenisSurat("keluar"),
          fetchKategori(),
          fetchCustomFolders("masuk"),
          fetchCustomFolders("keluar"),
        ])
        setJenisMasuk(jm)
        setJenisKeluar(jk)
        setKategori(k)
        setFolderMasuk(fm)
        setFolderKeluar(fk)
      } catch (err) {
        console.error(err)
        showError("Gagal memuat data")
      }
      setLoading(false)
    }
    load()
  }, [])

  const filterItems = (items: string[]) => {
    if (!searchQuery.trim()) return items
    return items.filter((i) => i.toLowerCase().includes(searchQuery.toLowerCase()))
  }

  const handleAdd = async () => {
    if (!newItem.trim()) return
    const items = getItems()
    if (items.includes(newItem.trim())) { showError("Item sudah ada"); return }
    try {
      const val = newItem.trim()
      if (activeTab === "jenis-masuk") { await addJenisSurat(val, "masuk"); setJenisMasuk([...jenisMasuk, val]) }
      else if (activeTab === "jenis-keluar") { await addJenisSurat(val, "keluar"); setJenisKeluar([...jenisKeluar, val]) }
      else if (activeTab === "kategori") { await addKategori(val); setKategori([...kategori, val]) }
      animateAdd(`main-${val}`)
      showSuccess(`"${val}" ditambahkan`)
      setNewItem("")
    } catch (err: any) { showError(err.message || "Gagal menambah") }
  }

  const handleAddFolder = async (tipe: "masuk" | "keluar") => {
    const val = tipe === "masuk" ? newFolderMasuk : newFolderKeluar
    if (!val.trim()) return
    const items = tipe === "masuk" ? folderMasuk : folderKeluar
    if (items.includes(val.trim())) { showError("Folder sudah ada"); return }
    try {
      await createCustomFolder(tipe, val.trim())
      if (tipe === "masuk") setFolderMasuk([...folderMasuk, val.trim()])
      else setFolderKeluar([...folderKeluar, val.trim()])
      animateAdd(`${tipe}-${val.trim()}`)
      showSuccess(`Folder "${val.trim()}" ditambahkan`)
      if (tipe === "masuk") setNewFolderMasuk("")
      else setNewFolderKeluar("")
    } catch (err: any) { showError(err.message || "Gagal menambah folder") }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const { tab, idx, name, panel } = deleteTarget
    try {
      if (tab === "jenis-masuk") { await deleteJenisSurat(name, "masuk"); setJenisMasuk(jenisMasuk.filter((_, i) => i !== idx)) }
      else if (tab === "jenis-keluar") { await deleteJenisSurat(name, "keluar"); setJenisKeluar(jenisKeluar.filter((_, i) => i !== idx)) }
      else if (tab === "kategori") { await deleteKategori(name); setKategori(kategori.filter((_, i) => i !== idx)) }
      else if (tab === "folder" && panel) {
        await deleteCustomFolderByName(name, panel)
        if (panel === "masuk") setFolderMasuk(folderMasuk.filter((_, i) => i !== idx))
        else setFolderKeluar(folderKeluar.filter((_, i) => i !== idx))
      }
      showSuccess(`"${name}" dihapus`)
    } catch (err: any) { showError(err.message || "Gagal menghapus") }
    setDeleteTarget(null)
  }

  const getEditItems = (panel?: "main" | "masuk" | "keluar") => {
    if (panel === "masuk") return folderMasuk
    if (panel === "keluar") return folderKeluar
    return getItems()
  }

  const handleRename = async (idx: number) => {
    if (!editValue.trim()) return
    const panel = editTarget?.panel || "main"
    const items = getEditItems(panel)
    const oldName = items[idx]
    const newName = editValue.trim()
    if (oldName === newName) { setEditTarget(null); setEditValue(""); return }
    try {
      if (panel === "masuk") await renameCustomFolder(oldName, newName, "masuk")
      else if (panel === "keluar") await renameCustomFolder(oldName, newName, "keluar")
      else if (activeTab === "jenis-masuk") await renameJenisSurat(oldName, newName, "masuk")
      else if (activeTab === "jenis-keluar") await renameJenisSurat(oldName, newName, "keluar")
      else await renameKategori(oldName, newName)

      const updated = [...items]; updated[idx] = newName
      if (panel === "masuk") setFolderMasuk(updated)
      else if (panel === "keluar") setFolderKeluar(updated)
      else setItems(updated)
      showSuccess(`Diubah ke "${newName}"`)
    } catch (err: any) { showError(err.message || "Gagal mengubah") }
    setEditTarget(null); setEditValue("")
  }

  const cancelEdit = () => { setEditTarget(null); setEditValue("") }

  const isEditing = (panel: "main" | "masuk" | "keluar", idx: number) =>
    editTarget?.panel === panel && editTarget?.idx === idx

  const tabs: TabKey[] = ["jenis-masuk", "jenis-keluar", "kategori", "folder"]
  const cfg = TAB_CONFIG[activeTab]

  const renderSkeleton = (rows = 5) => (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="h-4 bg-slate-100 rounded w-40 animate-pulse" />
      </div>
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="h-10 bg-slate-50 rounded-lg animate-pulse" />
      </div>
      <div className="divide-y divide-slate-50">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-3 flex items-center gap-3">
            <div className="h-4 bg-slate-100 rounded w-6 animate-pulse" />
            <div className="h-4 bg-slate-100 rounded w-full max-w-[40%] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )

  const renderEmptyState = (tabKey: TabKey) => {
    const empty = TAB_CONFIG[tabKey].empty
    return (
      <div className="py-16 text-center">
        <div className="mb-3 text-slate-300">{empty.icon}</div>
        <p className="text-sm font-medium text-slate-600">{empty.title}</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">{empty.desc}</p>
      </div>
    )
  }

  const renderFolderEmptyState = (tipe: "masuk" | "keluar") => (
    <div className="py-10 text-center">
      <div className="text-slate-300 mb-2"><IconFolder /></div>
      <p className="text-xs text-slate-400">Belum ada folder {tipe}</p>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      <TopBar title="Master Data" subtitle={cfg.label} onNavigate={onNavigate} />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg text-white text-sm font-medium shadow-lg flex items-center gap-2 toast-enter ${
              toast.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {toast.type === "success" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            )}
            {toast.msg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-1 flex-wrap">
          {tabs.map((key) => {
            const active = activeTab === key
            const tabCfg = TAB_CONFIG[key]
            return (
              <button
                key={key}
                onClick={() => { setActiveTab(key); cancelEdit(); setNewItem(""); setNewFolderMasuk(""); setNewFolderKeluar(""); setSearchQuery("") }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm hover:shadow ${
                  active
                    ? `${tabCfg.activeBg} text-white shadow-md ${tabCfg.activeShadow}`
                    : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"
                }`}
              >
                <span>{tabCfg.icon}</span>
                <span>{tabCfg.label}</span>
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                    active ? "bg-white/25 text-white" : `${tabCfg.badgeBg} ${tabCfg.badgeText}`
                  }`}
                >
                  {counts[key]}
                </span>
              </button>
            )
          })}
        </div>

        {/* Subtitle */}
        <p className="text-sm text-slate-400 mb-6 mt-1">
          {activeTab === "folder" ? "Kelola folder untuk mengorganisir surat" : `Pilihan ${cfg.label.toLowerCase()} yang tersedia`}
        </p>

        {loading ? (
          activeTab === "folder" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(["masuk", "keluar"] as const).map((tipe) => (
                <div key={tipe} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <div className="h-4 bg-slate-100 rounded w-36 animate-pulse" />
                  </div>
                  <div className="px-5 py-3 border-b border-slate-100">
                    <div className="h-10 bg-slate-50 rounded-lg animate-pulse" />
                  </div>
                  <div className="px-5 py-3 space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex items-center gap-3 py-3 border-b border-slate-50">
                        <div className="h-4 bg-slate-100 rounded w-6 animate-pulse" />
                        <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            renderSkeleton()
          )
        ) : activeTab === "folder" ? (
          /* ── Folder Tab ──────────────────────────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {([
              { tipe: "masuk" as const, label: "Folder Surat Masuk", data: folderMasuk, setData: setFolderMasuk, newVal: newFolderMasuk, setNewVal: setNewFolderMasuk },
              { tipe: "keluar" as const, label: "Folder Surat Keluar", data: folderKeluar, setData: setFolderKeluar, newVal: newFolderKeluar, setNewVal: setNewFolderKeluar },
            ]).map((panelCfg) => {
              const panelAccent = panelCfg.tipe === "masuk" ? "blue" : "emerald"
              return (
                <div key={panelCfg.tipe} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        panelAccent === "blue" ? "bg-blue-50 text-blue-500" : "bg-emerald-50 text-emerald-500"
                      }`}>{panelCfg.tipe === "masuk" ? <IconMailIn /> : <IconMailOut />}</span>
                      {panelCfg.label}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      panelAccent === "blue" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                    }`}>{panelCfg.data.length}</span>
                  </div>
                  <div className="px-5 py-3 border-b border-slate-100 flex gap-2">
                    <input
                      type="text"
                      value={panelCfg.newVal}
                      onChange={(e) => panelCfg.setNewVal(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddFolder(panelCfg.tipe)}
                      placeholder={`Tambah folder ${panelCfg.tipe} baru...`}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                    <button
                      onClick={() => handleAddFolder(panelCfg.tipe)}
                      disabled={!panelCfg.newVal.trim()}
                      className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 hover:opacity-90 active:scale-95 ${
                        panelCfg.newVal.trim() ? (panelAccent === "blue" ? "bg-blue-600" : "bg-emerald-600") : "bg-slate-300"
                      }`}
                    >Tambah</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {panelCfg.data.length === 0 && renderFolderEmptyState(panelCfg.tipe)}
                    {panelCfg.data.map((item, idx) => {
                      const itemKey = `${panelCfg.tipe}-${item}`
                      const isAnimating = animatingAdd === itemKey
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between px-5 py-3 border-b border-slate-50 hover:bg-slate-50/80 transition-all group ${
                            isAnimating ? "item-slide-in" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs text-slate-300 w-6 text-right shrink-0 font-mono">{idx + 1}</span>
                            {isEditing(panelCfg.tipe, idx) ? (
                              <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRename(idx)} className="px-3 py-1.5 rounded-lg border border-blue-400 text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all w-48" autoFocus />
                            ) : (
                              <span className="text-sm text-slate-700 truncate">{item}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {isEditing(panelCfg.tipe, idx) ? (
                              <>
                                <button onClick={() => handleRename(idx)} className="p-1.5 rounded-md hover:bg-blue-100 transition-colors" title="Simpan">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                </button>
                                <button onClick={cancelEdit} className="p-1.5 rounded-md hover:bg-slate-200 transition-colors" title="Batal (Esc)">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => { setEditTarget({ panel: panelCfg.tipe, idx }); setEditValue(item) }} className="p-1.5 rounded-md opacity-100 hover:bg-slate-100 transition-all" title="Edit">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                </button>
                                <button onClick={() => setDeleteTarget({ tab: "folder", idx, name: item, panel: panelCfg.tipe })} className="p-1.5 rounded-md opacity-100 hover:bg-red-50 transition-all" title="Hapus">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ── Jenis/Kategori Tab ──────────────────────────────────────────── */
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span>{cfg.icon}</span> {cfg.label}
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.badgeBg} ${cfg.badgeText}`}>
                {getItems().length} item
              </span>
            </div>

            {/* Add form */}
            <div className="px-6 py-4 border-b border-slate-100 flex gap-3">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">+</span>
                <input
                  type="text"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder={`Tambah ${cfg.label.toLowerCase()} baru...`}
                  className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={!newItem.trim()}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 flex items-center gap-1.5 hover:opacity-90 active:scale-95 ${
                  newItem.trim() ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <span>+</span> Tambah
              </button>
            </div>

            {/* Search */}
            {getItems().length > 0 && (
              <div className="px-6 py-3 border-b border-slate-100">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Cari ${cfg.label.toLowerCase()}...`}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* List */}
            <div className="divide-y divide-slate-50">
              {filterItems(getItems()).map((item) => {
                const realIdx = getItems().indexOf(item)
                const isAnimating = animatingAdd === `main-${item}`
                return (
                  <div
                    key={realIdx}
                    className={`flex items-center justify-between px-6 py-3 hover:bg-slate-50/80 transition-all group ${
                      isAnimating ? "item-slide-in" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-slate-300 w-6 text-right shrink-0 font-mono">{realIdx + 1}</span>
                      {isEditing("main", realIdx) ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleRename(realIdx)}
                          className="px-3 py-1.5 rounded-lg border border-blue-400 text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all w-64"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm text-slate-700 truncate">{item}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {isEditing("main", realIdx) ? (
                        <>
                          <button onClick={() => handleRename(realIdx)} className="p-1.5 rounded-md hover:bg-blue-100 transition-colors" title="Simpan">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          </button>
                          <button onClick={cancelEdit} className="p-1.5 rounded-md hover:bg-slate-200 transition-colors" title="Batal (Esc)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditTarget({ panel: "main", idx: realIdx }); setEditValue(item) }} className="p-1.5 rounded-md opacity-100 hover:bg-slate-100 transition-all" title="Edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>
                          <button onClick={() => setDeleteTarget({ tab: activeTab, idx: realIdx, name: item })} className="p-1.5 rounded-md opacity-100 hover:bg-red-50 transition-all" title="Hapus">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
              {getItems().length === 0 ? (
                renderEmptyState(activeTab)
              ) : filterItems(getItems()).length === 0 ? (
                <div className="py-12 text-center">
                  <svg className="mx-auto mb-2 text-slate-300" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <p className="text-sm text-slate-400">Tidak ditemukan hasil untuk "<span className="font-medium text-slate-500">{searchQuery}</span>"</p>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 modal-enter" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-50 shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Hapus Item?</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    "<strong className="text-slate-700">{deleteTarget.name}</strong>" akan dihapus permanen.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-lg font-semibold text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all active:scale-95">Batal</button>
                <button onClick={handleDelete} className="flex-1 py-2.5 rounded-lg font-semibold text-sm text-white transition-all bg-red-600 hover:bg-red-700 active:scale-95">Hapus</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
