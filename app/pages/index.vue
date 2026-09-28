<script setup lang="ts">
definePageMeta({ layout: false })
useSeoMeta({
  title: 'Ruang Kantor · Reservasi ruang dan fasilitas',
  description:
    'Periksa ketersediaan ruang, ajukan jadwal kegiatan, dan pantau persetujuan dalam satu aplikasi internal.'
})
const steps = [
  {
    number: '01',
    icon: 'i-lucide-calendar-search',
    title: 'Temukan ruang yang sesuai',
    description: 'Cari berdasarkan kapasitas dan fasilitas, lalu periksa kalender ketersediaannya.'
  },
  {
    number: '02',
    icon: 'i-lucide-clipboard-pen',
    title: 'Ajukan waktu kegiatan',
    description: 'Tentukan jadwal, jumlah peserta, dan tujuan. Tinjau ringkasannya sebelum mengirim.'
  },
  {
    number: '03',
    icon: 'i-lucide-circle-check',
    title: 'Pantau keputusan admin',
    description: 'Lihat status dan alasan keputusan. Jadwal terkunci setelah pengajuan disetujui.'
  }
]
// Pilihan editorial untuk halaman publik; katalog terkini tetap tersedia setelah login.
const featuredRooms = [
  {
    name: 'Ruang Merapi',
    location: 'Lantai 2 · Gedung Utama',
    capacity: 12,
    amenities: ['Layar presentasi', 'Papan tulis', 'Video konferensi']
  },
  {
    name: 'Ruang Cendana',
    location: 'Lantai 3 · Gedung Utama',
    capacity: 20,
    amenities: ['Proyektor', 'Papan tulis', 'Video konferensi']
  },
  {
    name: 'Ruang Kenanga',
    location: 'Lantai 1 · Gedung Utama',
    capacity: 6,
    amenities: ['Layar presentasi', 'Papan tulis']
  }
]
</script>

