import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'))

/**
 * Delete attachment files from disk
 * @param {Object|Array} fileObj - Single file object or array of file objects
 * @param {string} fileObj.path - File path (HTTP URL or relative)
 * @returns {Object} Result of deletion attempt { deleted: number, errors: string[] }
 */
export function deleteAttachmentFiles(fileObj) {
  const result = { deleted: 0, errors: [] }

  if (!fileObj) return result

  const files = Array.isArray(fileObj) ? fileObj : [fileObj]

  files.forEach((f) => {
    if (!f?.path) return

    let fileName = ''
    try {
      if (String(f.path).startsWith('http')) {
        fileName = decodeURIComponent(new URL(f.path).pathname.split('/uploads/').pop() || '')
      } else {
        fileName = path.basename(String(f.path))
      }
    } catch (err) {
      result.errors.push(`Invalid path format: ${f.path}`)
      return
    }

    if (!fileName || fileName.includes('..')) {
      result.errors.push(`Invalid or unsafe filename: ${fileName}`)
      return
    }

    const full = path.join(UPLOAD_DIR, fileName)

    try {
      if (fs.existsSync(full)) {
        fs.unlinkSync(full)
        result.deleted++
      }
    } catch (err) {
      result.errors.push(`Failed to delete ${fileName}: ${err.message}`)
    }
  })

  return result
}

/**
 * Parse file_lampiran or file_draft JSON field
 * @param {string|Object} fileData - JSON string or already parsed object
 * @returns {Array} Array of file objects
 */
export function parseFileData(fileData) {
  if (!fileData) return []

  if (Array.isArray(fileData)) return fileData
  if (typeof fileData === 'object') return [fileData]

  try {
    const parsed = JSON.parse(fileData)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return []
  }
}

export default { deleteAttachmentFiles, parseFileData }
