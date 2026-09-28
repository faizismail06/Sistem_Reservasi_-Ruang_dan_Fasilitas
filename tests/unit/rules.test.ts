import { describe, expect, it } from 'vitest'
import { overlaps, timeError, wibISO, jakartaDate, timeLabel, reservationSchema } from '../../shared/rules'
const now = new Date('2026-09-27T00:00:00Z')
const range = (s: string, e: string) => ({ startAt: new Date(s), endAt: new Date(e) })
describe('Aturan jadwal kantor', () => {
  it('mendeteksi bentrok sebagian dan rentang yang melingkupi', () => {
    const a = range('2026-09-28T03:00:00Z', '2026-09-28T04:00:00Z')
    expect(overlaps(a, range('2026-09-28T03:30:00Z', '2026-09-28T04:30:00Z'))).toBe(true)
    expect(overlaps(a, range('2026-09-28T02:00:00Z', '2026-09-28T05:00:00Z'))).toBe(true)
    expect(overlaps(a, range('2026-09-28T04:00:00Z', '2026-09-28T05:00:00Z'))).toBe(false)
  })
  it.each([30, 480])('menerima durasi batas %i menit', (minutes) => {
    const start = new Date(now.getTime() + 86400_000)
    expect(timeError(start, new Date(start.getTime() + minutes * 60000), now)).toBeNull()
  })
  it.each([0, -60, 29, 481])('menolak durasi %i menit', (minutes) => {
    const start = new Date(now.getTime() + 86400_000)
    expect(timeError(start, new Date(start.getTime() + minutes * 60000), now)).toBeTruthy()
  })
  it('menolak masa lalu, tanggal invalid, dan batas lebih dari 30 hari', () => {
    expect(timeError(now, new Date(now.getTime() + 3600_000), now)).toBeTruthy()
    expect(timeError(new Date('invalid'), now, now)).toBeTruthy()
    const last = new Date(now.getTime() + 30 * 86400_000)
    expect(timeError(last, new Date(last.getTime() + 3600_000), now)).toBeNull()
    expect(timeError(new Date(last.getTime() + 1), new Date(last.getTime() + 3600_000), now)).toBeTruthy()
  })
  it('mengonversi WIB secara eksplisit, termasuk pergantian tanggal UTC', () => {
    expect(wibISO('2026-09-28', '00:30')).toBe('2026-09-27T17:30:00.000Z')
    expect(jakartaDate(new Date('2026-09-27T18:00:00Z'))).toBe('2026-09-28')
    expect(timeLabel('2026-09-28T03:00:00Z')).toBe('10.00')
  })
  it('menolak peserta nol dan tujuan kosong', () => {
    expect(
      reservationSchema.safeParse({
        roomId: 'room',
        startAt: now.toISOString(),
        endAt: now.toISOString(),
        attendees: 0,
        purpose: ''
      }).success
    ).toBe(false)
  })
})
