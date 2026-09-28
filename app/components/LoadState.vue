<script setup lang="ts">
defineProps<{ pending?: boolean; error?: unknown; empty?: boolean; emptyText?: string }>()
defineEmits<{ retry: [] }>()
</script>
<template>
  <div v-if="pending" class="state-box" aria-label="Memuat data" aria-busy="true">
    <USkeleton v-for="n in 4" :key="n" class="h-10 w-full mb-3" />
  </div>
  <div v-else-if="error" class="state-box" role="alert">
    <UIcon name="i-lucide-wifi-off" class="text-2xl" />
    <h3>Data belum dapat dimuat</h3>
    <p>Periksa koneksi Anda, lalu coba kembali.</p>
    <UButton class="mt-4" variant="outline" @click="$emit('retry')">Coba lagi</UButton>
  </div>
  <div v-else-if="empty" class="state-box">
    <UIcon name="i-lucide-inbox" class="text-3xl text-muted" />
    <h3>{{ emptyText || 'Belum ada data' }}</h3>
    <p>Coba sesuaikan filter atau buat pengajuan baru.</p>
  </div>
  <slot v-else />
</template>
