<script setup lang="ts">
defineProps<{ title: string; description: string; eyebrow?: string }>()
</script>
<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">{{ eyebrow || 'RUANG KERJA' }}</p>
      <h1>{{ title }}</h1>
      <p class="text-muted mt-2">{{ description }}</p>
    </div>
    <div class="heading-actions"><slot /></div>
  </div>
</template>
