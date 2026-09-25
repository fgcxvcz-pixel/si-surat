import { ModalTambahSurat } from "../components/modals/ModalTambahSurat"

// ── Tambah Surat Keluar (Full Page - Tindak Lanjut) ──────────────────────────
export function TambahSuratKeluarPage({
  initialData,
  onClose,
  onSaved,
  folderList,
}: {
  initialData: any
  onClose: () => void
  onSaved?: () => void
  folderList?: string[]
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#F8FAFC", fontFamily: "Inter, sans-serif" }}>
      <ModalTambahSurat
        type="keluar"
        onClose={onClose}
        onSaved={onSaved}
        folderList={folderList}
        initialData={initialData}
        inline
      />
    </div>
  )
}
