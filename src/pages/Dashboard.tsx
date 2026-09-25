import React, { useState } from "react"
import { fetchSuratMasuk, fetchSuratKeluar } from "../lib/api"
import { inMonth } from "../lib/constants"
import { TopBar } from "../components/TopBar"
import { IconMailIn, IconMailOut, IconMailStack } from "../components/Icons"

// ── Rekap Periodik (rekap volume surat per periode) ──────────────────────────
type RekapRow = { periode: string; masuk: number; keluar: number; selesai: number }

const COLS = [
  { key: "masuk", label: "Total Surat Masuk", color: "#2563EB", bg: "#EFF6FF" },
  { key: "keluar", label: "Total Surat Keluar", color: "#059669", bg: "#ECFDF5" },
]

function exportToCSV(periode: string, data: RekapRow[]) {
  const header = ["Periode", "Surat Masuk", "Surat Keluar", "Total"]
  const rows = data.map((r) => [
    r.periode,
    r.masuk,
    r.keluar,
    r.masuk + r.keluar,
  ])
  const totalRow = [
    "TOTAL",
    data.reduce((s, r) => s + r.masuk, 0),
    data.reduce((s, r) => s + r.keluar, 0),
    data.reduce((s, r) => s + r.masuk + r.keluar, 0),
  ]
  const csv = [header, ...rows, totalRow].map((r) => r.join(";")).join("\n")
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `Rekap_Surat_${periode.replace(/ /g, "_")}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportSuratToCSV(filename: string, data: any[], fields: string[]) {
  const header = fields.join(",")
  const rows = data.map((r) =>
    fields
      .map((f) => {
        let v = r[f]
        if (v instanceof Date || (typeof v === "string" && !isNaN(Date.parse(v)))) {
          v = new Date(v).toLocaleDateString("id-ID")
        }
        return `"${String(v ?? "").replace(/"/g, '""')}"`
      })
      .join(","),
  )
  const csv = [header, ...rows].join("\n")
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const PERIODE_KEYS = ["Minggu Ini", "Bulan Ini", "Kuartal Ini"] as const
type PeriodeKey = (typeof PERIODE_KEYS)[number]

const WEEK_DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]

