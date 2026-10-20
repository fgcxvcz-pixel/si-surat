import React, { useState, useMemo } from "react"
import { fetchSuratKeluar, fetchSuratMasuk, fetchReminders as apiFetchReminders } from "../lib/api"
import { isSuperAdmin, isKepalaRole } from "../lib/constants"
import { IconBell, IconPendingDibalas, IconMenungguApproval, IconSelesai, IconTerlewat } from "./Icons"

export function TopBar({ title, subtitle, onNavigate, refreshTrigger }: { title: string; subtitle: string; onNavigate?: (page: any, suratId?: string) => void; refreshTrigger?: number }) {
  const userInfo = useMemo(() => {
    const saved = localStorage.getItem("userInfo")
    return saved ? JSON.parse(saved) : null
  }, [])
  const avatar = userInfo?.avatar || "P"
  const isKepala = isKepalaRole(userInfo?.role)
  const isSuper = isSuperAdmin(userInfo?.role)

  const [showDropdown, setShowDropdown] = useState(false)
  const [tindakLanjutList, setTindakLanjutList] = useState<any[]>([])
  const [reminders, setReminders] = useState<any[]>([])

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const keluarList: any[] = []
        const masukList: any[] = []

        if (isKepala || isSuper) {
          const keluarData = await fetchSuratKeluar()
          keluarData.filter((s: any) => s.status_approval === "menunggu" && s.id_user?.id !== userInfo?.id).forEach((s: any) => keluarList.push(s))
        }
        if (!isKepala || isSuper) {
          const [masukResult, allReminders] = await Promise.all([fetchSuratMasuk(), apiFetchReminders()])
          masukResult.filter((s: any) => {
            if (s.status_tindak_lanjut !== "menunggu" && s.status_tindak_lanjut !== "menunggu_approval") return false
            const reminder = allReminders.find((r: any) => {
              const rSmId = typeof r.id_surat_masuk === 'object' ? r.id_surat_masuk?.id : r.id_surat_masuk
              return rSmId === s.id
            })
            return !reminder || reminder.status !== "selesai"
          }).forEach((s: any) => masukList.push(s))
          setReminders(allReminders)
        }
        setTindakLanjutList([...keluarList, ...masukList])
      } catch (err) {
        console.error("Error fetching bell data:", err)
      }
    }
    fetchData()
  }, [refreshTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
    <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200 flex-shrink-0 relative">
      <div>
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowDropdown((v) => !v)}
          className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
          title={tindakLanjutList.length > 0 ? `${tindakLanjutList.length} ${isKepala ? 'surat menunggu persetujuan' : 'surat tindak lanjut'}` : "Tidak ada notifikasi"}
        >
          <IconBell />
          {tindakLanjutList.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
              {tindakLanjutList.length}
            </span>
          )}
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#2563EB" }}>
          {avatar}
        </div>
      </div>

      {showDropdown && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden z-50">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              {isSuper ? "Notifikasi" : isKepala ? "Menunggu Persetujuan" : "Surat Tindak Lanjut"}
            </h3>
            <button onClick={() => setShowDropdown(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
          </div>
          {tindakLanjutList.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-slate-400">
              {isSuper ? "Tidak ada notifikasi" : isKepala ? "Tidak ada surat menunggu persetujuan" : "Tidak ada surat tindak lanjut"}
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
              {tindakLanjutList.map((s) => {
                if (s.tujuan) {
                  return (
                    <div key={`keluar-${s.id}`} className="px-5 py-3 hover:bg-blue-50 transition-colors flex items-start gap-3 cursor-pointer" onClick={() => { setShowDropdown(false); onNavigate?.("surat-keluar", s.id) }}>
                      <span className="text-xs mt-0.5" ><IconMenungguApproval /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{s.tujuan}</p>
                        <p className="text-xs text-slate-500 truncate">{s.perihal}</p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0" style={{ background: "#EFF6FF", color: "#2563EB" }}>Menunggu Approval</span>
                    </div>
                  )
                } else {
                  const reminder = reminders.find((r: any) => {
                    const rSmId = typeof r.id_surat_masuk === 'object' ? r.id_surat_masuk?.id : r.id_surat_masuk
                    return rSmId === s.id
                  })
                  const isDone = reminder && reminder.status === 'selesai'
                  const isOverdue = reminder && !isDone && new Date(reminder.tanggal_batas) < new Date()
                  let badge

                  if (isDone) {
                    badge = { icon: <IconSelesai />, label: "Selesai", bg: "#ECFDF5", color: "#059669" }
                  } else if (isOverdue) {
                    badge = { icon: <IconTerlewat />, label: "Terlewat", bg: "#FEF2F2", color: "#DC2626" }
                  } else if (s.status_tindak_lanjut === "menunggu_approval") {
                    badge = { icon: <IconMenungguApproval />, label: "Menunggu Approval", bg: "#EFF6FF", color: "#2563EB" }
                  } else if (s.status_tindak_lanjut === "menunggu" ) {
                    badge = { icon: <IconPendingDibalas />, label: "Menunggu Dibalas", bg: "#FEF3C7", color: "#D97706" }
                  } else if (s.status_tindak_lanjut === "menunggu" ) {
                    badge = { icon: <IconMenungguApproval />, label: "Menunggu Approval", bg: "#EFF6FF", color: "#2563EB" }
                  } else {
                    badge = { icon: <IconPendingDibalas />, label: "Menunggu", bg: "#FEF3C7", color: "#D97706" }
                  }
                  return (
                    <div key={`masuk-${s.id}`} className="px-5 py-3 hover:bg-blue-50 transition-colors flex items-start gap-3 cursor-pointer" onClick={() => { setShowDropdown(false); onNavigate?.("surat-masuk", s.id) }}>
                      <span className="text-xs mt-0.5">{badge.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{s.pengirim}</p>
                        <p className="text-xs text-slate-500 truncate">{s.perihal}</p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                    </div>
                  )
                }
              })}
            </div>
          )}
        </div>
      )}
    </div>
    </>
  )
}
