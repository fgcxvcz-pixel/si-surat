#!/usr/bin/env bash
# Backup DB sisurat_db + folder uploads/
# Jalankan: sudo ./deploy/backup.sh
# Cron harian contoh: 0 2 * * * /var/www/sisurat/deploy/backup.sh >> /var/log/sisurat-backup.log 2>&1

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/sisurat}"
STAMP="$(date +%Y%m%d_%H%M%S)"
DB_NAME="${DB_NAME:-sisurat_db}"
DB_USER="${DB_USER:-root}"
UPLOAD_DIR="${UPLOAD_DIR:-$ROOT_DIR/uploads}"
KEEP_DAYS="${KEEP_DAYS:-14}"

mkdir -p "$BACKUP_ROOT"

echo "=== Backup SiSurat $STAMP ==="

# ── 1. Dump database ──────────────────────────────────
SQL_FILE="$BACKUP_ROOT/sisurat_db_${STAMP}.sql.gz"
if command -v mariadb-dump >/dev/null 2>&1; then
  DUMP_CMD="mariadb-dump"
elif command -v mysqldump >/dev/null 2>&1; then
  DUMP_CMD="mysqldump"
else
  echo "ERROR: mariadb-dump/mysqldump tidak ditemukan"
  exit 1
fi

echo "Dump DB: $DB_NAME → $SQL_FILE"
if [ "$DB_USER" = "root" ]; then
  $DUMP_CMD -u root --single-transaction --routines --triggers "$DB_NAME" | gzip > "$SQL_FILE"
else
  $DUMP_CMD -u "$DB_USER" -p"$DB_PASSWORD" --single-transaction --routines --triggers "$DB_NAME" | gzip > "$SQL_FILE"
fi
echo "  ukuran: $(du -h "$SQL_FILE" | cut -f1)"

# ── 2. Zip uploads ────────────────────────────────────
ZIP_FILE="$BACKUP_ROOT/uploads_${STAMP}.zip"
if [ -d "$UPLOAD_DIR" ]; then
  echo "Zip uploads: $UPLOAD_DIR → $ZIP_FILE"
  if command -v zip >/dev/null 2>&1; then
    (cd "$(dirname "$UPLOAD_DIR")" && zip -r -q "$ZIP_FILE" "$(basename "$UPLOAD_DIR")")
  else
    tar -czf "${ZIP_FILE%.zip}.tar.gz" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"
    ZIP_FILE="${ZIP_FILE%.zip}.tar.gz"
  fi
  echo "  ukuran: $(du -h "$ZIP_FILE" | cut -f1)"
else
  echo "Folder uploads tidak ada: $UPLOAD_DIR (skip)"
fi

# ── 3. Hapus backup lama ──────────────────────────────
echo "Hapus backup lebih tua dari $KEEP_DAYS hari..."
find "$BACKUP_ROOT" -type f \( -name 'sisurat_db_*.sql.gz' -o -name 'uploads_*.zip' -o -name 'uploads_*.tar.gz' \) -mtime +"$KEEP_DAYS" -delete

echo "=== Selesai ==="
ls -lh "$BACKUP_ROOT" | tail -n 20
