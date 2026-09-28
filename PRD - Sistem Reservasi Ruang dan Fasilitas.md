# PRD — Sistem Reservasi Ruang dan Fasilitas

**Versi:** 1.1 · **Status:** MVP diimplementasikan · **Platform:** Web internal responsif · **Stack:** Nuxt 4, Nuxt UI 4, TypeScript, PostgreSQL, Prisma

## 1. Ringkasan

Aplikasi untuk melihat ketersediaan ruang/fasilitas, mengajukan reservasi, dan mengelola persetujuannya. Contoh konteks: kantor atau kampus dengan ruang rapat, aula, studio, dan proyektor. Pengguna dapat memilih tanggal dan jam, sedangkan admin mengelola inventaris fasilitas serta memutuskan pengajuan. Sistem menjaga agar satu ruang tidak memiliki reservasi aktif yang bertabrakan.

**Tujuan portofolio:** menunjukkan kemampuan full stack Nuxt, otorisasi peran, validasi rentang waktu, transaksi database, dan antarmuka kalender yang berguna.

## 2. Masalah dan tujuan

Tanpa satu jadwal bersama, pengajuan reservasi lewat chat mudah terlewat dan dua orang dapat memakai ruang yang sama pada waktu bersamaan. Sistem ini memberi jadwal yang dapat dilihat, keputusan yang terlacak, dan penolakan otomatis untuk bentrokan jadwal.

**Indikator keberhasilan versi awal:** pengguna dapat membuat pengajuan yang valid, admin dapat memutuskan pengajuan, dan sistem tidak pernah menyimpan dua reservasi yang sudah disetujui pada waktu bertabrakan untuk ruang yang sama, termasuk saat dua admin menyetujui hampir bersamaan.

## 3. Pengguna dan hak akses

| Peran | Hak utama |
|---|---|
| Pemohon | Melihat daftar dan kalender ruang, mengajukan reservasi, melihat status pengajuan sendiri, membatalkan pengajuan sendiri sesuai aturan |
| Admin | Semua hak pemohon; menambah/mengubah/menonaktifkan ruang, melihat semua pengajuan, menyetujui atau menolak dengan alasan, memblokir ruang untuk pemeliharaan |

Akun contoh untuk demo boleh disediakan dengan data fiktif. Seluruh halaman kerja serta operasi baca/tulis API mensyaratkan sesi login; perubahan hak akses diperiksa di server.

## 4. Ruang lingkup MVP

### P0 — wajib

1. **Autentikasi:** login dan logout; akun pemohon dan admin disiapkan melalui seed untuk demo. Pengguna hanya bisa membaca atau mengubah pengajuannya sendiri.
2. **Katalog:** nama, lokasi, kapasitas, deskripsi, foto opsional, fasilitas yang tersedia, status aktif/nonaktif. Pencarian dan filter kapasitas/fasilitas.
3. **Kalender ketersediaan:** tampilan harian/mingguan untuk satu ruang; tampilkan waktu terisi dan blokir tanpa mengekspos identitas atau detail privat pemohon kepada pengguna lain.
4. **Pengajuan:** pilih ruang, tanggal, jam mulai dan selesai, jumlah peserta, tujuan kegiatan. Pengguna melihat ringkasan sebelum menyimpan. Status awal `PENDING`.
5. **Persetujuan:** admin dapat `APPROVE` atau `REJECT`; penolakan memerlukan alasan. Pemohon dapat melihat status dan alasan keputusan.
6. **Pembatalan:** pemohon dapat membatalkan pengajuan miliknya sebelum waktu mulai. Admin dapat membatalkan dengan alasan. Reservasi yang dibatalkan tidak lagi memblokir slot.
7. **Blokir pemeliharaan:** admin menetapkan rentang waktu ruang tidak dapat digunakan; tidak boleh menimpa reservasi yang sudah disetujui.
8. **Riwayat:** setiap keputusan mencatat pelaku, waktu, tindakan, dan alasan jika ada.

### P1 — setelah MVP

