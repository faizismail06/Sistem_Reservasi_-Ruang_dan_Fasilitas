<script setup lang="ts">
import type { Room } from '#shared/types'
const search = ref(''),
  capacity = ref(0),
  amenity = ref('ALL')
const amenityQuery = computed(() => (amenity.value === 'ALL' ? '' : amenity.value))
const {
  data: rooms,
  status,
  error,
  refresh
} = await useFetch<Room[]>('/api/rooms', { query: { search, capacity, amenity: amenityQuery } })
const amenities = [
  { label: 'Semua fasilitas', value: 'ALL' },
  ...['Layar presentasi', 'Papan tulis', 'Video konferensi', 'Proyektor'].map((value) => ({
    label: value,
    value
  }))
]
</script>
<template>
  <div>
    <PageHeading
      title="Ruang & Kalender"
      description="Temukan ruang yang sesuai, periksa jadwal, lalu ajukan reservasi."
      eyebrow="FASILITAS KANTOR"
      ><UButton to="/reservasi/baru" icon="i-lucide-plus">Ajukan Reservasi</UButton></PageHeading
    >
    <div class="toolbar">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Cari nama atau lokasi ruang"
        aria-label="Cari ruang"
        class="search-input"
      /><UInput
        v-model.number="capacity"
        type="number"
        :min="0"
        :max="1000"
        aria-label="Kapasitas minimal"
        class="capacity-input"
        ><template #leading><UIcon name="i-lucide-users" /></template
        ><template #trailing><span class="text-xs text-muted">orang min.</span></template></UInput
      ><USelect v-model="amenity" :items="amenities" aria-label="Filter fasilitas" class="filter-input" />
    </div>
    <div class="section-line">
      <span>Ruang tersedia untuk reservasi</span
      ><span class="text-muted">{{ rooms?.length || 0 }} ruang</span>
    </div>
    <LoadState
      :pending="status === 'pending'"
      :error="error"
      :empty="!rooms?.length"
      empty-text="Tidak ada ruang yang sesuai"
      @retry="refresh"
      ><div class="room-grid">
        <NuxtLink v-for="room in rooms" :key="room.id" :to="`/ruang/${room.id}`" class="room-card"
          ><div class="flex items-start justify-between">
            <span class="room-symbol"><UIcon name="i-lucide-door-open" /></span
            ><span class="text-xs text-muted">Aktif</span>
          </div>
          <h2>{{ room.name }}</h2>
          <p class="text-muted">{{ room.location }}</p>
          <p class="room-capacity"><UIcon name="i-lucide-users" /> Kapasitas {{ room.capacity }} orang</p>
          <p class="room-description">{{ room.description }}</p>
          <div class="amenities">
            <span v-for="item in room.amenities" :key="item">{{ item }}</span>
          </div>
          <div class="room-card-footer">Lihat ketersediaan <UIcon name="i-lucide-arrow-up-right" /></div
        ></NuxtLink></div
    ></LoadState>
  </div>
</template>
