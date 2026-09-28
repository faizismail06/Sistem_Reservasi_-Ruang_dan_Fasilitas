import { PrismaClient, type Status } from '@prisma/client'
import { hash, argon2id } from 'argon2'
import { jakartaDate, wibISO } from '../shared/rules'
const db = new PrismaClient()
async function seed() {
  if (!process.env.DEMO_PASSWORD || process.env.DEMO_PASSWORD.length < 12)
    throw new Error('Set DEMO_PASSWORD minimal 12 karakter sebelum menjalankan seed.')
  const passwordHash = await hash(process.env.DEMO_PASSWORD, { type: argon2id })
  const names = [
    'Dimas Saputra',
    'Maya Lestari',
    'Rina Prasetyo',
    'Aditya Nugraha',
    'Sari Wulandari',
    'Bima Santoso',
    'Dewi Anggraini',
    'Fajar Hidayat',
    'Nadia Putri',
    'Rizky Ramadhan'
  ]
  for (const [i, name] of names.entries()) {
    await db.user.upsert({
      where: { id: `demo-user-${i}` },
      update: {},
      create: {
        id: `demo-user-${i}`,
        name,
        email:
          i === 0
            ? 'admin@kantor.example'
            : i === 2
              ? 'rina@kantor.example'
              : `${name.toLowerCase().split(' ')[0]}@kantor.example`,
        passwordHash,
        role: i < 2 ? 'ADMIN' : 'EMPLOYEE'
      }
    })
  }
  const rooms = [
    [
      'Ruang Merapi',
      'Lantai 2 · Gedung Utama',
      12,
      'Ruang rapat tim untuk koordinasi dan pembahasan operasional.',
      ['Layar presentasi', 'Papan tulis', 'Video konferensi']
    ],
    [
      'Ruang Cendana',
      'Lantai 3 · Gedung Utama',
      20,
      'Ruang presentasi untuk pertemuan lintas divisi dan evaluasi kerja.',
      ['Proyektor', 'Papan tulis', 'Video konferensi']
    ],
    [
      'Ruang Kenanga',
      'Lantai 1 · Gedung Utama',
      6,
      'Ruang diskusi kecil untuk wawancara dan pertemuan singkat.',
      ['Layar presentasi', 'Papan tulis']
    ],
    [
      'Ruang Bromo',
      'Lantai 2 · Gedung Utama',
      8,
      'Ruang rapat dengan perangkat konferensi untuk tim hibrida.',
      ['Video konferensi', 'Layar presentasi']
    ],
    [
      'Aula Nusantara',
      'Lantai 1 · Gedung Selatan',
      60,
      'Ruang serbaguna untuk pelatihan dan pertemuan seluruh pegawai.',
      ['Proyektor', 'Papan tulis', 'Sistem audio']
    ],
    [
      'Ruang Anggrek',
      'Lantai 3 · Gedung Utama',
      4,
      'Ruang tenang untuk diskusi terbatas dan tinjauan dokumen.',
      ['Papan tulis', 'Layar presentasi']
    ]
  ] as const
  for (const [i, r] of rooms.entries())
    await db.room.upsert({
      where: { id: `demo-room-${i}` },
      update: {},
      create: {
        id: `demo-room-${i}`,
        name: r[0],
        location: r[1],
        capacity: r[2],
        description: r[3],
        amenities: [...r[4]]
      }
    })
  const purposes = [
    'Koordinasi Operasional',
    'Evaluasi Anggaran',
    'Persiapan Audit Internal',
    'Tinjauan Rencana Pengadaan',
    'Diskusi Pengembangan Produk',
    'Pelatihan Layanan Pelanggan',
    'Rapat Progres Proyek',
    'Evaluasi Kinerja Bulanan'
  ]
  const statuses: Status[] = ['PENDING', 'APPROVED', 'PENDING', 'REJECTED', 'CANCELLED']
  for (let i = 0; i < 30; i++) {
    const dayOffset = i < 24 ? 1 + Math.floor(i / 6) : -1 - Math.floor((i - 24) / 6)
    const date = jakartaDate(new Date(Date.now() + dayOffset * 86400_000))
    const startAt = new Date(wibISO(date, `${String(9 + (i % 3) * 2).padStart(2, '0')}:00`))
    const status = i >= 24 ? 'APPROVED' : statuses[i % 5]!
    const userId = `demo-user-${2 + (i % 8)}`
    const reason =
      status === 'REJECTED'
        ? 'Jadwal kegiatan perlu disesuaikan dengan agenda divisi.'
        : status === 'CANCELLED'
          ? 'Kegiatan dijadwalkan ulang oleh pemohon.'
          : null
    await db.reservation.upsert({
      where: { id: `demo-reservation-${String(i + 1).padStart(6, '0')}` },
      update: {},
      create: {
        id: `demo-reservation-${String(i + 1).padStart(6, '0')}`,
        roomId: `demo-room-${i % 6}`,
        userId,
        startAt,
        endAt: new Date(startAt.getTime() + 3600_000),
        attendees: Math.min(Number(rooms[i % 6]![2]), 4 + (i % 9)),
        purpose: purposes[i % purposes.length]!,
        status,
        decisionReason: reason,
        decidedBy: status === 'PENDING' ? null : 'demo-user-0',
        decidedAt: status === 'PENDING' ? null : new Date(),
        createdAt: new Date(Date.now() - (30 - i) * 1800_000),
        events: {
          create: [
            {
              actorId: userId,
              action: 'CREATED',
              note: 'Pengajuan dibuat.',
              createdAt: new Date(Date.now() - (30 - i) * 1800_000)
            },
            ...(status === 'PENDING' ? [] : [{ actorId: 'demo-user-0', action: status, note: reason }])
          ]
        }
      }
    })
  }
  for (let i = 0; i < 3; i++) {
    const startAt = new Date(wibISO(jakartaDate(new Date(Date.now() + (i + 1) * 86400_000)), '16:00'))
    await db.maintenanceBlock.upsert({
      where: { id: `demo-block-${i}` },
      update: {},
      create: {
        id: `demo-block-${i}`,
        roomId: `demo-room-${i}`,
        startAt,
        endAt: new Date(startAt.getTime() + 3600_000),
        reason: 'Perawatan perangkat presentasi dan pemeriksaan fasilitas.',
        createdBy: 'demo-user-0'
      }
    })
  }
  console.log(
    'Seed selesai: 6 ruang, 10 akun, 30 reservasi, dan 3 blokir. Akun: admin@kantor.example / rina@kantor.example. Kata sandi mengikuti DEMO_PASSWORD saat akun pertama dibuat.'
  )
}
seed().finally(() => db.$disconnect())