Notifikasi email, unggah foto ruang, ekspor jadwal CSV, reservasi berulang, pengingat otomatis, aturan jam operasional per ruang, dan dashboard tingkat pemakaian. Fitur P1 tidak menjadi syarat selesai MVP.

## 5. Aturan bisnis

- Semua waktu disimpan sebagai UTC dan ditampilkan dalam zona waktu yang dipilih organisasi; default demo **Asia/Jakarta**. Form menampilkan zona waktu dengan jelas.
- `start_at < end_at`; tanggal mulai harus di masa depan. Untuk MVP, durasi 30 menit–8 jam dan pengajuan maksimal 30 hari ke depan. Nilai ini dapat diubah lewat konfigurasi.
- Dua rentang bentrok apabila `startA < endB` **dan** `endA > startB`. Pertemuan tepat pada batas akhir diperbolehkan: 10.00–11.00 dan 11.00–12.00 tidak bentrok.
- Slot tidak boleh bertabrakan dengan reservasi `APPROVED` atau blokir pemeliharaan. Pengajuan `PENDING` lain boleh berada di slot yang sama; admin hanya dapat menyetujui satu pengajuan yang bentrok. Antarmuka menandai bahwa slot tersebut memiliki pengajuan lain, tanpa menjanjikan ketersediaannya.
- Validasi ketersediaan dilakukan saat mengajukan **dan diulang secara atomik saat menyetujui**. Pemeriksaan terakhir harus berada dalam transaksi dengan penguncian per ruang atau batasan database yang setara, supaya dua persetujuan serentak tidak lolos. Jika gagal, kembalikan konflik HTTP 409 dan minta admin memilih slot lain/menolak.
- Reservasi `REJECTED`/`CANCELLED` tidak menghalangi slot. Keputusan final tidak dapat dibalik pada MVP; buat pengajuan baru bila diperlukan.
- Ruang nonaktif tidak menerima pengajuan baru, tetapi riwayatnya tetap tersimpan.
- Pemohon hanya dapat membatalkan reservasi sendiri sebelum `start_at`; admin dapat membatalkan sebelum mulai dengan alasan. Perubahan jadwal dilakukan lewat pembatalan dan pengajuan ulang pada MVP.

## 6. Alur utama

1. Pemohon membuka katalog → memilih ruang → melihat kalender.
2. Pemohon memilih rentang waktu → sistem memvalidasi waktu, kapasitas, dan bentrokan → menyimpan `PENDING`.
3. Admin membuka antrean pengajuan → melihat detail → memilih setujui atau tolak.
4. Saat setujui, server memeriksa ulang slot secara atomik. Jika kosong, status menjadi `APPROVED` dan kalender diperbarui; jika bentrok, persetujuan gagal dengan alasan jelas.
5. Pemohon melihat status dan dapat membatalkan sebelum acara dimulai.

## 7. Halaman

| Halaman | Isi utama |
|---|---|
| Katalog ruang | Kartu ruang, filter kapasitas/fasilitas, status |
| Detail ruang | Informasi ruang, kalender, tombol ajukan |
| Form pengajuan | Waktu, peserta, tujuan, validasi dan ringkasan |
| Reservasi saya | Daftar, status, detail, alasan penolakan, pembatalan |
| Admin: pengajuan | Filter status/tanggal, detail, setujui/tolak |
| Admin: ruang | Tambah, ubah, nonaktifkan ruang, blokir pemeliharaan |

Sediakan keadaan kosong, loading, kegagalan jaringan, validasi form, dan pesan konflik jadwal yang dapat ditindaklanjuti. Antarmuka dapat dipakai di ponsel.

## 8. Model data awal

| Entitas | Kolom utama |
|---|---|
| User | id, name, email unik, password_hash, role, created_at |
| Room | id, name, location, capacity, description, amenities, is_active, created_at, updated_at |
| Reservation | id, room_id, user_id, start_at, end_at, attendees, purpose, status, decision_reason, decided_by, decided_at, created_at, updated_at |
| MaintenanceBlock | id, room_id, start_at, end_at, reason, created_by, created_at |
| ReservationEvent | id, reservation_id, actor_id, action, note, created_at |

