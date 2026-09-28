# Ruang Kantor

Aplikasi internal reservasi ruang kantor dengan Nuxt 4, Nuxt UI 4, TypeScript, PostgreSQL, dan Prisma. Halaman awal `/` menampilkan pengantar aplikasi, pilihan ruang beserta lokasi, kapasitas, dan fasilitas, alur pengajuan, dan akses masuk tanpa membutuhkan login atau koneksi database. Seluruh halaman kerja dan API data tetap memerlukan login. Antarmuka berbahasa Indonesia, satu aksen biru, tabel padat, dan kalender ketersediaan dalam WIB.

## Menjalankan lokal

Gunakan Node.js 22 LTS (22.12 atau lebih baru) atau 24 LTS, npm, serta PostgreSQL 17. Docker Compose disediakan sebagai opsi database lokal.

```powershell
cd 'E:\Project\Programmer\Sistem_Reservasi_ Ruang_dan_Fasilitas'
Copy-Item .env.example .env
docker compose up -d
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

Buka http://localhost:3000. Jika menggunakan PostgreSQL yang sudah terpasang, buat database khusus aplikasi dan sesuaikan `DATABASE_URL` dalam `.env`; lewati langkah Docker. Prisma dan Nuxt membaca `.env`; perintah seed menggunakan Node `--env-file=.env`.

Pada workspace ini, `.env` lokal sudah disiapkan untuk PostgreSQL terpisah di `127.0.0.1:55432`, database `reservasi`. Cluster uji berada di `E:\Project\.reservasi-pg` dan tidak mengubah layanan PostgreSQL lain. Setelah restart komputer, hidupkan kembali bila diperlukan:

```powershell
& 'C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe' -D 'E:\Project\.reservasi-pg' -l 'E:\Project\.reservasi-pg\server.log' -o '-p 55432 -h 127.0.0.1' -w start
npm run dev
```

Konfigurasi cluster tersebut hanya untuk pengembangan lokal. `.env.example` tetap menggunakan PostgreSQL Docker dengan kredensial, sedangkan deployment mengikuti bagian tersendiri di bawah.

| Akun demo | Peran |
| --- | --- |
| `admin@kantor.example` | Administrator — Dimas Saputra |
| `maya@kantor.example` | Administrator — Maya Lestari |
| `rina@kantor.example` | Pegawai — Rina Prasetyo |

Kata sandi mengikuti `DEMO_PASSWORD` ketika seed pertama kali membuat akun; contoh lokal: `RuangKantor2026!`. Seed menghasilkan 6 ruang, 2 admin, 8 pegawai, 30 reservasi lintas status, dan 3 blokir pemeliharaan. Tanggal relatif terhadap saat seed pertama kali dijalankan. Seed idempoten: tidak menimpa keputusan atau kata sandi akun yang telah ada. Gunakan database demo baru untuk mendapatkan jadwal relatif yang baru.

## Penggunaan

- **Pegawai:** Ruang & Kalender → pilih ruang → pilih slot atau Ajukan Reservasi → isi form → tinjau ringkasan → kirim. Pantau status dan batalkan sebelum mulai melalui Reservasi Saya.
- **Admin:** Pengajuan → filter/cari → buka detail → periksa jadwal/riwayat → Setujui atau Tolak. Penolakan dan pembatalan admin memerlukan alasan. Tidak ada persetujuan massal.
- **Kelola Ruang:** tambah/ubah data, nonaktifkan ruang, dan buat blokir pemeliharaan. Riwayat serta reservasi yang sudah disetujui tetap ada saat ruang nonaktif.
- Kalender harian/mingguan menampilkan satu ruang dengan slot per jam, default 07.00–19.00 dan opsi seluruh 24 jam. Ketelitian input hingga menit. Ponsel memakai agenda harian. Klik slot mengisi formulir; tidak mengubah jadwal langsung.
- Badge Menunggu berarti **belum mengunci jadwal**. Kalender bersama tidak mengungkap pemohon, tujuan, atau alasan pemeliharaan. Detail pengajuan hanya dapat dibaca pemilik/admin.

## Arsitektur dan API

`app/` berisi UI dan middleware navigasi; `server/api/` menangani HTTP; `server/utils/reservations.ts` memusatkan transaksi; `shared/` berisi kontrak dan aturan waktu. PostgreSQL merupakan sumber kebenaran; middleware frontend bukan batas keamanan.

| Endpoint | Akses / fungsi |
| --- | --- |
| `POST /api/auth/login` | Email dan kata sandi; sesi 8 jam |
| `GET /api/auth/me`, `POST /api/auth/logout` | Pengguna aktif / akhiri sesi |
| `GET /api/rooms` | Ruang aktif, filter `search`, `capacity`, `amenity` |
| `GET /api/rooms/:id` | Detail ruang |
| `GET /api/rooms/:id/availability?from=&to=` | Interval ISO 8601, maksimal 32 hari, tanpa informasi privat |
| `POST /api/reservations` | `roomId`, `startAt`, `endAt`, `attendees`, `purpose` |
| `GET /api/reservations/mine` | Pengajuan milik pengguna |
| `GET /api/reservations/:id` | Detail, riwayat, dan indikasi bentrok untuk pemilik/admin |
| `POST /api/reservations/:id/cancel` | Pembatalan sebelum mulai; admin wajib mengirim `reason` |
| `GET /api/admin/reservations` | Daftar seluruh pengajuan |
| `POST /api/admin/reservations/:id/approve` | Persetujuan atomik |
| `POST /api/admin/reservations/:id/reject` | Penolakan dengan `reason` |
| `GET/POST /api/admin/rooms` | Daftar termasuk nonaktif / tambah ruang |
| `PATCH /api/admin/rooms/:id` | Ubah seluruh isian ruang |
| `POST /api/admin/rooms/:id/blocks` | `startAt`, `endAt`, `reason` |

Daftar reservasi menerima `search`, `status`, `roomId`, `date` (tanggal WIB), `sort` (`oldest`, `newest`, `schedule`), dan `page`; respons `{ items, total, page, pageSize: 20 }`. Filter UI disimpan pada query URL. Status database: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`. Availability menambahkan kategori `BLOCKED`.

