import { resolveFileUrl } from "./http"
import { fetchJenisSurat, fetchJenisSuratWithKode, fetchKategori } from "./api"

// ── Types ────────────────────────────────────────────────────────────────────
export type Page = "login" | "lupa-password" | "dashboard" | "surat-masuk" | "surat-keluar" | "manajemen-akun" | "master-data" | "tanda-tangan" | "rekap-surat" | "audit-logs" | "edit-surat" | "tambah-surat-keluar" | "success"

// ── Helpers ──────────────────────────────────────────────────────────────────
export const currentMonthKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export const inMonth = (dateStr: string | undefined, month: string) => {
  const t = dateStr ? new Date(dateStr) : null
  if (!t || isNaN(t.getTime())) return false
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}` === month
}

export const inDateRange = (dateStr: string | undefined, from: string, to: string) => {
  const t = dateStr ? new Date(dateStr) : null
  if (!t || isNaN(t.getTime())) return false
  if (from) {
    const f = new Date(from)
    if (t < f) return false
  }
  if (to) {
    const end = new Date(to)
    end.setHours(23, 59, 59, 999)
    if (t > end) return false
  }
  return true
}

export const isSuperAdmin = (role: string | null | undefined) =>
  role === "Super Admin" || role?.includes("Super Admin") || false

export const isKepalaRole = (role: string | null | undefined) =>
  role === "Kepala" || role === "Kepala Bagian" || role?.includes("Kepala") || false

export const isAdminRole = (role: string | null | undefined) =>
  role === "Admin" || role === "Super Admin" || role?.includes("Admin") || false

export const getReminderStatusForRole = (role: string | null | undefined) => {
  if (isAdminRole(role)) return ["menunggu_dibuat", "menunggu_approval"]
  if (isKepalaRole(role)) return ["menunggu_approval"]
  return ["menunggu"]
}

export const getCurrentUserId = (): string => {
  const saved = localStorage.getItem("userInfo")
  if (saved) {
    const u = JSON.parse(saved)
    if (u.id) return u.id
  }
  return ""
}

export const fileApiUrl = (p: string) => resolveFileUrl(p)

export function canManageFolder(): boolean {
  try {
    const saved = localStorage.getItem("userInfo")
    const role: string = saved ? JSON.parse(saved).role : ""
    return role === "Admin" || role === "Super Admin" || role.includes("Super Admin")
  } catch {
    return false
  }
}

// ── Nomor Surat Constants ───────────────────────────────────────────────────
export const BULAN_ROMAWI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]

// ── Master Data Cache ────────────────────────────────────────────────────────
let _jenisMasukCache: string[] = []
let _jenisKeluarCache: string[] = []
let _kategoriCache: string[] = []
let _kodeMapCache: Record<string, string> = {}
let _loaded = false

export async function loadMasterDataCache() {
  const [jm, jk, k, jmKode, jkKode] = await Promise.all([
    fetchJenisSurat("masuk"),
    fetchJenisSurat("keluar"),
    fetchKategori(),
    fetchJenisSuratWithKode("masuk"),
    fetchJenisSuratWithKode("keluar"),
  ])
  _jenisMasukCache = jm
  _jenisKeluarCache = jk
  _kategoriCache = k
  _kodeMapCache = {}
  for (const item of [...jmKode, ...jkKode]) {
    if (item.kode) _kodeMapCache[item.nama] = item.kode
  }
  _loaded = true
}

export function isMasterDataLoaded() {
  return _loaded
}

export function getJenisSuratMasukOptions(): string[] {
  return _jenisMasukCache
}

export function getJenisSuratKeluarOptions(): string[] {
  return _jenisKeluarCache
}

export function getKategoriOptions(): string[] {
  return _kategoriCache
}

export function getKodeMap(): Record<string, string> {
  return _kodeMapCache
}