Gunakan foreign key dan indeks pada `(room_id, start_at, end_at)` serta `(user_id, created_at)`. Jangan hapus fisik reservasi yang memiliki riwayat.

## 9. API awal

| Method | Endpoint | Akses | Hasil |
|---|---|---|---|
| GET | `/api/rooms` | Login | Daftar dan filter ruang aktif |
| GET | `/api/rooms/:id` | Login | Detail ruang |
| GET | `/api/rooms/:id/availability?from=&to=` | Login | Rentang waktu terisi dan blokir |
| POST | `/api/reservations` | Pemohon | Buat pengajuan |
| GET | `/api/reservations/mine` | Pemohon | Pengajuan sendiri |
| POST | `/api/reservations/:id/cancel` | Pemilik/Admin | Batalkan |
| GET | `/api/admin/reservations` | Admin | Antrean seluruh pengajuan |
| POST | `/api/admin/reservations/:id/approve` | Admin | Setujui setelah cek atomik |
| POST | `/api/admin/reservations/:id/reject` | Admin | Tolak dengan alasan |
| POST/PATCH | `/api/admin/rooms` dan `/api/admin/rooms/:id` | Admin | Kelola ruang |
| POST | `/api/admin/rooms/:id/blocks` | Admin | Buat blokir pemeliharaan |

Server harus memvalidasi input dan otorisasi pada setiap permintaan. Jangan percaya status, pemilik, atau peran yang dikirim dari browser.

## 10. Kriteria penerimaan utama

- Pengguna dapat mencari ruang berkapasitas minimal 10 orang dan melihat jadwalnya untuk tanggal tertentu.
- Pengajuan 10.00–11.00 ditolak jika ada reservasi disetujui 10.30–11.30 untuk ruang yang sama; pengajuan 11.30–12.30 diterima.
- Dua pengajuan `PENDING` pada slot sama dapat dibuat, tetapi hanya satu dapat disetujui; upaya persetujuan kedua mengembalikan konflik.
- Dua permintaan persetujuan serentak untuk slot bertabrakan tetap menghasilkan maksimal satu `APPROVED`.
- Pemohon tidak bisa membaca detail pengajuan orang lain atau memanggil endpoint admin.
- Pembatalan sebelum mulai melepaskan slot dan tercatat dalam riwayat; pembatalan setelah mulai ditolak.
- Admin tidak dapat membuat blokir yang menabrak reservasi disetujui.
- Waktu yang terlihat di UI sesuai zona waktu organisasi dan konsisten setelah halaman dimuat ulang.

## 11. Urutan pengerjaan

1. Inisialisasi Nuxt, database, migrasi, seed akun dan ruang contoh.
2. Sesi login, pemeriksaan peran di server, katalog dan detail ruang.
3. Model reservasi, validasi jadwal, form pengajuan, halaman reservasi saya.
4. Antrean admin, keputusan dan audit event; pastikan pemeriksaan bentrok atomik.
5. Kalender, blokir pemeliharaan, responsif, pesan kesalahan, dan data demo.
6. Uji alur pengguna serta skenario bentrok dan persetujuan serentak; terbitkan demo dan README berisi akun demo, arsitektur, serta batasan.

## 12. Batasan versi awal

Satu reservasi hanya untuk satu ruang. Tidak ada pembayaran, integrasi kalender eksternal, undangan peserta, atau pengulangan otomatis. Fasilitas seperti proyektor dicatat sebagai atribut ruang; pemesanan unit fasilitas terpisah memerlukan model ketersediaan tersendiri pada versi berikutnya.

## 13. Keputusan implementasi UI dan akses

Seluruh katalog dan kalender wajib login. Sidebar sederhana, tabel pengajuan padat, slideover detail dan riwayat, kalender harian/mingguan serta agenda ponsel. Tema terang, font sistem, satu aksen biru, ikon Lucide, garis pemisah tipis, tanpa hero marketing atau ilustrasi dekoratif. Pengajuan menunggu ditandai belum mengunci jadwal. Status ditulis dalam bahasa Indonesia dan tidak hanya dibedakan dengan warna. Lihat README.md untuk instalasi, akun demo, API, pengujian, dan deployment.

