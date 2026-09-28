# Hasil validasi MVP

Pembaruan 28 September 2026: landing page publik diperiksa pada 360/768/1440 px tanpa overflow dan tanpa error JavaScript. Tombol masuk menuju `/login`; akses langsung halaman admin tanpa sesi tetap diarahkan ke login. Typecheck dan lint lulus. Pilihan ruang pada landing page merupakan konten editorial berdasarkan katalog seed; informasi terkini dan ketersediaan dapat dilihat setelah login. Halaman publik tidak mengambil data reservasi privat.

Diperiksa pada 27 September 2026 menggunakan Windows, Node.js 25.7.0, PostgreSQL 17 lokal terpisah, dan Chromium Playwright. Node.js 22/24 LTS disarankan untuk instalasi baru sesuai README.

| Pemeriksaan | Hasil |
| --- | --- |
| TypeScript / Nuxt typecheck | Lulus |
| ESLint | Lulus |
| Vitest aturan waktu dan input | 10 lulus |
| Integrasi PostgreSQL nyata | 5 lulus |
| Playwright alur dan responsif | 6 lulus |
| Pengulangan logout dan layar 360 px setelah penyempurnaan | 2 lulus |
| Audit dependency setelah pembaruan | 0 kerentanan dilaporkan |
| Build produksi Nuxt/Nitro | Lulus |
| Smoke test hasil build | Login admin, pemuatan pengajuan dari PostgreSQL, dan validasi tanggal invalid (422) lulus; tanpa error JavaScript |

Integrasi mencakup persetujuan serentak untuk slot bertabrakan, persetujuan bersamaan dengan pemeliharaan, batas slot yang bersebelahan, pelepasan slot saat dibatalkan, status final, kapasitas, serta ruang nonaktif. Pengujian menggunakan database nyata, bukan mock transaksi.

Pengujian browser mencakup akses tanpa login, hak admin, privasi detail pengajuan dan kalender, pengajuan sampai persetujuan/pembatalan, pembuatan/nonaktivasi ruang, penolakan dengan alasan, blokir pemeliharaan, fokus dialog dengan keyboard, dan viewport 360/768/1440 px. Screenshot tersimpan sebagai artefak lokal dalam `test-results/` ketika pengujian dijalankan; direktori ini tidak masuk version control.

Data sementara pengujian browser pada sesi implementasi telah dibersihkan. Data demo akhir kembali menjadi 6 ruang, 10 akun, 30 reservasi, dan 3 blokir. Menjalankan ulang suite browser akan menambahkan data uji pada database yang dipilih; gunakan database uji tersendiri seperti petunjuk README.

