import bcrypt from 'bcryptjs'

const HASH = '$2b$12$u/88fgMlc0FHfbNevFjrUehwUqFuQ1RFSB1OioW/hLAi6yDuGIKhq'

export const DEFAULT_PASSWORD_HASH = HASH
export const DEFAULT_PASSWORD = 'qwerasdf'

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 12)
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash)
}
