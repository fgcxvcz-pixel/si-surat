import { useState } from "react"
import { IconPanelRight, IconAllMail, IconFolder, IconFolderOpen, IconChevronRight, IconPlus, IconMinus } from "./Icons"

export interface FolderItem {
  key: string
  label: string
  count: number
  color: string
}

export function FolderPanel({
  title,
  folders,
  selected,
  onSelect,
  month,
  onMonthChange,
  onAddFolder,
  onDeleteWithConfirm,
  totalCount,
}: {
  title: string
  folders: FolderItem[]
  selected: string
  onSelect: (k: string) => void
  month: string
  onMonthChange: (m: string) => void
  onAddFolder?: () => void
  onDeleteWithConfirm?: (key: string) => void
  totalCount?: number
}) {
  const [groupExpanded, setGroupExpanded] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  const w = collapsed ? "48px" : "224px"
  const allCount = totalCount ?? folders.reduce((a, f) => a + f.count, 0)

  return (
    <aside
      className="flex-shrink-0 h-full border-r border-slate-200 bg-white flex flex-col relative"
      style={{
        width: w,
        minWidth: w,
        fontFamily: "Inter, sans-serif",
        transition: "width 200ms cubic-bezier(0.4,0,0.2,1), min-width 200ms cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
      }}
    >
      <div className="flex items-center justify-between px-3 py-3.5 border-b border-slate-100 flex-shrink-0" style={{ minHeight: "52px" }}>
        {!collapsed && (
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">{title}</p>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Perluas panel folder" : "Perkecil panel folder"}
          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ color: "#94A3B8", background: "transparent", marginLeft: collapsed ? "auto" : "0" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <IconPanelRight />
        </button>
      </div>

      {collapsed ? (
        <div className="flex flex-col items-center gap-1 py-3 px-1.5 overflow-y-auto flex-1">
          <button
            onClick={() => onSelect("__all__")}
            title="Semua"
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors relative"
            style={{ background: selected === "__all__" ? "#EFF6FF" : "transparent", color: selected === "__all__" ? "#2563EB" : "#94A3B8" }}
            onMouseEnter={(e) => { if (selected !== "__all__") (e.currentTarget as HTMLButtonElement).style.background = "#F8FAFC" }}
            onMouseLeave={(e) => { if (selected !== "__all__") (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
          >
            <IconAllMail />
            <span className="absolute -top-1 -right-1 text-xs font-bold flex items-center justify-center rounded-full" style={{ background: "#DBEAFE", color: "#2563EB", fontSize: "9px", minWidth: "16px", height: "16px", padding: "0 3px" }}>{allCount}</span>
          </button>
          <div className="w-full h-px my-1" style={{ background: "#F1F5F9" }} />
          {folders.map((f) => (
            <button
              key={f.key}
              onClick={() => onSelect(f.key)}
              title={f.label}
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors relative"
              style={{ background: selected === f.key ? "#EFF6FF" : "transparent", color: selected === f.key ? "#2563EB" : f.color }}
              onMouseEnter={(e) => { if (selected !== f.key) (e.currentTarget as HTMLButtonElement).style.background = "#F8FAFC" }}
              onMouseLeave={(e) => { if (selected !== f.key) (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
            >
              {selected === f.key ? <IconFolderOpen /> : <IconFolder />}
              <span className="absolute -top-1 -right-1 text-xs font-bold flex items-center justify-center rounded-full" style={{ background: "#F1F5F9", color: "#94A3B8", fontSize: "9px", minWidth: "16px", height: "16px", padding: "0 3px" }}>{f.count}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 pt-3">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Filter Bulan</label>
            <input type="month" value={month} onChange={(e) => onMonthChange(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white" style={{ fontFamily: "Inter, sans-serif" }} />
          </div>
          <div className="px-3 pt-3 flex items-center">
            <button
              onClick={() => onSelect("__all__")}
              className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{ background: selected === "__all__" ? "#EFF6FF" : "transparent", color: selected === "__all__" ? "#2563EB" : "#475569", fontWeight: selected === "__all__" ? 600 : 400 }}
              onMouseEnter={(e) => { if (selected !== "__all__") (e.currentTarget as HTMLButtonElement).style.background = "#F8FAFC" }}
              onMouseLeave={(e) => { if (selected !== "__all__") (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
            >
              <span style={{ color: selected === "__all__" ? "#2563EB" : "#94A3B8" }}><IconAllMail /></span>
              <span className="flex-1 text-left whitespace-nowrap">Semua</span>
            </button>
            <span className="flex items-center justify-end gap-1 flex-shrink-0 w-[60px] pr-1">
              <span className="inline-flex items-center justify-center text-xs font-medium px-1 rounded-full flex-shrink-0 leading-none" style={{ width: "26px", height: "20px", background: selected === "__all__" ? "#DBEAFE" : "#F1F5F9", color: selected === "__all__" ? "#2563EB" : "#64748B" }}>{allCount}</span>
            </span>
          </div>

          <div className="px-3 pt-3 pb-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <button onClick={() => setGroupExpanded((e) => !e)} className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-semibold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                <span style={{ display: "inline-block", transform: groupExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 150ms" }}><IconChevronRight /></span>
                Folder
              </button>
              {onAddFolder && (
                <button onClick={onAddFolder} title="Tambah folder" className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors flex-shrink-0">
                  <IconPlus />
                </button>
              )}
            </div>

            {groupExpanded && (
              <div className="space-y-0.5">
                {folders.map((f) => (
                  <div key={f.key} className="group flex items-center rounded-lg" style={{ background: selected === f.key ? "#EFF6FF" : "transparent" }}>
                    <button
                      onClick={() => onSelect(f.key)}
                      className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
                      style={{ background: "transparent", color: selected === f.key ? "#2563EB" : "#475569", fontWeight: selected === f.key ? 600 : 400 }}
                      onMouseEnter={(e) => { if (selected !== f.key) (e.currentTarget as HTMLButtonElement).style.background = "#F8FAFC" }}
                      onMouseLeave={(e) => { if (selected !== f.key) (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                    >
                      <span style={{ color: selected === f.key ? "#2563EB" : f.color }}>{selected === f.key ? <IconFolderOpen /> : <IconFolder />}</span>
                      <span className="flex-1 text-left truncate">{f.label}</span>
                    </button>
                    <span className="flex items-center justify-end gap-1 flex-shrink-0 w-[60px] pr-1">
                      {onDeleteWithConfirm && (
                        <button onClick={() => onDeleteWithConfirm(f.key)} title="Hapus folder" className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:bg-red-100 hover:text-red-600 transition-all flex-shrink-0">
                          <IconMinus />
                        </button>
                      )}
                      <span className="inline-flex items-center justify-center text-xs font-medium px-1 rounded-full flex-shrink-0 leading-none" style={{ width: "26px", height: "20px", background: selected === f.key ? "#DBEAFE" : "#F1F5F9", color: selected === f.key ? "#2563EB" : "#94A3B8" }}>{f.count}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