Waktu disimpan UTC dan ditampilkan `Asia/Jakarta`, tanpa bergantung zona waktu komputer pengguna. Durasi 30 menit–8 jam, pengajuan maksimal 30 hari, dan peserta tidak boleh melebihi kapasitas. Rentang memakai batas `[mulai, selesai)`, sehingga pertemuan bersebelahan diperbolehkan.

Semua mutasi jadwal mengunci baris `Room` dengan `SELECT ... FOR UPDATE` dalam transaksi. Keputusan membaca ulang status dan bentrokan setelah memperoleh kunci. Pembuatan blokir dan perubahan ruang memakai kunci yang sama; perubahan status serta audit event dikomit bersama. `PENDING` boleh tumpang tindih; `APPROVED` dan pemeliharaan memblokir slot. Konflik HTTP 409, input invalid 422, sesi tidak valid 401, hak admin tidak sesuai 403, dan pengajuan bukan milik pengguna 404.

Kata sandi di-hash Argon2id. Token sesi acak disimpan sebagai hash SHA-256 dalam database, cookie HttpOnly/SameSite=Lax dan Secure pada produksi. Mutasi memeriksa origin dan Fetch Metadata; endpoint login memiliki pembatas percobaan per proses. Seluruh respons data dan halaman dinamis menggunakan `Cache-Control: no-store`.

## Pengujian

```powershell
npm run typecheck
npm run lint
npm test
# Gunakan database PostgreSQL uji tersendiri yang telah dimigrasi.
$env:DATABASE_URL = 'postgresql://reservasi:reservasi_local@localhost:5432/reservasi_test?schema=public'
npm run db:migrate
npm run test:integration
# Seed diperlukan untuk pengujian browser.
npm run db:seed
npx playwright install chromium
npm run test:e2e
npm run build
```

Integrasi menggunakan PostgreSQL nyata, membuat data dengan prefix acak, dan membersihkan hanya datanya sendiri. Skenario meliputi dua persetujuan serentak, persetujuan vs. pemeliharaan, batas waktu bersebelahan, pembatalan, kapasitas, status final, dan ruang nonaktif. Playwright menguji login/peran, privasi, alur pengajuan sampai pembatalan, administrasi, fokus dialog, serta viewport 360/768/1440 px. Playwright memulai server dev otomatis; jangan arahkan pengujian browser ke database produksi karena pengujian menambahkan data.

## Build dan deployment

1. Siapkan PostgreSQL privat dan `DATABASE_URL` untuk lingkungan tujuan; gunakan akun database khusus.
2. Jalankan `npm ci`, `npm run db:migrate`, dan `npm run build` pada mesin build dengan platform yang sama dengan server runtime (Prisma/Argon2 memiliki binary native).
3. Jalankan `node .output/server/index.mjs` dengan `DATABASE_URL`, `HOST=127.0.0.1`, dan `PORT` melalui environment layanan. Runtime hasil build tidak otomatis membaca `.env`.
4. Letakkan reverse proxy HTTPS di depan server. Teruskan host/protokol asli secara benar untuk pemeriksaan origin. Jangan cache halaman internal atau `/api/*`.
5. Untuk demo privat, seed sekali dengan `DEMO_PASSWORD` yang dipilih. Penyediaan akun produksi dilakukan administrator melalui database/script terkontrol; registrasi publik tidak tersedia.

Periksa log error server, backup database, dan jalankan migrasi sebagai langkah rilis tunggal sebelum mengganti proses aplikasi. Batasi ukuran request pada reverse proxy. Jika menjalankan banyak instance, gunakan pembatas login terpusat pada proxy karena limiter aplikasi berada di memori tiap proses. Sesi kedaluwarsa tidak berlaku lagi; pembersihan berkala dapat menghapus baris `Session` dengan `expiresAt < now()`.

Dependency Nuxt/UI dikunci melalui lockfile. Override `deepmerge-ts` dan `effect` pada konfigurasi Prisma serta `esbuild` memakai rilis perbaikan; validasi migrasi, generate, dan build setelah memperbaruinya.

## Batas MVP

Satu organisasi, satu ruang per reservasi, fasilitas sebagai atribut ruang. Tidak ada SSO, registrasi/reset kata sandi mandiri, email, reservasi berulang, upload foto, pembayaran, integrasi kalender eksternal, pemesanan barang terpisah, atau penghapusan riwayat. Penjadwalan ulang memakai pembatalan dan pengajuan baru. Hosting publik tidak dikonfigurasi otomatis.

