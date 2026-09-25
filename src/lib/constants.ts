import { fetchJenisSurat, fetchJenisSuratWithKode, fetchKategori } from "./api"

// ── Types ────────────────────────────────────────────────────────────────────
export type Page = "login" | "lupa-password" | "dashboard" | "surat-masuk" | "surat-keluar" | "manajemen-akun" | "master-data" | "tanda-tangan" | "rekap-surat" | "edit-surat" | "tambah-surat-keluar" | "success"

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

export const getCurrentUserId = (): string => {
  const saved = localStorage.getItem("userInfo")
  if (saved) {
    const u = JSON.parse(saved)
    if (u.id) return u.id
  }
  return ""
}

export const fileApiUrl = (p: string) => {
  if (!p) return ""
  if (p.startsWith("http")) return p
  const FILE_SERVER = `http://${window.location.hostname}:5000`
  return `${FILE_SERVER}/uploads/${encodeURIComponent(p)}`
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
