import React, { useState } from "react"
import { EditSuratPage } from "./EditSuratPage"
import { type Page, loadMasterDataCache } from "./lib/constants"
import { LoginPage } from "./pages/LoginPage"
import { LupaPasswordPage } from "./pages/LupaPasswordPage"
import { Sidebar } from "./components/Sidebar"
import { Dashboard } from "./pages/Dashboard"
import { SuratMasuk } from "./pages/SuratMasuk"
import { SuratKeluar } from "./pages/SuratKeluar"
import { TambahSuratKeluarPage } from "./pages/TambahSuratKeluarPage"
import { KelolaData } from "./pages/KelolaData"
import { ManajemenAkun } from "./pages/ManajemenAkun"
import TandaTanganPage from "./pages/TandaTanganPage"
import { RekapSurat } from "./pages/RekapSurat"

// ── App Shell ────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>("login")
  const [authed, setAuthed] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [userInfo, setUserInfo] = useState<{ id: string | null; name: string; role: string; avatar: string }>({ id: null, name: "Pengguna", role: "-", avatar: "P" })
  const [isLoading, setIsLoading] = useState(true)
  
  // State untuk edit surat
  const [editSuratType, setEditSuratType] = useState<"masuk" | "keluar" | null>(null)
  const [editSuratId, setEditSuratId] = useState<string | null>(null)
  
  // State untuk tindak lanjut
  const [tindakLanjutData, setTindakLanjutData] = useState<any>(null)
  const [suratMasukRefresh, setSuratMasukRefresh] = useState(0)
  const [openSuratId, setOpenSuratId] = useState<string | null>(null)
  
  // Show sidebar on mount
  React.useEffect(() => {
    setSidebarCollapsed(false)
  }, [])

  React.useEffect(() => {
    const savedAuth = localStorage.getItem("isAuthed")
    const savedPage = localStorage.getItem("currentPage")
    
    if (savedAuth === "true") {
      setAuthed(true)
      setPage((savedPage as Page) || "dashboard")
      const savedUser = localStorage.getItem("userInfo")
      if (savedUser) {
        setUserInfo(JSON.parse(savedUser))
      }
      loadMasterDataCache().catch(console.error)
    }
    setIsLoading(false)
  }, [])

  const handleLogin = (user?: { id?: string; nama?: string; role?: string | null }) => {
    const info = {
      id: user?.id || null,
      name: user?.nama || "Pengguna",
      role: user?.role || "-",
      avatar: (user?.nama || "P").charAt(0).toUpperCase(),
    }
    setUserInfo(info)
    localStorage.setItem("userInfo", JSON.stringify(info))
    setAuthed(true)
    setPage("dashboard")
    localStorage.setItem("isAuthed", "true")
    localStorage.setItem("currentPage", "dashboard")
    loadMasterDataCache().catch(console.error)
  }
  const handleLogout = () => {
    setAuthed(false)
    setPage("login")
    localStorage.removeItem("isAuthed")
    localStorage.removeItem("currentPage")
    localStorage.removeItem("userInfo")
  }

  const handlePageChange = (newPage: Page, suratId?: string) => {
    setPage(newPage)
    if (suratId) {
      setOpenSuratId(suratId)
    } else {
      setOpenSuratId(null)
    }
    if (authed) {
      localStorage.setItem("currentPage", newPage)
    }
  }

  if (isLoading) return null

  if (!authed && page === "lupa-password")
    return <LupaPasswordPage onBack={() => setPage("login")} />
  if (!authed)
    return (
      <LoginPage
        onLogin={handleLogin}
        onLupaPassword={() => setPage("lupa-password")}
      />
    )

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <Sidebar
        page={page === "edit-surat" ? (editSuratType === "keluar" ? "surat-keluar" : "surat-masuk") : page === "tambah-surat-keluar" ? "surat-keluar" : page}
        setPage={handlePageChange}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        user={userInfo}
      />
      
      {/* Jika sedang edit surat, tampilkan halaman edit */}
      {page === "edit-surat" && editSuratType && editSuratId ? (
        <EditSuratPage
          type={editSuratType}
          suratId={editSuratId}
          onClose={() => {
            setEditSuratType(null)
            setEditSuratId(null)
            setPage(editSuratType === "masuk" ? "surat-masuk" : "surat-keluar")
          }}
          onSaved={() => {
            setEditSuratType(null)
            setEditSuratId(null)
            setPage(editSuratType === "masuk" ? "surat-masuk" : "surat-keluar")
          }}
        />
      ) : page === "tambah-surat-keluar" ? (
        <TambahSuratKeluarPage
          initialData={tindakLanjutData}
          onClose={() => {
            setTindakLanjutData(null)
            setPage("surat-masuk")
            setSuratMasukRefresh(prev => prev + 1)
          }}
          onSaved={() => {
            setTindakLanjutData(null)
            setPage("surat-masuk")
            setSuratMasukRefresh(prev => prev + 1)
          }}
          folderList={[]}
        />
      ) : (
        <>
          {page === "dashboard" && <Dashboard onNavigate={handlePageChange} />}
          {page === "surat-masuk" && <SuratMasuk
            onEditClick={(id) => { setEditSuratType("masuk"); setEditSuratId(id); setPage("edit-surat"); }}
            onTindakLanjut={(data) => { setTindakLanjutData(data); setPage("tambah-surat-keluar"); }}
            refreshTrigger={suratMasukRefresh}
            initialDetailId={openSuratId}
            onNavigate={handlePageChange}
          />}
          {page === "surat-keluar" && <SuratKeluar onEditClick={(id) => { setEditSuratType("keluar"); setEditSuratId(id); setPage("edit-surat"); }} initialDetailId={openSuratId} onNavigate={handlePageChange} />}
          {page === "manajemen-akun" && <ManajemenAkun onNavigate={handlePageChange} />}
          {page === "master-data" && <KelolaData onNavigate={handlePageChange} />}
          {page === "tanda-tangan" && <TandaTanganPage />}
          {page === "rekap-surat" && <RekapSurat onNavigate={handlePageChange} />}
        </>
      )}
    </div>
  )
}
