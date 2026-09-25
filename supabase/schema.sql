-- ==========================================
-- SiSurat → Supabase Migration
-- ==========================================

-- 1. Roles
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_role TEXT NOT NULL UNIQUE,
  keterangan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Pengguna (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS pengguna (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  id_role UUID NOT NULL REFERENCES roles(id),
  nama TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Format Nomor Surat
CREATE TABLE IF NOT EXISTS format_nomor_surat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_surat TEXT NOT NULL,
  pola_format TEXT NOT NULL,
  counter_terakhir INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tanda Tangan Digital
CREATE TABLE IF NOT EXISTS tanda_tangan_digital (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user UUID NOT NULL REFERENCES pengguna(id),
  file_ttd JSONB NOT NULL,
  is_aktif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Surat Masuk
CREATE TABLE IF NOT EXISTS surat_masuk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user UUID NOT NULL REFERENCES pengguna(id),
  id_format UUID REFERENCES format_nomor_surat(id),
  id_surat_keluar_ref UUID,
  nomor_surat TEXT NOT NULL UNIQUE,
  pengirim TEXT NOT NULL,
  folder TEXT,
  perihal TEXT NOT NULL,
  isi_surat TEXT NOT NULL DEFAULT '',
  kategori TEXT NOT NULL DEFAULT 'biasa' CHECK (kategori IN ('biasa', 'penting')),
  jenis_surat TEXT NOT NULL DEFAULT '',
  tanggal_terima TIMESTAMPTZ NOT NULL,
  status_tindak_lanjut TEXT NOT NULL DEFAULT 'tidak' CHECK (status_tindak_lanjut IN ('tidak', 'menunggu', 'menunggu_approval', 'selesai')),
  file_lampiran JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_surat_masuk_tanggal ON surat_masuk(tanggal_terima DESC);
CREATE INDEX IF NOT EXISTS idx_surat_masuk_status ON surat_masuk(status_tindak_lanjut);

-- 6. Surat Keluar
CREATE TABLE IF NOT EXISTS surat_keluar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user UUID NOT NULL REFERENCES pengguna(id),
  id_format UUID REFERENCES format_nomor_surat(id),
  approved_by UUID REFERENCES pengguna(id),
  id_ttd UUID REFERENCES tanda_tangan_digital(id),
  id_surat_masuk_ref UUID,
  nomor_surat TEXT NOT NULL UNIQUE,
  tujuan TEXT NOT NULL,
  folder TEXT,
  perihal TEXT NOT NULL,
  jenis_surat TEXT NOT NULL DEFAULT 'surat tugas',
  isi_surat TEXT NOT NULL DEFAULT '',
  kategori TEXT NOT NULL DEFAULT 'biasa' CHECK (kategori IN ('biasa', 'penting')),
  tanggal_kirim TIMESTAMPTZ NOT NULL,
  status_approval TEXT NOT NULL DEFAULT 'menunggu' CHECK (status_approval IN ('menunggu', 'disetujui', 'ditolak')),
  tanggal_approval TIMESTAMPTZ,
  catatan_revisi TEXT,
  file_draft JSONB,
  file_final_ttd JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_surat_keluar_tanggal ON surat_keluar(tanggal_kirim DESC);
CREATE INDEX IF NOT EXISTS idx_surat_keluar_status ON surat_keluar(status_approval);

-- 7. Reminders
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_surat_masuk UUID NOT NULL REFERENCES surat_masuk(id),
  tanggal_batas TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'selesai', 'terlewat')),
  keterangan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Custom Folders
CREATE TABLE IF NOT EXISTS custom_folder_surat_masuk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_folder TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS custom_folder_surat_keluar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_folder TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Jenis Surat
CREATE TABLE IF NOT EXISTS jenis_surat_masuk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  kode TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jenis_surat_keluar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  kode TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Kategori (ganti localStorage)
CREATE TABLE IF NOT EXISTS kategori (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- RLS Helper Functions
-- ==========================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pengguna p
    JOIN public.roles r ON p.id_role = r.id
    WHERE p.id = auth.uid()
      AND r.nama_role = 'Admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_kepala()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pengguna p
    JOIN public.roles r ON p.id_role = r.id
    WHERE p.id = auth.uid()
      AND r.nama_role LIKE '%Kepala%'
  );
$$;

-- ==========================================
-- RPC: Generate Next Nomor Surat (anti race condition)
-- ==========================================
CREATE OR REPLACE FUNCTION public.generate_next_nomor_surat(
  p_jenis_kode TEXT,
  p_tipe TEXT DEFAULT 'keluar'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_urutan INTEGER;
  v_bulan_romawi TEXT;
  v_tahun INTEGER;
  v_bulan INTEGER;
  v_months TEXT[];
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('nomor:' || p_jenis_kode || ':' || p_tipe));

  v_bulan := EXTRACT(MONTH FROM now())::INTEGER;
  v_tahun := EXTRACT(YEAR FROM now())::INTEGER;
  v_months := ARRAY['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  v_bulan_romawi := v_months[v_bulan];

  -- Count per kode_jenis per bulan+tahun (reset each month)
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(nomor_surat, '.', 1) AS INTEGER)
  ), 0) + 1 INTO v_urutan
  FROM public.surat_keluar
  WHERE SUBSTRING(SPLIT_PART(nomor_surat, '.', 2) FROM 1 FOR 2) = lpad(p_jenis_kode, 2, '0')
    AND EXTRACT(MONTH FROM tanggal_kirim) = v_bulan
    AND EXTRACT(YEAR FROM tanggal_kirim) = v_tahun;

  RETURN lpad(v_urutan::TEXT, 3, '0') || '.' ||
         lpad(p_jenis_kode, 2, '0') ||
         '/SSI-PCT/' || v_bulan_romawi || '/' || v_tahun;
