import { useState, useMemo } from "react"
import { TopBar } from "../components/TopBar"
import { fetchSuratMasuk, fetchSuratKeluar } from "../lib/api"
import { openPrintRekap } from "./PrintRekapSurat"

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function getDayName(year: number, month: number, day: number) {
  return HARI[new Date(year, month - 1, day).getDay()]
}

function isWeekend(year: number, month: number, day: number) {
  const d = new Date(year, month - 1, day).getDay()
  return d === 0 || d === 6
}

export function RekapSurat({ onNavigate }: { onNavigate?: (page: any, suratId?: string) => void }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [smData, setSmData] = useState<any[]>([])
  const [skData, setSkData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const monthKey = `${year}-${String(month).padStart(2, "0")}`
  const daysInMonth = getDaysInMonth(year, month)

  const loadData = async () => {
    setLoading(true)
    try {
      const [sm, sk] = await Promise.all([fetchSuratMasuk(), fetchSuratKeluar()])
      setSmData(sm)
      setSkData(sk)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useMemo(() => { loadData() }, [monthKey])

  const smByDay = useMemo(() => {
    const map: Record<number, boolean> = {}
    smData.forEach((s: any) => {
      const d = s.tanggal_terima ? new Date(s.tanggal_terima) : null
      if (d && d.getFullYear() === year && d.getMonth() + 1 === month) {
        map[d.getDate()] = true
      }
    })
    return map
  }, [smData, year, month])

  const skByDay = useMemo(() => {
    const map: Record<number, boolean> = {}
    skData.forEach((s: any) => {
      const d = s.tanggal_kirim ? new Date(s.tanggal_kirim) : null
      if (d && d.getFullYear() === year && d.getMonth() + 1 === month) {
        map[d.getDate()] = true
      }
    })
    return map
  }, [skData, year, month])

  const smTotal = useMemo(() => smData.filter((s: any) => {
    const d = s.tanggal_terima ? new Date(s.tanggal_terima) : null
    return d && d.getFullYear() === year && d.getMonth() + 1 === month
  }).length, [smData, year, month])

  const skTotal = useMemo(() => skData.filter((s: any) => {
    const d = s.tanggal_kirim ? new Date(s.tanggal_kirim) : null
    return d && d.getFullYear() === year && d.getMonth() + 1 === month
  }).length, [skData, year, month])

  const handleExportCSV = () => {
    const header = ["Jenis Surat", ...Array.from({ length: daysInMonth }, (_, i) => `${String(i + 1).padStart(2, "0")} ${getDayName(year, month, i + 1)}`), "Total"]
    const rows = [
      ["Surat Masuk", ...Array.from({ length: daysInMonth }, (_, i) => smByDay[i + 1] ? "✓" : "-"), String(smTotal)],
      ["Surat Keluar", ...Array.from({ length: daysInMonth }, (_, i) => skByDay[i + 1] ? "✓" : "-"), String(skTotal)],
    ]
    const csv = [header, ...rows].map(r => r.join(";")).join("\n")
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `rekap-surat-${monthKey}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      <TopBar title="Rekap Surat" subtitle={`Rekapitulasi surat masuk & keluar bulan ${BULAN[month - 1]} ${year}`} onNavigate={onNavigate} />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white">
            {BULAN.map((b, i) => (<option key={i} value={i + 1}>{b}</option>))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white">
            {years.map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
          <div className="flex-1" />
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Excel
          </button>
          <button onClick={() => openPrintRekap({ smByDay, skByDay, smTotal, skTotal, year, month })} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
            Print
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className="h-4 bg-slate-100 rounded w-48 mx-auto animate-pulse mb-3" />
            <div className="h-4 bg-slate-100 rounded w-32 mx-auto animate-pulse" />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden" style={{ background: "#0389ff" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#090909", color: "white" }}>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider sticky left-0 z-10" style={{ minWidth: "140px", background: "#0389ff" }}>Jenis Surat</th>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1
                      const weekend = isWeekend(year, month, day)
                      return (
                        <th key={day} className="px-2 py-3 text-center text-xs font-bold" style={{ minWidth: "48px", background: weekend ? "#0389ff" : "#0389ff" }}>
                          <div>{String(day).padStart(2, "0")}</div>
                          <div className="font-normal opacity-70 text-[10px]">{getDayName(year, month, day)}</div>
                        </th>
                      )
                    })}
                    <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ minWidth: "70px", background: "#0389ff" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Surat Masuk */}
                  <tr className="border-b border-slate-200 transition-colors" style={{ background: "#0389ff" }}>
                    <td className="px-4 py-4 font-semibold text-slate-700 sticky left-0 z-10" style={{ background: "#0389ff", minWidth: "140px" }}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                        Surat Masuk
                      </div>
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1
                      const has = smByDay[day]
                      const weekend = isWeekend(year, month, day)
                      return (
                        <td key={day} className="px-2 py-4 text-center" style={weekend ? { background: "#0389ff" } : undefined}>
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-sm font-bold ${has ? "bg-red-100 text-red-600" : "text-slate-300"}`}>
                            {has ? "✓" : "–"}
                          </span>
                        </td>
                      )
                    })}
                    <td className="px-3 py-4 text-center font-bold text-red-600" style={{ background: "#0389ff", color: "#f00e0e" }}>{smTotal}</td>
                  </tr>
                  {/* Surat Keluar */}
                  <tr className="border-b border-slate-200 transition-colors" style={{ background: "#0389ff" }}>
                    <td className="px-4 py-4 font-semibold text-slate-700 sticky left-0 z-10" style={{ background: "#0389ff", minWidth: "140px" }}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                        Surat Keluar
                      </div>
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1
                      const has = skByDay[day]
                      const weekend = isWeekend(year, month, day)
                      return (
                        <td key={day} className="px-2 py-4 text-center" style={weekend ? { background: "#0389ff" } : undefined}>
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-sm font-bold ${has ? "bg-emerald-100 text-emerald-600" : "text-slate-300"}`}>
                            {has ? "✓" : "–"}
                          </span>
                        </td>
                      )
                    })}
                    <td className="px-3 py-4 text-center font-bold" style={{ background: "#0389ff", color: "#34D399" }}>{skTotal}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="px-6 py-3 border-t border-slate-100 flex flex-wrap items-center gap-5 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-red-100 text-red-600 font-bold text-[10px]">✓</span> Ada Surat Masuk
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-emerald-100 text-emerald-600 font-bold text-[10px]">✓</span> Ada Surat Keluar
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-slate-200 font-bold">–</span> Tidak ada surat
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200" /> Weekend
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
