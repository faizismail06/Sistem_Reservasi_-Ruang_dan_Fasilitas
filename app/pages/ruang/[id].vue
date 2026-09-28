<script setup lang="ts">
import type { Room } from '#shared/types'
const route = useRoute()
const { data: room, status, error, refresh } = await useFetch<Room>(`/api/rooms/${route.params.id}`)
</script>
<template>
  <div>
    <UButton to="/ruang" variant="link" color="neutral" icon="i-lucide-arrow-left" class="mb-5 px-0"
      >Semua ruang</UButton
    ><LoadState :pending="status === 'pending'" :error="error" @retry="refresh"
      ><template v-if="room"
        ><PageHeading :title="room.name" :description="room.location" eyebrow="DETAIL RUANG"
          ><UButton :to="`/reservasi/baru?roomId=${room.id}`" :disabled="!room.isActive" icon="i-lucide-plus"
            >Ajukan Reservasi</UButton
          ></PageHeading
        >
        <div class="room-info">
          <div>
            <span class="text-muted">Kapasitas</span><strong>{{ room.capacity }} orang</strong>
          </div>
          <div>
            <span class="text-muted">Fasilitas</span><strong>{{ room.amenities.join(' · ') || '—' }}</strong>
          </div>
          <div>
            <span class="text-muted">Tentang ruang</span><strong>{{ room.description || '—' }}</strong>
          </div>
        </div>
        <p v-if="!room.isActive" class="notice mb-5">
          Ruang sedang nonaktif dan tidak menerima pengajuan baru.
        </p>
        <RoomCalendar :room-id="room.id" :disabled="!room.isActive" /></template
    ></LoadState>
  </div>
</template>