END;
$$;

-- ==========================================
-- RLS Policies
-- ==========================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengguna ENABLE ROW LEVEL SECURITY;
ALTER TABLE format_nomor_surat ENABLE ROW LEVEL SECURITY;
ALTER TABLE tanda_tangan_digital ENABLE ROW LEVEL SECURITY;
ALTER TABLE surat_masuk ENABLE ROW LEVEL SECURITY;
ALTER TABLE surat_keluar ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_folder_surat_masuk ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_folder_surat_keluar ENABLE ROW LEVEL SECURITY;
ALTER TABLE jenis_surat_masuk ENABLE ROW LEVEL SECURITY;
ALTER TABLE jenis_surat_keluar ENABLE ROW LEVEL SECURITY;
ALTER TABLE kategori ENABLE ROW LEVEL SECURITY;

-- ── SELECT: all authenticated users can read everything ──
CREATE POLICY "Authenticated read roles" ON roles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read pengguna" ON pengguna FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read format_nomor_surat" ON format_nomor_surat FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read tanda_tangan_digital" ON tanda_tangan_digital FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read surat_masuk" ON surat_masuk FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read surat_keluar" ON surat_keluar FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read reminders" ON reminders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read custom_folder_surat_masuk" ON custom_folder_surat_masuk FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read custom_folder_surat_keluar" ON custom_folder_surat_keluar FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read jenis_surat_masuk" ON jenis_surat_masuk FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read jenis_surat_keluar" ON jenis_surat_keluar FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read kategori" ON kategori FOR SELECT USING (auth.role() = 'authenticated');

-- ── Admin-only tables: roles, pengguna, format_nomor, custom_folder, jenis_surat, kategori ──
CREATE POLICY "Admin write roles" ON roles FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin write pengguna" ON pengguna FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin write format_nomor_surat" ON format_nomor_surat FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin write custom_folder_surat_masuk" ON custom_folder_surat_masuk FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin write custom_folder_surat_keluar" ON custom_folder_surat_keluar FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin write jenis_surat_masuk" ON jenis_surat_masuk FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin write jenis_surat_keluar" ON jenis_surat_keluar FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin write kategori" ON kategori FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── Tanda Tangan: owner can manage own ──
CREATE POLICY "Owner write tanda_tangan_digital" ON tanda_tangan_digital FOR ALL
  USING (id_user = auth.uid() OR public.is_admin())
  WITH CHECK (id_user = auth.uid() OR public.is_admin());

-- ── Surat Masuk: owner/admin/kepala can update, owner/admin can delete ──
CREATE POLICY "Insert surat_masuk" ON surat_masuk FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Update surat_masuk" ON surat_masuk FOR UPDATE
  USING (id_user = auth.uid() OR public.is_admin() OR public.is_kepala())
  WITH CHECK (id_user = auth.uid() OR public.is_admin() OR public.is_kepala());
CREATE POLICY "Delete surat_masuk" ON surat_masuk FOR DELETE
  USING (id_user = auth.uid() OR public.is_admin());

