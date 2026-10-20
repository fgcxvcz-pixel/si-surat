const BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "")
const ORIGIN = BASE.replace(/\/api$/, "") || window.location.origin

export function getToken() {
  return localStorage.getItem("token") || ""
}

export function setToken(token: string) {
  localStorage.setItem("token", token)
}

export function clearAuthStorage() {
  localStorage.removeItem("token")
  localStorage.removeItem("isAuthed")
  localStorage.removeItem("userInfo")
  localStorage.removeItem("currentPage")
}

export async function http<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (res.status === 401) {
    const hadToken = !!getToken()
    clearAuthStorage()
    if (hadToken) {
      window.dispatchEvent(new Event("auth:expired"))
    }
  }
  const text = await res.text()
  let data: any = null
  if (text) {
    try { data = JSON.parse(text) } catch { data = { error: text } }
  }
  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data as T
}

export function apiUrl() {
  return BASE
}

export function apiOrigin() {
  return ORIGIN
}

export function resolveFileUrl(path: string): string {
  if (!path) return ""
  if (path.startsWith("http") || path.startsWith("data:") || path.startsWith("blob:")) return path
  if (path.startsWith("/uploads/")) return `${ORIGIN}${path}`
  return `${ORIGIN}/uploads/${encodeURIComponent(path)}`
}
