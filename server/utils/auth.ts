import { createHash, randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import { createError, getCookie, setCookie } from 'h3'
import { db } from './db'
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
export async function userSession(event: H3Event) {
  const token = getCookie(event, 'reservasi_session')
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Silakan masuk terlebih dahulu.' })
  const session = await db.session.findUnique({ where: { id: hashToken(token) }, include: { user: true } })
  if (!session || session.expiresAt <= new Date())
    throw createError({ statusCode: 401, statusMessage: 'Sesi berakhir. Silakan masuk kembali.' })
  return { id: session.user.id, name: session.user.name, email: session.user.email, role: session.user.role }
}
export async function newSession(event: H3Event, userId: string) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 8 * 3600_000)
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt } })
  setCookie(event, 'reservasi_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt
  })
}
