<script setup lang="ts">
import { id } from '@nuxt/ui/locale'
const ready = ref(false)
onNuxtReady(() => {
  ready.value = true
})
</script>
<template>
  <UApp :locale="id">
    <div :inert="!ready" :aria-busy="!ready">
      <NuxtLayout><NuxtPage /></NuxtLayout>
    </div>
  </UApp>
</template>
