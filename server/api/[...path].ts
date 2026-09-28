import { verify } from 'argon2'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { blockSchema, reasonSchema, reservationSchema, roomSchema } from '../../shared/rules'
import { db } from '../utils/db'
import { hashToken, newSession, userSession } from '../utils/auth'
import {
  createBlock,
  createReservation,
  decideReservation,
  fail,
  hasConflict,
  lockRoom
} from '../utils/reservations'

const attempts = new Map<string, { count: number; until: number }>()
const includeList = { room: true, user: { select: { id: true, name: true } } }
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const method = event.method
  const path = getRequestURL(event)
    .pathname.replace(/^\/api\//, '')
    .split('/')
    .filter(Boolean)
  if (!['GET', 'HEAD'].includes(method)) {
    const origin = getHeader(event, 'origin')
    if (origin && origin !== getRequestURL(event).origin) fail(403, 'Asal permintaan tidak diizinkan.')
    if (getHeader(event, 'sec-fetch-site') === 'cross-site') fail(403, 'Permintaan lintas situs ditolak.')
  }
  try {
    if (path.join('/') === 'auth/login' && method === 'POST') {
      const input = z
        .object({ email: z.string().email().max(200), password: z.string().min(1).max(200) })
        .parse(await readBody(event))
      const key = `${getRequestIP(event) ?? 'local'}:${input.email.toLowerCase()}`
      const now = Date.now()
      for (const [k, value] of attempts) if (value.until < now) attempts.delete(k)
      const count = attempts.get(key) ?? { count: 0, until: now + 15 * 60_000 }
      if (count.count >= 10) fail(429, 'Terlalu banyak percobaan. Coba kembali dalam 15 menit.')
      count.count++
      attempts.set(key, count)
      const user = await db.user.findUnique({ where: { email: input.email.toLowerCase() } })
      if (!user || !(await verify(user.passwordHash, input.password)))
        fail(401, 'Email atau kata sandi tidak sesuai.')
      attempts.delete(key)
      await newSession(event, user.id)
      return { id: user.id, name: user.name, email: user.email, role: user.role }
    }
    const user = await userSession(event)
    if (path.join('/') === 'auth/me' && method === 'GET') return user
    if (path.join('/') === 'auth/logout' && method === 'POST') {
      const token = getCookie(event, 'reservasi_session')
      if (token) await db.session.deleteMany({ where: { id: hashToken(token) } })
      deleteCookie(event, 'reservasi_session', { path: '/' })
      return { ok: true }
    }
    if (path[0] === 'admin' && user.role !== 'ADMIN') fail(403, 'Akses admin diperlukan.')
    const q = getQuery(event)
    if ((path.join('/') === 'rooms' || path.join('/') === 'admin/rooms') && method === 'GET') {
      const capacity = z.coerce
        .number()
        .int()
        .min(0)
        .max(1000)
        .parse(q.capacity ?? 0)
      const search = String(q.search ?? '').slice(0, 100)
      return db.room.findMany({
        where: {
          ...(path[0] === 'admin' ? {} : { isActive: true }),
          capacity: { gte: capacity },
          ...(q.amenity ? { amenities: { has: String(q.amenity) } } : {}),
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } }
          ]
        },
        orderBy: { name: 'asc' }
      })
    }
    if (path[0] === 'rooms' && path.length === 2 && method === 'GET') {
      const room = await db.room.findUnique({ where: { id: path[1] } })
      if (!room) fail(404, 'Ruang tidak ditemukan.')
      return room
    }
    if (path[0] === 'rooms' && path[2] === 'availability' && method === 'GET') {
      const { from, to } = z
        .object({ from: z.string().datetime({ offset: true }), to: z.string().datetime({ offset: true }) })
        .parse(q)
      const start = new Date(from),
        end = new Date(to)
      if (end <= start || end.getTime() - start.getTime() > 32 * 86400_000)
        fail(422, 'Rentang kalender maksimal 32 hari.')
      const where = { roomId: path[1], startAt: { lt: end }, endAt: { gt: start } }
      const [reservations, blocks] = await Promise.all([
        db.reservation.findMany({
          where: { ...where, status: { in: ['PENDING', 'APPROVED'] } },
          select: { startAt: true, endAt: true, status: true }
        }),
        db.maintenanceBlock.findMany({ where, select: { startAt: true, endAt: true } })
      ])
      return [...reservations, ...blocks.map((b) => ({ ...b, status: 'BLOCKED' }))].sort(
        (a, b) => a.startAt.getTime() - b.startAt.getTime()
      )
    }
    if (path.join('/') === 'reservations' && method === 'POST')
      return createReservation(user, reservationSchema.parse(await readBody(event)))
    if (
      (path.join('/') === 'reservations/mine' || path.join('/') === 'admin/reservations') &&
      method === 'GET'
    ) {
      const page = z.coerce
        .number()
        .int()
        .min(1)
        .max(100000)
        .parse(q.page ?? 1)
      const status = z
        .enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'])
        .optional()
        .parse(q.status || undefined)
      const search = String(q.search ?? '').slice(0, 100)
      const day = q.date ? z.string().date().parse(q.date) : undefined
      const where: Prisma.ReservationWhereInput = {
        ...(path[0] === 'admin' ? {} : { userId: user.id }),
        ...(status ? { status } : {}),
        ...(q.roomId ? { roomId: String(q.roomId) } : {}),
        ...(day
          ? {
              startAt: {
                gte: new Date(`${day}T00:00:00+07:00`),
                lt: new Date(new Date(`${day}T00:00:00+07:00`).getTime() + 86400_000)
              }
            }
          : {}),
        OR: [
          { purpose: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { room: { name: { contains: search, mode: 'insensitive' } } },
          { id: { contains: search, mode: 'insensitive' } }
        ]
      }
      const sort = z
        .enum(['oldest', 'newest', 'schedule'])
        .parse(q.sort ?? (path[0] === 'admin' ? 'oldest' : 'newest'))
      const [items, total] = await db.$transaction([
        db.reservation.findMany({
          where,
          include: includeList,
          orderBy:
            sort === 'schedule'
              ? [{ startAt: 'asc' }, { id: 'asc' }]
              : [{ createdAt: sort === 'oldest' ? 'asc' : 'desc' }, { id: 'asc' }],
          skip: (page - 1) * 20,
          take: 20
        }),
        db.reservation.count({ where })
      ])
      return { items, total, page, pageSize: 20 }
    }
    if (path[0] === 'reservations' && path.length === 2 && method === 'GET') {
      const item = await db.reservation.findFirst({
        where: { id: path[1], ...(user.role === 'ADMIN' ? {} : { userId: user.id }) },
        include: {
          ...includeList,
          events: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: 'asc' } }
        }
      })
      if (!item) fail(404, 'Pengajuan tidak ditemukan.')
      return { ...item, conflict: await hasConflict(db, item.roomId, item.startAt, item.endAt, item.id) }
    }
    if (path[0] === 'reservations' && path[2] === 'cancel' && method === 'POST') {
      const body = await readBody(event)
      return decideReservation(
        user,
        path[1]!,
        'cancel',
        user.role === 'ADMIN' ? reasonSchema.parse(body).reason : undefined
      )
    }
    if (
      path[0] === 'admin' &&
      path[1] === 'reservations' &&
      ['approve', 'reject'].includes(path[3] ?? '') &&
      method === 'POST'
    ) {
      const action = path[3] as 'approve' | 'reject'
      return decideReservation(
        user,
        path[2]!,
        action,
        action === 'reject' ? reasonSchema.parse(await readBody(event)).reason : undefined
      )
    }
    if (path.join('/') === 'admin/rooms' && method === 'POST')
      return db.room.create({ data: roomSchema.parse(await readBody(event)) })
    if (path[0] === 'admin' && path[1] === 'rooms' && path.length === 3 && method === 'PATCH') {
      const data = roomSchema.parse(await readBody(event))
      return db.$transaction(async (tx) => {
        await lockRoom(tx, path[2]!)
        return tx.room.update({ where: { id: path[2] }, data })
      })
    }
    if (path[0] === 'admin' && path[1] === 'rooms' && path[3] === 'blocks' && method === 'POST')
      return createBlock(user, path[2]!, blockSchema.parse(await readBody(event)))
    fail(404, 'Endpoint tidak ditemukan.')
  } catch (error) {
    if (error instanceof z.ZodError)
      throw createError({
        statusCode: 422,
        statusMessage: 'Periksa isian formulir.',
        data: { fields: error.flatten().fieldErrors }
      })
    throw error
  }
})
