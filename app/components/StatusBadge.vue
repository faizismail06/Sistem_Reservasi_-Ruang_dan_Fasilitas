<script setup lang="ts">
import { statusLabels } from '#shared/rules'
defineProps<{ status: string }>()
const icons: Record<string, string> = {
  PENDING: 'i-lucide-clock-3',
  APPROVED: 'i-lucide-circle-check',
  REJECTED: 'i-lucide-circle-x',
  CANCELLED: 'i-lucide-minus-circle',
  BLOCKED: 'i-lucide-wrench'
}
</script>
<template>
  <span class="status-badge" :class="status.toLowerCase()"
    ><UIcon :name="icons[status] || 'i-lucide-circle'" />{{ statusLabels[status] || status }}</span
  >
</template>
