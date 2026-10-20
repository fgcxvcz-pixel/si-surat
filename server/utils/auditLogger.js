import { q } from '../db.js'

export async function logAudit(userId, actionType, tableName, recordId, oldValues = null, newValues = null, ipAddress = null, description = null) {
  try {
    await q(
      `INSERT INTO audit_logs (id_user, action_type, table_name, record_id, ip_address, old_values, new_values, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        actionType,
        tableName,
        recordId,
        ipAddress || null,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        description || null,
      ]
    )
  } catch (err) {
    console.error('[AuditLogger] Error logging action:', err.message)
    throw err
  }
}

export function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    null
  )
}

export function diffValues(oldObj, newObj, fieldsToTrack = null) {
  const old = oldObj || {}
  const neu = newObj || {}
  const diff = {}

  const keys = fieldsToTrack || Object.keys(new Set([...Object.keys(old), ...Object.keys(neu)]))

  for (const k of keys) {
    if (JSON.stringify(old[k]) !== JSON.stringify(neu[k])) {
      diff[k] = { before: old[k], after: neu[k] }
    }
  }

  return Object.keys(diff).length > 0 ? diff : null
}
