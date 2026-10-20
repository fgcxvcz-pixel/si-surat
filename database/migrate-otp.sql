-- Migration: tabel OTP lupa password (jalankan jika schema.sql versi lama)
USE sisurat_db;

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
