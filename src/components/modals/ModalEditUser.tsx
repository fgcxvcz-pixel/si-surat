import { useState, useEffect, useRef } from "react"
import { updateUserProfile, fetchRoles } from "../../lib/api"

export function ModalEditUser({
  user,
  onClose,
  onChanged,
}: {
  user: { id: string; username: string; nama: string; email?: string; id_role?: { id: string; nama_role: string } }
  onClose: () => void
  onChanged: () => void
}) {
  const [newUsername, setNewUsername] = useState(user.username)
  const [newNama, setNewNama] = useState(user.nama)
  const [newEmail, setNewEmail] = useState(user.email || "")
  const [roles, setRoles] = useState<Array<{ id: string; nama_role: string }>>([])
  const [idRole, setIdRole] = useState(user.id_role?.id || "")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const data = await fetchRoles()
        setRoles(data)
        if (!idRole && data.length > 0) setIdRole(data[0].id)
      } catch (err) {
        console.error("Error fetching roles:", err)
      }
    }
    loadRoles()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!newUsername || !newNama || !newEmail) { setError("Username, Nama, dan Email wajib diisi"); return }
    if (newUsername === user.username && newNama === user.nama && newEmail === (user.email || "") && idRole === user.id_role?.id) { setError("Tidak ada perubahan data"); return }
    setLoading(true)
    try {
      await updateUserProfile(user.id, {
        ...(newUsername !== user.username ? { username: newUsername } : {}),
        ...(newNama !== user.nama ? { nama: newNama } : {}),
        ...(newEmail !== (user.email || "") ? { email: newEmail } : {}),
        ...(idRole !== user.id_role?.id ? { id_role: idRole } : {}),
      })
      if (!mountedRef.current) return
      setSaved(true)
      setTimeout(() => { onClose(); onChanged() }, 800)
    } catch (err: any) {
      setError(err.message || "Gagal memperbarui data")
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(2px)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" style={{ fontFamily: "Inter, sans-serif" }}>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Edit Data Pengguna</h2>
            <p className="text-xs text-slate-400 mt-0.5">{user.nama}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nama Lengkap</label>
            <input type="text" value={newNama} onChange={(e) => setNewNama(e.target.value)} placeholder="Masukkan nama lengkap" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Username</label>
            <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Masukkan username baru" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Masukkan email" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
            <select value={idRole} onChange={(e) => setIdRole(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white">
              {roles.length === 0 && <option value="">Tidak ada role tersedia</option>}
              {roles.map((r) => (<option key={r.id} value={r.id}>{r.nama_role}</option>))}
            </select>
          </div>
          {error && (<div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-300"><span className="text-red-700 text-sm">{error}</span></div>)}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saved || loading} className="flex-1 py-2.5 rounded-lg font-semibold text-white text-sm transition-all" style={{ background: saved || loading ? "#93C5FD" : "#2563EB" }}>
              {loading ? "Menyimpan..." : saved ? "Berhasil ✓" : "Simpan"}
            </button>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg font-semibold text-sm border transition-all" style={{ color: "#DC2626", borderColor: "#FECACA", background: "#FFF5F5" }} onMouseEnter={(e) => (e.currentTarget.style.background = "#FEE2E2")} onMouseLeave={(e) => (e.currentTarget.style.background = "#FFF5F5")}>
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
