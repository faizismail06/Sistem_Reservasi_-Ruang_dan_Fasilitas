<script setup lang="ts">
import { z } from 'zod'
import type { Room } from '#shared/types'
import { jakartaDate, wibISO } from '#shared/rules'
const { data: rooms, status, error, refresh } = await useFetch<Room[]>('/api/admin/rooms')
const { message, success } = useFeedback()
const editing = ref(false),
  blocking = ref(false),
  editId = ref(''),
  busy = ref(false),
  formError = ref('')
const state = reactive({
  name: '',
  location: '',
  capacity: 8,
  description: '',
  amenities: '',
  isActive: true
})
const block = reactive({
  roomId: '',
  date: jakartaDate(new Date(Date.now() + 86400_000)),
  start: '08:00',
  end: '10:00',
  reason: ''
})
const schema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(80),
  location: z.string().trim().min(2, 'Lokasi wajib diisi.').max(100),
  capacity: z.number().int().min(1).max(1000),
  description: z.string().max(1000),
  amenities: z.string(),
  isActive: z.boolean()
})
const blockFormSchema = z
  .object({
    date: z.string().min(1),
    start: z.string().min(1),
    end: z.string().min(1),
    reason: z.string().trim().min(5, 'Alasan minimal 5 karakter.').max(1000)
  })
  .refine(
    (v) =>
      new Date(`${v.date}T${v.end}:00+07:00`) > new Date(`${v.date}T${v.start}:00+07:00`) &&
      new Date(`${v.date}T${v.start}:00+07:00`) > new Date(),
    { path: ['end'], message: 'Rentang harus valid dan di masa depan.' }
  )
function edit(room?: Room) {
  editId.value = room?.id || ''
  Object.assign(
    state,
    room
      ? { ...room, amenities: room.amenities.join(', ') }
      : { name: '', location: '', capacity: 8, description: '', amenities: '', isActive: true }
  )
  formError.value = ''
  editing.value = true
}
function blockRoom(id: string) {
  block.roomId = id
  block.reason = ''
  formError.value = ''
  blocking.value = true
}
async function save() {
  busy.value = true
  formError.value = ''
  try {
    await $fetch(`/api/admin/rooms${editId.value ? `/${editId.value}` : ''}`, {
      method: editId.value ? 'PATCH' : 'POST',
      body: {
        name: state.name,
        location: state.location,
        capacity: state.capacity,
        description: state.description,
        isActive: state.isActive,
        amenities: state.amenities
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      }
    })
    editing.value = false
    success('Data ruang disimpan')
    await refreshNuxtData()
  } catch (e) {
    formError.value = message(e)
  } finally {
    busy.value = false
  }
}
async function saveBlock() {
  busy.value = true
  formError.value = ''
  try {
    await $fetch(`/api/admin/rooms/${block.roomId}/blocks`, {
      method: 'POST',
      body: {
        startAt: wibISO(block.date, block.start),
        endAt: wibISO(block.date, block.end),
        reason: block.reason
      }
    })
    blocking.value = false
    success('Blokir pemeliharaan ditambahkan')
    await refreshNuxtData()
  } catch (e) {
    formError.value = message(e)
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <div>
    <PageHeading
      title="Kelola Ruang"
      description="Atur informasi ruang dan jadwalkan pemeliharaan fasilitas."
      eyebrow="ADMINISTRASI"
      ><UButton icon="i-lucide-plus" @click="edit()">Tambah Ruang</UButton></PageHeading
    ><LoadState :pending="status === 'pending'" :error="error" :empty="!rooms?.length" @retry="refresh"
      ><div class="panel">
        <div v-for="room in rooms" :key="room.id" class="manage-room">
          <span class="room-symbol"><UIcon name="i-lucide-door-open" /></span>
          <div class="manage-room-info">
            <h2>{{ room.name }} <span v-if="!room.isActive" class="count-pill">Nonaktif</span></h2>
            <p class="text-muted">{{ room.location }} · {{ room.capacity }} orang</p>
            <small class="text-muted">{{ room.amenities.join(' · ') }}</small>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton
              :to="`/ruang/${room.id}`"
              icon="i-lucide-calendar-days"
              variant="ghost"
              color="neutral"
              aria-label="Lihat kalender"
            /><UButton icon="i-lucide-wrench" variant="outline" color="neutral" @click="blockRoom(room.id)"
              >Pemeliharaan</UButton
            ><UButton icon="i-lucide-pencil" variant="outline" color="neutral" @click="edit(room)"
              >Ubah</UButton
            >
          </div>
        </div>
      </div></LoadState
    ><USlideover
      v-model:open="editing"
      :title="editId ? 'Ubah ruang' : 'Tambah ruang'"
      description="Informasi fasilitas yang ditampilkan kepada pegawai"
      ><template #body
        ><UForm :schema="schema" :state="state" class="space-y-5" @submit="save"
          ><UFormField name="name" label="Nama ruang" required
            ><UInput v-model="state.name" class="w-full" /></UFormField
          ><UFormField name="location" label="Lokasi" required
            ><UInput
              v-model="state.location"
              placeholder="Lantai 2 · Gedung Utama"
              class="w-full" /></UFormField
          ><UFormField name="capacity" label="Kapasitas (orang)" required
            ><UInput
              v-model.number="state.capacity"
              type="number"
              :min="1"
              :max="1000"
              class="w-full" /></UFormField
          ><UFormField name="description" label="Deskripsi"
            ><UTextarea v-model="state.description" class="w-full" /></UFormField
          ><UFormField
            name="amenities"
            label="Fasilitas"
            help="Pisahkan dengan koma. Contoh: Papan tulis, Proyektor"
            ><UInput v-model="state.amenities" class="w-full" /></UFormField
          ><USwitch
            v-model="state.isActive"
            label="Ruang aktif"
            description="Ruang nonaktif tidak menerima pengajuan dan persetujuan baru. Reservasi disetujui tetap berlaku."
          />
          <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
          <UButton type="submit" :loading="busy">Simpan Ruang</UButton></UForm
        ></template
      ></USlideover
    ><UModal
      v-model:open="blocking"
      title="Blokir pemeliharaan"
      description="Jadwal tidak boleh menimpa reservasi yang sudah disetujui."
      ><template #body
        ><UForm :schema="blockFormSchema" :state="block" class="space-y-5" @submit="saveBlock"
          ><UFormField name="date" label="Tanggal" required
            ><UInput v-model="block.date" type="date" class="w-full"
          /></UFormField>
          <div class="form-row">
            <UFormField name="start" label="Mulai (WIB)" required
              ><UInput v-model="block.start" type="time" /></UFormField
            ><UFormField name="end" label="Selesai (WIB)" required
              ><UInput v-model="block.end" type="time"
            /></UFormField>
          </div>
          <UFormField name="reason" label="Alasan pemeliharaan" required
            ><UTextarea
              v-model="block.reason"
              placeholder="Contoh: Perawatan perangkat video konferensi"
              class="w-full"
          /></UFormField>
          <div v-if="formError" class="notice" role="alert">
            {{ formError
            }}<UButton :to="`/ruang/${block.roomId}`" variant="link">Lihat Jadwal Terbaru</UButton>
          </div>
          <UButton type="submit" :loading="busy">Simpan Blokir</UButton></UForm
        ></template
      ></UModal
    >
  </div>
</template>
