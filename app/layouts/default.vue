<script setup lang="ts">
const { account, logout } = useAccount()
const open = ref(false)
const route = useRoute()
watch(
  () => route.path,
  () => {
    open.value = false
  }
)
const links = computed(() => [
  { label: 'Ruang & Kalender', icon: 'i-lucide-calendar-days', to: '/ruang' },
  { label: 'Reservasi Saya', icon: 'i-lucide-bookmark', to: '/reservasi' },
  ...(account.value?.role === 'ADMIN'
    ? [
        { label: 'Pengajuan', icon: 'i-lucide-inbox', to: '/admin/pengajuan' },
        { label: 'Kelola Ruang', icon: 'i-lucide-door-open', to: '/admin/ruang' }
      ]
    : [])
])
</script>
<template>
  <div class="workspace">
    <aside class="sidebar">
      <NuxtLink to="/" class="brand"
        ><span class="brand-mark"><UIcon name="i-lucide-panels-top-left" /></span
        ><span>Ruang Kantor<small>RESERVASI INTERNAL</small></span></NuxtLink
      >
      <p class="nav-label">AREA KERJA</p>
      <UNavigationMenu :items="links" orientation="vertical" class="w-full" />
      <div class="sidebar-note">
        <UIcon name="i-lucide-clock-3" /><span
          >Zona waktu kantor<br /><strong>Waktu Indonesia Barat</strong></span
        >
      </div>
    </aside>
    <div class="workspace-main">
      <header class="topbar">
        <div class="flex items-center gap-3">
          <UButton
            class="mobile-menu"
            icon="i-lucide-menu"
            color="neutral"
            variant="ghost"
            aria-label="Buka navigasi"
            @click="open = true"
          /><span class="text-muted">Operasional kantor</span><span class="header-divider">/</span
          ><span>Reservasi ruang</span>
        </div>
        <div class="account">
          <span class="avatar">{{ account?.name.slice(0, 1) }}</span
          ><span class="account-name"
            >{{ account?.name
            }}<small>{{ account?.role === 'ADMIN' ? 'Administrator' : 'Pegawai' }}</small></span
          ><UButton
            icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            aria-label="Keluar"
            @click="logout"
          />
        </div>
      </header>
      <main id="main" class="content"><slot /></main>
      <footer>Ruang Kantor <span>Seluruh jadwal ditampilkan dalam WIB (UTC+7)</span></footer>
    </div>
    <UDrawer v-model:open="open" direction="left" title="Navigasi" description="Menu ruang kerja"
      ><template #body><UNavigationMenu :items="links" orientation="vertical" /></template
    ></UDrawer>
  </div>
</template>
