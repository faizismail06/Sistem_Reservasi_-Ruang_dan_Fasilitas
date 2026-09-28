<script setup lang="ts">
import { z } from 'zod'
import type { Account } from '#shared/types'
definePageMeta({ layout: false })
const ready = ref(false)
onMounted(() => {
  ready.value = true
})
const { account } = useAccount()
const { message } = useFeedback()
const state = reactive({ email: '', password: '' })
const schema = z.object({
  email: z.string().email('Masukkan email yang valid.'),
  password: z.string().min(1, 'Kata sandi wajib diisi.')
})
const busy = ref(false),
  error = ref('')
async function submit() {
  busy.value = true
  error.value = ''
  try {
    account.value = await $fetch<Account>('/api/auth/login', { method: 'POST', body: state })
    await navigateTo(account.value.role === 'ADMIN' ? '/admin/pengajuan' : '/ruang')
  } catch (e) {
    error.value = message(e)
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <main class="login-page">
    <div class="login-card">
      <div class="brand mb-9">
        <span class="brand-mark"><UIcon name="i-lucide-panels-top-left" /></span
        ><span>Ruang Kantor<small>RESERVASI INTERNAL</small></span>
      </div>
      <h1>Masuk ke ruang kerja</h1>
      <p class="text-muted mt-2 mb-7">Kelola jadwal rapat dan penggunaan ruang kantor.</p>
      <UForm :schema="schema" :state="state" :disabled="!ready" class="space-y-5" @submit="submit"
        ><UFormField name="email" label="Email kantor" required
          ><UInput
            v-model="state.email"
            type="email"
            placeholder="nama@kantor.co.id"
            autocomplete="username"
            class="w-full" /></UFormField
        ><UFormField name="password" label="Kata sandi" required
          ><UInput v-model="state.password" type="password" autocomplete="current-password" class="w-full"
        /></UFormField>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <UButton type="submit" block :loading="busy">Masuk <UIcon name="i-lucide-arrow-right" /></UButton
      ></UForm>
      <p class="login-note">Akses khusus pegawai. Hubungi administrator untuk mendapatkan akun.</p>
    </div>
  </main>
</template>
