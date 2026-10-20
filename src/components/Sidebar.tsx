import { type Page, isSuperAdmin, isKepalaRole, isAdminRole } from "../lib/constants"
import { IconDashboard, IconInbox, IconPaperPlane, IconUsers, IconFolder, IconPanelLeft, IconLogout, IconMail, IconPenTool, IconAllMail, IconAuditLog } from "./Icons"

export function Sidebar({
  page,
  setPage,
  onLogout,
  collapsed,
  onToggle,
  user,
}: {
  page: Page
  setPage: (p: Page) => void
  onLogout: () => void
  collapsed: boolean
  onToggle: () => void
  user: { name: string; role: string; avatar: string }
}) {
  const isKepala = isKepalaRole(user.role)
  const isSuper = isSuperAdmin(user.role)
  const isAdmin = isAdminRole(user.role)

  const nav = [
    { id: "dashboard" as Page, label: "Dashboard", icon: <IconDashboard /> },
    { id: "surat-masuk" as Page, label: "Surat Masuk", icon: <IconInbox /> },
    { id: "surat-keluar" as Page, label: "Surat Keluar", icon: <IconPaperPlane /> },
    ...(isSuper ? [
      { id: "manajemen-akun" as Page, label: "Manajemen Akun", icon: <IconUsers /> },
      { id: "master-data" as Page, label: "Master Data", icon: <IconFolder /> },
      { id: "tanda-tangan" as Page, label: "Tanda Tangan", icon: <IconPenTool /> },
    ] : isKepala ? [
      { id: "tanda-tangan" as Page, label: "Tanda Tangan", icon: <IconPenTool /> },
    ] : [
      { id: "manajemen-akun" as Page, label: "Manajemen Akun", icon: <IconUsers /> },
      { id: "master-data" as Page, label: "Master Data", icon: <IconFolder /> },
    ]),
    { id: "rekap-surat" as Page, label: "Rekap Surat", icon: <IconAllMail /> },
    ...(isSuper || isAdmin ? [
      { id: "audit-logs" as Page, label: "Audit Log", icon: <IconAuditLog /> },
    ] : []),
  ]

  const w = collapsed ? "64px" : "240px"

  return (
    <aside
      className="flex flex-col h-screen flex-shrink-0 relative"
      style={{
        width: w,
        minWidth: w,
        background: "#0F172A",
        fontFamily: "Inter, sans-serif",
        transition: "width 220ms cubic-bezier(0.4,0,0.2,1), min-width 220ms cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={onToggle}
        title={collapsed ? "Perluas sidebar" : "Perkecil sidebar"}
        className="absolute top-4 right-3 z-10 w-7 h-7 rounded-md flex items-center justify-center transition-colors"
        style={{ color: "#64748B", background: "rgba(255,255,255,0.06)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
      >
        <IconPanelLeft />
      </button>

      <div className="px-4 py-5 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#2563EB" }}>
            <IconMail />
          </div>
          {!collapsed && (
            <div className="overflow-hidden" style={{ opacity: collapsed ? 0 : 1, transition: "opacity 150ms" }}>
              <div className="text-white font-bold text-sm tracking-tight whitespace-nowrap">SiSurat</div>
              <div className="text-slate-500 text-xs">v2.4.1</div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: "#2563EB" }} title={collapsed ? user.name : undefined}>
            {user.avatar}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-white text-sm font-medium truncate">{user.name}</div>
              <div className="text-slate-500 text-xs truncate">{user.role}</div>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-hidden">
        {!collapsed && (
          <div className="text-slate-600 text-xs font-medium px-2 mb-2 uppercase tracking-widest whitespace-nowrap">Menu Utama</div>
        )}
        {nav.map((item) => {
          const active = page === item.id
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              title={collapsed ? item.label : undefined}
              className="w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all text-left"
              style={{
                padding: collapsed ? "10px" : "10px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                background: active ? "rgba(37,99,235,0.15)" : "transparent",
                color: active ? "#60A5FA" : "#94A3B8",
              }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)" }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
            >
              <span className="flex-shrink-0" style={{ color: active ? "#60A5FA" : "#64748B" }}>{item.icon}</span>
              {!collapsed && <span className="flex-1 whitespace-nowrap">{item.label}</span>}
              {!collapsed && (item as any).badge && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "#EF4444", color: "white", fontSize: "10px" }}>{(item as any).badge}</span>
              )}
              {collapsed && (item as any).badge && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: "#EF4444" }} />
              )}
            </button>
          )
        })}
      </nav>

      <div className="px-2 py-4 border-t flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <button
          onClick={onLogout}
          title={collapsed ? "Keluar" : undefined}
          className="w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all"
          style={{ padding: collapsed ? "10px" : "10px 12px", justifyContent: collapsed ? "center" : "flex-start", color: "#64748B" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)"; (e.currentTarget as HTMLButtonElement).style.color = "#FCA5A5" }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#64748B" }}
        >
          <span className="flex-shrink-0"><IconLogout /></span>
          {!collapsed && <span>Keluar</span>}
        </button>
      </div>
    </aside>
  )
}
