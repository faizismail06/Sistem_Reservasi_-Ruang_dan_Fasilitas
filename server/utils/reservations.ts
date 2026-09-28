import type { Prisma, Role } from '@prisma/client'
import { createError } from 'h3'
import { db } from './db'
import { timeError } from '../../shared/rules'
type Tx = Prisma.TransactionClient
type Actor = { id: string; role: Role }
export function fail(statusCode: number, statusMessage: string): never {
  throw createError({ statusCode, statusMessage })
}
export async function lockRoom(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM "Room" WHERE id = ${id} FOR UPDATE`
  const room = await tx.room.findUnique({ where: { id } })
  if (!room) fail(404, 'Ruang tidak ditemukan.')
  return room
}
export async function hasConflict(tx: Tx, roomId: string, startAt: Date, endAt: Date, excludeId?: string) {
  const range = { roomId, startAt: { lt: endAt }, endAt: { gt: startAt } }
  const [reservation, block] = await Promise.all([
    tx.reservation.findFirst({
      where: { ...range, status: 'APPROVED', ...(excludeId ? { id: { not: excludeId } } : {}) }
    }),
    tx.maintenanceBlock.findFirst({ where: range })
  ])
  return Boolean(reservation || block)
}
export async function createReservation(
  actor: Actor,
  input: { roomId: string; startAt: string; endAt: string; attendees: number; purpose: string }
) {
  return db.$transaction(async (tx) => {
    const room = await lockRoom(tx, input.roomId)
    const startAt = new Date(input.startAt),
      endAt = new Date(input.endAt)
    const error = timeError(startAt, endAt)
    if (error) fail(422, error)
    if (!room.isActive) fail(409, 'Ruang sedang nonaktif. Pilih ruang lain.')
    if (input.attendees > room.capacity) fail(422, 'Jumlah peserta melebihi kapasitas ruang.')
    if (await hasConflict(tx, room.id, startAt, endAt))
      fail(409, 'Jadwal sudah terisi atau diblokir. Pilih waktu lain.')
    return tx.reservation.create({
      data: {
        ...input,
        startAt,
        endAt,
        userId: actor.id,
        events: { create: { actorId: actor.id, action: 'CREATED', note: 'Pengajuan dibuat.' } }
      }
    })
  })
}
export async function decideReservation(
  actor: Actor,
  id: string,
  action: 'approve' | 'reject' | 'cancel',
  reason?: string
) {
  return db.$transaction(async (tx) => {
    const initial = await tx.reservation.findUnique({ where: { id } })
    if (!initial || (actor.role !== 'ADMIN' && initial.userId !== actor.id))
      fail(404, 'Pengajuan tidak ditemukan.')
    if (action !== 'cancel' && actor.role !== 'ADMIN') fail(403, 'Akses admin diperlukan.')
    const room = await lockRoom(tx, initial.roomId)
    const current = await tx.reservation.findUniqueOrThrow({ where: { id } })
    if (action === 'cancel') {
      if (!['PENDING', 'APPROVED'].includes(current.status) || current.startAt <= new Date())
        fail(409, 'Pengajuan ini tidak dapat dibatalkan.')
    } else if (current.status !== 'PENDING') fail(409, 'Pengajuan sudah diproses. Muat ulang daftar.')
    if (
      (action === 'reject' || (action === 'cancel' && actor.role === 'ADMIN')) &&
      (!reason || reason.trim().length < 5)
    )
      fail(422, 'Alasan minimal 5 karakter wajib diisi.')
    if (action === 'approve') {
      if (!room.isActive) fail(409, 'Ruang nonaktif tidak dapat menerima persetujuan.')
      if (current.startAt <= new Date()) fail(409, 'Jadwal sudah berlalu. Tolak pengajuan ini.')
      if (current.attendees > room.capacity) fail(409, 'Kapasitas ruang berubah. Tolak dan ajukan ulang.')
      if (await hasConflict(tx, room.id, current.startAt, current.endAt, id))
        fail(409, 'Persetujuan gagal: jadwal telah terisi. Lihat jadwal terbaru atau tolak pengajuan.')
    }
    const status = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'CANCELLED'
    return tx.reservation.update({
      where: { id },
      data: {
        status,
        decisionReason: reason ?? null,
        decidedBy: actor.id,
        decidedAt: new Date(),
        events: { create: { actorId: actor.id, action: status, note: reason } }
      }
    })
  })
}
export async function createBlock(
  actor: Actor,
  roomId: string,
  input: { startAt: string; endAt: string; reason: string }
) {
  if (actor.role !== 'ADMIN') fail(403, 'Akses admin diperlukan.')
  return db.$transaction(async (tx) => {
    await lockRoom(tx, roomId)
    const startAt = new Date(input.startAt),
      endAt = new Date(input.endAt)
    if (
      !Number.isFinite(startAt.getTime()) ||
      !Number.isFinite(endAt.getTime()) ||
      startAt <= new Date() ||
      endAt <= startAt
    )
      fail(422, 'Rentang pemeliharaan harus valid dan di masa depan.')
    if (await hasConflict(tx, roomId, startAt, endAt))
      fail(409, 'Pemeliharaan bertabrakan dengan reservasi disetujui atau blokir lain.')
    return tx.maintenanceBlock.create({ data: { ...input, roomId, startAt, endAt, createdBy: actor.id } })
  })
}
