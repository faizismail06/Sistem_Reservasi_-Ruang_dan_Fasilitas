<script setup lang="ts">
import { z } from 'zod'
import type { Room, Interval } from '#shared/types'
import { jakartaDate, wibISO, timeError, dateLabel, timeLabel } from '#shared/rules'
const route = useRoute()
const { message, success } = useFeedback()
const { data: rooms, error: loadError, status, refresh } = await useFetch<Room[]>('/api/rooms')
const state = reactive({
  roomId: String(route.query.roomId || ''),
  date: String(route.query.date || jakartaDate(new Date(Date.now() + 86400_000))),
  start: String(route.query.start || '09:00'),
  end: '10:00',
  attendees: 4,
  purpose: ''
})
if (route.query.start) {
  const h = Number(state.start.split(':')[0])
  state.end = `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${h === 23 ? '59' : '00'}`
}
const room = computed(() => rooms.value?.find((r) => r.id === state.roomId))
const schema = z
  .object({
    roomId: z.string().min(1, 'Pilih ruang.'),
    date: z.string().min(1, 'Pilih tanggal.'),
    start: z.string().min(1, 'Isi jam mulai.'),
    end: z.string().min(1, 'Isi jam selesai.'),
    attendees: z.number().int().min(1, 'Minimal 1 peserta.'),
    purpose: z.string().trim().min(5, 'Tujuan minimal 5 karakter.').max(1000)
  })
  .superRefine((v, ctx) => {
    const error = timeError(
      new Date(`${v.date}T${v.start}:00+07:00`),
      new Date(`${v.date}T${v.end}:00+07:00`)
    )
    if (error) ctx.addIssue({ code: 'custom', path: ['end'], message: error })
    if (room.value && v.attendees > room.value.capacity)
      ctx.addIssue({
        code: 'custom',
        path: ['attendees'],
        message: `Kapasitas ruang maksimal ${room.value.capacity} orang.`
      })
  })
const busy = ref(false),
  reviewing = ref(false),
  error = ref(''),
  competing = ref(false)
