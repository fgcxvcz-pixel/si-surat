import { Router } from 'express'
import { q } from '../db.js'
import { authRequired, requireRole } from '../middleware/auth.js'
import { mapRows, mapRow } from '../utils/helpers.js'
import ExcelJS from 'exceljs'

const router = Router()
router.use(authRequired)

router.get('/', requireRole('Super Admin', 'Admin'), async (req, res) => {
  const {
    user_id,
    action_type,
    table_name,
    date_from,
    date_to,
    page = 1,
    limit = 20,
  } = req.query

  const pageNum = Math.max(1, parseInt(page) || 1)
  const limitNum = Math.min(500, Math.max(1, parseInt(limit) || 50))
  const offset = (pageNum - 1) * limitNum

  let whereConditions = []
  let params = []

  if (user_id) {
    whereConditions.push('al.id_user = ?')
    params.push(parseInt(user_id))
  }

  if (action_type && ['CREATE', 'UPDATE', 'DELETE', 'APPROVE'].includes(action_type)) {
    whereConditions.push('al.action_type = ?')
    params.push(action_type)
  }

  if (table_name) {
    whereConditions.push('al.table_name = ?')
    params.push(table_name)
  }

  if (date_from) {
    whereConditions.push('al.created_at >= ?')
    params.push(`${date_from} 00:00:00`)
  }

  if (date_to) {
    whereConditions.push('al.created_at <= ?')
    params.push(`${date_to} 23:59:59`)
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

  const countParams = [...params]
  const countRows = await q(
    `SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`,
    countParams
  )
  const total = countRows[0]?.total || 0

  const dataParams = [...params, limitNum, offset]
  const rows = await q(
    `SELECT al.*, u.nama as user_nama, u.username
     FROM audit_logs al
     LEFT JOIN pengguna u ON u.id = al.id_user
     ${whereClause}
     ORDER BY al.created_at DESC
     LIMIT ? OFFSET ?`,
    dataParams
  )

  const data = rows.map(r => ({
    ...mapRow(r),
    old_values: r.old_values ? (typeof r.old_values === 'string' ? JSON.parse(r.old_values) : r.old_values) : null,
    new_values: r.new_values ? (typeof r.new_values === 'string' ? JSON.parse(r.new_values) : r.new_values) : null,
  }))

  res.json({
    data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  })
})

router.get('/timeline/:table_name/:record_id', authRequired, async (req, res) => {
  const { table_name, record_id } = req.params

  const rows = await q(
    `SELECT al.*, u.nama as user_nama, u.username
     FROM audit_logs al
     LEFT JOIN pengguna u ON u.id = al.id_user
     WHERE al.table_name = ? AND al.record_id = ?
     ORDER BY al.created_at ASC`,
    [table_name, parseInt(record_id)]
  )

  const data = rows.map(r => ({
    ...mapRow(r),
    old_values: r.old_values ? (typeof r.old_values === 'string' ? JSON.parse(r.old_values) : r.old_values) : null,
    new_values: r.new_values ? (typeof r.new_values === 'string' ? JSON.parse(r.new_values) : r.new_values) : null,
  }))

  res.json(data)
})

router.post('/export', requireRole('Super Admin', 'Admin'), async (req, res) => {
  try {
    const {
      username,
      action_type,
      table_name,
      date_from,
      date_to,
    } = req.body

    let whereConditions = []
    let params = []

    if (username) {
      whereConditions.push('u.username = ?')
      params.push(username)
    }

    if (action_type && ['CREATE', 'UPDATE', 'DELETE', 'APPROVE'].includes(action_type)) {
      whereConditions.push('al.action_type = ?')
      params.push(action_type)
    }

    if (table_name) {
      whereConditions.push('al.table_name = ?')
      params.push(table_name)
    }

    if (date_from) {
      whereConditions.push('al.created_at >= ?')
      params.push(`${date_from} 00:00:00`)
    }

    if (date_to) {
      whereConditions.push('al.created_at <= ?')
      params.push(`${date_to} 23:59:59`)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    const rows = await q(
      `SELECT al.*, u.nama as user_nama, u.username
       FROM audit_logs al
       LEFT JOIN pengguna u ON u.id = al.id_user
       ${whereClause}
       ORDER BY al.created_at DESC`,
      params
    )

    // Create workbook with ExcelJS
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Audit Logs')

    // Add headers with styling
    const headers = ['Timestamp', 'User ID', 'User Name', 'Username', 'IP Address', 'Action Type', 'Table', 'Record ID', 'Description', 'Old Values', 'New Values']
    const headerRow = worksheet.addRow(headers)
    
    // Style header
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } }
    headerRow.alignment = { horizontal: 'center', vertical: 'center', wrapText: true }

    // Add data rows
    rows.forEach(r => {
      worksheet.addRow([
        r.created_at || '',
        r.id_user || '',
        r.user_nama || '',
        r.username || '',
        r.ip_address || '',
        r.action_type || '',
        r.table_name || '',
        r.record_id || '',
        r.description || '',
        r.old_values ? JSON.stringify(r.old_values) : '',
        r.new_values ? JSON.stringify(r.new_values) : '',
      ])
    })

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      let maxLength = 0
      column.eachCell({ includeEmpty: true }, cell => {
        const cellLength = cell.value ? String(cell.value).length : 0
        if (cellLength > maxLength) maxLength = cellLength
      })
      column.width = Math.min(50, Math.max(12, maxLength + 2))
    })

    // Freeze header row
    worksheet.views = [{ state: 'frozen', ySplit: 1 }]

    // Send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.xlsx"`)
    
    await workbook.xlsx.write(res)
    res.end()
  } catch (error) {
    console.error('Error exporting audit logs:', error)
    res.status(500).json({ error: 'Failed to export audit logs' })
  }
})

export default router
