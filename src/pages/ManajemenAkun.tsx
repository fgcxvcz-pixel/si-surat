import React, { useState, useCallback } from "react"
import { TopBar } from "../components/TopBar"
import { IconPlus } from "../components/Icons"
import { ModalTambahAkun } from "../components/modals/ModalTambahAkun"
import { ModalGantiPassword } from "../components/modals/ModalGantiPassword"
import { ModalEditUser } from "../components/modals/ModalEditUser"
import { fetchUsers as apiFetchUsers, deleteUser as apiDeleteUser } from "../lib/api"
import { isSuperAdmin, isKepalaRole } from "../lib/constants"

const ROLE_COLORS: Record<string, { bg: string; text: string; iconBg: string; iconStroke: string }> = {
  "Admin": { bg: "bg-blue-50", text: "text-blue-700", iconBg: "bg-blue-100", iconStroke: "#2563EB" },
  "Kepala Bagian": { bg: "bg-purple-50", text: "text-purple-700", iconBg: "bg-purple-100", iconStroke: "#9333EA" },
  "Super Admin": { bg: "bg-amber-50", text: "text-amber-700", iconBg: "bg-amber-100", iconStroke: "#D97706" },
}
const DEFAULT_ROLE_COLOR = { bg: "bg-slate-50", text: "text-slate-700", iconBg: "bg-slate-100", iconStroke: "#64748B" }

