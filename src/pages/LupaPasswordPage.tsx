import { useState } from "react"
import { IconMail } from "../components/Icons"
import { forgotPassword, resetPasswordOtp } from "../lib/api"
import { usePasswordValidation } from "../hooks/usePasswordValidation"
import { PasswordValidationLabel } from "../components/PasswordValidationLabel"

type Step = "username" | "otp" | "password"

export function LupaPasswordPage({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>("username")
  const [username, setUsername] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const passwordValidation = usePasswordValidation(newPassword)

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setInfo("")
    if (!username) {
      setError("Username wajib diisi")
      return
    }
    setLoading(true)
    try {
      const data = await forgotPassword(username)
      setInfo(data.message || "Jika username terdaftar, kode OTP telah dikirim ke email.")
      setStep("otp")
    } catch (err: any) {
      setError(err.message || "Gagal mengirim OTP")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!otp) {
      setError("Kode OTP wajib diisi")
      return
    }
    setLoading(true)
    try {
      // Verifikasi OTP + password baru digabung di step berikutnya;
      // di sini kita hanya cek format lalu lanjut (server validasi saat reset).
      if (!/^\d{6}$/.test(otp.trim())) {
        setError("Kode OTP harus 6 digit angka")
        setLoading(false)
        return
      }
      setStep("password")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError("")
    setInfo("")
    setLoading(true)
    try {
      const data = await forgotPassword(username)
      setInfo(data.message || "Kode baru dikirim jika username terdaftar.")
    } catch (err: any) {
      setError(err.message || "Gagal mengirim ulang OTP")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!newPassword || !confirmPassword) {
      setError("Semua field wajib diisi")
      return
    }
    if (newPassword.length < 8) {
      setError("Password minimal 8 karakter")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Password tidak cocok")
      return
    }
    setLoading(true)
    try {
      await resetPasswordOtp({ username, otp: otp.trim(), newPassword })
      setStep("username")
      onBack()
    } catch (err: any) {
      setError(err.message || "Gagal mengubah password")
    } finally {
      setLoading(false)
    }
  }

  const stepInfo: Record<Step, { title: string; subtitle: string; leftDesc: string }> = {
    username: {
      title: "Lupa Password?",
      subtitle: "Masukkan username untuk menerima kode OTP",
      leftDesc: "Masukkan username Anda yang terdaftar. Kami akan mengirimkan kode OTP ke email Anda.",
    },
    otp: {
      title: "Verifikasi OTP",
      subtitle: "Masukkan kode 6 digit dari email Anda",
      leftDesc: "Buka email dari SiSurat, lalu masukkan kode OTP. Kode berlaku 15 menit.",
    },
    password: {
      title: "Password Baru",
      subtitle: "Masukkan password baru Anda",
      leftDesc: "Buat password baru yang kuat. Minimal 8 karakter.",
    },
  }

  const info2 = stepInfo[step]

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "Inter, sans-serif", background: "#F1F5F9" }}>
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 p-12" style={{ background: "#0F172A" }}>
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#2563EB" }}>
              <IconMail />
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">SiSurat</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">Reset<br />Password Anda</h1>
          <p className="text-slate-400 leading-relaxed" style={{ fontSize: "0.9375rem" }}>{info2.leftDesc}</p>
        </div>
        <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.06)" }}>
          <p className="text-slate-400 text-sm leading-relaxed">Jika Anda tidak menerima email dalam 5 menit, periksa folder spam atau hubungi administrator sistem.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-1">{info2.title}</h2>
              <p className="text-slate-500 text-sm">{info2.subtitle}</p>
            </div>

            {step === "username" && (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Masukkan username Anda" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-900 text-sm placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>
                {error && (<div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-300"><span className="text-red-700 text-sm">{error}</span></div>)}
                <button type="submit" disabled={loading || !username} className="w-full py-2.5 rounded-lg font-semibold text-white text-sm transition-all" style={{ background: loading || !username ? "#93C5FD" : "#2563EB", cursor: loading || !username ? "not-allowed" : "pointer" }}>
                  {loading ? "Mengirim..." : "Kirim OTP"}
                </button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                {info && (
                  <div className="px-4 py-3 rounded-lg bg-blue-50 border border-blue-200">
                    <span className="text-blue-800 text-sm">{info}</span>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Kode OTP</label>
                  <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="6 digit kode" maxLength={6} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-900 text-sm placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 tracking-widest text-center text-lg font-mono" />
                </div>
                {error && (<div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-300"><span className="text-red-700 text-sm">{error}</span></div>)}
                <button type="submit" disabled={loading || otp.length !== 6} className="w-full py-2.5 rounded-lg font-semibold text-white text-sm transition-all" style={{ background: loading || otp.length !== 6 ? "#93C5FD" : "#2563EB", cursor: loading || otp.length !== 6 ? "not-allowed" : "pointer" }}>
                  {loading ? "Memverifikasi..." : "Lanjut"}
                </button>
                <div className="flex gap-3">
                  <button type="button" onClick={handleResend} disabled={loading} className="flex-1 text-center text-sm font-medium py-2 rounded-lg border border-slate-200" style={{ color: "#2563EB" }}>
                    Kirim ulang
                  </button>
                  <button type="button" onClick={() => { setStep("username"); setError(""); setInfo(""); setOtp("") }} className="flex-1 text-center text-sm font-medium py-2" style={{ color: "#64748B" }}>
                    ← Kembali
                  </button>
                </div>
              </form>
            )}

            {step === "password" && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Password Baru</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Masukkan password baru" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-900 text-sm placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  <PasswordValidationLabel message={passwordValidation.message} color={passwordValidation.color} icon={passwordValidation.icon} isEmpty={passwordValidation.isEmpty} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Konfirmasi Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulangi password baru" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-900 text-sm placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>
                {error && (<div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-300"><span className="text-red-700 text-sm">{error}</span></div>)}
                <button type="submit" disabled={loading || !newPassword || !confirmPassword} className="w-full py-2.5 rounded-lg font-semibold text-white text-sm transition-all" style={{ background: loading || !newPassword || !confirmPassword ? "#93C5FD" : "#2563EB", cursor: loading || !newPassword || !confirmPassword ? "not-allowed" : "pointer" }}>
                  {loading ? "Menyimpan..." : "Ubah Password"}
                </button>
                <button type="button" onClick={() => { setStep("otp"); setError(""); setNewPassword(""); setConfirmPassword("") }} className="w-full text-center text-sm font-medium" style={{ color: "#2563EB" }}>
                  ← Kembali
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <button onClick={onBack} className="text-sm font-medium" style={{ color: "#2563EB" }}>← Kembali ke Login</button>
            </div>
          </div>
          <p className="text-center text-xs text-slate-400 mt-6">© 2026 SiSurat — Sistem Manajemen Surat Digital</p>
        </div>
      </div>
    </div>
  )
}
