/**
 * Jalankan database/schema.sql via mysql2 (portable — tidak butuh mysql di PATH).
 * Pakai: npm run db:schema
 * Baca konfigurasi dari .env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).
 */
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mysql from 'mysql2/promise'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function loadEnv(file) {
  const p = path.resolve(root, file)
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}
loadEnv('.env')

const schemaPath = path.join(__dirname, 'schema.sql')
if (!existsSync(schemaPath)) {
  console.error('schema.sql tidak ditemukan:', schemaPath)
  process.exit(1)
}

const sql = readFileSync(schemaPath, 'utf8')

// Koneksi tanpa database dulu (schema.sql berisi CREATE DATABASE + USE)
const conn = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
  charset: 'utf8mb4_unicode_ci',
})

try {
  console.log('Menjalankan database/schema.sql …')
  await conn.query(sql)
  console.log('Selesai. Seed roles, master data, dan akun admin sudah dibuat ulang.')
  const [users] = await conn.query('SELECT id, username FROM sisurat_db.pengguna')
  console.log('pengguna:', users)
} catch (err) {
  console.error('Gagal jalankan schema:', err.message)
  process.exitCode = 1
} finally {
  await conn.end()
}
