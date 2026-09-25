import { useState } from "react"
import { supabase } from "../lib/supabase"
import { usePasswordValidation } from "../hooks/usePasswordValidation"
import { PasswordValidationLabel } from "../components/PasswordValidationLabel"
import { IconMail, IconEye } from "../components/Icons"
import logoSandya from "../assets/logo-sandya.png"
import bubleOrang from "../assets/orang.png"

export function LoginPage({
  onLogin,
  onLupaPassword,
}: {
  onLogin: (user?: { id?: string; nama?: string; role?: string | null }) => void
  onLupaPassword: () => void
}) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const passwordValidation = usePasswordValidation(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!username || !password) {
      setError("Username dan password wajib diisi.")
      return
    }
    setLoading(true)
    try {
      const { data: pengguna } = await supabase.from("pengguna").select("id, email").eq("username", username).single()
      if (!pengguna) { setError("Username tidak terdaftar."); setLoading(false); return }
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email: pengguna.email, password })
      if (authErr) { setError(authErr.message.includes("Invalid login") ? "Password salah." : authErr.message); setLoading(false); return }
      const { data: profile } = await supabase.from("pengguna").select("id, nama, username, email, id_role:roles(nama_role)").eq("id", authData.user.id).single()
      onLogin({ id: profile?.id || authData.user.id, nama: profile?.nama || username, role: (profile?.id_role as any)?.nama_role || null })
    } catch (err) {
      setError("Koneksi ke server gagal.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ fontFamily: "Inter, sans-serif", background: "#1E293B" }}>
      <div className="flex w-full max-w-6xl rounded-3xl overflow-hidden border border-slate-700" style={{ background: "white", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(30, 41, 59, 0.1)" }}>
        <div className="hidden lg:flex flex-col justify-between w-1/2 flex-shrink-0 p-12 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)" }}>
          {/* Decorative Mail Icons */}
          <svg style={{ position: "absolute", top: "8%", left: "10%", opacity: 0.15 }} width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
          <svg style={{ position: "absolute", top: "18%", right: "12%", opacity: 0.18, transform: "rotate(12deg)" }} width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
          <svg style={{ position: "absolute", top: "55%", left: "5%", opacity: 0.12, transform: "rotate(-8deg)" }} width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
          <svg style={{ position: "absolute", top: "40%", right: "8%", opacity: 0.16, transform: "rotate(20deg)" }} width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
          <svg style={{ position: "absolute", bottom: "15%", left: "15%", opacity: 0.2, transform: "rotate(-15deg)" }} width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
          <svg style={{ position: "absolute", bottom: "8%", right: "18%", opacity: 0.1, transform: "rotate(30deg)" }} width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
          <svg style={{ position: "absolute", top: "30%", left: "40%", opacity: 0.14, transform: "rotate(-5deg)" }} width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
          <svg style={{ position: "absolute", bottom: "30%", right: "6%", opacity: 0.17, transform: "rotate(18deg)" }} width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center border-2" style={{ borderColor: "#60A5FA", background: "transparent", position: "relative" }}>
                <IconMail style={{ color: "#60A5FA", width: "26px", height: "22px" }} />
              </div>
              <span className="font-semibold text-lg tracking-tight" style={{ color: "#ffffff", fontSize: "22px" }}>SiSurat</span>
            </div>
            <p className="text-sm mt-3" style={{ color: "#94A3B8", lineHeight: "1.6" }}>Sistem Manajemen Surat Digital</p>
          </div>
          <div className="flex flex-col items-center justify-center flex-1">
            <img src={logoSandya} alt="SANDYA Networks" className="mb-6 h-auto" style={{ maxWidth: "170px", position: "relative", bottom: "110px", left: "150px", zIndex: "1" }} />
            <div className="flex items-flex-end justify-between w-full" style={{ height: "140px", position: "relative" }}>
              <img src={bubleOrang} alt="Orang" className="h-auto" style={{ width: "460px", objectFit: "contain", position: "absolute", top: "-130px", left: "45%", transform: "translateX(-50%)" }} />
            </div>
          </div>
        </div>
        <div className="flex-1 lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-1" style={{ color: "#0F172A" }}>Login</h2>
              <p className="text-sm" style={{ color: "#64748B" }}>Masuk ke akun Anda</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#334155" }}>Username</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Masukkan username" className="w-full px-4 py-3 rounded-xl border text-slate-900 text-sm placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm" style={{ fontFamily: "Inter, sans-serif", borderColor: "#E2E8F0", background: "white" }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#334155" }}>Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan password" className="w-full px-4 py-3 rounded-xl border text-slate-900 text-sm placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 pr-12 shadow-sm" style={{ fontFamily: "Inter, sans-serif", borderColor: "#E2E8F0", background: "white" }} />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-md transition-colors duration-200" style={{ color: "#94A3B8" }} title={showPassword ? "Sembunyikan password" : "Lihat password"} onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <IconEye open={showPassword} />
                  </button>
                </div>
                <PasswordValidationLabel message={passwordValidation.message} color={passwordValidation.color} icon={passwordValidation.icon} isEmpty={passwordValidation.isEmpty} />
              </div>
              <div className="text-right">
                <button type="button" onClick={onLupaPassword} className="text-sm font-medium transition-colors duration-200" style={{ color: "#2563EB" }}>Lupa Password?</button>
              </div>
              {error && (<div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200"><span className="text-red-600 text-sm">{error}</span></div>)}
              <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]" style={{ background: loading ? "#93C5FD" : "linear-gradient(135deg, #3B82F6, #2563EB)", cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Memproses..." : "Masuk"}
              </button>
            </form>
            <p className="text-center text-xs mt-8 pt-6" style={{ color: "#64748B", borderTop: "1px solid #E2E8F0" }}>© 2026 SiSurat — Sistem Manajemen Surat Digital</p>
          </div>
        </div>
      </div>
    </div>
  )
}
