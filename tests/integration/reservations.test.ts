import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../../server/utils/db'
import { createReservation, createBlock, decideReservation } from '../../server/utils/reservations'
const prefix = `test-${randomUUID()}`
const admin = { id: `${prefix}-admin`, role: 'ADMIN' as const }
const employee = { id: `${prefix}-employee`, role: 'EMPLOYEE' as const }
let index = 0
async function room(active = true) {
  return db.room.create({
    data: {
      id: `${prefix}-room-${index++}`,
      name: 'Ruang uji',
      location: 'Lantai 2',
      capacity: 10,
      description: '',
      amenities: [],
      isActive: active
    }
  })
}
function input(roomId: string, offset = 0) {
  const start = new Date(Date.now() + 2 * 86400_000 + offset)
  return {
    roomId,
    startAt: start.toISOString(),
    endAt: new Date(start.getTime() + 3600_000).toISOString(),
    attendees: 4,
    purpose: 'Pengujian transaksi reservasi'
  }
}
beforeAll(async () => {
  if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL wajib menunjuk PostgreSQL uji yang sudah dimigrasi.')
  await db.user.createMany({
    data: [admin, employee].map((a) => ({
      ...a,
      name: 'Akun uji',
      email: `${a.id}@test.example`,
      passwordHash: 'unused'
    }))
  })
})
afterAll(async () => {
  await db.reservationEvent.deleteMany({ where: { actorId: { startsWith: prefix } } })
  await db.reservation.deleteMany({ where: { userId: { startsWith: prefix } } })
  await db.maintenanceBlock.deleteMany({ where: { createdBy: { startsWith: prefix } } })
  await db.room.deleteMany({ where: { id: { startsWith: prefix } } })
  await db.user.deleteMany({ where: { id: { startsWith: prefix } } })
  await db.$disconnect()
})
describe('Transaksi PostgreSQL nyata', () => {
  it('hanya satu persetujuan serentak berhasil dan audit ikut atomik', async () => {
    const r = await room()
    const a = await createReservation(employee, input(r.id))
    const b = await createReservation(employee, input(r.id))
    const results = await Promise.allSettled([
      decideReservation(admin, a.id, 'approve'),
      decideReservation(admin, b.id, 'approve')
    ])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult
    expect(failed.reason.statusCode).toBe(409)
    expect(await db.reservation.count({ where: { roomId: r.id, status: 'APPROVED' } })).toBe(1)
    expect(
      await db.reservationEvent.count({ where: { reservation: { roomId: r.id }, action: 'APPROVED' } })
    ).toBe(1)
  })
  it('persetujuan dan pemeliharaan serentak tidak bisa sama-sama lolos', async () => {
    const r = await room(),
      data = input(r.id)
    const a = await createReservation(employee, data)
    const result = await Promise.allSettled([
      decideReservation(admin, a.id, 'approve'),
      createBlock(admin, r.id, { ...data, reason: 'Perbaikan perangkat' })
    ])
    expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
  })
  it('membolehkan batas berdampingan dan pembatalan melepaskan slot', async () => {
    const r = await room(),
      data = input(r.id),
      a = await createReservation(employee, data)
    await decideReservation(admin, a.id, 'approve')
    await expect(createReservation(employee, data)).rejects.toMatchObject({ statusCode: 409 })
    await expect(
      createReservation(employee, {
        ...data,
        startAt: data.endAt,
        endAt: new Date(new Date(data.endAt).getTime() + 3600_000).toISOString()
      })
    ).resolves.toMatchObject({ status: 'PENDING' })
    await decideReservation(employee, a.id, 'cancel')
    await expect(createReservation(employee, data)).resolves.toMatchObject({ status: 'PENDING' })
  })
  it('menolak kapasitas, ruang nonaktif, keputusan ulang, dan alasan kosong', async () => {
    const r = await room()
    await expect(createReservation(employee, { ...input(r.id), attendees: 11 })).rejects.toMatchObject({
      statusCode: 422
    })
    const a = await createReservation(employee, input(r.id))
    await expect(decideReservation(admin, a.id, 'reject')).rejects.toMatchObject({ statusCode: 422 })
    await decideReservation(admin, a.id, 'reject', 'Jadwal perlu diubah')
    await expect(decideReservation(admin, a.id, 'approve')).rejects.toMatchObject({ statusCode: 409 })
    const inactive = await room(false)
    await expect(createReservation(employee, input(inactive.id))).rejects.toMatchObject({ statusCode: 409 })
    const pending = await createReservation(employee, input(r.id))
    await db.room.update({ where: { id: r.id }, data: { isActive: false } })
    await expect(decideReservation(admin, pending.id, 'approve')).rejects.toMatchObject({ statusCode: 409 })
  })
  it('menolak pembatalan setelah mulai serta keputusan oleh pemohon', async () => {
    const r = await room(),
      a = await createReservation(employee, input(r.id))
    await expect(decideReservation(employee, a.id, 'approve')).rejects.toMatchObject({ statusCode: 403 })
    await db.reservation.update({ where: { id: a.id }, data: { startAt: new Date(Date.now() - 60000) } })
    await expect(decideReservation(employee, a.id, 'cancel')).rejects.toMatchObject({ statusCode: 409 })
  })
})