export function ManajemenAkun({ onNavigate }: { onNavigate?: (page: any, suratId?: string) => void }) {
  const [showAddUser, setShowAddUser] = useState(false)
  const [changePwUser, setChangePwUser] = useState<{ id: string; username: string; nama: string } | null>(null)
  const [editUser, setEditUser] = useState<{ id: string; username: string; nama: string; email?: string; id_role?: { id: string; nama_role: string } } | null>(null)
  const [users, setUsers] = useState<Array<{ id: string; username: string; nama: string; email?: string; id_role?: { id: string; nama_role: string } }>>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; username: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  const userInfo = localStorage.getItem("userInfo")
  let currentUserRole: string | null = null
  try { currentUserRole = userInfo ? JSON.parse(userInfo).role : null } catch { /* corrupted data */ }
  const isAccessDenied = !isSuperAdmin(currentUserRole) && isKepalaRole(currentUserRole)

  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 2500)
  }, [])

  React.useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await apiFetchUsers()
      setUsers(
        (data ?? [])
          .filter((u: any) => {
            const role = (Array.isArray(u.id_role) ? u.id_role[0] : u.id_role)?.nama_role
            return role !== "Super Admin"
          })
          .map((u: any) => ({
            id: u.id,
            username: u.username,
            nama: u.nama,
            email: u.email,
            id_role: Array.isArray(u.id_role) ? u.id_role[0] : u.id_role,
          }))
      )
    } catch (err) {
      console.error("Error fetching users:", err)
      showToast("error", "Gagal memuat data pengguna")
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = (newUser: { id: string; username: string; nama: string }) => {
    setShowAddUser(false)
    fetchUsers()
    showToast("success", `Akun "${newUser.username}" berhasil ditambahkan`)
  }

  const handleDeleteUser = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiDeleteUser(deleteTarget.id)
      setUsers(users.filter(u => u.id !== deleteTarget.id))
      showToast("success", `Akun "${deleteTarget.username}" berhasil dihapus`)
    } catch (err) {
      showToast("error", "Gagal menghapus akun")
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const getRoleColor = (namaRole?: string) => ROLE_COLORS[namaRole || ""] || DEFAULT_ROLE_COLOR

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {showAddUser && <ModalTambahAkun onClose={() => setShowAddUser(false)} onAdd={handleAddUser} />}
      {changePwUser && <ModalGantiPassword user={{ id: changePwUser.id, username: changePwUser.username, nama: changePwUser.nama }} onClose={() => setChangePwUser(null)} onChanged={fetchUsers} />}
      {editUser && <ModalEditUser user={{ id: editUser.id, username: editUser.username, nama: editUser.nama, email: editUser.email, id_role: editUser.id_role }} onClose={() => setEditUser(null)} onChanged={fetchUsers} />}

      <TopBar title="Manajemen Akun" subtitle="Kelola akun pengguna sistem SiSurat" onNavigate={onNavigate} />

      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg text-white text-sm font-medium shadow-lg flex items-center gap-2 toast-enter ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
            {toast.type === "success" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            )}
            {toast.msg}
          </div>
        )}

        {isAccessDenied ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-full max-w-md text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-red-50">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Akses Ditolak</h2>
              <p className="text-slate-600 mb-4">Anda tidak memiliki izin untuk mengakses halaman Manajemen Akun. Hanya Admin yang dapat mengelola akun pengguna.</p>
              <p className="text-slate-500 text-sm">Role Anda: <span className="font-semibold">{currentUserRole}</span></p>
            </div>
          </div>
        ) : (
          <>
            {/* Role Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border overflow-hidden shadow-sm" style={{ background: "#EFF6FF", borderColor: "#BFDBFE" }}>
                <div className="px-5 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-blue-100">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  </div>
                  <h3 className="text-sm font-bold text-blue-700">Admin</h3>
                </div>
                <div className="px-5 pb-5">
                  <ul className="space-y-1.5">
                    {["Mengelola akun pengguna (tambah, edit, hapus)", "Mengubah peran pengguna", "Melihat semua surat masuk dan surat keluar", "Menambah, mengedit, dan menghapus surat", "Mengelola master data dan folder", "Mengelola tanda tangan digital"].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-blue-800">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-blue-400" />{item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="rounded-xl border overflow-hidden shadow-sm" style={{ background: "#FAF5FF", borderColor: "#E9D5FF" }}>
                <div className="px-5 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-purple-100">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9333EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  </div>
                  <h3 className="text-sm font-bold text-purple-700">Kepala Bagian</h3>
                </div>
                <div className="px-5 pb-5">
                  <ul className="space-y-1.5">
                    {["Menyetujui atau menolak surat keluar", "Melihat notifikasi surat menunggu persetujuan", "Melihat daftar surat masuk dan surat keluar", "Mengedit surat yang dibuat sendiri", "Tidak dapat mengelola akun pengguna", "Tidak dapat mengelola master data"].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-purple-800">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-purple-400" />{item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* User Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Daftar Akun Pengguna</h3>
                  <p className="text-slate-400 text-xs mt-0.5">{users.length} akun terdaftar</p>
                </div>
                <button onClick={() => setShowAddUser(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95 bg-blue-600">
                  <IconPlus /><span>Tambah Akun</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-6 py-3.5"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse shrink-0" /><div className="h-4 bg-slate-100 rounded w-20 animate-pulse" /></div></td>
                          <td className="px-6 py-3.5"><div className="h-4 bg-slate-100 rounded w-28 animate-pulse" /></td>
                          <td className="px-6 py-3.5"><div className="h-5 bg-slate-100 rounded-full w-20 animate-pulse" /></td>
                          <td className="px-6 py-3.5"><div className="flex gap-2"><div className="h-8 bg-slate-100 rounded-lg w-16 animate-pulse" /><div className="h-8 bg-slate-100 rounded-lg w-24 animate-pulse" /><div className="h-8 bg-slate-100 rounded-lg w-16 animate-pulse" /></div></td>
                        </tr>
                      ))
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center">
                          <div className="text-4xl mb-3">👤</div>
                          <p className="text-sm font-medium text-slate-600">Belum ada akun pengguna</p>
                          <p className="text-xs text-slate-400 mt-1">Klik "Tambah Akun" untuk membuat akun baru</p>
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => {
                        const rc = getRoleColor(user.id_role?.nama_role)
                        return (
                          <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${user.id_role?.nama_role === "Admin" ? "bg-blue-500" : user.id_role?.nama_role?.includes("Kepala") ? "bg-purple-500" : "bg-slate-400"}`}>
                                  {(user.nama || user.username || "?").charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-slate-800">{user.username}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3.5 text-sm text-slate-600">{user.nama}</td>
                            <td className="px-6 py-3.5">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${rc.bg} ${rc.text}`}>
                                {user.id_role?.nama_role || "-"}
                              </span>
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button onClick={() => setEditUser({ id: user.id, username: user.username, nama: user.nama, email: user.email, id_role: user.id_role })} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-all hover:opacity-90 active:scale-95 bg-purple-600">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                  Edit
                                </button>
                                <button onClick={() => setChangePwUser({ id: user.id, username: user.username, nama: user.nama })} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-all hover:opacity-90 active:scale-95 bg-blue-600">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                  Ganti Password
                                </button>
                                <button onClick={() => setDeleteTarget({ id: user.id, username: user.username })} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-all hover:opacity-90 active:scale-95 bg-red-600">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                  Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

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
                <h3 className="text-base font-bold text-slate-900">Hapus Akun?</h3>
                <p className="text-sm text-slate-500 mt-0.5">Akun "<strong className="text-slate-700">{deleteTarget.username}</strong>" akan dihapus permanen. Semua surat dan tanda tangan milik akun ini juga akan terhapus.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-lg font-semibold text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all active:scale-95">Batal</button>
              <button onClick={handleDeleteUser} disabled={deleting} className="flex-1 py-2.5 rounded-lg font-semibold text-sm text-white transition-all bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-50">{deleting ? "Menghapus..." : "Hapus"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
