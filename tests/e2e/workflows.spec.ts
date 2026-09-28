import { test, expect, type Page } from '@playwright/test'
import { jakartaDate } from '../../shared/rules'
const password = process.env.DEMO_PASSWORD || 'RuangKantor2026!'
async function login(page: Page, email = 'rina@kantor.example') {
  await page.goto('/login')
  await page.getByLabel('Email kantor').fill(email)
  await page.getByLabel('Kata sandi', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(page).toHaveURL(email.startsWith('admin') ? /\/admin\/pengajuan/ : /\/ruang/)
}
test('seluruh data wajib login dan pemohon tidak mendapat hak admin', async ({ page, request }) => {
  expect((await request.get('/api/rooms')).status()).toBe(401)
  expect(
    (
      await request.get(
        '/api/rooms/demo-room-0/availability?from=2026-09-28T00:00:00Z&to=2026-09-29T00:00:00Z'
      )
    ).status()
  ).toBe(401)
  await page.goto('/admin/pengajuan')
  await expect(page).toHaveURL(/\/login/)
  await login(page)
  expect((await page.request.get('/api/admin/reservations')).status()).toBe(403)
  expect((await page.request.get('/api/reservations/demo-reservation-000002')).status()).toBe(404)
  const tomorrow = new Date(Date.now() + 86400_000).toISOString(),
    next = new Date(Date.now() + 7 * 86400_000).toISOString()
  const intervals = await (
    await page.request.get(`/api/rooms/demo-room-0/availability?from=${tomorrow}&to=${next}`)
  ).json()
  expect(intervals.length).toBeGreaterThan(0)
  expect(Object.keys(intervals[0]).sort()).toEqual(['endAt', 'startAt', 'status'])
  await page.getByRole('button', { name: 'Keluar', exact: true }).click()
  await expect(page).toHaveURL(/\/login/)
  expect((await page.request.get('/api/rooms')).status()).toBe(401)
})
test('pegawai mencari ruang, mengajukan, admin menyetujui, dan pegawai membatalkan', async ({
  page,
  browser
}) => {
  await login(page)
  await page.getByRole('spinbutton', { name: 'Kapasitas minimal' }).fill('10')
  await expect(page.getByRole('heading', { name: 'Ruang Kenanga', exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: /Ruang Merapi/ }).click()
  await expect(page.getByRole('heading', { name: 'Kalender ketersediaan' })).toBeVisible()
  await page.getByRole('link', { name: 'Ajukan Reservasi' }).click()
  const date = jakartaDate(new Date(Date.now() + 12 * 86400_000))
  await page.getByLabel('Tanggal kegiatan').fill(date)
  await page.getByLabel('Jam mulai (WIB)').fill('10:00')
  await page.getByLabel('Jam selesai (WIB)').fill('11:00')
  await page.getByLabel('Jumlah peserta').fill('8')
  const purpose = `Koordinasi Pengadaan ${Date.now()}`
  await page.getByLabel('Tujuan kegiatan').fill(purpose)
  await page.getByRole('button', { name: 'Tinjau Pengajuan' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('10.00–11.00 WIB')
  await dialog.getByRole('button', { name: 'Kirim Pengajuan' }).click()
  await expect(page).toHaveURL(/\/reservasi$/)
  await page.getByRole('textbox', { name: 'Cari pengajuan' }).fill(purpose)
  const listing = await (
    await page.request.get(`/api/reservations/mine?search=${encodeURIComponent(purpose)}`)
  ).json()
  const id = listing.items[0].id as string
  await page.getByRole('button', { name: `RSV-${id.slice(-6).toUpperCase()}` }).click()
  await expect(page.getByRole('dialog')).toContainText('Menunggu')
  await expect(page.getByRole('dialog')).toContainText('10.00–11.00 WIB')
  await page.keyboard.press('Escape')
  const adminContext = await browser.newContext()
  const admin = await adminContext.newPage()
  await login(admin, 'admin@kantor.example')
  await admin.getByRole('textbox', { name: 'Cari pengajuan' }).fill(purpose)
  await admin.getByRole('button', { name: `RSV-${id.slice(-6).toUpperCase()}` }).click()
  await admin.getByRole('button', { name: 'Setujui', exact: true }).click()
  await expect(admin.getByRole('dialog').getByText('Disetujui', { exact: true }).first()).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: `RSV-${id.slice(-6).toUpperCase()}` }).click()
  await expect(page.getByRole('dialog')).toContainText('Disetujui')
  await expect(page.getByRole('dialog')).toContainText('10.00–11.00 WIB')
  await page.getByRole('button', { name: 'Batalkan Reservasi' }).click()
  await expect(page.getByRole('dialog').getByText('Dibatalkan', { exact: true }).first()).toBeVisible()
  await adminContext.close()
})
test('admin mengelola ruang, menolak, dan memblokir pemeliharaan', async ({ page }) => {
  await login(page, 'admin@kantor.example')
  await page.goto('/admin/ruang')
  await page.getByRole('button', { name: 'Tambah Ruang' }).click()
  const name = `Ruang Uji ${Date.now()}`
  await page.getByLabel('Nama ruang').fill(name)
  await page.getByLabel('Lokasi', { exact: true }).fill('Lantai 4 · Gedung Uji')
  await page.getByLabel('Kapasitas (orang)').fill('12')
  await page.getByRole('button', { name: 'Simpan Ruang' }).click()
  const row = page.locator('.manage-room').filter({ hasText: name })
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: 'Pemeliharaan' }).click()
  const date = jakartaDate(new Date(Date.now() + 14 * 86400_000))
  await page.getByLabel('Tanggal', { exact: true }).fill(date)
  await page.getByLabel('Alasan pemeliharaan').fill('Pemeriksaan perangkat konferensi')
  await page.getByRole('button', { name: 'Simpan Blokir' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const rooms = await (await page.request.get('/api/admin/rooms')).json()
  const room = rooms.find((r: { name: string }) => r.name === name)
  const startAt = new Date(`${date}T11:00:00+07:00`).toISOString(),
    endAt = new Date(`${date}T12:00:00+07:00`).toISOString()
  const created = await (
    await page.request.post('/api/reservations', {
      data: { roomId: room.id, startAt, endAt, attendees: 5, purpose: 'Tinjauan kebutuhan tim' }
    })
  ).json()
  await page.goto('/admin/pengajuan')
  await page.getByRole('textbox', { name: 'Cari pengajuan' }).fill(name)
  await page.getByRole('button', { name: `RSV-${created.id.slice(-6).toUpperCase()}` }).click()
  await page.getByRole('button', { name: 'Tolak', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Isi alasan' })).toBeVisible()
  await page.getByLabel('Alasan penolakan / pembatalan').fill('Kegiatan perlu dijadwalkan ulang')
  await page.getByRole('button', { name: 'Tolak', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Ditolak')
  await page.keyboard.press('Escape')
  await page.goto('/admin/ruang')
  await page
    .locator('.manage-room')
    .filter({ hasText: name })
    .getByRole('button', { name: 'Ubah', exact: true })
    .click()
  await page.getByRole('switch', { name: 'Ruang aktif' }).click()
  await page.getByRole('button', { name: 'Simpan Ruang' }).click()
  await expect(page.locator('.manage-room').filter({ hasText: name })).toContainText('Nonaktif')
})
for (const width of [360, 768, 1440]) {
  test(`tampilan ${width}px, navigasi keyboard, dan dialog`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 })
    const consoleErrors: string[] = []
    page.on('pageerror', (error) => consoleErrors.push(error.message))
    await login(page, 'admin@kantor.example')
    await expect(page.getByRole('heading', { name: 'Pengajuan Reservasi' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (width < 600) {
      await page.locator('.mobile-reservation').first().click()
    } else {
      await page.getByRole('button', { name: /RSV-/ }).first().click()
    }
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.goto('/ruang/demo-room-0')
    await expect(page.getByRole('heading', { name: 'Kalender ketersediaan' })).toBeVisible()
    if (width === 360) await expect(page.locator('.calendar-agenda')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: `test-results/kalender-${width}.png`, fullPage: true })
    expect(consoleErrors).toEqual([])
  })
}
