<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import type { Interval } from '#shared/types'
import { jakartaDate, dateLabel, timeLabel, wibISO } from '#shared/rules'
const props = defineProps<{ roomId: string; disabled?: boolean }>()
const parts = jakartaDate().split('-').map(Number)
const chosen = shallowRef(new CalendarDate(parts[0]!, parts[1]!, parts[2]!))
const mode = ref('day'),
  allHours = ref(false)
const date = computed(() => chosen.value.toString())
const days = computed(() =>
  Array.from({ length: mode.value === 'week' ? 7 : 1 }, (_, i) => chosen.value.add({ days: i }).toString())
)
const from = computed(() => wibISO(date.value, '00:00'))
const to = computed(() =>
  wibISO(chosen.value.add({ days: mode.value === 'week' ? 7 : 1 }).toString(), '00:00')
)
const { data, status, error, refresh } = await useFetch<Interval[]>(
  `/api/rooms/${props.roomId}/availability`,
  { query: { from, to } }
)
const hours = computed(() =>
  Array.from({ length: allHours.value ? 24 : 12 }, (_, i) => i + (allHours.value ? 0 : 7))
)
function eventsFor(day: string, hour?: number) {
  const start = new Date(wibISO(day, `${String(hour ?? 0).padStart(2, '0')}:00`)).getTime()
  const end = start + (hour === undefined ? 86400_000 : 3600_000)
  return (data.value || []).filter(
    (e) => new Date(e.startAt).getTime() < end && new Date(e.endAt).getTime() > start
  )
}
function choose(day: string, hour: number) {
  if (!props.disabled)
    navigateTo({
      path: '/reservasi/baru',
      query: { roomId: props.roomId, date: day, start: `${String(hour).padStart(2, '0')}:00` }
    })
}
</script>
<template>
  <div class="panel calendar-panel">
    <div class="panel-title">
      <h2>Kalender ketersediaan</h2>
      <span class="text-xs text-muted">WIB · UTC+7</span>
    </div>
    <div class="calendar-toolbar">
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-chevron-left"
          variant="outline"
          color="neutral"
          aria-label="Tanggal sebelumnya"
          @click="chosen = chosen.subtract({ days: mode === 'week' ? 7 : 1 })"
        /><UPopover
          ><UButton variant="outline" color="neutral" icon="i-lucide-calendar-days">{{
            dateLabel(wibISO(date, '00:00'))
          }}</UButton
          ><template #content><UCalendar v-model="chosen" class="p-2" /></template></UPopover
        ><UButton
          icon="i-lucide-chevron-right"
          variant="outline"
          color="neutral"
          aria-label="Tanggal berikutnya"
          @click="chosen = chosen.add({ days: mode === 'week' ? 7 : 1 })"
        />
      </div>
      <div class="flex gap-2 calendar-view-controls">
        <USelect
          v-model="mode"
          :items="[
            { label: 'Harian', value: 'day' },
            { label: 'Mingguan', value: 'week' }
          ]"
          aria-label="Tampilan kalender"
        /><UButton variant="ghost" color="neutral" @click="allHours = !allHours">{{
          allHours ? '07.00–19.00' : 'Lihat 24 jam'
        }}</UButton>
      </div>
    </div>
    <div class="calendar-legend">
      <StatusBadge status="APPROVED" /><StatusBadge status="BLOCKED" /><span
        ><StatusBadge status="PENDING" /> <small>Belum mengunci jadwal</small></span
      >
    </div>
    <LoadState :pending="status === 'pending'" :error="error" @retry="refresh"
      ><div class="calendar-scroll">
        <div
          class="calendar-grid"
          :style="{ gridTemplateColumns: `64px repeat(${days.length}, minmax(130px, 1fr))` }"
        >
          <div class="calendar-head">WIB</div>
          <div v-for="d in days" :key="d" class="calendar-head">{{ dateLabel(wibISO(d, '00:00')) }}</div>
          <template v-for="hour in hours" :key="hour"
            ><div class="calendar-time">{{ String(hour).padStart(2, '0') }}.00</div>
            <div v-for="d in days" :key="d" class="calendar-slot">
              <button
                class="slot-button"
                :disabled="disabled"
                :aria-label="`Ajukan ${d} pukul ${hour}.00 WIB`"
                @click="choose(d, hour)"
              >
                <span class="slot-hint">+ Ajukan</span>
              </button>
              <div
                v-for="(event, i) in eventsFor(d, hour)"
                :key="i"
                class="calendar-event"
                :class="event.status.toLowerCase()"
              >
                <StatusBadge :status="event.status" /><small
                  >{{ timeLabel(event.startAt) }}–{{ timeLabel(event.endAt) }}</small
                >
              </div>
            </div></template
          >
        </div>
      </div>
      <div class="calendar-agenda">
        <h3>Agenda {{ dateLabel(wibISO(date, '00:00')) }}</h3>
        <p v-if="!eventsFor(date).length" class="text-muted py-6">Belum ada jadwal pada hari ini.</p>
        <div v-for="(event, i) in eventsFor(date)" :key="i" class="agenda-item">
          <span>{{ timeLabel(event.startAt) }}–{{ timeLabel(event.endAt) }} WIB</span
          ><StatusBadge :status="event.status" /><small v-if="event.status === 'PENDING'"
            >Belum mengunci jadwal</small
          >
        </div>
        <UButton class="mt-4" variant="outline" :disabled="disabled" @click="choose(date, 9)"
          >Pilih waktu reservasi</UButton
        >
      </div></LoadState
    >
    <p class="footnote p-4">
      Pilih slot atau gunakan formulir pengajuan. Identitas dan tujuan pengguna lain tidak ditampilkan.
    </p>
  </div>
</template>