<template>
  <div class="landing">
    <a href="#informasi" class="skip-link">Lewati ke konten</a>
    <header class="landing-header">
      <div class="landing-container header-inner">
        <NuxtLink to="/" class="brand" aria-label="Ruang Kantor, beranda">
          <span class="brand-mark"><UIcon name="i-lucide-panels-top-left" /></span>
          <span>Ruang Kantor<small>RESERVASI INTERNAL</small></span>
        </NuxtLink>
        <nav aria-label="Navigasi halaman awal" class="landing-nav">
          <a href="#cara-pengajuan" class="section-link">Cara pengajuan</a>
          <UButton to="/login" icon="i-lucide-log-in" variant="outline">Masuk</UButton>
        </nav>
      </div>
    </header>

    <main id="informasi" class="landing-container" tabindex="-1">
      <section class="introduction" aria-labelledby="landing-title">
        <div class="intro-copy">
          <p class="intro-label"><span class="label-line" /> RUANG & FASILITAS KANTOR</p>
          <h1 id="landing-title">Ruang yang tepat.<br />Jadwal yang tertata.</h1>
          <p class="intro-description">
            Siapkan ruang untuk pekerjaan yang perlu diselesaikan bersama. Periksa jadwal, ajukan reservasi,
            dan pantau persetujuannya dalam satu tempat.
          </p>
          <div class="intro-actions">
            <UButton to="/login" size="lg" trailing icon="i-lucide-arrow-right">Masuk ke aplikasi</UButton>
            <a href="#cara-pengajuan" class="guide-link"
              >Lihat cara pengajuan <UIcon name="i-lucide-arrow-down"
            /></a>
          </div>
          <p class="access-note">
            <UIcon name="i-lucide-lock-keyhole" /> Khusus pegawai. Gunakan akun yang diberikan administrator.
          </p>
        </div>

        <section class="rooms-preview" aria-labelledby="featured-rooms-title">
          <div class="preview-title">
            <div>
              <p class="preview-eyebrow">KENALI RUANG KANTOR</p>
              <h2 id="featured-rooms-title">Pilihan ruang & fasilitas</h2>
            </div>
          </div>
          <div class="featured-rooms">
            <article v-for="room in featuredRooms" :key="room.name" class="featured-room">
              <div class="room-heading">
                <span class="room-icon"><UIcon name="i-lucide-door-open" /></span>
                <div class="room-identity">
                  <h3>{{ room.name }}</h3>
                  <p>{{ room.location }}</p>
                </div>
                <span class="room-capacity"><UIcon name="i-lucide-users" />{{ room.capacity }} orang</span>
              </div>
              <ul class="room-amenities" aria-label="Fasilitas ruang">
                <li v-for="amenity in room.amenities" :key="amenity">{{ amenity }}</li>
              </ul>
            </article>
          </div>
          <div class="rooms-access">
            <UButton to="/login" icon="i-lucide-arrow-right" trailing block
              >Masuk untuk cek ketersediaan</UButton
            >
            <p>Daftar ruang dan informasi terbaru tersedia di dalam aplikasi.</p>
          </div>
        </section>
      </section>

      <section id="cara-pengajuan" class="steps-section" aria-labelledby="steps-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">ALUR RESERVASI</p>
            <h2 id="steps-title">Dari kebutuhan ruang ke jadwal yang pasti.</h2>
          </div>
          <p>Tiga langkah untuk memulai kegiatan Anda.</p>
        </div>
        <div class="steps-grid">
          <article v-for="step in steps" :key="step.number" class="step-card">
            <div class="step-top">
              <UIcon :name="step.icon" /><span>{{ step.number }}</span>
            </div>
            <h3>{{ step.title }}</h3>
            <p>{{ step.description }}</p>
          </article>
        </div>
      </section>

      <section class="guidelines" aria-labelledby="guidelines-title">
        <div class="guidelines-title">
          <UIcon name="i-lucide-notebook-tabs" />
          <h2 id="guidelines-title">Sebelum mengajukan</h2>
        </div>
        <dl class="guidelines-grid">
          <div>
            <dt>Rencanakan lebih awal</dt>
            <dd>Pengajuan maksimal 30 hari ke depan.</dd>
          </div>
          <div>
            <dt>Sesuaikan durasi</dt>
            <dd>30 menit hingga 8 jam per reservasi.</dd>
          </div>
          <div>
            <dt>Perhatikan status</dt>
            <dd>Pengajuan menunggu belum mengunci ruang.</dd>
          </div>
        </dl>
      </section>

      <section class="access-panel" aria-labelledby="access-title">
        <div>
          <h2 id="access-title">Sudah punya agenda berikutnya?</h2>
          <p>Masuk untuk menemukan ruang dan melihat jadwal yang tersedia.</p>
        </div>
        <UButton to="/login" icon="i-lucide-arrow-right" trailing size="lg">Buka ruang kerja</UButton>
      </section>
    </main>

    <footer class="landing-footer">
      <div class="landing-container footer-inner">
        <span>Ruang Kantor <span class="footer-divider">/</span> Sistem reservasi ruang dan fasilitas</span
        ><span>Zona waktu Asia/Jakarta · WIB</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing {
  background: #fff;
  min-height: 100vh;
}
.landing-container {
  width: min(1120px, calc(100% - 64px));
  margin: 0 auto;
}
.landing-header {
  border-bottom: 1px solid #e2e8f0;
}
.header-inner {
  min-height: 88px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}