-- ── Surat Keluar: owner/kepala/admin can update, all authenticated can insert ──
CREATE POLICY "Insert surat_keluar" ON surat_keluar FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Update surat_keluar" ON surat_keluar FOR UPDATE
  USING (id_user = auth.uid() OR public.is_kepala() OR public.is_admin())
  WITH CHECK (id_user = auth.uid() OR public.is_kepala() OR public.is_admin());
CREATE POLICY "Delete surat_keluar" ON surat_keluar FOR DELETE
  USING (id_user = auth.uid() OR public.is_admin());

-- ── Reminder: all authenticated can manage ──
CREATE POLICY "Authenticated write reminders" ON reminders FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ==========================================
-- Trigger: Enforce approval state machine
-- ==========================================
CREATE OR REPLACE FUNCTION public.enforce_approval_transition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status_approval = 'disetujui' AND NEW.status_approval != 'disetujui' THEN
    RAISE EXCEPTION 'Cannot change status of an already approved surat';
  END IF;
  IF OLD.status_approval = 'ditolak' AND NEW.status_approval != 'ditolak' THEN
    RAISE EXCEPTION 'Cannot change status of a rejected surat';
  END IF;
  IF OLD.status_approval = 'menunggu' AND NEW.status_approval NOT IN ('disetujui', 'ditolak') THEN
    RAISE EXCEPTION 'From menunggu, only disetujui or ditolak is allowed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_approval_transition ON public.surat_keluar;
CREATE TRIGGER trg_approval_transition
  BEFORE UPDATE OF status_approval ON public.surat_keluar
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_approval_transition();

-- ==========================================
-- RPC: Reset Database (fresh start)
-- ==========================================
CREATE OR REPLACE FUNCTION public.reset_database()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.reminders WHERE true;
  DELETE FROM public.surat_keluar WHERE true;
  DELETE FROM public.surat_masuk WHERE true;
  DELETE FROM public.format_nomor_surat WHERE true;
  DELETE FROM public.custom_folder_surat_masuk WHERE true;
  DELETE FROM public.custom_folder_surat_keluar WHERE true;

  -- Keep admin, kepalas, and TTD
  DELETE FROM public.pengguna WHERE username NOT IN ('admin', 'taufik');

  INSERT INTO custom_folder_surat_masuk (nama_folder) VALUES ('Instansi'), ('Lembaga'), ('Perorangan')
  ON CONFLICT DO NOTHING;
  INSERT INTO custom_folder_surat_keluar (nama_folder) VALUES ('Instansi'), ('Lembaga'), ('Perorangan')
  ON CONFLICT DO NOTHING;
END;
$$;

-- ==========================================
-- Seed Data: Roles
-- ==========================================
INSERT INTO roles (nama_role, keterangan) VALUES
  ('Admin', 'Administrator sistem dengan akses penuh'),
  ('Kepala Bagian', 'Kepala bagian umum, menyetujui surat keluar')
ON CONFLICT (nama_role) DO NOTHING;

-- Seed Data: Jenis Surat Masuk
INSERT INTO jenis_surat_masuk (nama, kode) VALUES
  ('surat masuk biasa', '01'),
  ('surat undangan', '02'),
  ('surat pemberitahuan', '03'),
  ('surat tugas', '04'),
  ('surat perintah', '05'),
  ('surat rekomendasi', '06'),
  ('surat izin', '07')
ON CONFLICT DO NOTHING;

-- Seed Data: Jenis Surat Keluar
INSERT INTO jenis_surat_keluar (nama, kode) VALUES
  ('surat tugas', '01'),
  ('surat pemberitahuan', '02'),
  ('surat balasan', '03'),
  ('surat undangan', '04'),
  ('surat perintah', '05'),
  ('surat rekomendasi', '06'),
  ('surat izin', '07'),
  ('surat edaran', '08'),
  ('surat perjanjian/kontrak', '09')
ON CONFLICT DO NOTHING;

-- Seed Data: Kategori
INSERT INTO kategori (nama) VALUES ('biasa'), ('penting') ON CONFLICT DO NOTHING;

-- Seed Data: Default Custom Folders
INSERT INTO custom_folder_surat_masuk (nama_folder) VALUES ('Instansi'), ('Lembaga'), ('Perorangan')
ON CONFLICT DO NOTHING;
INSERT INTO custom_folder_surat_keluar (nama_folder) VALUES ('Instansi'), ('Lembaga'), ('Perorangan')
ON CONFLICT DO NOTHING;