function buildRekap(periode: PeriodeKey, masuk: any[], keluar: any[]): RekapRow[] {
  const rows = new Map<string, { masuk: number; keluar: number; selesai: number }>()
  const bump = (key: string, sec: "masuk" | "keluar" | "selesai") => {
    const r = rows.get(key) || { masuk: 0, keluar: 0, selesai: 0 }
    r[sec] += 1
    rows.set(key, r)
  }

  const now = new Date()
  const weekKey = (d: Date) => {
    const diff = (d.getDay() + 6) % 7
    const monday = new Date(d)
    monday.setDate(d.getDate() - diff)
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`
  }
  const inMonth = (d: Date) =>
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()

  for (const s of masuk) {
    const d = new Date(s.tanggal_terima || s.created_at)
    if (isNaN(d.getTime())) continue
    if (periode === "Minggu Ini") {
      if (weekKey(d) !== weekKey(now)) continue
      bump(["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"][(d.getDay() + 6) % 7], "masuk")
      if (s.status_tindak_lanjut === "selesai") rows.get(["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"][(d.getDay() + 6) % 7])!.selesai += 1
    } else if (periode === "Bulan Ini") {
      if (!inMonth(d)) continue
      bump(`Minggu ${Math.ceil(d.getDate() / 7)}`, "masuk")
      if (s.status_tindak_lanjut === "selesai") rows.get(`Minggu ${Math.ceil(d.getDate() / 7)}`)!.selesai += 1
    } else {
      if (d.getFullYear() !== now.getFullYear()) continue
      bump(d.toLocaleDateString("id-ID", { month: "long" }), "masuk")
      if (s.status_tindak_lanjut === "selesai") rows.get(d.toLocaleDateString("id-ID", { month: "long" }))!.selesai += 1
    }
  }

  for (const s of keluar) {
    const d = new Date(s.tanggal_kirim || s.created_at)
    if (isNaN(d.getTime())) continue
    if (periode === "Minggu Ini") {
      if (weekKey(d) !== weekKey(now)) continue
      bump(["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"][(d.getDay() + 6) % 7], "keluar")
      if (s.status_approval === "disetujui") rows.get(["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"][(d.getDay() + 6) % 7])!.selesai += 1
    } else if (periode === "Bulan Ini") {
      if (!inMonth(d)) continue
      bump(`Minggu ${Math.ceil(d.getDate() / 7)}`, "keluar")
      if (s.status_approval === "disetujui") rows.get(`Minggu ${Math.ceil(d.getDate() / 7)}`)!.selesai += 1
    } else {
      if (d.getFullYear() !== now.getFullYear()) continue
      bump(d.toLocaleDateString("id-ID", { month: "long" }), "keluar")
      if (s.status_approval === "disetujui") rows.get(d.toLocaleDateString("id-ID", { month: "long" }))!.selesai += 1
    }
  }

  if (periode === "Minggu Ini") {
    return WEEK_DAYS.map((p) => rows.get(p) || { masuk: 0, keluar: 0, selesai: 0 })
      .map((r, i) => ({ periode: WEEK_DAYS[i], ...r }))
  }

  if (periode === "Bulan Ini") {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const totalWeeks = Math.ceil(daysInMonth / 7)
    const ALL_WEEKS = Array.from({ length: totalWeeks }, (_, i) => `Minggu ${i + 1}`)
    return ALL_WEEKS.map((p) => rows.get(p) || { masuk: 0, keluar: 0, selesai: 0 })
      .map((r, i) => ({ periode: ALL_WEEKS[i], ...r }))
  }

  if (periode === "Kuartal Ini") {
    const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
    return MONTHS.map((p) => rows.get(p) || { masuk: 0, keluar: 0, selesai: 0 })
      .map((r, i) => ({ periode: MONTHS[i], ...r }))
  }

  const sorted = Array.from(rows.entries()).sort((a, b) => {
    const numA = parseInt(a[0].replace(/\D/g, "")) || 1
    const numB = parseInt(b[0].replace(/\D/g, "")) || 1
    return numA - numB
  })
  return sorted.map(([periode, r]) => ({ periode, ...r }))
}

function RekapPeriodik() {
  const [periode, setPeriode] = useState<PeriodeKey>("Bulan Ini")
  const [suratMasuk, setSuratMasuk] = useState<any[]>([])
  const [suratKeluar, setSuratKeluar] = useState<any[]>([])

  React.useEffect(() => {
    const fetchAll = async () => {
      try {
        const [mj, kj] = await Promise.all([fetchSuratMasuk(), fetchSuratKeluar()])
        setSuratMasuk(mj)
        setSuratKeluar(kj)
      } catch (err) {
        console.error("Error fetching rekap:", err)
      }
    }
    fetchAll()
  }, [])

  const data = buildRekap(periode, suratMasuk, suratKeluar)

  const totals = {
    masuk: data.reduce((s, r) => s + r.masuk, 0),
    keluar: data.reduce((s, r) => s + r.keluar, 0),
  }

  return (
    <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 text-sm">
            Rekap Periodik
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Volume surat berdasarkan periode
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {PERIODE_KEYS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriode(p)}
                className="px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap"
                style={{
                  background: periode === p ? "white" : "transparent",
                  color: periode === p ? "#0F172A" : "#64748B",
                  boxShadow:
                    periode === p ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => exportToCSV(periode, data)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Ekspor Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full">
          <thead>
            <tr style={{ background: "#F8FAFC" }}>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Periode
              </th>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider"
                >
                  {c.label}
                </th>
              ))}
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((row, i) => {
              const total = row.masuk + row.keluar
              return (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-slate-700">
                    {row.periode}
                  </td>
                  {COLS.map((c) => (
                    <td key={c.key} className="px-6 py-3 text-right">
                      <span
                        className="text-sm font-semibold"
                        style={{
                          color: c.color,
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        {row[(c.key as keyof typeof row)]}
                      </span>
                    </td>
                  ))}
                  <td className="px-6 py-3 text-right">
                    <span
                      className="text-sm font-bold text-slate-800"
                      style={{ fontFamily: "JetBrains Mono, monospace" }}
                    >
                      {total}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr
              style={{ background: "#F8FAFC", borderTop: "2px solid #E2E8F0" }}
            >
              <td className="px-6 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">
                Total
              </td>
              {COLS.map((c) => (
                <td key={c.key} className="px-6 py-3 text-right">
                  <span
                    className="text-sm font-bold"
                    style={{
                      color: c.color,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {totals[(c.key as keyof typeof totals)]}
                  </span>
                </td>
              ))}
              <td className="px-6 py-3 text-right">
                <span
                  className="text-sm font-bold text-slate-900"
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  {totals.masuk + totals.keluar}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}


// ── Dashboard ────────────────────────────────────────────────────────────────
export function Dashboard({ onNavigate }: { onNavigate?: (page: any, suratId?: string) => void }) {
  const [masukCount, setMasukCount] = useState(0)
  const [keluarCount, setKeluarCount] = useState(0)
  const [balasanCount, setBalasanCount] = useState(0)

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const [mj, kj] = await Promise.all([fetchSuratMasuk(), fetchSuratKeluar()])
        const now = new Date()
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
        const masukBulanIni = mj.filter((s: any) => inMonth(s.tanggal_terima, thisMonth))
        const keluarBulanIni = kj.filter((s: any) => inMonth(s.tanggal_kirim, thisMonth))
        const balasanBulanIni = keluarBulanIni.filter((s: any) => s.id_surat_masuk_ref)
        setMasukCount(masukBulanIni.length)
        setKeluarCount(keluarBulanIni.length)
        setBalasanCount(balasanBulanIni.length)
      } catch (err) {
        console.error("Error fetching stats:", err)
      }
    }
    fetchStats()
  }, [])

  const stats = [
    {
      label: "Surat Masuk",
      value: String(masukCount),
      delta: "Bulan Ini",
      color: "#DC2626",
      bg: "#FEF2F2",
      icon: <IconMailIn />,
    },
    {
      label: "Total Surat Keluar",
      value: String(keluarCount),
      delta: "Bulan Ini",
      color: "#059669",
      bg: "#ECFDF5",
      icon: <IconMailOut />,
    },
    {
      label: "Surat Balasan",
      value: String(balasanCount),
      delta: "Bulan Ini",
      color: "#2563EB",
      bg: "#EFF6FF",
      icon: <IconMailStack />,
    },
  ]

  // Generate dynamic subtitle
  const getDayName = (date: Date) => {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
    return days[date.getDay()]
  }

  const getGreeting = (hour: number) => {
    if (hour < 12) return "Selamat pagi"
    if (hour < 15) return "Selamat siang"
    if (hour < 18) return "Selamat sore"
    return "Selamat malam"
  }

  const now = new Date()
  const dayName = getDayName(now)
  const dateFormatted = now.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const userInfo = localStorage.getItem("userInfo")
  const userName = userInfo ? JSON.parse(userInfo).name : "Pengguna"
  const greeting = getGreeting(now.getHours())
  const subtitle = `${dayName}, ${dateFormatted} — ${greeting}, ${userName}!`

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ background: "#F8FAFC", fontFamily: "Inter, sans-serif" }}
    >
      <TopBar
        title="Dashboard"
        subtitle={subtitle}
        onNavigate={onNavigate}
      />

      {/* Bell Dropdown sudah di TopBar */}

      <div className="p-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-6"
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-slate-500 text-sm font-medium">
                  {stat.label}
                </p>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: stat.bg, color: stat.color }}
                >
                  {stat.icon}
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span
                  className="text-4xl font-bold"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: stat.color }}
                >
                  {stat.delta}
                </span>
              </div>
              <div
                className="h-1 rounded-full"
                style={{ background: stat.bg }}
              />
            </div>
          ))}
        </div>

        {/* Rekap Periodik */}
        <RekapPeriodik />
      </div>
    </div>
  )
}
