import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { authRequired } from '../middleware/auth.js'
import { newId } from '../db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'))

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin'
    cb(null, `${Date.now()}_${newId().slice(0, 8)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const okPdf = file.mimetype === 'application/pdf'
    const okImg = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.mimetype)
    if (okPdf || okImg) return cb(null, true)
    cb(new Error('Hanya PDF atau gambar yang diizinkan'))
  },
})

const router = Router()
router.use(authRequired)

function publicUrl(_req, fileName) {
  const apiUrl = (process.env.VITE_API_URL || '').replace(/\/api\/?$/, '')
  const origin = apiUrl || `http://localhost:${process.env.PORT || 3000}`
  return `${origin}/uploads/${fileName}`
}

router.post('/', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload gagal' })
    if (!req.file) return res.status(400).json({ error: 'File tidak ada' })
    const isPdf = req.file.mimetype === 'application/pdf'
    if (isPdf && req.file.size > 1.5 * 1024 * 1024) {
      fs.unlink(req.file.path, () => {})
      return res.status(400).json({ error: 'PDF maksimal 1.5MB' })
    }
    res.status(201).json({
      nama: req.file.originalname,
      path: publicUrl(req, req.file.filename),
      ukuran: req.file.size,
      mime: req.file.mimetype,
    })
  })
})

router.delete('/', (req, res) => {
  const p = req.body?.path || req.query.path
  if (!p) return res.status(400).json({ error: 'path wajib' })
  let fileName = ''
  try {
    if (String(p).startsWith('http')) {
      fileName = decodeURIComponent(new URL(p).pathname.split('/uploads/').pop() || '')
    } else {
      fileName = path.basename(String(p))
    }
  } catch {
    fileName = path.basename(String(p))
  }
  if (!fileName || fileName.includes('..')) return res.status(400).json({ error: 'path tidak valid' })
  const full = path.join(UPLOAD_DIR, fileName)
  if (fs.existsSync(full)) fs.unlinkSync(full)
  res.json({ ok: true })
})

export default router
