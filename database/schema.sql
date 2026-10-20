-- SiSurat — MariaDB (Laragon) schema
-- DB: sisurat_db | Semua PK/FK: INT AUTO_INCREMENT (bukan UUID) | password: bcrypt

CREATE DATABASE IF NOT EXISTS sisurat_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sisurat_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS password_reset_otps;
DROP TABLE IF EXISTS reminders;
DROP TABLE IF EXISTS surat_keluar;
DROP TABLE IF EXISTS surat_masuk;
DROP TABLE IF EXISTS tanda_tangan_digital;
DROP TABLE IF EXISTS custom_folder_surat_keluar;
DROP TABLE IF EXISTS custom_folder_surat_masuk;
DROP TABLE IF EXISTS jenis_surat_keluar;
DROP TABLE IF EXISTS jenis_surat_masuk;
DROP TABLE IF EXISTS kategori;
DROP TABLE IF EXISTS format_nomor_surat;
DROP TABLE IF EXISTS pengguna;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS audit_logs;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Roles
CREATE TABLE roles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama_role VARCHAR(100) NOT NULL,
  keterangan TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_nama (nama_role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Pengguna
CREATE TABLE pengguna (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_role INT UNSIGNED NOT NULL,
  nama VARCHAR(150) NOT NULL,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pengguna_username (username),
  UNIQUE KEY uq_pengguna_email (email),
  KEY idx_pengguna_role (id_role),
  CONSTRAINT fk_pengguna_role FOREIGN KEY (id_role) REFERENCES roles (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Format Nomor Surat
CREATE TABLE format_nomor_surat (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kode_surat VARCHAR(50) NOT NULL,
  pola_format VARCHAR(255) NOT NULL,
  counter_terakhir INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tanda Tangan Digital
CREATE TABLE tanda_tangan_digital (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_user INT UNSIGNED NOT NULL,
  file_ttd JSON NOT NULL,
  is_aktif TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ttd_user (id_user),
  CONSTRAINT fk_ttd_user FOREIGN KEY (id_user) REFERENCES pengguna (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Surat Masuk
CREATE TABLE surat_masuk (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_user INT UNSIGNED NOT NULL,
  id_format INT UNSIGNED NULL,
  id_surat_keluar_ref INT UNSIGNED NULL,
  nomor_surat VARCHAR(190) NOT NULL,
  pengirim VARCHAR(255) NOT NULL,
  folder VARCHAR(150) NULL,
  perihal VARCHAR(255) NOT NULL,
  isi_surat TEXT NOT NULL,
  kategori ENUM('biasa','penting') NOT NULL DEFAULT 'biasa',
  jenis_surat VARCHAR(150) NOT NULL DEFAULT '',
  tanggal_terima DATETIME NOT NULL,
  status_tindak_lanjut ENUM('tidak','menunggu','menunggu_approval','selesai') NOT NULL DEFAULT 'tidak',
  file_lampiran JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sm_nomor (nomor_surat),
  KEY idx_sm_tanggal (tanggal_terima),
  KEY idx_sm_status (status_tindak_lanjut),
  KEY idx_sm_user (id_user),
  CONSTRAINT fk_sm_user FOREIGN KEY (id_user) REFERENCES pengguna (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Surat Keluar
CREATE TABLE surat_keluar (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_user INT UNSIGNED NOT NULL,
  id_format INT UNSIGNED NULL,
  approved_by INT UNSIGNED NULL,
  id_ttd INT UNSIGNED NULL,
  id_surat_masuk_ref INT UNSIGNED NULL,
  nomor_surat VARCHAR(190) NOT NULL,
  tujuan VARCHAR(255) NOT NULL,
  folder VARCHAR(150) NULL,
  perihal VARCHAR(255) NOT NULL,
  jenis_surat VARCHAR(150) NOT NULL DEFAULT 'surat tugas',
  isi_surat TEXT NOT NULL,
  kategori ENUM('biasa','penting') NOT NULL DEFAULT 'biasa',
  tanggal_kirim DATETIME NOT NULL,
  status_approval ENUM('menunggu','disetujui','ditolak') NOT NULL DEFAULT 'menunggu',
  tanggal_approval DATETIME NULL,
  catatan_revisi TEXT NULL,
  file_draft JSON NULL,
  file_final_ttd JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sk_nomor (nomor_surat),
  KEY idx_sk_tanggal (tanggal_kirim),
  KEY idx_sk_status (status_approval),
  KEY idx_sk_user (id_user),
  KEY idx_sk_approved (approved_by),
  KEY idx_sk_ttd (id_ttd),
  CONSTRAINT fk_sk_user FOREIGN KEY (id_user) REFERENCES pengguna (id) ON DELETE CASCADE,
  CONSTRAINT fk_sk_approved FOREIGN KEY (approved_by) REFERENCES pengguna (id) ON DELETE SET NULL,
  CONSTRAINT fk_sk_ttd FOREIGN KEY (id_ttd) REFERENCES tanda_tangan_digital (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Reminders
CREATE TABLE reminders (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_surat_masuk INT UNSIGNED NOT NULL,
  tanggal_batas DATETIME NOT NULL,
  status ENUM('menunggu','selesai','terlewat') NOT NULL DEFAULT 'menunggu',
  keterangan TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rem_sm (id_surat_masuk),
  KEY idx_rem_status (status),
  CONSTRAINT fk_rem_sm FOREIGN KEY (id_surat_masuk) REFERENCES surat_masuk (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Custom Folders
CREATE TABLE custom_folder_surat_masuk (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama_folder VARCHAR(150) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cfm_nama (nama_folder)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE custom_folder_surat_keluar (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama_folder VARCHAR(150) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cfk_nama (nama_folder)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Jenis Surat
CREATE TABLE jenis_surat_masuk (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama VARCHAR(150) NOT NULL,
  kode VARCHAR(10) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_jsm_nama (nama)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE jenis_surat_keluar (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama VARCHAR(150) NOT NULL,
  kode VARCHAR(10) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_jsk_nama (nama)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Kategori
CREATE TABLE kategori (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_kategori_nama (nama)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Password Reset OTP (lupa password via email)
CREATE TABLE IF NOT EXISTS password_reset_otps (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_user INT UNSIGNED NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_prto_user (id_user),
  KEY idx_prto_expires (expires_at),
  CONSTRAINT fk_prto_user FOREIGN KEY (id_user) REFERENCES pengguna (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Audit Logs - Activity Trail untuk CRUD + APPROVE actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_user INT UNSIGNED NOT NULL,
  action_type ENUM('CREATE','UPDATE','DELETE','APPROVE') NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id INT UNSIGNED NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  description TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_user (id_user),
  KEY idx_audit_action (action_type),
  KEY idx_audit_table (table_name),
  KEY idx_audit_record (record_id),
  KEY idx_audit_created (created_at),
  KEY idx_audit_compound (table_name, record_id, created_at),
  CONSTRAINT fk_audit_user FOREIGN KEY (id_user) REFERENCES pengguna (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed roles
INSERT INTO roles (id, nama_role, keterangan) VALUES
  (1, 'Super Admin', 'Akses penuh ke semua fitur'),
  (2, 'Admin', 'Administrator sistem dengan akses penuh'),
  (3, 'Kepala Bagian', 'Kepala bagian umum, menyetujui surat keluar')
ON DUPLICATE KEY UPDATE keterangan = VALUES(keterangan);

-- Seed jenis surat masuk (id auto)
INSERT INTO jenis_surat_masuk (nama, kode) VALUES
  ('surat masuk biasa', '01'),
  ('surat undangan', '02'),
  ('surat pemberitahuan', '03'),
  ('surat tugas', '04'),
  ('surat perintah', '05'),
  ('surat rekomendasi', '06'),
  ('surat izin', '07');

-- Seed jenis surat keluar
INSERT INTO jenis_surat_keluar (nama, kode) VALUES
  ('surat tugas', '01'),
  ('surat pemberitahuan', '02'),
  ('surat balasan', '03'),
  ('surat undangan', '04'),
  ('surat perintah', '05'),
  ('surat rekomendasi', '06'),
  ('surat izin', '07'),
  ('surat edaran', '08'),
  ('surat perjanjian/kontrak', '09');

-- Seed kategori
INSERT INTO kategori (nama) VALUES ('biasa'), ('penting');

-- Seed folders default
INSERT INTO custom_folder_surat_masuk (nama_folder) VALUES ('Instansi'), ('Lembaga'), ('Perorangan');
INSERT INTO custom_folder_surat_keluar (nama_folder) VALUES ('Instansi'), ('Lembaga'), ('Perorangan');

-- Seed akun default: HANYA Super Admin — password: qwerasdf (bcrypt)
-- Akun Admin / Kepala Bagian ditambah lewat Manajemen Akun
INSERT INTO pengguna (id, id_role, nama, username, email, password) VALUES
  (1, 1, 'Super Admin', 'admin', 'admin@sisurat.local',
   '$2b$12$u/88fgMlc0FHfbNevFjrUehwUqFuQ1RFSB1OioW/hLAi6yDuGIKhq');