.landing-nav {
  display: flex;
  align-items: center;
  gap: 30px;
}
.section-link {
  color: #475569;
  font-size: 13px;
}
.section-link:hover,
.guide-link:hover {
  color: #2563eb;
}
.introduction {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  align-items: center;
  gap: 72px;
  padding: 76px 0 64px;
}
.intro-label {
  color: #475569;
  letter-spacing: 0.12em;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
}
.label-line {
  display: inline-block;
  width: 24px;
  height: 2px;
  background: #2563eb;
}
h1 {
  font-size: clamp(30px, 3.4vw, 44px);
  line-height: 1.2;
  letter-spacing: -0.04em;
  font-weight: 650;
}
.intro-description {
  color: #475569;
  line-height: 1.9;
  max-width: 460px;
  margin-top: 24px;
  font-size: 15px;
}
.intro-actions {
  display: flex;
  gap: 22px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 30px;
}
.guide-link {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
}
.access-note {
  display: flex;
  gap: 7px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.7;
  margin-top: 22px;
}
.access-note > span {
  flex-shrink: 0;
  margin-top: 3px;
}
.rooms-preview {
  background: #fff;
  border: 1px solid #dbe2eb;
  border-radius: 8px;
  overflow: hidden;
}
.preview-title {
  padding: 22px 22px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.preview-eyebrow {
  font-size: 12px;
  letter-spacing: 0.08em;
  color: #64748b;
  margin-bottom: 7px;
}
.preview-title h2 {
  font-size: 18px;
}
.featured-rooms {
  padding: 0 18px;
}
.featured-room {
  padding: 17px 0;
  border-top: 1px solid #e2e8f0;
}
.room-heading {
  display: flex;
  align-items: center;
  gap: 10px;
}
.room-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #f8fafc;
  color: #475569;
  font-size: 18px;
}
.room-identity {
  min-width: 0;
  flex: 1;
}
.room-identity h3 {
  font-size: 14px;
}
.room-identity p {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}
.room-capacity {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  color: #475569;
  font-size: 12px;
  margin: 0;
}
.room-amenities {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 12px;
}
.room-amenities li {
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: #f8fafc;
  padding: 3px 7px;
  font-size: 12px;
  color: #475569;
}
.rooms-access {
  padding: 18px;
  border-top: 1px solid #e2e8f0;
  background: #fafbfc;
}
.rooms-access p {
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
  text-align: center;
  margin-top: 10px;
}
.steps-section {
  scroll-margin-top: 24px;
  padding: 40px 0;
  border-top: 1px solid #e2e8f0;
}
.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 25px;
}
.section-heading h2 {
  font-size: 22px;
  letter-spacing: -0.02em;
}
.section-heading > p {
  color: #64748b;
  font-size: 13px;
}
.steps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.step-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 23px;
}
.step-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #2563eb;
  font-size: 23px;
  margin-bottom: 22px;
}
.step-top > span:last-child {
  color: #94a3b8;
  font-size: 12px;
}
.step-card h3 {
  font-size: 15px;
  margin-bottom: 10px;
}
.step-card p {
  color: #64748b;
  font-size: 13px;
  line-height: 1.8;
}
.guidelines {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  padding: 23px;
}
.guidelines-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}
.guidelines-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 26px;
}
.guidelines-grid dt {
  font-weight: 500;
  font-size: 13px;
  margin-bottom: 6px;
}
.guidelines-grid dd {
  color: #64748b;
  font-size: 12px;
  line-height: 1.7;
}
.access-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 25px;
  padding: 44px 0 50px;
}
.access-panel h2 {
  font-size: 20px;
  margin-bottom: 9px;
}
.access-panel p {
  color: #64748b;
  font-size: 13px;
  line-height: 1.8;
}
.landing-footer {
  display: block;
  background: #fafbfc;
  padding: 23px 0;
  font-size: 12px;
}
.footer-inner {
  display: flex;
  justify-content: space-between;
  gap: 18px;
}
.footer-divider {
  margin: 0 10px;
  color: #cbd5e1;
}
.skip-link {
  position: absolute;
  top: -100px;
  left: 16px;
  background: white;
  padding: 12px;
  z-index: 10;
}
.skip-link:focus {
  top: 12px;
}
@media (max-width: 1000px) {
  .introduction {
    gap: 32px;
  }
  .intro-actions {
    gap: 16px;
  }
  .section-heading {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  .preview-title {
    align-items: flex-start;
    flex-direction: column;
  }
}
@media (max-width: 720px) {
  .landing-container {
    width: calc(100% - 40px);
  }
  .introduction {
    grid-template-columns: 1fr;
    padding: 42px 0;
    gap: 32px;
  }
  .intro-description {
    max-width: none;
  }
  .preview-title {
    flex-direction: row;
    align-items: center;
  }
  .steps-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .step-card {
    padding: 20px;
  }
  .step-top {
    margin-bottom: 14px;
  }
  .guidelines-grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }
  .access-panel {
    align-items: flex-start;
    flex-direction: column;
    padding: 32px 0;
  }
  .section-link {
    display: none;
  }
  .header-inner {
    min-height: 78px;
  }
  .footer-inner {
    flex-direction: column;
  }
  .landing-footer span {
    display: inline;
  }
  .section-heading h2 {
    font-size: 20px;
  }
}
@media (max-width: 380px) {
  .landing-container {
    width: calc(100% - 32px);
  }
  .brand {
    gap: 8px;
    font-size: 15px;
  }
  .brand small {
    font-size: 10px;
  }
  .preview-title {
    padding-inline: 16px;
  }
  .preview-eyebrow {
    font-size: 11px;
  }
}
</style>