const summary = ref<{
  roomId: string
  startAt: string
  endAt: string
  attendees: number
  purpose: string
} | null>(null)
async function review() {
  busy.value = true
  error.value = ''
  try {
    const input = {
      roomId: state.roomId,
      startAt: wibISO(state.date, state.start),
      endAt: wibISO(state.date, state.end),
      attendees: state.attendees,
      purpose: state.purpose.trim()
    }
    const intervals = await $fetch<Interval[]>(`/api/rooms/${state.roomId}/availability`, {
      query: { from: input.startAt, to: input.endAt }
    })
    if (intervals.some((i) => i.status !== 'PENDING')) {
      error.value = 'Jadwal sudah terisi atau diblokir. Pilih waktu lain.'
      return
    }
    competing.value = intervals.some((i) => i.status === 'PENDING')
    summary.value = input
    reviewing.value = true
  } catch (e) {
    error.value = message(e)
  } finally {
    busy.value = false
  }
}
async function submit() {
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/reservations', { method: 'POST', body: summary.value })
    success('Pengajuan berhasil dikirim')
    await refreshNuxtData()
    await navigateTo('/reservasi')
  } catch (e) {
    reviewing.value = false
    error.value = message(e)
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <div>
    <UButton to="/ruang" icon="i-lucide-arrow-left" variant="link" color="neutral" class="mb-5 px-0"
      >Kembali ke ruang</UButton
    ><PageHeading
      title="Ajukan Reservasi"
      description="Isi kebutuhan ruang dan waktu kegiatan Anda."
      eyebrow="PENGAJUAN BARU"
    /><LoadState :pending="status === 'pending'" :error="loadError" @retry="refresh"
      ><div class="form-layout">
        <div class="panel form-panel">
          <h2>Informasi kegiatan</h2>
          <p class="text-muted mb-6 mt-1">Semua waktu menggunakan WIB (UTC+7).</p>
          <UForm :schema="schema" :state="state" class="space-y-5" @submit="review"
            ><UFormField label="Ruang" name="roomId" required
              ><USelect
                v-model="state.roomId"
                :items="(rooms || []).map((r) => ({ label: `${r.name} · ${r.capacity} orang`, value: r.id }))"
                placeholder="Pilih ruang"
                class="w-full" /></UFormField
            ><UFormField label="Tanggal kegiatan" name="date" required
              ><UInput
                v-model="state.date"
                type="date"
                :min="jakartaDate()"
                :max="jakartaDate(new Date(Date.now() + 30 * 86400_000))"
                class="w-full"
            /></UFormField>
            <div class="form-row">
              <UFormField label="Jam mulai (WIB)" name="start" required
                ><UInput v-model="state.start" type="time" class="w-full" /></UFormField
              ><UFormField label="Jam selesai (WIB)" name="end" required
                ><UInput v-model="state.end" type="time" class="w-full"
              /></UFormField>
            </div>
            <UFormField label="Jumlah peserta" name="attendees" required
              ><UInput
                v-model.number="state.attendees"
                type="number"
                :min="1"
                :max="room?.capacity || 1000"
                class="w-full" /></UFormField
            ><UFormField
              label="Tujuan kegiatan"
              name="purpose"
              required
              help="Tuliskan nama kegiatan dan kebutuhan singkatnya."
              ><UTextarea
                v-model="state.purpose"
                placeholder="Contoh: Koordinasi Operasional — evaluasi pekerjaan mingguan"
                :rows="4"
                :maxlength="1000"
                class="w-full"
            /></UFormField>
            <div v-if="error" class="notice" role="alert">
              <p>{{ error }}</p>
              <UButton v-if="room" :to="`/ruang/${room.id}`" variant="link" class="px-0"
                >Lihat Jadwal Terbaru</UButton
              >
            </div>
            <div class="form-actions">
              <UButton to="/reservasi" color="neutral" variant="outline">Batal</UButton
              ><UButton type="submit" :loading="busy" icon="i-lucide-arrow-right" trailing
                >Tinjau Pengajuan</UButton
              >
            </div></UForm
          >
        </div>
        <aside class="form-aside">
          <h3>Ketentuan reservasi</h3>
          <ul>
            <li>Ajukan maksimal 30 hari sebelum kegiatan.</li>
            <li>Durasi penggunaan 30 menit hingga 8 jam.</li>
            <li>Pengajuan menunggu belum mengunci ruang.</li>
            <li>Jadwal dapat diubah dengan membatalkan lalu mengajukan kembali.</li>
          </ul>
          <div v-if="room" class="selected-room">
            <UIcon name="i-lucide-door-open" />
            <h3>{{ room.name }}</h3>
            <p>{{ room.location }}</p>
            <p>{{ room.amenities.join(' · ') }}</p>
            <UButton :to="`/ruang/${room.id}`" variant="link" class="px-0">Lihat ketersediaan</UButton>
          </div>
        </aside>
      </div></LoadState
    ><UModal
      v-model:open="reviewing"
      title="Tinjau pengajuan"
      description="Periksa ringkasan sebelum mengirim permintaan reservasi."
      ><template #body
        ><dl v-if="summary" class="detail-grid">
          <dt>Ruang</dt>
          <dd>{{ room?.name }}</dd>
          <dt>Tanggal</dt>
          <dd>{{ dateLabel(summary.startAt) }}</dd>
          <dt>Waktu</dt>
          <dd>{{ timeLabel(summary.startAt) }}–{{ timeLabel(summary.endAt) }} WIB</dd>
          <dt>Peserta</dt>
          <dd>{{ summary.attendees }} orang</dd>
          <dt>Tujuan</dt>
          <dd>{{ summary.purpose }}</dd>
        </dl>
        <p v-if="competing" class="notice">
          Ada pengajuan lain pada slot ini. Jadwal belum terkunci dan persetujuan bergantung pada keputusan
          admin.
        </p>
        <p class="text-muted mt-4">Status awal: Menunggu persetujuan admin.</p></template
      ><template #footer
        ><UButton color="neutral" variant="outline" :disabled="busy" @click="reviewing = false"
          >Perbaiki</UButton
        ><UButton :loading="busy" @click="submit">Kirim Pengajuan</UButton></template
      ></UModal
    >
  </div>
</template>
