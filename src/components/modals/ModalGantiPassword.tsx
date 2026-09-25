import { useState, useRef, useEffect } from "react"
import { adminUpdatePassword } from "../../lib/api"
import { usePasswordValidation, usePasswordMatch } from "../../hooks/usePasswordValidation"
import { PasswordValidationLabel } from "../PasswordValidationLabel"
import { IconEye } from "../Icons"

export function ModalGantiPassword({
  user,
  onClose,
  onChanged,
}: {
  user: { id: string; username: string; nama: string }
  onClose: () => void
  onChanged: () => void
}) {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const newPasswordValidation = usePasswordValidation(newPassword)
  const confirmPasswordValidation = usePasswordMatch(newPassword, confirmPassword)
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!newPassword) { setError("Password baru wajib diisi"); return }
    if (newPassword.length < 8) { setError("Password minimal 8 karakter"); return }
    if (newPassword !== confirmPassword) { setError("Password tidak cocok"); return }
    setLoading(true)
    try {
      await adminUpdatePassword(user.id, newPassword)
      if (!mountedRef.current) return
      setSaved(true)
      setTimeout(() => { onClose(); onChanged() }, 800)
    } catch (err: any) {
      setError(err.message || "Gagal mengganti password")
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(2px)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" style={{ fontFamily: "Inter, sans-serif" }}>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Ganti Password</h2>
            <p className="text-xs text-slate-400 mt-0.5">Akun: {user.username} — {user.nama}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Password Baru</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Masukkan password baru" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all pr-10" />
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-md transition-colors" style={{ color: "#94A3B8" }} title={showPassword ? "Sembunyikan password" : "Lihat password"}>
                <IconEye open={showPassword} />
              </button>
            </div>
            <PasswordValidationLabel message={newPasswordValidation.message} color={newPasswordValidation.color} icon={newPasswordValidation.icon} isEmpty={newPasswordValidation.isEmpty} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Konfirmasi Password</label>
            <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Konfirmasi password baru" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
            <PasswordValidationLabel message={confirmPasswordValidation.message} color={confirmPasswordValidation.color} icon={confirmPasswordValidation.icon} isEmpty={confirmPasswordValidation.isEmpty} />
          </div>
          {error && (<div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-300"><span className="text-red-700 text-sm">{error}</span></div>)}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saved || loading} className="flex-1 py-2.5 rounded-lg font-semibold text-white text-sm transition-all" style={{ background: saved || loading ? "#93C5FD" : "#2563EB" }}>
              {loading ? "Menyimpan..." : saved ? "Berhasil ✓" : "Simpan Password"}
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
