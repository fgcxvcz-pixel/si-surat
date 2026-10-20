import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import suratMasukRoutes from './routes/suratMasuk.js'
import suratKeluarRoutes from './routes/suratKeluar.js'
import reminderRoutes from './routes/reminders.js'
import folderRoutes from './routes/folders.js'
import masterDataRoutes from './routes/masterData.js'
import ttdRoutes from './routes/ttd.js'
import userRoutes from './routes/users.js'
import uploadRoutes from './routes/upload.js'
import auditLogsRoutes from './routes/auditLogs.js'
import { pool } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 3000)
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'))

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '2mb' }))
app.use('/uploads', express.static(UPLOAD_DIR))

app.get('/health', (_req, res) => res.json({ ok: true, service: 'sisurat-api' }))
app.use('/api/auth', authRoutes)
app.use('/api/surat-masuk', suratMasukRoutes)
app.use('/api/surat-keluar', suratKeluarRoutes)
app.use('/api/reminders', reminderRoutes)
app.use('/api/folders', folderRoutes)
app.use('/api', masterDataRoutes)
app.use('/api/ttd', ttdRoutes)
app.use('/api/users', userRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/audit-logs', auditLogsRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Server error' })
})

async function main() {
  try {
    await pool.query('SELECT 1')
    console.log('MySQL connected:', process.env.DB_NAME || 'sisurat_db')
  } catch (e) {
    console.error('MySQL connection failed:', e.message)
    process.exit(1)
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`sisurat-api listening on http://localhost:${PORT}`)
  })
}

main()
