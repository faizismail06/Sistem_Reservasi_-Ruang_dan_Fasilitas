import { z } from 'zod'

export const statusLabels: Record<string, string> = {
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  CANCELLED: 'Dibatalkan',
  BLOCKED: 'Pemeliharaan'
}
export const roomSchema = z.object({
  name: z.string().trim().min(2).max(80),
  location: z.string().trim().min(2).max(100),
  capacity: z.number().int().min(1).max(1000),
  description: z.string().trim().max(1000),
  amenities: z.array(z.string().trim().min(1).max(50)).max(20),
  isActive: z.boolean().default(true)
})
export const reservationSchema = z.object({
  roomId: z.string().min(1),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  attendees: z.number().int().min(1),
  purpose: z.string().trim().min(5, 'Tujuan minimal 5 karakter.').max(1000)
})
export const blockSchema = z.object({
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  reason: z.string().trim().min(5, 'Alasan minimal 5 karakter.').max(1000)
})
export const reasonSchema = z.object({
  reason: z.string().trim().min(5, 'Alasan minimal 5 karakter.').max(1000)
})
export function overlaps(a: { startAt: Date; endAt: Date }, b: { startAt: Date; endAt: Date }) {
  return a.startAt < b.endAt && a.endAt > b.startAt
}
export function timeError(start: Date, end: Date, now = new Date()): string | null {
  const duration = end.getTime() - start.getTime()
  if (!Number.isFinite(duration)) return 'Tanggal atau jam tidak valid.'
  if (start <= now) return 'Waktu mulai harus di masa depan.'
  if (duration < 30 * 60_000 || duration > 8 * 3600_000)
    return 'Durasi reservasi harus 30 menit sampai 8 jam.'
  if (start.getTime() > now.getTime() + 30 * 86400_000) return 'Pengajuan maksimal 30 hari ke depan.'
  return null
}
export function jakartaDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}
export function dateLabel(value: string | Date) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value))
}
export function timeLabel(value: string | Date) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).format(new Date(value))
}
export function wibISO(date: string, time: string) {
  return new Date(`${date}T${time}:00+07:00`).toISOString()
}
